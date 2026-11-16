package com.mealplanner.service;

import com.mealplanner.entity.EmailOtp;
import com.mealplanner.entity.OtpType;
import com.mealplanner.exception.RateLimitExceededException;
import com.mealplanner.repository.EmailOtpRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Slf4j
public class OtpService {

    private final EmailOtpRepository otpRepository;
    private final EmailService emailService;
    private final DnsValidationService dnsValidationService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.otp.expiration-minutes:10}")
    private int expirationMinutes;

    @Value("${app.otp.cooldown-seconds:60}")
    private int cooldownSeconds;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.otp.max-requests-per-hour:5}")
    private int maxRequestsPerHour;

    @Value("${jwt.secret:mealcraft-fallback-salt}")
    private String salt;

    public OtpService(EmailOtpRepository otpRepository,
                      EmailService emailService,
                      DnsValidationService dnsValidationService) {
        this.otpRepository = otpRepository;
        this.emailService = emailService;
        this.dnsValidationService = dnsValidationService;
    }

    /**
     * Validates limits, creates a secure registration OTP, and dispatches the verification email.
     */
    @Transactional
    public void generateAndSendOtp(String email, String name) {
        String cleanEmail = email.trim().toLowerCase();

        validateDomainAndLimits(cleanEmail, OtpType.REGISTRATION);

        // Invalidate any currently pending active registration OTPs for this email
        otpRepository.invalidateAllActiveForEmailAndType(cleanEmail, OtpType.REGISTRATION);

        // Generate secure 6-digit numeric OTP
        String plainOtp = generateNumericOtp();

        // Save salted SHA-256 hash
        String otpHash = hashOtp(plainOtp, cleanEmail);

        EmailOtp emailOtp = EmailOtp.builder()
                .email(cleanEmail)
                .otpHash(otpHash)
                .type(OtpType.REGISTRATION)
                .attempts(0)
                .maxAttempts(maxAttempts)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .createdAt(LocalDateTime.now())
                .build();

        otpRepository.save(emailOtp);

        // Send the email
        emailService.sendOtpEmail(cleanEmail, name, plainOtp);
    }

    /**
     * Validates limits, creates a secure password reset OTP, and dispatches the reset email.
     */
    @Transactional
    public void generateAndSendResetOtp(String email, String name) {
        String cleanEmail = email.trim().toLowerCase();

        validateDomainAndLimits(cleanEmail, OtpType.PASSWORD_RESET);

        // Invalidate any currently pending active password reset OTPs for this email
        otpRepository.invalidateAllActiveForEmailAndType(cleanEmail, OtpType.PASSWORD_RESET);

        // Generate secure 6-digit numeric OTP
        String plainOtp = generateNumericOtp();

        // Save salted SHA-256 hash
        String otpHash = hashOtp(plainOtp, cleanEmail);

        EmailOtp emailOtp = EmailOtp.builder()
                .email(cleanEmail)
                .otpHash(otpHash)
                .type(OtpType.PASSWORD_RESET)
                .attempts(0)
                .maxAttempts(maxAttempts)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .createdAt(LocalDateTime.now())
                .build();

        otpRepository.save(emailOtp);

        // Send password reset email
        emailService.sendPasswordResetOtpEmail(cleanEmail, name, plainOtp);
    }

    /**
     * Verifies the provided 6-digit code for registration against active records with brute-force lockout.
     */
    @Transactional
    public void verifyOtp(String email, String rawOtp) {
        String cleanEmail = email.trim().toLowerCase();
        EmailOtp otp = findAndValidateOtp(cleanEmail, rawOtp, OtpType.REGISTRATION);

        // Successful verification - mark as used
        otp.setUsed(true);
        otpRepository.save(otp);
    }

    /**
     * Verifies the provided 6-digit code for password reset, marks OTP as used,
     * and generates a cryptographically secure single-use reset token valid for 10 minutes.
     *
     * @return Raw reset token to be returned to the client.
     */
    @Transactional
    public String verifyResetOtpAndGenerateToken(String email, String rawOtp) {
        String cleanEmail = email.trim().toLowerCase();
        EmailOtp otp = findAndValidateOtp(cleanEmail, rawOtp, OtpType.PASSWORD_RESET);

        // Generate random high-entropy reset token
        String resetToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = hashToken(resetToken);

        // Attach token and mark OTP used so code cannot be submitted again
        otp.setUsed(true);
        otp.setResetTokenHash(tokenHash);
        otp.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(expirationMinutes));
        otpRepository.save(otp);

        return resetToken;
    }

    /**
     * Validates and consumes the single-use reset token, returning the associated email.
     * Throws IllegalArgumentException if token is invalid, expired, or already consumed.
     */
    @Transactional
    public String validateAndConsumeResetToken(String resetToken) {
        if (resetToken == null || resetToken.trim().isBlank()) {
            throw new IllegalArgumentException("Reset token is missing or invalid.");
        }

        String tokenHash = hashToken(resetToken.trim());
        EmailOtp otp = otpRepository.findTopByResetTokenHashOrderByIdDesc(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired password reset session. Please request a new code."));

        if (otp.isResetTokenExpired()) {
            otp.setResetTokenHash(null);
            otp.setResetTokenExpiresAt(LocalDateTime.now().minusSeconds(1));
            otpRepository.save(otp);
            throw new IllegalArgumentException("Password reset session has expired. Please request a new code.");
        }

        // Invalidate token so it can never be reused
        otp.setResetTokenHash(null);
        otp.setResetTokenExpiresAt(LocalDateTime.now().minusSeconds(1));
        otpRepository.save(otp);

        return otp.getEmail();
    }

    private void validateDomainAndLimits(String cleanEmail, OtpType type) {
        // 1. Validate DNS MX record to ensure domain can receive mail
        if (!dnsValidationService.hasValidMailDomain(cleanEmail)) {
            throw new IllegalArgumentException("The email domain does not exist or cannot receive mail.");
        }

        // 2. Enforce Hourly Cap (Max 5 requests / hour)
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long requestsInLastHour = otpRepository.countByEmailAndTypeAndCreatedAtAfter(cleanEmail, type, oneHourAgo);
        if (requestsInLastHour >= maxRequestsPerHour) {
            throw new RateLimitExceededException("Too many verification attempts for this email. Please try again in an hour.");
        }

        // 3. Enforce 60-second cooldown between resends
        otpRepository.findTopByEmailAndTypeOrderByIdDesc(cleanEmail, type).ifPresent(lastOtp -> {
            if (lastOtp.getCreatedAt() != null) {
                long secondsSince = Duration.between(lastOtp.getCreatedAt(), LocalDateTime.now()).getSeconds();
                if (secondsSince < cooldownSeconds) {
                    long remaining = cooldownSeconds - secondsSince;
                    throw new IllegalArgumentException("Please wait " + remaining + " seconds before requesting a new code.");
                }
            }
        });
    }

    private String generateNumericOtp() {
        int codeInt = secureRandom.nextInt(1_000_000);
        return String.format("%06d", codeInt);
    }

    private EmailOtp findAndValidateOtp(String cleanEmail, String rawOtp, OtpType type) {
        String cleanCode = rawOtp != null ? rawOtp.trim() : "";

        EmailOtp otp = otpRepository.findTopByEmailAndTypeAndIsUsedFalseOrderByIdDesc(cleanEmail, type)
                .orElseThrow(() -> new IllegalArgumentException("No active verification code found for this email. Please request a new one."));

        // Check expiration
        if (otp.isExpired()) {
            otp.setUsed(true);
            otpRepository.save(otp);
            throw new IllegalArgumentException("Verification code has expired. Please request a new code.");
        }

        // Check if already exhausted
        if (otp.isExhausted()) {
            otp.setUsed(true);
            otpRepository.save(otp);
            throw new IllegalArgumentException("Too many failed attempts. This code has been deactivated. Please request a new code.");
        }

        // Increment attempt counter
        int currentAttempts = otp.getAttempts() + 1;
        otp.setAttempts(currentAttempts);

        // Compare constant-time hash
        String expectedHash = otp.getOtpHash();
        String providedHash = hashOtp(cleanCode, cleanEmail);

        boolean isMatch = MessageDigest.isEqual(
                expectedHash.getBytes(StandardCharsets.UTF_8),
                providedHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!isMatch) {
            if (currentAttempts >= otp.getMaxAttempts()) {
                otp.setUsed(true);
                otpRepository.save(otp);
                throw new IllegalArgumentException("Too many failed attempts. This code has been deactivated. Please request a new code.");
            } else {
                int remaining = otp.getMaxAttempts() - currentAttempts;
                otpRepository.save(otp);
                throw new IllegalArgumentException("Invalid verification code. " + remaining + " attempts remaining.");
            }
        }

        return otp;
    }

    private String hashOtp(String otp, String email) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String data = otp + ":" + email + ":" + salt;
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String data = token + ":" + salt;
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}

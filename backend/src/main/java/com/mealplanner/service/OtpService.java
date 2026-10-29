package com.mealplanner.service;

import com.mealplanner.entity.EmailOtp;
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
     * Validates limits, creates a secure OTP, and dispatches the verification email.
     */
    @Transactional
    public void generateAndSendOtp(String email, String name) {
        String cleanEmail = email.trim().toLowerCase();

        // 1. Validate DNS MX record to ensure domain can receive mail
        if (!dnsValidationService.hasValidMailDomain(cleanEmail)) {
            throw new IllegalArgumentException("The email domain does not exist or cannot receive mail.");
        }

        // 2. Enforce Hourly Cap (Max 5 requests / hour)
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long requestsInLastHour = otpRepository.countByEmailAndCreatedAtAfter(cleanEmail, oneHourAgo);
        if (requestsInLastHour >= maxRequestsPerHour) {
            throw new RateLimitExceededException("Too many verification attempts for this email. Please try again in an hour.");
        }

        // 3. Enforce 60-second cooldown between resends
        otpRepository.findTopByEmailOrderByIdDesc(cleanEmail).ifPresent(lastOtp -> {
            if (lastOtp.getCreatedAt() != null) {
                long secondsSince = Duration.between(lastOtp.getCreatedAt(), LocalDateTime.now()).getSeconds();
                if (secondsSince < cooldownSeconds) {
                    long remaining = cooldownSeconds - secondsSince;
                    throw new IllegalArgumentException("Please wait " + remaining + " seconds before requesting a new code.");
                }
            }
        });

        // 4. Invalidate any currently pending active OTPs for this email
        otpRepository.invalidateAllActiveForEmail(cleanEmail);

        // 5. Generate secure 6-digit numeric OTP
        int codeInt = secureRandom.nextInt(1_000_000);
        String plainOtp = String.format("%06d", codeInt);

        // 6. Save salted SHA-256 hash
        String otpHash = hashOtp(plainOtp, cleanEmail);

        EmailOtp emailOtp = EmailOtp.builder()
                .email(cleanEmail)
                .otpHash(otpHash)
                .attempts(0)
                .maxAttempts(maxAttempts)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .createdAt(LocalDateTime.now())
                .build();

        otpRepository.save(emailOtp);

        // 7. Send the email
        emailService.sendOtpEmail(cleanEmail, name, plainOtp);
    }

    /**
     * Verifies the provided 6-digit code against active records with brute-force lockout.
     */
    @Transactional
    public void verifyOtp(String email, String rawOtp) {
        String cleanEmail = email.trim().toLowerCase();
        String cleanCode = rawOtp != null ? rawOtp.trim() : "";

        EmailOtp otp = otpRepository.findTopByEmailAndIsUsedFalseOrderByIdDesc(cleanEmail)
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

        // Successful verification - mark as used
        otp.setUsed(true);
        otpRepository.save(otp);
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
}

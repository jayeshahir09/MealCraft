package com.mealplanner.service;

import com.mealplanner.dto.AuthResponse;
import com.mealplanner.dto.ForgotPasswordRequest;
import com.mealplanner.dto.LoginRequest;
import com.mealplanner.dto.MessageResponse;
import com.mealplanner.dto.RegisterRequest;
import com.mealplanner.dto.RegisterResponse;
import com.mealplanner.dto.ResendOtpRequest;
import com.mealplanner.dto.ResetPasswordRequest;
import com.mealplanner.dto.ResetTokenResponse;
import com.mealplanner.dto.VerifyOtpRequest;
import com.mealplanner.dto.VerifyResetOtpRequest;
import com.mealplanner.entity.User;
import com.mealplanner.entity.UserPreference;
import com.mealplanner.repository.UserRepository;
import com.mealplanner.repository.UserPreferenceRepository;
import com.mealplanner.security.JwtUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;

    public AuthService(UserRepository userRepository,
                       UserPreferenceRepository userPreferenceRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       OtpService otpService) {
        this.userRepository = userRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.otpService = otpService;
    }

    /**
     * Handles user registration: creates an unverified user record and dispatches an OTP.
     */
    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String cleanName = request.getName() != null ? request.getName().trim() : "";

        Optional<User> existingUserOpt = userRepository.findByEmail(cleanEmail);
        User user;

        if (existingUserOpt.isPresent()) {
            User existing = existingUserOpt.get();
            if (existing.isVerified()) {
                throw new IllegalArgumentException("Email already registered: " + cleanEmail);
            }
            // Update details for unverified user re-attempting registration
            existing.setName(cleanName);
            existing.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user = userRepository.save(existing);
        } else {
            user = User.builder()
                    .name(cleanName)
                    .email(cleanEmail)
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .isVerified(false)
                    .build();
            user = userRepository.save(user);
        }

        // Generate and send OTP via email
        otpService.generateAndSendOtp(cleanEmail, cleanName);

        return RegisterResponse.builder()
                .message("Verification code sent to your email. Please verify to complete registration.")
                .email(cleanEmail)
                .requiresOtp(true)
                .build();
    }

    /**
     * Verifies the 6-digit OTP, activates the user account, and returns authentication JWT.
     */
    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found for email: " + cleanEmail));

        // Validate code (throws IllegalArgumentException with attempt counts on failure)
        otpService.verifyOtp(cleanEmail, request.getOtp());

        // Mark account verified
        user.setVerified(true);
        user = userRepository.save(user);

        // Initialize default preferences if they don't exist yet
        if (userPreferenceRepository.findByUserId(user.getId()).isEmpty()) {
            UserPreference prefs = UserPreference.builder()
                    .user(user)
                    .dietType(UserPreference.DietType.NONE)
                    .allergies(new String[]{})
                    .build();
            userPreferenceRepository.save(prefs);
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    /**
     * Resends a fresh OTP code with rate-limit and cooldown protections.
     */
    @Transactional
    public RegisterResponse resendOtp(ResendOtpRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No registration found for email: " + cleanEmail));

        if (user.isVerified()) {
            throw new IllegalArgumentException("This account is already verified. Please sign in.");
        }

        otpService.generateAndSendOtp(cleanEmail, user.getName());

        return RegisterResponse.builder()
                .message("A new verification code has been sent to your email.")
                .email(cleanEmail)
                .requiresOtp(true)
                .build();
    }

    /**
     * Authenticates user, enforcing email verification before granting access.
     */
    public AuthResponse login(LoginRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!user.isVerified()) {
            throw new BadCredentialsException("Please verify your email address before logging in. A verification code was sent to your email.");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    /**
     * Initiates password reset by issuing an OTP if the user exists and is verified.
     * Always returns generic response to prevent account enumeration.
     */
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        userRepository.findByEmail(cleanEmail).ifPresent(user -> {
            if (user.isVerified()) {
                otpService.generateAndSendResetOtp(cleanEmail, user.getName());
            }
        });

        return MessageResponse.builder()
                .message("If an account is associated with this email, a verification code has been sent.")
                .email(cleanEmail)
                .build();
    }

    /**
     * Verifies the 6-digit OTP for password reset and returns a single-use 10-minute reset token.
     */
    @Transactional
    public ResetTokenResponse verifyResetOtp(VerifyResetOtpRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String resetToken = otpService.verifyResetOtpAndGenerateToken(cleanEmail, request.getOtp());

        return ResetTokenResponse.builder()
                .message("Verification successful. Please set your new password.")
                .resetToken(resetToken)
                .build();
    }

    /**
     * Consumes the single-use reset token and securely updates the user's password.
     */
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String email = otpService.validateAndConsumeResetToken(request.getResetToken());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User account not found."));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return MessageResponse.builder()
                .message("Your password has been successfully reset. Please sign in with your new password.")
                .email(email)
                .build();
    }
}

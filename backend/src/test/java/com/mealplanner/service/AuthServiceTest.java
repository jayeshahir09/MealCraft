package com.mealplanner.service;

import com.mealplanner.dto.AuthResponse;
import com.mealplanner.dto.ForgotPasswordRequest;
import com.mealplanner.dto.LoginRequest;
import com.mealplanner.dto.MessageResponse;
import com.mealplanner.dto.RegisterRequest;
import com.mealplanner.dto.RegisterResponse;
import com.mealplanner.dto.ResetPasswordRequest;
import com.mealplanner.dto.ResetTokenResponse;
import com.mealplanner.dto.VerifyOtpRequest;
import com.mealplanner.dto.VerifyResetOtpRequest;
import com.mealplanner.entity.User;
import com.mealplanner.entity.UserPreference;
import com.mealplanner.repository.UserPreferenceRepository;
import com.mealplanner.repository.UserRepository;
import com.mealplanner.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserPreferenceRepository userPreferenceRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private OtpService otpService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User testUser;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setName("Chef John");
        registerRequest.setEmail("john@example.com");
        registerRequest.setPassword("secret123");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("john@example.com");
        loginRequest.setPassword("secret123");

        testUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("john@example.com")
                .passwordHash("hashed_secret123")
                .isVerified(true)
                .build();
    }

    @Test
    @DisplayName("Register - creates unverified user and dispatches OTP email")
    void testRegisterSuccess() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("hashed_secret123");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        RegisterResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("john@example.com", response.getEmail());
        assertTrue(response.isRequiresOtp());

        verify(otpService, times(1)).generateAndSendOtp(eq("john@example.com"), eq("Chef John"));
    }

    @Test
    @DisplayName("Register - throws exception when email already verified")
    void testRegisterEmailAlreadyExists() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        assertThrows(IllegalArgumentException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any());
        verify(otpService, never()).generateAndSendOtp(any(), any());
    }

    @Test
    @DisplayName("VerifyOtp - successfully validates code, sets is_verified=true, and returns JWT")
    void testVerifyOtpSuccess() {
        User unverifiedUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("john@example.com")
                .passwordHash("hashed_secret123")
                .isVerified(false)
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(userPreferenceRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(jwtUtil.generateToken("john@example.com")).thenReturn("mock-jwt-token");

        VerifyOtpRequest verifyRequest = VerifyOtpRequest.builder()
                .email("john@example.com")
                .otp("123456")
                .build();

        AuthResponse response = authService.verifyOtp(verifyRequest);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.getToken());
        assertEquals("Chef John", response.getName());
        assertEquals(1L, response.getUserId());

        verify(otpService, times(1)).verifyOtp("john@example.com", "123456");
        verify(userPreferenceRepository, times(1)).save(any(UserPreference.class));
    }

    @Test
    @DisplayName("Login - successfully returns JWT on valid credentials for verified user")
    void testLoginSuccess() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("secret123", "hashed_secret123")).thenReturn(true);
        when(jwtUtil.generateToken("john@example.com")).thenReturn("mock-login-token");

        AuthResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mock-login-token", response.getToken());
        assertEquals(1L, response.getUserId());
    }

    @Test
    @DisplayName("Login - blocks unverified user with BadCredentialsException")
    void testLoginUnverifiedUserBlocked() {
        User unverified = User.builder()
                .id(2L)
                .name("Unverified")
                .email("john@example.com")
                .passwordHash("hashed_secret123")
                .isVerified(false)
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(unverified));
        when(passwordEncoder.matches("secret123", "hashed_secret123")).thenReturn(true);

        BadCredentialsException ex = assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
        assertTrue(ex.getMessage().contains("verify your email"));
    }

    @Test
    @DisplayName("Login - throws BadCredentialsException when user not found")
    void testLoginUserNotFound() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
    }

    @Test
    @DisplayName("Login - throws BadCredentialsException on password mismatch")
    void testLoginPasswordMismatch() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("secret123", "hashed_secret123")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
    }

    @Test
    @DisplayName("ForgotPassword - sends reset OTP when user is registered and verified")
    void testForgotPasswordUserExists() {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email("john@example.com")
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        MessageResponse response = authService.forgotPassword(request);

        assertNotNull(response);
        assertEquals("john@example.com", response.getEmail());
        assertTrue(response.getMessage().contains("verification code has been sent"));
        verify(otpService, times(1)).generateAndSendResetOtp("john@example.com", "Chef John");
    }

    @Test
    @DisplayName("ForgotPassword - does not dispatch OTP if email not found, but returns standard message")
    void testForgotPasswordUserNotFound() {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email("unknown@example.com")
                .build();

        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        MessageResponse response = authService.forgotPassword(request);

        assertNotNull(response);
        assertEquals("unknown@example.com", response.getEmail());
        verify(otpService, never()).generateAndSendResetOtp(any(), any());
    }

    @Test
    @DisplayName("VerifyResetOtp - returns resetToken on successful OTP check")
    void testVerifyResetOtpSuccess() {
        VerifyResetOtpRequest request = VerifyResetOtpRequest.builder()
                .email("john@example.com")
                .otp("654321")
                .build();

        when(otpService.verifyResetOtpAndGenerateToken("john@example.com", "654321")).thenReturn("sample-reset-token");

        ResetTokenResponse response = authService.verifyResetOtp(request);

        assertNotNull(response);
        assertEquals("sample-reset-token", response.getResetToken());
        verify(otpService, times(1)).verifyResetOtpAndGenerateToken("john@example.com", "654321");
    }

    @Test
    @DisplayName("ResetPassword - successfully updates password with BCrypt hash")
    void testResetPasswordSuccess() {
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken("sample-reset-token")
                .newPassword("brandNewPassword99")
                .build();

        when(otpService.validateAndConsumeResetToken("sample-reset-token")).thenReturn("john@example.com");
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("brandNewPassword99")).thenReturn("new_bcrypt_hash");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        MessageResponse response = authService.resetPassword(request);

        assertNotNull(response);
        assertTrue(response.getMessage().contains("successfully reset"));
        assertEquals("new_bcrypt_hash", testUser.getPasswordHash());
        verify(userRepository, times(1)).save(testUser);
    }
}

package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.*;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @DisplayName("POST /api/auth/register - success returns 200 and RegisterResponse")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Chef John");
        request.setEmail("john@example.com");
        request.setPassword("password123");

        RegisterResponse response = RegisterResponse.builder()
                .message("Verification code sent to your email.")
                .email("john@example.com")
                .requiresOtp(true)
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.requiresOtp").value(true));
    }

    @Test
    @DisplayName("POST /api/auth/register - invalid email returns 400")
    void testRegisterValidationFailure() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("A");
        request.setEmail("not-an-email");
        request.setPassword("123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/verify-otp - success returns 200 and AuthResponse")
    void testVerifyOtpSuccess() throws Exception {
        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("john@example.com")
                .otp("123456")
                .build();

        AuthResponse response = AuthResponse.builder()
                .token("jwt-token-xyz")
                .userId(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();

        when(authService.verifyOtp(any(VerifyOtpRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-xyz"))
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.name").value("Chef John"))
                .andExpect(jsonPath("$.email").value("john@example.com"));
    }

    @Test
    @DisplayName("POST /api/auth/resend-otp - success returns 200 and RegisterResponse")
    void testResendOtpSuccess() throws Exception {
        ResendOtpRequest request = ResendOtpRequest.builder()
                .email("john@example.com")
                .build();

        RegisterResponse response = RegisterResponse.builder()
                .message("A new verification code has been sent.")
                .email("john@example.com")
                .requiresOtp(true)
                .build();

        when(authService.resendOtp(any(ResendOtpRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.requiresOtp").value(true));
    }

    @Test
    @DisplayName("POST /api/auth/login - success returns 200 and AuthResponse")
    void testLoginSuccess() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("password123");

        AuthResponse response = AuthResponse.builder()
                .token("jwt-login-token")
                .userId(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-login-token"))
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.name").value("Chef John"));
    }

    @Test
    @DisplayName("POST /api/auth/login - bad credentials returns 401")
    void testLoginBadCredentials() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("wrongpassword");

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password - success returns 200 and MessageResponse")
    void testForgotPasswordSuccess() throws Exception {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email("john@example.com")
                .build();

        MessageResponse response = MessageResponse.builder()
                .message("If an account is associated with this email, a verification code has been sent.")
                .email("john@example.com")
                .build();

        when(authService.forgotPassword(any(ForgotPasswordRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.message").value("If an account is associated with this email, a verification code has been sent."));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password - invalid email returns 400")
    void testForgotPasswordInvalidEmail() throws Exception {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email("not-an-email")
                .build();

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/verify-reset-otp - success returns 200 and ResetTokenResponse")
    void testVerifyResetOtpSuccess() throws Exception {
        VerifyResetOtpRequest request = VerifyResetOtpRequest.builder()
                .email("john@example.com")
                .otp("123456")
                .build();

        ResetTokenResponse response = ResetTokenResponse.builder()
                .message("Verification successful.")
                .resetToken("token-123456-abc")
                .build();

        when(authService.verifyResetOtp(any(VerifyResetOtpRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/verify-reset-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").value("token-123456-abc"));
    }

    @Test
    @DisplayName("POST /api/auth/verify-reset-otp - non 6-digit OTP returns 400")
    void testVerifyResetOtpInvalidFormat() throws Exception {
        VerifyResetOtpRequest request = VerifyResetOtpRequest.builder()
                .email("john@example.com")
                .otp("12")
                .build();

        mockMvc.perform(post("/api/auth/verify-reset-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/reset-password - success returns 200 and MessageResponse")
    void testResetPasswordSuccess() throws Exception {
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken("valid-token")
                .newPassword("brandNewPassword123")
                .build();

        MessageResponse response = MessageResponse.builder()
                .message("Your password has been successfully reset.")
                .email("john@example.com")
                .build();

        when(authService.resetPassword(any(ResetPasswordRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Your password has been successfully reset."));
    }

    @Test
    @DisplayName("POST /api/auth/reset-password - password too short returns 400")
    void testResetPasswordTooShort() throws Exception {
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken("valid-token")
                .newPassword("123")
                .build();

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}

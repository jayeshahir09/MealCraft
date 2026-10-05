package com.mealplanner.service;

import com.mealplanner.dto.AuthResponse;
import com.mealplanner.dto.LoginRequest;
import com.mealplanner.dto.RegisterRequest;
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
                .build();
    }

    @Test
    @DisplayName("Register - successfully creates user, default preferences and returns JWT")
    void testRegisterSuccess() {
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed_secret123");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtUtil.generateToken("john@example.com")).thenReturn("mock-jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.getToken());
        assertEquals("Chef John", response.getName());
        assertEquals("john@example.com", response.getEmail());
        assertEquals(1L, response.getUserId());

        verify(userPreferenceRepository, times(1)).save(any(UserPreference.class));
    }

    @Test
    @DisplayName("Register - throws exception when email already exists")
    void testRegisterEmailAlreadyExists() {
        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any());
        verify(userPreferenceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login - successfully returns JWT on valid credentials")
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
}

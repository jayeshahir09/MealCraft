package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.AuthResponse;
import com.mealplanner.dto.LoginRequest;
import com.mealplanner.dto.RegisterRequest;
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
    @DisplayName("POST /api/auth/register - success returns 200 and AuthResponse")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Chef John");
        request.setEmail("john@example.com");
        request.setPassword("password123");

        AuthResponse response = AuthResponse.builder()
                .token("jwt-token-xyz")
                .userId(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-xyz"))
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.name").value("Chef John"))
                .andExpect(jsonPath("$.email").value("john@example.com"));
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
}

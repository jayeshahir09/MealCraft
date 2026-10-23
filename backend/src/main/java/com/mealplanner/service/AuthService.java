package com.mealplanner.service;

import com.mealplanner.dto.AuthResponse;
import com.mealplanner.dto.LoginRequest;
import com.mealplanner.dto.RegisterRequest;
import com.mealplanner.entity.User;
import com.mealplanner.entity.UserPreference;
import com.mealplanner.repository.UserRepository;
import com.mealplanner.repository.UserPreferenceRepository;
import com.mealplanner.security.JwtUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       UserPreferenceRepository userPreferenceRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String cleanName = request.getName() != null ? request.getName().trim() : "";

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("Email already registered: " + cleanEmail);
        }

        User user = User.builder()
                .name(cleanName)
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        user = userRepository.save(user);

        // Create default preferences
        UserPreference prefs = UserPreference.builder()
                .user(user)
                .dietType(UserPreference.DietType.NONE)
                .allergies(new String[]{})
                .build();
        userPreferenceRepository.save(prefs);

        String token = jwtUtil.generateToken(user.getEmail());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }
}

package com.mealplanner.service;

import com.mealplanner.entity.EmailOtp;
import com.mealplanner.entity.OtpType;
import com.mealplanner.repository.EmailOtpRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private EmailOtpRepository otpRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private DnsValidationService dnsValidationService;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "expirationMinutes", 10);
        ReflectionTestUtils.setField(otpService, "cooldownSeconds", 60);
        ReflectionTestUtils.setField(otpService, "maxAttempts", 5);
        ReflectionTestUtils.setField(otpService, "maxRequestsPerHour", 5);
        ReflectionTestUtils.setField(otpService, "salt", "test-salt");
    }

    @Test
    @DisplayName("VerifyResetOtp and then validateAndConsumeResetToken succeeds")
    void testVerifyAndConsumeResetToken() {
        String email = "chef@example.com";
        String rawOtp = "123456";

        // Calculate expected OTP hash using the private hashOtp method
        String expectedHash = (String) ReflectionTestUtils.invokeMethod(otpService, "hashOtp", rawOtp, email);

        EmailOtp pendingOtp = EmailOtp.builder()
                .id(1L)
                .email(email)
                .otpHash(expectedHash)
                .type(OtpType.PASSWORD_RESET)
                .attempts(0)
                .maxAttempts(5)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        when(otpRepository.findTopByEmailAndTypeAndIsUsedFalseOrderByIdDesc(email, OtpType.PASSWORD_RESET))
                .thenReturn(Optional.of(pendingOtp));

        // 1. Verify OTP -> generates reset token
        String resetToken = otpService.verifyResetOtpAndGenerateToken(email, rawOtp);
        assertNotNull(resetToken);
        assertTrue(pendingOtp.isUsed());
        assertNotNull(pendingOtp.getResetTokenHash());
        assertNotNull(pendingOtp.getResetTokenExpiresAt());

        // 2. Mock finding by resetTokenHash
        String tokenHash = (String) ReflectionTestUtils.invokeMethod(otpService, "hashToken", resetToken);
        when(otpRepository.findTopByResetTokenHashOrderByIdDesc(tokenHash))
                .thenReturn(Optional.of(pendingOtp));

        // 3. Validate & consume reset token
        String recoveredEmail = otpService.validateAndConsumeResetToken(resetToken);
        assertEquals(email, recoveredEmail);
        assertNull(pendingOtp.getResetTokenHash());
        assertTrue(pendingOtp.isResetTokenExpired());
        verify(otpRepository, atLeastOnce()).save(pendingOtp);
    }

    @Test
    @DisplayName("validateAndConsumeResetToken throws exception when token not found or already consumed")
    void testValidateAndConsumeResetTokenNotFound() {
        String tokenHash = (String) ReflectionTestUtils.invokeMethod(otpService, "hashToken", "invalid-token");
        when(otpRepository.findTopByResetTokenHashOrderByIdDesc(tokenHash))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> otpService.validateAndConsumeResetToken("invalid-token"));

        assertTrue(ex.getMessage().contains("Invalid or expired password reset session"));
    }
}


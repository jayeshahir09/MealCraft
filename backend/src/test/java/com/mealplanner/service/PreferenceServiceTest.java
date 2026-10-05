package com.mealplanner.service;

import com.mealplanner.dto.PreferenceDTO;
import com.mealplanner.entity.User;
import com.mealplanner.entity.UserPreference;
import com.mealplanner.entity.UserPreference.DietType;
import com.mealplanner.repository.UserPreferenceRepository;
import com.mealplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PreferenceServiceTest {

    @Mock
    private UserPreferenceRepository preferenceRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PreferenceService preferenceService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();
    }

    @Test
    @DisplayName("getPreferences - returns user preferences")
    void testGetPreferences() {
        UserPreference pref = UserPreference.builder()
                .id(10L)
                .user(testUser)
                .dietType(DietType.KETO)
                .allergies(new String[]{"Shellfish"})
                .preferredCuisine("American")
                .maxCookTimeMinutes(40)
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.of(pref));

        PreferenceDTO dto = preferenceService.getPreferences("john@example.com");

        assertNotNull(dto);
        assertEquals(DietType.KETO, dto.getDietType());
        assertEquals("American", dto.getPreferredCuisine());
        assertEquals(40, dto.getMaxCookTimeMinutes());
        assertArrayEquals(new String[]{"Shellfish"}, dto.getAllergies());
    }

    @Test
    @DisplayName("updatePreferences - updates and saves user preferences")
    void testUpdatePreferences() {
        UserPreference pref = UserPreference.builder()
                .id(10L)
                .user(testUser)
                .dietType(DietType.NONE)
                .build();

        PreferenceDTO updateInput = PreferenceDTO.builder()
                .dietType(DietType.VEGAN)
                .allergies(new String[]{"Peanuts"})
                .preferredCuisine("Indian")
                .maxCookTimeMinutes(25)
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.of(pref));
        when(preferenceRepository.save(any(UserPreference.class))).thenAnswer(i -> i.getArgument(0));

        PreferenceDTO result = preferenceService.updatePreferences("john@example.com", updateInput);

        assertNotNull(result);
        assertEquals(DietType.VEGAN, result.getDietType());
        assertEquals("Indian", result.getPreferredCuisine());
        assertEquals(25, result.getMaxCookTimeMinutes());
    }
}

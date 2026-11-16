package com.mealplanner.service;

import com.mealplanner.config.CacheConfig;
import com.mealplanner.dto.PreferenceDTO;
import com.mealplanner.entity.User;
import com.mealplanner.entity.UserPreference;
import com.mealplanner.entity.UserPreference.DietType;
import com.mealplanner.repository.UserPreferenceRepository;
import com.mealplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Import;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@SpringBootTest(classes = {PreferenceService.class})
@Import(CacheConfig.class)
class PreferenceServiceCacheTest {

    @Autowired
    private PreferenceService preferenceService;

    @Autowired
    private CacheManager cacheManager;

    @MockBean
    private UserPreferenceRepository preferenceRepository;

    @MockBean
    private UserRepository userRepository;

    private User testUser;
    private UserPreference testPref;

    @BeforeEach
    void setUp() {
        if (cacheManager.getCache("userPreferences") != null) {
            cacheManager.getCache("userPreferences").clear();
        }

        testUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("chef@example.com")
                .build();

        testPref = UserPreference.builder()
                .id(10L)
                .user(testUser)
                .dietType(DietType.KETO)
                .allergies(new String[]{"Peanuts"})
                .preferredCuisine("Italian")
                .maxCookTimeMinutes(30)
                .build();
    }

    @Test
    @DisplayName("getPreferences uses Caffeine cache on repeated calls and evicts on update")
    void testCacheHitAndEviction() {
        when(userRepository.findByEmail("chef@example.com")).thenReturn(Optional.of(testUser));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.of(testPref));

        // 1st Call -> Cache Miss (hits repo)
        PreferenceDTO firstCall = preferenceService.getPreferences("chef@example.com");
        assertNotNull(firstCall);
        assertEquals(DietType.KETO, firstCall.getDietType());
        verify(preferenceRepository, times(1)).findByUserId(1L);

        // 2nd Call -> Cache Hit (repo NOT called again)
        PreferenceDTO secondCall = preferenceService.getPreferences("chef@example.com");
        assertNotNull(secondCall);
        verify(preferenceRepository, times(1)).findByUserId(1L);

        // Update preferences -> Evicts cache (calls findByUserId inside updatePreferences)
        PreferenceDTO updatedInput = PreferenceDTO.builder()
                .dietType(DietType.VEGAN)
                .allergies(new String[]{"Peanuts"})
                .preferredCuisine("Mexican")
                .maxCookTimeMinutes(25)
                .build();

        when(preferenceRepository.save(any(UserPreference.class))).thenReturn(testPref);
        preferenceService.updatePreferences("chef@example.com", updatedInput);

        // 3rd Call -> Cache Miss after eviction (hits repo again: 1 initial + 1 update + 1 fetch = 3 total)
        preferenceService.getPreferences("chef@example.com");
        verify(preferenceRepository, times(3)).findByUserId(1L);
    }
}

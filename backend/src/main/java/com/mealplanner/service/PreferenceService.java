package com.mealplanner.service;

import com.mealplanner.dto.PreferenceDTO;
import com.mealplanner.entity.User;
import com.mealplanner.entity.UserPreference;
import com.mealplanner.repository.UserPreferenceRepository;
import com.mealplanner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PreferenceService {

    private final UserPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    public PreferenceDTO getPreferences(String email) {
        User user = getUser(email);
        UserPreference pref = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> UserPreference.builder().user(user).build());
        return toDTO(pref);
    }

    @Transactional
    public PreferenceDTO updatePreferences(String email, PreferenceDTO dto) {
        User user = getUser(email);
        UserPreference pref = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> UserPreference.builder().user(user).build());

        pref.setDietType(dto.getDietType() != null ? dto.getDietType() : UserPreference.DietType.NONE);
        pref.setAllergies(dto.getAllergies() != null ? dto.getAllergies() : new String[]{});
        pref.setPreferredCuisine(dto.getPreferredCuisine());
        pref.setMaxCookTimeMinutes(dto.getMaxCookTimeMinutes());

        return toDTO(preferenceRepository.save(pref));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private PreferenceDTO toDTO(UserPreference pref) {
        return PreferenceDTO.builder()
                .dietType(pref.getDietType())
                .allergies(pref.getAllergies())
                .preferredCuisine(pref.getPreferredCuisine())
                .maxCookTimeMinutes(pref.getMaxCookTimeMinutes())
                .build();
    }
}

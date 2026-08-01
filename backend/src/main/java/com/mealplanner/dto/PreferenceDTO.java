package com.mealplanner.dto;

import com.mealplanner.entity.UserPreference.DietType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PreferenceDTO {
    private DietType dietType;
    private String[] allergies;
    private String preferredCuisine;
    private Integer maxCookTimeMinutes;
}

package com.mealplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AiRecipeDTO {
    private String title;
    private List<String> usedIngredients;
    private List<MissingIngredient> missingIngredients;
    private List<String> steps;
    private Integer estimatedTimeMinutes;
    private Integer estimatedCalories;
    private String cuisine;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MissingIngredient {
        private String name;
        private String quantity;
        private String unit;
    }
}

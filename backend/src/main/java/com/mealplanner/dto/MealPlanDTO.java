package com.mealplanner.dto;

import com.mealplanner.entity.Recipe;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MealPlanDTO {
    private Long id;
    private LocalDate weekStartDate;
    private List<MealPlanEntryDTO> entries;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MealPlanEntryDTO {
        private Long id;
        private Long recipeId;
        private String recipeTitle;
        private Integer estimatedCalories;
        private Integer estimatedTimeMinutes;
        private String cuisine;
        private List<Recipe.IngredientItem> ingredients;
        private List<String> steps;
        private String dayOfWeek;
        private String mealType;
    }
}

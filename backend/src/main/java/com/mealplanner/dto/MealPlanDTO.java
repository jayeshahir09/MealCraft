package com.mealplanner.dto;

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
        private String dayOfWeek;
        private String mealType;
    }
}

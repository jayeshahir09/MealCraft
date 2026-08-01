package com.mealplanner.dto;

import com.mealplanner.entity.Recipe;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RecipeDTO {
    private Long id;
    private String title;
    private List<Recipe.IngredientItem> ingredients;
    private List<String> steps;
    private String cuisine;
    private Integer estimatedTimeMinutes;
    private Integer estimatedCalories;
    private String source;
    private String[] tags;
    private LocalDateTime createdAt;
}

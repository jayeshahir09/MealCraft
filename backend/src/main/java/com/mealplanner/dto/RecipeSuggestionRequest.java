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
public class RecipeSuggestionRequest {
    private List<String> ingredients;
    private String dietType;
    private List<String> allergies;
    private String cuisine;
    private Integer maxTimeMinutes;
}

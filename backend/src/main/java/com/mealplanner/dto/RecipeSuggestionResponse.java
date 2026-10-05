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
public class RecipeSuggestionResponse {
    private List<AiRecipeDTO> recipes;
    private boolean fromCache;
    private int remainingCallsToday;
    private int maxCallsPerDay;
}

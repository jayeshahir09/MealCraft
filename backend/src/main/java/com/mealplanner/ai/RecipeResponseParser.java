package com.mealplanner.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.exception.AIServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecipeResponseParser {

    private final ObjectMapper objectMapper;

    public List<AiRecipeDTO> parse(String rawResponse) {
        String cleaned = extractJson(rawResponse);
        try {
            List<AiRecipeDTO> recipes = objectMapper.readValue(cleaned, new TypeReference<>() {});
            if (recipes == null || recipes.isEmpty()) {
                throw new AIServiceException("LLM returned empty recipe list");
            }
            // Validate each recipe has required fields
            for (AiRecipeDTO recipe : recipes) {
                if (recipe.getTitle() == null || recipe.getTitle().isBlank()) {
                    throw new AIServiceException("Recipe missing title in LLM response");
                }
                if (recipe.getSteps() == null || recipe.getSteps().isEmpty()) {
                    throw new AIServiceException("Recipe missing steps in LLM response");
                }
            }
            return recipes;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse LLM JSON response: {}", cleaned, e);
            throw new AIServiceException("Failed to parse recipe suggestions from AI response");
        }
    }

    private String extractJson(String rawResponse) {
        if (rawResponse == null) throw new AIServiceException("LLM returned null response");
        // Strip markdown code blocks if present
        String cleaned = rawResponse.trim();
        if (cleaned.startsWith("```")) {
            int start = cleaned.indexOf('[');
            int end = cleaned.lastIndexOf(']');
            if (start != -1 && end != -1) {
                cleaned = cleaned.substring(start, end + 1);
            }
        }
        // Extract JSON array
        int start = cleaned.indexOf('[');
        int end = cleaned.lastIndexOf(']');
        if (start == -1 || end == -1) {
            throw new AIServiceException("LLM response does not contain a JSON array");
        }
        return cleaned.substring(start, end + 1);
    }
}

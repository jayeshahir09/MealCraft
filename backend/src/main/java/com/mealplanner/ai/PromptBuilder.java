package com.mealplanner.ai;

import com.mealplanner.dto.RecipeSuggestionRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptBuilder {

    public String buildRecipeSuggestionPrompt(RecipeSuggestionRequest request) {
        StringBuilder sb = new StringBuilder();

        sb.append("""
            You are a professional recipe assistant. Given the ingredients and constraints below, suggest 3-5 recipes.
            IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no preamble, no explanation, no ```json wrapper.
            Start your response with [ and end with ].
            
            """);

        sb.append("Ingredients available: ")
          .append(sanitize(request.getIngredients()))
          .append("\n");

        if (request.getDietType() != null && !request.getDietType().isBlank() && !request.getDietType().equals("NONE")) {
            sb.append("Dietary restriction: ").append(sanitize(request.getDietType())).append("\n");
        }

        if (request.getAllergies() != null && !request.getAllergies().isEmpty()) {
            sb.append("Allergies - MUST EXCLUDE completely: ")
              .append(sanitize(request.getAllergies()))
              .append("\n");
        }

        if (request.getCuisine() != null && !request.getCuisine().isBlank()) {
            sb.append("Cuisine preference: ").append(sanitize(request.getCuisine())).append("\n");
        }

        if (request.getMaxTimeMinutes() != null) {
            sb.append("Maximum cooking time: ").append(request.getMaxTimeMinutes()).append(" minutes\n");
        }

        sb.append("""
            
            Required JSON schema for EACH recipe in the array:
            {
              "title": "string",
              "cuisine": "string",
              "usedIngredients": ["string"],
              "missingIngredients": [{"name": "string", "quantity": "string", "unit": "string"}],
              "steps": ["string"],
              "estimatedTimeMinutes": number,
              "estimatedCalories": number
            }
            """);

        return sb.toString();
    }

    private String sanitize(String input) {
        if (input == null) return "";
        // Strip prompt injection attempts
        return input.replaceAll("(?i)(ignore|forget|disregard|system|prompt|instruction)", "[removed]")
                    .replaceAll("[<>{}]", "")
                    .trim();
    }

    private String sanitize(List<String> inputs) {
        if (inputs == null || inputs.isEmpty()) return "none";
        return inputs.stream()
                .map(this::sanitize)
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(", "));
    }
}

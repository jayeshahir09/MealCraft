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
            You are an expert executive chef and culinary educator.
            CRITICAL OUTPUT FORMAT:
            1. Respond ONLY with a valid JSON array starting with [ and ending with ].
            2. Do NOT include markdown blocks, preamble, explanation, or notes.
            3. Suggest EXACTLY 3 delicious, realistic, and complete recipes.

            ENGLISH & STEP QUALITY INSTRUCTIONS (MANDATORY):
            - Write in clear, natural, and grammatically flawless English.
            - Provide 4 to 6 sequential, easy-to-follow steps per recipe.
            - Write each step as a full, clear sentence in the imperative voice (e.g., "Heat olive oil in a wide skillet over medium heat.").
            - NEVER use telegraphic, broken shorthand or fragmented phrases (e.g., NEVER write "chop onion pan fry 5 min done").
            - Every cooking step MUST include:
              * Specific heat level (e.g., "low heat", "medium-high heat", "gentle simmer").
              * Specific time duration (e.g., "cook for 4–5 minutes", "simmer for 10 minutes").
              * Visual or sensory doneness cue (e.g., "until the onions turn soft and translucent", "until golden brown and fragrant").
            - Follow chronological cooking order:
              * Step 1: Prep & mise en place (washing, cutting, measuring).
              * Steps 2–4: Active cooking, sautéing, or searing with heat cues.
              * Step 5–6: Simmering, resting, seasoning with salt/pepper, and serving garnish.
            - Recipe titles MUST be appetizing and descriptive (e.g., "Creamy Garlic Herb Chicken Skillet").
            - Missing ingredients MUST have realistic home-kitchen measurements with standard units (e.g., quantity: "2", unit: "cloves" or "tbsp" or "cups" or "g").

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
            sb.append("Maximum preparation and cooking time: ")
              .append(request.getMaxTimeMinutes())
              .append(" minutes (CRITICAL RULE: each recipe's estimatedTimeMinutes MUST be <= ")
              .append(request.getMaxTimeMinutes())
              .append(" minutes)\n");
        }

        sb.append("""
            
            Each object in the array MUST have exactly these fields:
            "title": string (Appetizing, descriptive recipe title in clear English),
            "cuisine": string (e.g. Italian, Mediterranean, Asian, Mexican, American),
            "usedIngredients": [string] (names of available ingredients utilized),
            "missingIngredients": [{"name": string, "quantity": string, "unit": string}],
            "steps": [string] (4 to 6 complete, clearly explained sentences in professional English),
            "estimatedTimeMinutes": integer (total prep and cooking time),
            "estimatedCalories": integer (estimated calories per serving, realistic range 250-950)
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

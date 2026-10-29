package com.mealplanner.ai;

import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeSuggestionRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Slf4j
public class FallbackRecipeGenerator {

    public List<AiRecipeDTO> generateFallbackRecipes(RecipeSuggestionRequest request) {
        List<String> rawIngredients = request.getIngredients() != null ? request.getIngredients() : List.of("Seasonal Veggies");
        List<String> cleanedIngredients = rawIngredients.stream()
                .filter(i -> i != null && !i.isBlank())
                .map(this::capitalize)
                .collect(Collectors.toList());

        if (cleanedIngredients.isEmpty()) {
            cleanedIngredients.add("Fresh Vegetables");
        }

        String cuisine = (request.getCuisine() != null && !request.getCuisine().isBlank())
                ? capitalize(request.getCuisine().trim())
                : "Homestyle";

        int maxTime = (request.getMaxTimeMinutes() != null && request.getMaxTimeMinutes() > 0)
                ? request.getMaxTimeMinutes()
                : 30;

        String primary = cleanedIngredients.get(0);
        String secondary = cleanedIngredients.size() > 1 ? cleanedIngredients.get(1) : "Aromatics";

        List<AiRecipeDTO> recipes = new ArrayList<>();

        // 1. Skillet / Sauté
        recipes.add(AiRecipeDTO.builder()
                .title(cuisine + " " + primary + " & " + secondary + " Skillet")
                .cuisine(cuisine)
                .estimatedTimeMinutes(Math.min(maxTime, 25))
                .estimatedCalories(480)
                .usedIngredients(cleanedIngredients)
                .missingIngredients(List.of(
                        new AiRecipeDTO.MissingIngredient("Olive Oil", "2", "tbsp"),
                        new AiRecipeDTO.MissingIngredient("Garlic Cloves (minced)", "3", "cloves"),
                        new AiRecipeDTO.MissingIngredient("Sea Salt & Black Pepper", "1", "tsp")
                ))
                .steps(List.of(
                        "Rinse, trim, and cut " + primary + (cleanedIngredients.size() > 1 ? " and " + secondary : "") + " into uniform bite-sized pieces.",
                        "Heat 2 tablespoons of olive oil in a wide skillet over medium-high heat until shimmering.",
                        "Add the minced garlic and sauté for 30 seconds until fragrant.",
                        "Add " + primary + " to the skillet and cook for 6-8 minutes, stirring occasionally until nicely caramelized.",
                        cleanedIngredients.size() > 1
                                ? "Incorporate " + secondary + " (and other vegetables) and toss continuously for 4-5 minutes until tender-crisp."
                                : "Reduce heat slightly and continue tossing for 3 minutes until tender and cooked through.",
                        "Season with sea salt, freshly cracked pepper, and serve warm immediately as a wholesome main dish."
                ))
                .build());

        // 2. Grain / Power Bowl
        recipes.add(AiRecipeDTO.builder()
                .title("Crispy " + cuisine + " " + primary + " Harvest Bowl")
                .cuisine(cuisine)
                .estimatedTimeMinutes(Math.min(maxTime, 30))
                .estimatedCalories(540)
                .usedIngredients(cleanedIngredients)
                .missingIngredients(List.of(
                        new AiRecipeDTO.MissingIngredient("Quinoa or Brown Rice", "1", "cup"),
                        new AiRecipeDTO.MissingIngredient("Lemon Juice or Vinegar", "1", "tbsp"),
                        new AiRecipeDTO.MissingIngredient("Paprika or Cumin", "1/2", "tsp")
                ))
                .steps(List.of(
                        "Preheat your oven or air fryer to 400°F (200°C) or set up a large roasting pan.",
                        "Toss " + primary + " with a drizzle of oil, paprika, and a pinch of salt on a baking tray.",
                        "Roast for 18-20 minutes until golden brown with crisp, flavorful edges.",
                        "While roasting, warm your base of quinoa or brown rice in serving bowls.",
                        "Arrange the roasted " + primary + (cleanedIngredients.size() > 1 ? ", " + secondary : "") + " neatly over the grain base.",
                        "Drizzle with fresh lemon juice or your favorite light dressing and garnish before enjoying."
                ))
                .build());

        // 3. Simmer / Stew / One-Pot
        recipes.add(AiRecipeDTO.builder()
                .title("Aromatic " + cuisine + " " + primary + " Medley Simmer")
                .cuisine(cuisine)
                .estimatedTimeMinutes(Math.min(maxTime, 25))
                .estimatedCalories(420)
                .usedIngredients(cleanedIngredients)
                .missingIngredients(List.of(
                        new AiRecipeDTO.MissingIngredient("Vegetable or Chicken Broth", "1.5", "cups"),
                        new AiRecipeDTO.MissingIngredient("Diced Onion", "1/2", "medium"),
                        new AiRecipeDTO.MissingIngredient("Italian Herb Blend", "1", "tsp")
                ))
                .steps(List.of(
                        "In a medium saucepan, warm a splash of oil over medium heat and sauté the diced onion until translucent.",
                        "Add " + primary + (cleanedIngredients.size() > 1 ? " along with " + secondary : "") + " and stir to coat in the aromatics.",
                        "Pour in 1.5 cups of broth and sprinkle with the Italian herb blend. Bring to a gentle boil.",
                        "Lower heat to a simmer, cover with a lid, and let cook for 10-12 minutes until all ingredients are tender and flavorful.",
                        "Taste and adjust seasoning with salt and pepper. Ladle into warm bowls and serve."
                ))
                .build());

        log.info("Generated {} intelligent fallback recipes for cuisine '{}' and ingredients: {}", 
                recipes.size(), cuisine, cleanedIngredients);
        return recipes;
    }

    private String capitalize(String text) {
        if (text == null || text.isBlank()) return "";
        text = text.trim();
        return Character.toUpperCase(text.charAt(0)) + (text.length() > 1 ? text.substring(1) : "");
    }
}

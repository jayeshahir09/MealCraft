package com.mealplanner.config;

import com.mealplanner.dto.RecipeSuggestionRequest;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Builds a stable, order-independent cache key from a RecipeSuggestionRequest.
 *
 * Ingredients are sorted + lowercased so ["Egg","flour"] and ["flour","egg"]
 * resolve to the same cache entry. Allergies are also sorted for the same reason.
 *
 * Key format:
 *   ing:[a,b,c]|diet:VEGAN|allergy:[nuts]|cuisine:Indian|time:30
 */
@Component("recipeCacheKeyGenerator")
public class RecipeCacheKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        for (Object param : params) {
            if (param instanceof RecipeSuggestionRequest req) {
                return buildKey(req);
            }
        }
        return "default";
    }

    private String buildKey(RecipeSuggestionRequest req) {
        StringBuilder key = new StringBuilder();

        // Sorted, lowercased ingredients
        List<String> ingredients = req.getIngredients() != null
                ? new ArrayList<>(req.getIngredients()) : new ArrayList<>();
        ingredients.replaceAll(s -> s == null ? "" : s.trim().toLowerCase());
        Collections.sort(ingredients);
        key.append("ing:").append(ingredients);

        // Diet type
        key.append("|diet:").append(req.getDietType() != null ? req.getDietType().trim().toUpperCase() : "NONE");

        // Sorted allergies
        List<String> allergies = req.getAllergies() != null
                ? new ArrayList<>(req.getAllergies()) : new ArrayList<>();
        allergies.replaceAll(s -> s == null ? "" : s.trim().toLowerCase());
        Collections.sort(allergies);
        key.append("|allergy:").append(allergies);

        // Cuisine
        key.append("|cuisine:").append(req.getCuisine() != null ? req.getCuisine().trim().toLowerCase() : "");

        // Max time
        key.append("|time:").append(req.getMaxTimeMinutes() != null ? req.getMaxTimeMinutes() : "any");

        return key.toString();
    }
}

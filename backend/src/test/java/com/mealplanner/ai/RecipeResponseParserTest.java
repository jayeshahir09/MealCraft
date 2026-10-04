package com.mealplanner.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.exception.AIServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecipeResponseParserTest {

    private RecipeResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new RecipeResponseParser(new ObjectMapper());
    }

    @Test
    @DisplayName("Should successfully parse a clean JSON array response")
    void testParseCleanJson() {
        String json = """
            [
              {
                "title": "Garlic Butter Pasta",
                "cuisine": "Italian",
                "estimatedTimeMinutes": 20,
                "estimatedCalories": 450,
                "usedIngredients": ["Garlic", "Butter", "Pasta"],
                "missingIngredients": [
                  {"name": "Parmesan", "quantity": "50", "unit": "g"}
                ],
                "steps": ["Boil pasta", "Melt butter with garlic", "Toss together"]
              }
            ]
            """;

        List<AiRecipeDTO> recipes = parser.parse(json);
        assertNotNull(recipes);
        assertEquals(1, recipes.size());

        AiRecipeDTO recipe = recipes.getFirst();
        assertEquals("Garlic Butter Pasta", recipe.getTitle());
        assertEquals("Italian", recipe.getCuisine());
        assertEquals(20, recipe.getEstimatedTimeMinutes());
        assertEquals(450, recipe.getEstimatedCalories());
        assertEquals(3, recipe.getUsedIngredients().size());
        assertEquals(1, recipe.getMissingIngredients().size());
        assertEquals(3, recipe.getSteps().size());
    }

    @Test
    @DisplayName("Should strip markdown code fences and extract valid JSON")
    void testParseMarkdownFencedJson() {
        String response = """
            Here are your recipe suggestions:
            ```json
            [
              {
                "title": "Tomato Basil Soup",
                "cuisine": "Mediterranean",
                "estimatedTimeMinutes": 25,
                "steps": ["Blend tomatoes", "Simmer with basil"]
              }
            ]
            ```
            Hope you enjoy cooking!
            """;

        List<AiRecipeDTO> recipes = parser.parse(response);
        assertNotNull(recipes);
        assertEquals(1, recipes.size());
        assertEquals("Tomato Basil Soup", recipes.getFirst().getTitle());
    }

    @Test
    @DisplayName("Should repair truncated JSON arrays where LLM stopped mid-object")
    void testParseTruncatedJson() {
        String truncated = """
            [
              {
                "title": "Quick Fried Rice",
                "cuisine": "Asian",
                "steps": ["Heat oil", "Stir fry rice and egg"]
              },
              {
                "title": "Incomplete Recipe",
                "cuisine": "Unknown"
            """;

        List<AiRecipeDTO> recipes = parser.parse(truncated);
        assertNotNull(recipes);
        assertEquals(1, recipes.size());
        assertEquals("Quick Fried Rice", recipes.getFirst().getTitle());
    }

    @Test
    @DisplayName("Should throw AIServiceException if JSON array is missing or empty")
    void testParseInvalidJson() {
        assertThrows(AIServiceException.class, () -> parser.parse("Sorry, I cannot suggest recipes."));
        assertThrows(AIServiceException.class, () -> parser.parse("[]"));
        assertThrows(AIServiceException.class, () -> parser.parse(null));
    }

    @Test
    @DisplayName("Should throw AIServiceException if recipe is missing title or steps")
    void testParseMissingRequiredFields() {
        String missingTitle = """
            [
              {
                "cuisine": "Italian",
                "steps": ["Step 1"]
              }
            ]
            """;
        assertThrows(AIServiceException.class, () -> parser.parse(missingTitle));

        String missingSteps = """
            [
              {
                "title": "No Steps Recipe",
                "cuisine": "Italian"
              }
            ]
            """;
        assertThrows(AIServiceException.class, () -> parser.parse(missingSteps));
    }
}

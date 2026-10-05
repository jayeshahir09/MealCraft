package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeDTO;
import com.mealplanner.dto.RecipeSuggestionRequest;
import com.mealplanner.dto.RecipeSuggestionResponse;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.AIRecipeService;
import com.mealplanner.service.RecipeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = RecipeController.class)
@AutoConfigureMockMvc(addFilters = false)
class RecipeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RecipeService recipeService;

    @MockBean
    private AIRecipeService aiRecipeService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/recipes/suggest - returns suggestions")
    void testSuggestRecipes() throws Exception {
        RecipeSuggestionRequest request = RecipeSuggestionRequest.builder()
                .ingredients(List.of("Tomato", "Pasta"))
                .cuisine("Italian")
                .build();

        AiRecipeDTO aiRecipe = AiRecipeDTO.builder()
                .title("Tomato Pasta")
                .cuisine("Italian")
                .estimatedTimeMinutes(20)
                .estimatedCalories(450)
                .usedIngredients(List.of("Tomato", "Pasta"))
                .steps(List.of("Boil pasta", "Mix with tomato"))
                .build();

        RecipeSuggestionResponse response = RecipeSuggestionResponse.builder()
                .recipes(List.of(aiRecipe))
                .remainingCallsToday(9)
                .build();

        when(aiRecipeService.suggestRecipes(eq("chef@example.com"), any(RecipeSuggestionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/recipes/suggest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipes[0].title").value("Tomato Pasta"))
                .andExpect(jsonPath("$.remainingCallsToday").value(9));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/recipes/ai-credits - returns credit count")
    void testGetAiCredits() throws Exception {
        when(aiRecipeService.getAiCredits("chef@example.com"))
                .thenReturn(Map.of("creditsRemaining", 8, "dailyLimit", 10));

        mockMvc.perform(get("/api/recipes/ai-credits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creditsRemaining").value(8))
                .andExpect(jsonPath("$.dailyLimit").value(10));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/recipes - returns list of saved recipes")
    void testGetSavedRecipes() throws Exception {
        RecipeDTO recipe1 = RecipeDTO.builder()
                .id(1L)
                .title("Garlic Bread")
                .cuisine("Italian")
                .build();

        when(recipeService.getSavedRecipes(eq("chef@example.com"), isNull(), isNull()))
                .thenReturn(List.of(recipe1));

        mockMvc.perform(get("/api/recipes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Garlic Bread"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/recipes/{id} - returns recipe by ID")
    void testGetRecipeById() throws Exception {
        RecipeDTO recipe = RecipeDTO.builder()
                .id(5L)
                .title("Vegetable Stir Fry")
                .cuisine("Asian")
                .build();

        when(recipeService.getRecipeById("chef@example.com", 5L)).thenReturn(recipe);

        mockMvc.perform(get("/api/recipes/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.title").value("Vegetable Stir Fry"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/recipes - saves recipe and returns 200")
    void testSaveRecipe() throws Exception {
        AiRecipeDTO input = AiRecipeDTO.builder()
                .title("Avocado Toast")
                .cuisine("American")
                .build();

        RecipeDTO saved = RecipeDTO.builder()
                .id(10L)
                .title("Avocado Toast")
                .cuisine("American")
                .build();

        when(recipeService.saveRecipe(eq("chef@example.com"), any(AiRecipeDTO.class))).thenReturn(saved);

        mockMvc.perform(post("/api/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.title").value("Avocado Toast"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("DELETE /api/recipes/{id} - returns 204 No Content")
    void testDeleteRecipe() throws Exception {
        doNothing().when(recipeService).deleteRecipe("chef@example.com", 12L);

        mockMvc.perform(delete("/api/recipes/12"))
                .andExpect(status().isNoContent());

        verify(recipeService, times(1)).deleteRecipe("chef@example.com", 12L);
    }
}

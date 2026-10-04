package com.mealplanner.controller;

import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeDTO;
import com.mealplanner.dto.RecipeSuggestionRequest;
import com.mealplanner.dto.RecipeSuggestionResponse;
import com.mealplanner.service.AIRecipeService;
import com.mealplanner.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;
    private final AIRecipeService aiRecipeService;

    @PostMapping("/suggest")
    public ResponseEntity<RecipeSuggestionResponse> suggestRecipes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RecipeSuggestionRequest request) {
        return ResponseEntity.ok(aiRecipeService.suggestRecipes(userDetails.getUsername(), request));
    }

    @GetMapping("/ai-credits")
    public ResponseEntity<java.util.Map<String, Object>> getAiCredits(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(aiRecipeService.getAiCredits(userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<RecipeDTO>> getSavedRecipes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(recipeService.getSavedRecipes(userDetails.getUsername(), cuisine, query));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecipeDTO> getRecipe(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(recipeService.getRecipeById(userDetails.getUsername(), id));
    }

    @PostMapping
    public ResponseEntity<RecipeDTO> saveRecipe(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AiRecipeDTO recipe) {
        return ResponseEntity.ok(recipeService.saveRecipe(userDetails.getUsername(), recipe));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipe(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        recipeService.deleteRecipe(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}

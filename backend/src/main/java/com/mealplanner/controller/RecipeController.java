package com.mealplanner.controller;

import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeDTO;
import com.mealplanner.dto.RecipeSuggestionRequest;
import com.mealplanner.dto.RecipeSuggestionResponse;
import com.mealplanner.service.AIRecipeService;
import com.mealplanner.service.RecipeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeService recipeService;
    private final AIRecipeService aiRecipeService;

    public RecipeController(RecipeService recipeService, AIRecipeService aiRecipeService) {
        this.recipeService = recipeService;
        this.aiRecipeService = aiRecipeService;
    }

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
    public ResponseEntity<Page<RecipeDTO>> getSavedRecipes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(recipeService.getSavedRecipes(userDetails.getUsername(), cuisine, query, pageable));
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

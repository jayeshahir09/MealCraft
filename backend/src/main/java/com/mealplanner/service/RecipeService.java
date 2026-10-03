package com.mealplanner.service;

import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeDTO;
import com.mealplanner.entity.Recipe;
import com.mealplanner.entity.User;
import com.mealplanner.repository.RecipeRepository;
import com.mealplanner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;

    public List<RecipeDTO> getSavedRecipes(String email, String cuisine, String query) {
        User user = getUser(email);
        List<Recipe> recipes;
        if (query != null && !query.isBlank()) {
            recipes = recipeRepository.searchByTitle(user.getId(), query);
        } else if (cuisine != null && !cuisine.isBlank()) {
            recipes = recipeRepository.findByUserIdAndCuisine(user.getId(), cuisine);
        } else {
            recipes = recipeRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        }
        return recipes.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public RecipeDTO saveRecipe(String email, AiRecipeDTO aiRecipe) {
        User user = getUser(email);
        String recipeTitle = aiRecipe.getTitle() != null ? aiRecipe.getTitle().trim() : "";

        // Build full ingredient list from usedIngredients + missingIngredients
        List<Recipe.IngredientItem> ingredients = aiRecipe.getUsedIngredients() != null
                ? aiRecipe.getUsedIngredients().stream()
                    .map(name -> new Recipe.IngredientItem(name, null, null))
                    .collect(Collectors.toList())
                : new java.util.ArrayList<>();

        if (aiRecipe.getMissingIngredients() != null) {
            aiRecipe.getMissingIngredients().forEach(mi ->
                ingredients.add(new Recipe.IngredientItem(mi.getName(), mi.getQuantity(), mi.getUnit())));
        }

        // Check if recipe with identical title already exists for this user (ensure unique collection)
        Optional<Recipe> existingOpt = recipeRepository.findByUserIdAndTitleIgnoreCase(user.getId(), recipeTitle);
        if (existingOpt.isPresent()) {
            Recipe existing = existingOpt.get();
            existing.setIngredients(ingredients);
            existing.setSteps(aiRecipe.getSteps());
            existing.setCuisine(aiRecipe.getCuisine());
            existing.setEstimatedTimeMinutes(aiRecipe.getEstimatedTimeMinutes());
            existing.setEstimatedCalories(aiRecipe.getEstimatedCalories());
            return toDTO(recipeRepository.save(existing));
        }

        Recipe recipe = Recipe.builder()
                .user(user)
                .title(recipeTitle)
                .ingredients(ingredients)
                .steps(aiRecipe.getSteps())
                .cuisine(aiRecipe.getCuisine())
                .estimatedTimeMinutes(aiRecipe.getEstimatedTimeMinutes())
                .estimatedCalories(aiRecipe.getEstimatedCalories())
                .source(Recipe.RecipeSource.AI_GENERATED)
                .tags(new String[]{})
                .build();

        return toDTO(recipeRepository.save(recipe));
    }

    @Transactional
    public void deleteRecipe(String email, Long recipeId) {
        User user = getUser(email);
        Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        recipeRepository.delete(recipe);
    }

    public RecipeDTO getRecipeById(String email, Long recipeId) {
        User user = getUser(email);
        Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        return toDTO(recipe);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public RecipeDTO toDTO(Recipe recipe) {
        return RecipeDTO.builder()
                .id(recipe.getId())
                .title(recipe.getTitle())
                .ingredients(recipe.getIngredients())
                .steps(recipe.getSteps())
                .cuisine(recipe.getCuisine())
                .estimatedTimeMinutes(recipe.getEstimatedTimeMinutes())
                .estimatedCalories(recipe.getEstimatedCalories())
                .source(recipe.getSource() != null ? recipe.getSource().name() : null)
                .tags(recipe.getTags())
                .createdAt(recipe.getCreatedAt())
                .build();
    }
}

package com.mealplanner.service;

import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeDTO;
import com.mealplanner.entity.Recipe;
import com.mealplanner.entity.User;
import com.mealplanner.repository.RecipeRepository;
import com.mealplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RecipeService recipeService;

    private User testUser;
    private Recipe testRecipe;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();

        testRecipe = Recipe.builder()
                .id(10L)
                .user(testUser)
                .title("Spaghetti Bolognese")
                .cuisine("Italian")
                .estimatedTimeMinutes(30)
                .estimatedCalories(600)
                .source(Recipe.RecipeSource.AI_GENERATED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getSavedRecipes - retrieves all user recipes sorted by creation date")
    void testGetSavedRecipesAll() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(testRecipe));

        List<RecipeDTO> results = recipeService.getSavedRecipes("john@example.com", null, null);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("Spaghetti Bolognese", results.get(0).getTitle());
    }

    @Test
    @DisplayName("getSavedRecipes - searches recipes by query")
    void testGetSavedRecipesWithQuery() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.searchByTitle(1L, "spaghetti")).thenReturn(List.of(testRecipe));

        List<RecipeDTO> results = recipeService.getSavedRecipes("john@example.com", null, "spaghetti");

        assertEquals(1, results.size());
        verify(recipeRepository).searchByTitle(1L, "spaghetti");
    }

    @Test
    @DisplayName("getSavedRecipes - filters recipes by cuisine")
    void testGetSavedRecipesWithCuisine() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByUserIdAndCuisine(1L, "Italian")).thenReturn(List.of(testRecipe));

        List<RecipeDTO> results = recipeService.getSavedRecipes("john@example.com", "Italian", null);

        assertEquals(1, results.size());
        verify(recipeRepository).findByUserIdAndCuisine(1L, "Italian");
    }

    @Test
    @DisplayName("getRecipeById - returns recipe when found")
    void testGetRecipeByIdSuccess() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testRecipe));

        RecipeDTO dto = recipeService.getRecipeById("john@example.com", 10L);

        assertNotNull(dto);
        assertEquals(10L, dto.getId());
        assertEquals("Spaghetti Bolognese", dto.getTitle());
    }

    @Test
    @DisplayName("getRecipeById - throws exception when not found")
    void testGetRecipeByIdNotFound() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> recipeService.getRecipeById("john@example.com", 99L));
    }

    @Test
    @DisplayName("saveRecipe - saves new recipe successfully")
    void testSaveRecipeNew() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByUserIdAndTitleIgnoreCase(1L, "Margherita Pizza")).thenReturn(Optional.empty());

        AiRecipeDTO aiRecipe = AiRecipeDTO.builder()
                .title("Margherita Pizza")
                .cuisine("Italian")
                .estimatedTimeMinutes(25)
                .estimatedCalories(500)
                .usedIngredients(List.of("Dough", "Tomato Sauce", "Cheese"))
                .steps(List.of("Bake in oven"))
                .build();

        when(recipeRepository.save(any(Recipe.class))).thenAnswer(i -> {
            Recipe r = i.getArgument(0);
            r.setId(20L);
            return r;
        });

        RecipeDTO saved = recipeService.saveRecipe("john@example.com", aiRecipe);

        assertNotNull(saved);
        assertEquals(20L, saved.getId());
        assertEquals("Margherita Pizza", saved.getTitle());
        assertEquals(3, saved.getIngredients().size());
    }

    @Test
    @DisplayName("deleteRecipe - deletes recipe when found")
    void testDeleteRecipeSuccess() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testRecipe));

        assertDoesNotThrow(() -> recipeService.deleteRecipe("john@example.com", 10L));
        verify(recipeRepository).delete(testRecipe);
    }
}

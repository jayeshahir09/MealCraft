package com.mealplanner.service;

import com.mealplanner.entity.CookingHistory;
import com.mealplanner.entity.Recipe;
import com.mealplanner.entity.User;
import com.mealplanner.repository.CookingHistoryRepository;
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
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private CookingHistoryRepository cookingHistoryRepository;

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

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
                .title("Chicken Tikka Masala")
                .cuisine("Indian")
                .build();
    }

    @Test
    @DisplayName("logCookedRecipe - saves cooking history record")
    void testLogCookedRecipe() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(recipeRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testRecipe));

        CookingHistory history = CookingHistory.builder()
                .id(99L)
                .user(testUser)
                .recipe(testRecipe)
                .notes("Tasted fantastic")
                .cookedAt(LocalDateTime.now())
                .build();

        when(cookingHistoryRepository.save(any(CookingHistory.class))).thenReturn(history);

        Map<String, Object> result = analyticsService.logCookedRecipe("john@example.com", 10L, "Tasted fantastic");

        assertNotNull(result);
        assertEquals(99L, result.get("id"));
        assertNotNull(result.get("cookedAt"));
    }

    @Test
    @DisplayName("getAnalytics - calculates summary, weekly calories, and top cuisines")
    void testGetAnalytics() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        CookingHistory history = CookingHistory.builder()
                .id(1L)
                .user(testUser)
                .recipe(testRecipe)
                .cookedAt(LocalDateTime.now())
                .notes("Good")
                .build();

        when(cookingHistoryRepository.findByUserIdOrderByCookedAtDesc(1L)).thenReturn(List.of(history));
        when(cookingHistoryRepository.findTopCuisines(1L)).thenReturn(List.<Object[]>of(new Object[]{"Indian", 5L}));
        when(cookingHistoryRepository.sumCaloriesThisWeek(eq(1L), any(LocalDateTime.class))).thenReturn(2500L);

        Map<String, Object> analytics = analyticsService.getAnalytics("john@example.com");

        assertNotNull(analytics);
        assertEquals(1, analytics.get("totalCookedRecipes"));
        assertEquals(2500L, analytics.get("weeklyCalories"));
        assertTrue(analytics.containsKey("topCuisines"));
        assertTrue(analytics.containsKey("recentHistory"));
    }
}

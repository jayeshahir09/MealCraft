package com.mealplanner.service;

import com.mealplanner.entity.CookingHistory;
import com.mealplanner.entity.Recipe;
import com.mealplanner.entity.User;
import com.mealplanner.repository.CookingHistoryRepository;
import com.mealplanner.repository.RecipeRepository;
import com.mealplanner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final CookingHistoryRepository cookingHistoryRepository;
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;

    @Transactional
    public Map<String, Object> logCookedRecipe(String email, Long recipeId, String notes) {
        User user = getUser(email);
        Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));

        CookingHistory history = CookingHistory.builder()
                .user(user)
                .recipe(recipe)
                .notes(notes)
                .build();

        CookingHistory saved = cookingHistoryRepository.save(history);
        return Map.of("id", saved.getId(), "cookedAt", saved.getCookedAt().toString());
    }

    public Map<String, Object> getAnalytics(String email) {
        User user = getUser(email);

        List<CookingHistory> history = cookingHistoryRepository.findByUserIdOrderByCookedAtDesc(user.getId());

        // Top cuisines
        List<Object[]> topCuisines = cookingHistoryRepository.findTopCuisines(user.getId());
        List<Map<String, Object>> cuisineStats = topCuisines.stream()
                .limit(5)
                .map(row -> Map.<String, Object>of("cuisine", row[0] != null ? row[0] : "Unknown", "count", row[1]))
                .collect(Collectors.toList());

        // Weekly calories
        LocalDateTime weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY).atStartOfDay();
        Long weeklyCalories = cookingHistoryRepository.sumCaloriesThisWeek(user.getId(), weekStart);

        // Recent history (last 10)
        List<Map<String, Object>> recentHistory = history.stream()
                .limit(10)
                .map(h -> Map.<String, Object>of(
                        "id", h.getId(),
                        "recipeId", h.getRecipe().getId(),
                        "recipeTitle", h.getRecipe().getTitle(),
                        "cuisine", h.getRecipe().getCuisine() != null ? h.getRecipe().getCuisine() : "",
                        "cookedAt", h.getCookedAt().toString(),
                        "notes", h.getNotes() != null ? h.getNotes() : ""
                ))
                .collect(Collectors.toList());

        return Map.of(
                "totalCookedRecipes", history.size(),
                "topCuisines", cuisineStats,
                "weeklyCalories", weeklyCalories != null ? weeklyCalories : 0,
                "recentHistory", recentHistory
        );
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}

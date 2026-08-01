package com.mealplanner.service;

import com.mealplanner.dto.MealPlanDTO;
import com.mealplanner.entity.*;
import com.mealplanner.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanEntryRepository mealPlanEntryRepository;
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;

    public MealPlanDTO getMealPlan(String email, LocalDate weekStart) {
        User user = getUser(email);
        MealPlan plan = mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElse(MealPlan.builder().weekStartDate(weekStart).build());
        return toDTO(plan);
    }

    @Transactional
    public MealPlanDTO assignRecipeToSlot(String email, LocalDate weekStart,
                                           String dayOfWeek, String mealType, Long recipeId) {
        User user = getUser(email);

        MealPlan plan = mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElseGet(() -> {
                    MealPlan newPlan = MealPlan.builder().user(user).weekStartDate(weekStart).build();
                    return mealPlanRepository.save(newPlan);
                });

        Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));

        MealPlanEntry.DayOfWeek day = MealPlanEntry.DayOfWeek.valueOf(dayOfWeek.toUpperCase());
        MealPlanEntry.MealType type = MealPlanEntry.MealType.valueOf(mealType.toUpperCase());

        // Remove existing entry for this slot if exists
        plan.getEntries().removeIf(e -> e.getDayOfWeek() == day && e.getMealType() == type);

        MealPlanEntry entry = MealPlanEntry.builder()
                .mealPlan(plan)
                .recipe(recipe)
                .dayOfWeek(day)
                .mealType(type)
                .build();

        plan.getEntries().add(entry);
        return toDTO(mealPlanRepository.save(plan));
    }

    @Transactional
    public MealPlanDTO removeRecipeFromSlot(String email, LocalDate weekStart,
                                             String dayOfWeek, String mealType) {
        User user = getUser(email);
        MealPlan plan = mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElseThrow(() -> new IllegalArgumentException("Meal plan not found"));

        MealPlanEntry.DayOfWeek day = MealPlanEntry.DayOfWeek.valueOf(dayOfWeek.toUpperCase());
        MealPlanEntry.MealType type = MealPlanEntry.MealType.valueOf(mealType.toUpperCase());

        plan.getEntries().removeIf(e -> e.getDayOfWeek() == day && e.getMealType() == type);
        return toDTO(mealPlanRepository.save(plan));
    }

    @Transactional
    public void clearWeek(String email, LocalDate weekStart) {
        User user = getUser(email);
        mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .ifPresent(plan -> {
                    plan.getEntries().clear();
                    mealPlanRepository.save(plan);
                });
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public MealPlanDTO toDTO(MealPlan plan) {
        List<MealPlanDTO.MealPlanEntryDTO> entries = plan.getEntries() == null ? List.of() :
                plan.getEntries().stream()
                        .map(e -> MealPlanDTO.MealPlanEntryDTO.builder()
                                .id(e.getId())
                                .recipeId(e.getRecipe().getId())
                                .recipeTitle(e.getRecipe().getTitle())
                                .estimatedCalories(e.getRecipe().getEstimatedCalories())
                                .dayOfWeek(e.getDayOfWeek().name())
                                .mealType(e.getMealType().name())
                                .build())
                        .collect(Collectors.toList());

        return MealPlanDTO.builder()
                .id(plan.getId())
                .weekStartDate(plan.getWeekStartDate())
                .entries(entries)
                .build();
    }
}

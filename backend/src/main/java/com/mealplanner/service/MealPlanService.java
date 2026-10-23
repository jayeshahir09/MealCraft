package com.mealplanner.service;

import com.mealplanner.dto.MealPlanDTO;
import com.mealplanner.entity.*;
import com.mealplanner.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanEntryRepository mealPlanEntryRepository;
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final PantryService pantryService;
    private final CookingHistoryRepository cookingHistoryRepository;

    public MealPlanService(MealPlanRepository mealPlanRepository,
                           MealPlanEntryRepository mealPlanEntryRepository,
                           RecipeRepository recipeRepository,
                           UserRepository userRepository,
                           PantryService pantryService,
                           CookingHistoryRepository cookingHistoryRepository) {
        this.mealPlanRepository = mealPlanRepository;
        this.mealPlanEntryRepository = mealPlanEntryRepository;
        this.recipeRepository = recipeRepository;
        this.userRepository = userRepository;
        this.pantryService = pantryService;
        this.cookingHistoryRepository = cookingHistoryRepository;
    }

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
    public MealPlanDTO toggleSlotCooked(String email, LocalDate weekStart,
                                        String dayOfWeek, String mealType, Boolean cooked) {
        User user = getUser(email);
        MealPlan plan = mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElseThrow(() -> new IllegalArgumentException("Meal plan not found"));

        MealPlanEntry.DayOfWeek day = MealPlanEntry.DayOfWeek.valueOf(dayOfWeek.toUpperCase());
        MealPlanEntry.MealType type = MealPlanEntry.MealType.valueOf(mealType.toUpperCase());

        MealPlanEntry entry = plan.getEntries().stream()
                .filter(e -> e.getDayOfWeek() == day && e.getMealType() == type)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Meal slot not found"));

        boolean targetCooked = (cooked != null) ? cooked : !entry.isCooked();

        if (targetCooked && !entry.isCooked()) {
            entry.setCooked(true);
            entry.setCookedAt(java.time.LocalDateTime.now());
            // Deduct recipe ingredients from pantry
            pantryService.deductRecipeIngredients(user.getId(), entry.getRecipe());
            // Log to cooking history
            cookingHistoryRepository.save(CookingHistory.builder()
                    .user(user)
                    .recipe(entry.getRecipe())
                    .notes("Cooked from meal plan (" + day + " " + type + ")")
                    .build());
        } else if (!targetCooked && entry.isCooked()) {
            entry.setCooked(false);
            entry.setCookedAt(null);
        }

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
                        .map(e -> {
                            Recipe r = e.getRecipe();
                            return MealPlanDTO.MealPlanEntryDTO.builder()
                                     .id(e.getId())
                                     .recipeId(r != null ? r.getId() : null)
                                     .recipeTitle(r != null ? r.getTitle() : null)
                                     .estimatedCalories(r != null ? r.getEstimatedCalories() : null)
                                     .estimatedTimeMinutes(r != null ? r.getEstimatedTimeMinutes() : null)
                                     .cuisine(r != null ? r.getCuisine() : null)
                                     .ingredients(r != null ? r.getIngredients() : null)
                                     .steps(r != null ? r.getSteps() : null)
                                     .dayOfWeek(e.getDayOfWeek().name())
                                     .mealType(e.getMealType().name())
                                     .isCooked(e.isCooked())
                                     .cookedAt(e.getCookedAt())
                                     .build();
                        })
                        .collect(Collectors.toList());

        return MealPlanDTO.builder()
                .id(plan.getId())
                .weekStartDate(plan.getWeekStartDate())
                .entries(entries)
                .build();
    }
}

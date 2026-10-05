package com.mealplanner.service;

import com.mealplanner.dto.MealPlanDTO;
import com.mealplanner.entity.MealPlan;
import com.mealplanner.entity.MealPlanEntry;
import com.mealplanner.entity.Recipe;
import com.mealplanner.entity.User;
import com.mealplanner.repository.MealPlanRepository;
import com.mealplanner.repository.RecipeRepository;
import com.mealplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MealPlanServiceTest {

    @Mock
    private MealPlanRepository mealPlanRepository;

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MealPlanService mealPlanService;

    private User testUser;
    private Recipe testRecipe;
    private LocalDate weekStart;

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
                .title("Avocado Salad")
                .build();

        weekStart = LocalDate.of(2026, 10, 5);
    }

    @Test
    @DisplayName("getMealPlan - returns existing meal plan")
    void testGetMealPlanExisting() {
        MealPlan plan = MealPlan.builder()
                .id(5L)
                .user(testUser)
                .weekStartDate(weekStart)
                .entries(new ArrayList<>())
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByUserIdAndWeekStartDate(1L, weekStart)).thenReturn(Optional.of(plan));

        MealPlanDTO dto = mealPlanService.getMealPlan("john@example.com", weekStart);

        assertNotNull(dto);
        assertEquals(5L, dto.getId());
        assertEquals(weekStart, dto.getWeekStartDate());
    }

    @Test
    @DisplayName("assignRecipeToSlot - assigns recipe to slot and returns updated plan")
    void testAssignRecipeToSlot() {
        MealPlan plan = MealPlan.builder()
                .id(5L)
                .user(testUser)
                .weekStartDate(weekStart)
                .entries(new ArrayList<>())
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByUserIdAndWeekStartDate(1L, weekStart)).thenReturn(Optional.of(plan));
        when(recipeRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testRecipe));
        when(mealPlanRepository.save(any(MealPlan.class))).thenAnswer(i -> i.getArgument(0));

        MealPlanDTO dto = mealPlanService.assignRecipeToSlot("john@example.com", weekStart, "MON", "DINNER", 10L);

        assertNotNull(dto);
        assertEquals(1, dto.getEntries().size());
        assertEquals("MON", dto.getEntries().get(0).getDayOfWeek());
        assertEquals("DINNER", dto.getEntries().get(0).getMealType());
        assertEquals("Avocado Salad", dto.getEntries().get(0).getRecipeTitle());
    }

    @Test
    @DisplayName("removeRecipeFromSlot - removes specific entry from plan")
    void testRemoveRecipeFromSlot() {
        MealPlan plan = MealPlan.builder()
                .id(5L)
                .user(testUser)
                .weekStartDate(weekStart)
                .entries(new ArrayList<>())
                .build();

        MealPlanEntry entry = MealPlanEntry.builder()
                .mealPlan(plan)
                .recipe(testRecipe)
                .dayOfWeek(MealPlanEntry.DayOfWeek.MON)
                .mealType(MealPlanEntry.MealType.DINNER)
                .build();
        plan.getEntries().add(entry);

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByUserIdAndWeekStartDate(1L, weekStart)).thenReturn(Optional.of(plan));
        when(mealPlanRepository.save(any(MealPlan.class))).thenAnswer(i -> i.getArgument(0));

        MealPlanDTO dto = mealPlanService.removeRecipeFromSlot("john@example.com", weekStart, "MON", "DINNER");

        assertNotNull(dto);
        assertTrue(dto.getEntries().isEmpty());
    }

    @Test
    @DisplayName("clearWeek - removes all entries from meal plan")
    void testClearWeek() {
        MealPlan plan = MealPlan.builder()
                .id(5L)
                .user(testUser)
                .weekStartDate(weekStart)
                .entries(new ArrayList<>())
                .build();

        plan.getEntries().add(MealPlanEntry.builder().mealPlan(plan).recipe(testRecipe)
                .dayOfWeek(MealPlanEntry.DayOfWeek.TUE).mealType(MealPlanEntry.MealType.LUNCH).build());

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByUserIdAndWeekStartDate(1L, weekStart)).thenReturn(Optional.of(plan));

        mealPlanService.clearWeek("john@example.com", weekStart);

        assertTrue(plan.getEntries().isEmpty());
        verify(mealPlanRepository).save(plan);
    }
}

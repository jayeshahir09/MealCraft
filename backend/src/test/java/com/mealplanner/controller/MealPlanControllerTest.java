package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.MealPlanDTO;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.MealPlanService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = MealPlanController.class)
@AutoConfigureMockMvc(addFilters = false)
class MealPlanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MealPlanService mealPlanService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/mealplans/{weekStart} - returns meal plan")
    void testGetMealPlan() throws Exception {
        LocalDate weekStart = LocalDate.of(2026, 10, 5);
        MealPlanDTO dto = MealPlanDTO.builder()
                .id(1L)
                .weekStartDate(weekStart)
                .entries(List.of(
                        MealPlanDTO.MealPlanEntryDTO.builder()
                                .id(10L)
                                .recipeId(100L)
                                .recipeTitle("Oatmeal")
                                .dayOfWeek("MON")
                                .mealType("BREAKFAST")
                                .build()
                ))
                .build();

        when(mealPlanService.getMealPlan("chef@example.com", weekStart)).thenReturn(dto);

        mockMvc.perform(get("/api/mealplans/2026-10-05"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.entries[0].recipeTitle").value("Oatmeal"))
                .andExpect(jsonPath("$.entries[0].dayOfWeek").value("MON"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/mealplans/{weekStart}/assign - assigns recipe to slot")
    void testAssignRecipe() throws Exception {
        LocalDate weekStart = LocalDate.of(2026, 10, 5);
        Map<String, Object> payload = Map.of(
                "dayOfWeek", "MON",
                "mealType", "DINNER",
                "recipeId", 42L
        );

        MealPlanDTO dto = MealPlanDTO.builder()
                .id(1L)
                .weekStartDate(weekStart)
                .entries(List.of(
                        MealPlanDTO.MealPlanEntryDTO.builder()
                                .recipeId(42L)
                                .recipeTitle("Salmon Bowl")
                                .dayOfWeek("MON")
                                .mealType("DINNER")
                                .build()
                ))
                .build();

        when(mealPlanService.assignRecipeToSlot(eq("chef@example.com"), eq(weekStart), eq("MON"), eq("DINNER"), eq(42L)))
                .thenReturn(dto);

        mockMvc.perform(post("/api/mealplans/2026-10-05/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].recipeId").value(42));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("DELETE /api/mealplans/{weekStart}/slot - removes slot")
    void testRemoveFromSlot() throws Exception {
        LocalDate weekStart = LocalDate.of(2026, 10, 5);
        MealPlanDTO dto = MealPlanDTO.builder()
                .id(1L)
                .weekStartDate(weekStart)
                .entries(List.of())
                .build();

        when(mealPlanService.removeRecipeFromSlot("chef@example.com", weekStart, "MON", "DINNER"))
                .thenReturn(dto);

        mockMvc.perform(delete("/api/mealplans/2026-10-05/slot")
                        .param("dayOfWeek", "MON")
                        .param("mealType", "DINNER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries").isEmpty());
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("DELETE /api/mealplans/{weekStart}/clear - clears entire week")
    void testClearWeek() throws Exception {
        LocalDate weekStart = LocalDate.of(2026, 10, 5);
        doNothing().when(mealPlanService).clearWeek("chef@example.com", weekStart);

        mockMvc.perform(delete("/api/mealplans/2026-10-05/clear"))
                .andExpect(status().isNoContent());

        verify(mealPlanService, times(1)).clearWeek("chef@example.com", weekStart);
    }
}

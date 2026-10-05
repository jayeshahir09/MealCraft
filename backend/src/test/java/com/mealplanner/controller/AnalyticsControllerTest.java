package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.AnalyticsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AnalyticsController.class)
@AutoConfigureMockMvc(addFilters = false)
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AnalyticsService analyticsService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/analytics - returns statistics summary")
    void testGetAnalytics() throws Exception {
        Map<String, Object> analyticsData = Map.of(
                "totalCookedRecipes", 15,
                "weeklyCalories", 4200L,
                "topCuisines", List.of(Map.of("cuisine", "Italian", "count", 5)),
                "recentHistory", List.of()
        );

        when(analyticsService.getAnalytics("chef@example.com")).thenReturn(analyticsData);

        mockMvc.perform(get("/api/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCookedRecipes").value(15))
                .andExpect(jsonPath("$.weeklyCalories").value(4200))
                .andExpect(jsonPath("$.topCuisines[0].cuisine").value("Italian"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/analytics/log/{recipeId} - logs cooked recipe with notes")
    void testLogCookedRecipe() throws Exception {
        Map<String, Object> logResult = Map.of(
                "id", 101L,
                "cookedAt", "2026-10-05T12:00:00"
        );

        when(analyticsService.logCookedRecipe("chef@example.com", 5L, "Delicious!"))
                .thenReturn(logResult);

        mockMvc.perform(post("/api/analytics/log/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("notes", "Delicious!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.cookedAt").value("2026-10-05T12:00:00"));
    }
}

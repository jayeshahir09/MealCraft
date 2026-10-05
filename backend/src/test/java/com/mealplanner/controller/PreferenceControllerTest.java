package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.PreferenceDTO;
import com.mealplanner.entity.UserPreference.DietType;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.PreferenceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PreferenceController.class)
@AutoConfigureMockMvc(addFilters = false)
class PreferenceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PreferenceService preferenceService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/preferences - returns user preferences")
    void testGetPreferences() throws Exception {
        PreferenceDTO dto = PreferenceDTO.builder()
                .dietType(DietType.VEGETARIAN)
                .allergies(new String[]{"Peanuts", "Gluten"})
                .preferredCuisine("Mediterranean")
                .maxCookTimeMinutes(30)
                .build();

        when(preferenceService.getPreferences("chef@example.com")).thenReturn(dto);

        mockMvc.perform(get("/api/preferences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dietType").value("VEGETARIAN"))
                .andExpect(jsonPath("$.preferredCuisine").value("Mediterranean"))
                .andExpect(jsonPath("$.maxCookTimeMinutes").value(30))
                .andExpect(jsonPath("$.allergies[0]").value("Peanuts"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("PUT /api/preferences - updates user preferences")
    void testUpdatePreferences() throws Exception {
        PreferenceDTO input = PreferenceDTO.builder()
                .dietType(DietType.VEGAN)
                .allergies(new String[]{"Soy"})
                .preferredCuisine("Mexican")
                .maxCookTimeMinutes(45)
                .build();

        when(preferenceService.updatePreferences(eq("chef@example.com"), any(PreferenceDTO.class)))
                .thenReturn(input);

        mockMvc.perform(put("/api/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dietType").value("VEGAN"))
                .andExpect(jsonPath("$.preferredCuisine").value("Mexican"))
                .andExpect(jsonPath("$.maxCookTimeMinutes").value(45));
    }
}

package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.PantryItemDTO;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.PantryService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PantryController.class)
@AutoConfigureMockMvc(addFilters = false)
class PantryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PantryService pantryService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/pantry - returns list of pantry items")
    void testGetPantry() throws Exception {
        PantryItemDTO item = PantryItemDTO.builder()
                .id(1L)
                .ingredientName("Olive Oil")
                .quantity("500")
                .unit("ml")
                .build();

        when(pantryService.getPantryItems("chef@example.com")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/pantry"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ingredientName").value("Olive Oil"))
                .andExpect(jsonPath("$[0].quantity").value("500"))
                .andExpect(jsonPath("$[0].unit").value("ml"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/pantry - adds item and returns created item")
    void testAddItem() throws Exception {
        PantryItemDTO input = PantryItemDTO.builder()
                .ingredientName("Garlic")
                .quantity("3")
                .unit("cloves")
                .build();

        PantryItemDTO output = PantryItemDTO.builder()
                .id(10L)
                .ingredientName("garlic")
                .quantity("3")
                .unit("cloves")
                .build();

        when(pantryService.addPantryItem(eq("chef@example.com"), any(PantryItemDTO.class))).thenReturn(output);

        mockMvc.perform(post("/api/pantry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.ingredientName").value("garlic"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("DELETE /api/pantry/{id} - deletes single item")
    void testDeleteItem() throws Exception {
        doNothing().when(pantryService).deletePantryItem("chef@example.com", 5L);

        mockMvc.perform(delete("/api/pantry/5"))
                .andExpect(status().isNoContent());

        verify(pantryService, times(1)).deletePantryItem("chef@example.com", 5L);
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("DELETE /api/pantry - clears all items in pantry")
    void testClearPantry() throws Exception {
        doNothing().when(pantryService).clearPantry("chef@example.com");

        mockMvc.perform(delete("/api/pantry"))
                .andExpect(status().isNoContent());

        verify(pantryService, times(1)).clearPantry("chef@example.com");
    }
}

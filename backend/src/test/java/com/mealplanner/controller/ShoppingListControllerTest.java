package com.mealplanner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.security.JwtAuthFilter;
import com.mealplanner.security.JwtUtil;
import com.mealplanner.security.UserDetailsServiceImpl;
import com.mealplanner.service.ShoppingListService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ShoppingListController.class)
@AutoConfigureMockMvc(addFilters = false)
class ShoppingListControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ShoppingListService shoppingListService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/shopping-list/generate/{mealPlanId} - generates list")
    void testGenerateShoppingList() throws Exception {
        ShoppingListDTO dto = ShoppingListDTO.builder()
                .id(1L)
                .mealPlanId(10L)
                .generatedAt(LocalDateTime.now())
                .items(List.of(
                        ShoppingListDTO.ShoppingListItemDTO.builder()
                                .id(100L)
                                .ingredientName("Milk")
                                .quantity("1")
                                .unit("liter")
                                .isChecked(false)
                                .build()
                ))
                .build();

        when(shoppingListService.generateShoppingList("chef@example.com", 10L)).thenReturn(dto);

        mockMvc.perform(post("/api/shopping-list/generate/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.items[0].ingredientName").value("Milk"));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/shopping-list/plan/{mealPlanId} - gets shopping list by plan ID")
    void testGetShoppingListByMealPlan() throws Exception {
        ShoppingListDTO dto = ShoppingListDTO.builder()
                .id(1L)
                .mealPlanId(10L)
                .items(List.of())
                .build();

        when(shoppingListService.getShoppingListByMealPlan("chef@example.com", 10L)).thenReturn(dto);

        mockMvc.perform(get("/api/shopping-list/plan/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.mealPlanId").value(10));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("GET /api/shopping-list/{id} - gets list by id")
    void testGetShoppingList() throws Exception {
        ShoppingListDTO dto = ShoppingListDTO.builder()
                .id(2L)
                .items(List.of())
                .build();

        when(shoppingListService.getShoppingList("chef@example.com", 2L)).thenReturn(dto);

        mockMvc.perform(get("/api/shopping-list/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("PATCH /api/shopping-list/items/{itemId}/toggle - toggles item check state")
    void testToggleItem() throws Exception {
        ShoppingListDTO.ShoppingListItemDTO item = ShoppingListDTO.ShoppingListItemDTO.builder()
                .id(50L)
                .ingredientName("Apples")
                .isChecked(true)
                .build();

        when(shoppingListService.toggleItem("chef@example.com", 50L)).thenReturn(item);

        mockMvc.perform(patch("/api/shopping-list/items/50/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50))
                .andExpect(jsonPath("$.isChecked").value(true));
    }

    @Test
    @WithMockUser(username = "chef@example.com")
    @DisplayName("POST /api/shopping-list/{id}/items - adds manual ingredient item")
    void testAddManualItem() throws Exception {
        ShoppingListDTO dto = ShoppingListDTO.builder()
                .id(1L)
                .items(List.of(
                        ShoppingListDTO.ShoppingListItemDTO.builder()
                                .id(101L)
                                .ingredientName("Honey")
                                .isChecked(false)
                                .build()
                ))
                .build();

        when(shoppingListService.addManualItem("chef@example.com", 1L, "Honey")).thenReturn(dto);

        mockMvc.perform(post("/api/shopping-list/1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("ingredientName", "Honey"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].ingredientName").value("Honey"));
    }
}

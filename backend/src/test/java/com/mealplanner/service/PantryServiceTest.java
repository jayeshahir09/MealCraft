package com.mealplanner.service;

import com.mealplanner.dto.PantryItemDTO;
import com.mealplanner.entity.PantryItem;
import com.mealplanner.entity.User;
import com.mealplanner.repository.PantryRepository;
import com.mealplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PantryServiceTest {

    @Mock
    private PantryRepository pantryRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PantryService pantryService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();
    }

    @Test
    @DisplayName("Should add new pantry item with normalized name")
    void testAddNewPantryItem() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(pantryRepository.findByUserId(1L)).thenReturn(List.of());

        when(pantryRepository.save(any(PantryItem.class))).thenAnswer(invocation -> {
            PantryItem item = invocation.getArgument(0);
            item.setId(10L);
            return item;
        });

        PantryItemDTO input = PantryItemDTO.builder()
                .ingredientName("Tomatoes")
                .quantity("500")
                .unit("g")
                .build();

        PantryItemDTO created = pantryService.addPantryItem("john@example.com", input);

        assertNotNull(created);
        assertEquals(10L, created.getId());
        assertEquals("tomato", created.getIngredientName());
        assertEquals("500", created.getQuantity());
        assertEquals("g", created.getUnit());
    }

    @Test
    @DisplayName("Should upsert existing pantry item when same ingredient is added again")
    void testUpsertExistingPantryItem() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        PantryItem existing = PantryItem.builder()
                .id(5L)
                .user(testUser)
                .ingredientName("tomato")
                .quantity("200")
                .unit("g")
                .build();

        when(pantryRepository.findByUserId(1L)).thenReturn(List.of(existing));
        when(pantryRepository.save(any(PantryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PantryItemDTO updateInput = PantryItemDTO.builder()
                .ingredientName("Tomato") // Same item
                .quantity("1")
                .unit("kg")
                .build();

        PantryItemDTO updated = pantryService.addPantryItem("john@example.com", updateInput);

        assertNotNull(updated);
        assertEquals(5L, updated.getId());
        assertEquals("tomato", updated.getIngredientName());
        assertEquals("1", updated.getQuantity());
        assertEquals("kg", updated.getUnit());
    }

    @Test
    @DisplayName("Should delete pantry item")
    void testDeletePantryItem() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        PantryItem item = PantryItem.builder()
                .id(7L)
                .user(testUser)
                .ingredientName("Garlic")
                .build();

        when(pantryRepository.findByUserIdAndId(1L, 7L)).thenReturn(Optional.of(item));

        assertDoesNotThrow(() -> pantryService.deletePantryItem("john@example.com", 7L));
        verify(pantryRepository, times(1)).delete(item);
    }
}

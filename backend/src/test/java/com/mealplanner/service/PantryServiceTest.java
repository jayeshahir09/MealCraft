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

    @Test
    @DisplayName("deductRecipeIngredients - does nothing when recipe or ingredients are null/empty")
    void testDeductRecipeIngredientsEmptyOrNull() {
        assertDoesNotThrow(() -> pantryService.deductRecipeIngredients(1L, null));

        com.mealplanner.entity.Recipe emptyRecipe = com.mealplanner.entity.Recipe.builder()
                .ingredients(List.of())
                .build();
        assertDoesNotThrow(() -> pantryService.deductRecipeIngredients(1L, emptyRecipe));
        verify(pantryRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("deductRecipeIngredients - partially deducts convertible units when pantry has more")
    void testDeductRecipeIngredientsPartialConvertible() {
        // Pantry: 1 kg Tomato (1000g)
        PantryItem tomatoItem = PantryItem.builder()
                .id(1L)
                .ingredientName("Tomato")
                .quantity("1")
                .unit("kg")
                .build();

        when(pantryRepository.findByUserId(1L)).thenReturn(List.of(tomatoItem));

        // Recipe needs 400 g Tomatoes -> 600g = 0.6 kg remaining
        com.mealplanner.entity.Recipe recipe = com.mealplanner.entity.Recipe.builder()
                .ingredients(List.of(new com.mealplanner.entity.Recipe.IngredientItem("Tomatoes", "400", "g")))
                .build();

        pantryService.deductRecipeIngredients(1L, recipe);

        assertEquals("0.6", tomatoItem.getQuantity());
        verify(pantryRepository, times(1)).save(tomatoItem);
        verify(pantryRepository, never()).delete(tomatoItem);
    }

    @Test
    @DisplayName("deductRecipeIngredients - deletes item when requirement meets or exceeds pantry stock")
    void testDeductRecipeIngredientsFullyConsumed() {
        // Pantry: 300 g Pasta
        PantryItem pastaItem = PantryItem.builder()
                .id(2L)
                .ingredientName("Pasta")
                .quantity("300")
                .unit("g")
                .build();

        when(pantryRepository.findByUserId(1L)).thenReturn(List.of(pastaItem));

        // Recipe needs 500 g Pasta
        com.mealplanner.entity.Recipe recipe = com.mealplanner.entity.Recipe.builder()
                .ingredients(List.of(new com.mealplanner.entity.Recipe.IngredientItem("Pasta", "500", "g")))
                .build();

        pantryService.deductRecipeIngredients(1L, recipe);

        verify(pantryRepository, times(1)).delete(pastaItem);
        verify(pantryRepository, never()).save(pastaItem);
    }

    @Test
    @DisplayName("deductRecipeIngredients - deducts discrete count items correctly")
    void testDeductRecipeIngredientsDiscrete() {
        // Pantry: 6 pcs Eggs
        PantryItem eggItem = PantryItem.builder()
                .id(3L)
                .ingredientName("Egg")
                .quantity("6")
                .unit("pcs")
                .build();

        when(pantryRepository.findByUserId(1L)).thenReturn(List.of(eggItem));

        // Recipe needs 2 pcs Eggs -> 4 remaining
        com.mealplanner.entity.Recipe recipe = com.mealplanner.entity.Recipe.builder()
                .ingredients(List.of(new com.mealplanner.entity.Recipe.IngredientItem("Egg", "2", "pcs")))
                .build();

        pantryService.deductRecipeIngredients(1L, recipe);

        assertEquals("4", eggItem.getQuantity());
        verify(pantryRepository, times(1)).save(eggItem);
    }

    @Test
    @DisplayName("clearPantry - deletes all items belonging to user")
    void testClearPantry() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        List<PantryItem> items = List.of(
                PantryItem.builder().id(1L).build(),
                PantryItem.builder().id(2L).build()
        );
        when(pantryRepository.findByUserId(1L)).thenReturn(items);

        pantryService.clearPantry("john@example.com");

        verify(pantryRepository, times(1)).deleteAll(items);
    }

    @Test
    @DisplayName("getPantryIngredientNames - retrieves all ingredient names")
    void testGetPantryIngredientNames() {
        List<PantryItem> items = List.of(
                PantryItem.builder().id(1L).ingredientName("garlic").build(),
                PantryItem.builder().id(2L).ingredientName("milk").build()
        );
        when(pantryRepository.findByUserId(1L)).thenReturn(items);

        List<String> names = pantryService.getPantryIngredientNames(1L);

        assertEquals(List.of("garlic", "milk"), names);
    }
}

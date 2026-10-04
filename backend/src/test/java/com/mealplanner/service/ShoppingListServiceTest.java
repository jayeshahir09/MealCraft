package com.mealplanner.service;

import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.entity.*;
import com.mealplanner.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShoppingListServiceTest {

    @Mock
    private ShoppingListRepository shoppingListRepository;
    @Mock
    private ShoppingListItemRepository shoppingListItemRepository;
    @Mock
    private MealPlanRepository mealPlanRepository;
    @Mock
    private PantryRepository pantryRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ShoppingListService shoppingListService;

    private User testUser;
    private MealPlan testMealPlan;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Chef John")
                .email("john@example.com")
                .build();

        Recipe recipeA = Recipe.builder()
                .id(101L)
                .title("Pancakes")
                .ingredients(List.of(
                        new Recipe.IngredientItem("All-Purpose Flour", "200", "g"),
                        new Recipe.IngredientItem("Whole Milk", "250", "ml"),
                        new Recipe.IngredientItem("Egg", "2", "pcs")
                ))
                .build();

        Recipe recipeB = Recipe.builder()
                .id(102L)
                .title("Cake")
                .ingredients(List.of(
                        new Recipe.IngredientItem("Flour", "300", "g"), // Synonym for All-Purpose Flour
                        new Recipe.IngredientItem("Milk", "250", "ml"),
                        new Recipe.IngredientItem("Egg", "2", "pcs")
                ))
                .build();

        MealPlanEntry entryA = MealPlanEntry.builder().id(1L).recipe(recipeA).build();
        MealPlanEntry entryB = MealPlanEntry.builder().id(2L).recipe(recipeB).build();

        testMealPlan = MealPlan.builder()
                .id(10L)
                .user(testUser)
                .entries(List.of(entryA, entryB))
                .build();
    }

    @Test
    @DisplayName("Should aggregate ingredients across recipes and subtract pantry stock accurately")
    void testGenerateShoppingListWithPantrySubtraction() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testMealPlan));

        // Pantry contains:
        // - 1 kg Flour (exceeds 500g needed -> 0 flour to buy)
        // - 200 ml Milk (less than 500ml needed -> 300ml to buy)
        // - 1 Egg (less than 4 needed -> 3 eggs to buy)
        List<PantryItem> pantryItems = List.of(
                PantryItem.builder().id(1L).ingredientName("All-Purpose Flour").quantity("1").unit("kg").build(),
                PantryItem.builder().id(2L).ingredientName("Milk").quantity("200").unit("ml").build(),
                PantryItem.builder().id(3L).ingredientName("Egg").quantity("1").unit("pcs").build()
        );
        when(pantryRepository.findByUserId(1L)).thenReturn(pantryItems);

        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(invocation -> {
            ShoppingList list = invocation.getArgument(0);
            list.setId(99L);
            return list;
        });

        ShoppingListDTO result = shoppingListService.generateShoppingList("john@example.com", 10L);

        assertNotNull(result);
        assertEquals(99L, result.getId());

        List<ShoppingListDTO.ShoppingListItemDTO> items = result.getItems();
        assertNotNull(items);

        // Flour should be fully fulfilled (not in list)
        boolean hasFlour = items.stream().anyMatch(i -> i.getIngredientName().toLowerCase().contains("flour"));
        assertFalse(hasFlour, "Flour should have been completely subtracted by 1kg pantry stock");

        // Milk should have 300 ml remaining (500ml - 200ml)
        ShoppingListDTO.ShoppingListItemDTO milkItem = items.stream()
                .filter(i -> i.getIngredientName().equalsIgnoreCase("whole milk") || i.getIngredientName().equalsIgnoreCase("milk"))
                .findFirst()
                .orElse(null);
        assertNotNull(milkItem, "Milk should be on shopping list");
        assertEquals("300", milkItem.getQuantity());
        assertEquals("ml", milkItem.getUnit());

        // Eggs should have 3 pcs remaining (4 - 1)
        ShoppingListDTO.ShoppingListItemDTO eggItem = items.stream()
                .filter(i -> i.getIngredientName().equalsIgnoreCase("egg"))
                .findFirst()
                .orElse(null);
        assertNotNull(eggItem, "Egg should be on shopping list");
        assertEquals("3", eggItem.getQuantity());
    }

    @Test
    @DisplayName("Should toggle shopping list item checked status")
    void testToggleItem() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        ShoppingListItem item = ShoppingListItem.builder()
                .id(5L)
                .ingredientName("Olive Oil")
                .quantity("1")
                .unit("tbsp")
                .isChecked(false)
                .build();

        when(shoppingListItemRepository.findByIdAndShoppingListUserId(5L, 1L)).thenReturn(Optional.of(item));
        when(shoppingListItemRepository.save(any(ShoppingListItem.class))).thenAnswer(i -> i.getArgument(0));

        ShoppingListDTO.ShoppingListItemDTO toggled = shoppingListService.toggleItem("john@example.com", 5L);

        assertNotNull(toggled);
        assertTrue(toggled.getIsChecked());
    }
}

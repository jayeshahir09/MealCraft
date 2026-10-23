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

import java.time.LocalDate;
import java.util.ArrayList;
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
                .weekStartDate(LocalDate.now().with(java.time.DayOfWeek.MONDAY))
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

    @Test
    @DisplayName("Should generate shopping list by week start date")
    void testGenerateShoppingListByWeek() {
        LocalDate currentMonday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByUserIdAndWeekStartDate(1L, currentMonday)).thenReturn(Optional.of(testMealPlan));
        when(pantryRepository.findByUserId(1L)).thenReturn(List.of());
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(i -> {
            ShoppingList list = i.getArgument(0);
            list.setId(50L);
            return list;
        });

        ShoppingListDTO result = shoppingListService.generateShoppingListByWeek("john@example.com", currentMonday, "smart");

        assertNotNull(result);
        assertEquals(50L, result.getId());
        assertEquals("smart", result.getMode());
    }

    @Test
    @DisplayName("Should exclude already cooked meals from generated shopping list")
    void testGenerateShoppingListExcludesCookedMeals() {
        LocalDate currentMonday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        Recipe cookedRecipe = Recipe.builder()
                .id(201L)
                .title("Cooked Steak")
                .ingredients(List.of(new Recipe.IngredientItem("Ribeye Steak", "500", "g")))
                .build();

        Recipe uncookedRecipe = Recipe.builder()
                .id(202L)
                .title("Uncooked Pasta")
                .ingredients(List.of(new Recipe.IngredientItem("Penne Pasta", "400", "g")))
                .build();

        MealPlanEntry cookedEntry = MealPlanEntry.builder()
                .id(1L)
                .recipe(cookedRecipe)
                .isCooked(true)
                .build();

        MealPlanEntry uncookedEntry = MealPlanEntry.builder()
                .id(2L)
                .recipe(uncookedRecipe)
                .isCooked(false)
                .build();

        MealPlan plan = MealPlan.builder()
                .id(15L)
                .user(testUser)
                .weekStartDate(currentMonday)
                .entries(List.of(cookedEntry, uncookedEntry))
                .build();

        when(mealPlanRepository.findByIdAndUserId(15L, 1L)).thenReturn(Optional.of(plan));
        when(pantryRepository.findByUserId(1L)).thenReturn(List.of());
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(i -> i.getArgument(0));

        ShoppingListDTO result = shoppingListService.generateShoppingList("john@example.com", 15L);

        assertNotNull(result);
        boolean hasSteak = result.getItems().stream().anyMatch(i -> i.getIngredientName().equalsIgnoreCase("Ribeye Steak"));
        boolean hasPasta = result.getItems().stream().anyMatch(i -> i.getIngredientName().equalsIgnoreCase("Penne Pasta"));

        assertFalse(hasSteak, "Cooked meal ingredients should be excluded");
        assertTrue(hasPasta, "Uncooked meal ingredients should be included");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when meal plan week is outside current or next week")
    void testGenerateShoppingListInvalidWeek() {
        LocalDate pastWeekMonday = LocalDate.now().with(java.time.DayOfWeek.MONDAY).minusWeeks(2);
        MealPlan pastPlan = MealPlan.builder()
                .id(99L)
                .user(testUser)
                .weekStartDate(pastWeekMonday)
                .entries(List.of())
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(mealPlanRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.of(pastPlan));

        assertThrows(IllegalArgumentException.class, () ->
                shoppingListService.generateShoppingList("john@example.com", 99L));
    }

    @Test
    @DisplayName("Should project pantry stock by subtracting running week consumption when generating next week list")
    void testGenerateShoppingListNextWeekWithRunningWeekConsumption() {
        LocalDate currentMonday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate nextMonday = currentMonday.plusWeeks(1);

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        // Current week running meal: requires 300g rice
        Recipe currentRecipe = Recipe.builder()
                .id(301L)
                .title("Fried Rice")
                .ingredients(List.of(new Recipe.IngredientItem("Rice", "300", "g")))
                .build();
        MealPlanEntry currentEntry = MealPlanEntry.builder()
                .id(1L)
                .recipe(currentRecipe)
                .isCooked(false)
                .build();
        MealPlan currentPlan = MealPlan.builder()
                .id(1L)
                .user(testUser)
                .weekStartDate(currentMonday)
                .entries(List.of(currentEntry))
                .build();

        // Next week meal: requires 500g rice
        Recipe nextRecipe = Recipe.builder()
                .id(302L)
                .title("Risotto")
                .ingredients(List.of(new Recipe.IngredientItem("Rice", "500", "g")))
                .build();
        MealPlanEntry nextEntry = MealPlanEntry.builder()
                .id(2L)
                .recipe(nextRecipe)
                .isCooked(false)
                .build();
        MealPlan nextPlan = MealPlan.builder()
                .id(2L)
                .user(testUser)
                .weekStartDate(nextMonday)
                .entries(List.of(nextEntry))
                .build();

        when(mealPlanRepository.findByIdAndUserId(2L, 1L)).thenReturn(Optional.of(nextPlan));
        when(mealPlanRepository.findByUserIdAndWeekStartDate(1L, currentMonday)).thenReturn(Optional.of(currentPlan));

        // Pantry starts with 600g rice:
        // Current week consumes 300g -> projected pantry has 300g
        // Next week needs 500g -> after deducting projected 300g, 200g remains to buy!
        PantryItem ricePantry = PantryItem.builder()
                .id(1L)
                .ingredientName("Rice")
                .quantity("600")
                .unit("g")
                .build();
        when(pantryRepository.findByUserId(1L)).thenReturn(List.of(ricePantry));

        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(i -> i.getArgument(0));

        ShoppingListDTO result = shoppingListService.generateShoppingList("john@example.com", 2L);

        assertNotNull(result);
        ShoppingListDTO.ShoppingListItemDTO riceItem = result.getItems().stream()
                .filter(i -> i.getIngredientName().equalsIgnoreCase("rice"))
                .findFirst()
                .orElse(null);

        assertNotNull(riceItem);
        assertEquals("200", riceItem.getQuantity());
        assertEquals("g", riceItem.getUnit());
    }

    @Test
    @DisplayName("Should add manual item with smart default unit")
    void testAddManualItem() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        ShoppingList list = ShoppingList.builder()
                .id(10L)
                .user(testUser)
                .items(new ArrayList<>())
                .build();

        when(shoppingListRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(list));
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(i -> i.getArgument(0));

        ShoppingListDTO result = shoppingListService.addManualItem("john@example.com", 10L, "Garlic");

        assertNotNull(result);
        assertEquals(1, result.getItems().size());
        assertEquals("Garlic", result.getItems().get(0).getIngredientName());
        assertEquals("1", result.getItems().get(0).getQuantity());
        assertEquals("cloves", result.getItems().get(0).getUnit());
    }

    @Test
    @DisplayName("Should get shopping list by id and by meal plan id")
    void testGetShoppingListAndByMealPlan() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));

        ShoppingList list = ShoppingList.builder()
                .id(10L)
                .user(testUser)
                .mealPlan(testMealPlan)
                .items(new ArrayList<>())
                .build();

        when(shoppingListRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(list));
        when(shoppingListRepository.findByMealPlanId(10L)).thenReturn(List.of(list));

        ShoppingListDTO byId = shoppingListService.getShoppingList("john@example.com", 10L);
        ShoppingListDTO byPlan = shoppingListService.getShoppingListByMealPlan("john@example.com", 10L);

        assertNotNull(byId);
        assertEquals(10L, byId.getId());
        assertNotNull(byPlan);
        assertEquals(10L, byPlan.getId());
    }
}

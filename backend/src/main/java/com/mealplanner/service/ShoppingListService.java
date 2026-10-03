package com.mealplanner.service;

import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.entity.*;
import com.mealplanner.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShoppingListService {

    private final ShoppingListRepository shoppingListRepository;
    private final ShoppingListItemRepository shoppingListItemRepository;
    private final MealPlanRepository mealPlanRepository;
    private final PantryRepository pantryRepository;
    private final UserRepository userRepository;

    @Transactional
    public ShoppingListDTO generateShoppingList(String email, Long mealPlanId) {
        User user = getUser(email);
        MealPlan plan = mealPlanRepository.findByIdAndUserId(mealPlanId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Meal plan not found"));

        // Step 1: Collect all missing ingredients from every recipe in the plan
        Map<String, IngredientAggregate> aggregated = new LinkedHashMap<>();

        for (MealPlanEntry entry : plan.getEntries()) {
            Recipe recipe = entry.getRecipe();
            if (recipe.getIngredients() != null) {
                for (Recipe.IngredientItem ingredient : recipe.getIngredients()) {
                    String key = normalize(ingredient.getName());
                    aggregated.merge(key, new IngredientAggregate(
                            ingredient.getName(), ingredient.getQuantity(), ingredient.getUnit()),
                            this::mergeIngredients);
                }
            }
        }

        // Step 2: Subtract pantry items
        Set<String> pantryNames = pantryRepository.findByUserId(user.getId())
                .stream()
                .map(p -> normalize(p.getIngredientName()))
                .collect(Collectors.toSet());

        aggregated.keySet().removeAll(pantryNames);

        // Step 3: Delete old shopping list for this plan if exists
        shoppingListRepository.findByMealPlanId(mealPlanId)
                .ifPresent(shoppingListRepository::delete);

        // Step 4: Build and persist new shopping list
        ShoppingList shoppingList = ShoppingList.builder()
                .user(user)
                .mealPlan(plan)
                .build();

        List<ShoppingListItem> items = aggregated.values().stream()
                .map(agg -> ShoppingListItem.builder()
                        .shoppingList(shoppingList)
                        .ingredientName(agg.name)
                        .quantity(agg.quantity)
                        .unit(agg.unit)
                        .isChecked(false)
                        .build())
                .collect(Collectors.toList());

        shoppingList.setItems(items);
        ShoppingList saved = shoppingListRepository.save(shoppingList);
        return toDTO(saved);
    }

    public ShoppingListDTO getShoppingList(String email, Long shoppingListId) {
        User user = getUser(email);
        ShoppingList list = shoppingListRepository.findByIdAndUserId(shoppingListId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Shopping list not found"));
        return toDTO(list);
    }

    public ShoppingListDTO getShoppingListByMealPlan(String email, Long mealPlanId) {
        User user = getUser(email);
        return shoppingListRepository.findByMealPlanId(mealPlanId)
                .filter(l -> l.getUser().getId().equals(user.getId()))
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional
    public ShoppingListDTO.ShoppingListItemDTO toggleItem(String email, Long itemId) {
        User user = getUser(email);
        ShoppingListItem item = shoppingListItemRepository.findByIdAndShoppingListUserId(itemId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Shopping list item not found"));
        item.setIsChecked(!item.getIsChecked());
        ShoppingListItem saved = shoppingListItemRepository.save(item);
        return ShoppingListDTO.ShoppingListItemDTO.builder()
                .id(saved.getId())
                .ingredientName(saved.getIngredientName())
                .quantity(saved.getQuantity())
                .unit(saved.getUnit())
                .isChecked(saved.getIsChecked())
                .build();
    }

    @Transactional
    public ShoppingListDTO addManualItem(String email, Long shoppingListId, String ingredientName) {
        User user = getUser(email);
        ShoppingList list = shoppingListRepository.findByIdAndUserId(shoppingListId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Shopping list not found"));

        ShoppingListItem item = ShoppingListItem.builder()
                .shoppingList(list)
                .ingredientName(ingredientName.trim())
                .isChecked(false)
                .build();
        list.getItems().add(item);
        return toDTO(shoppingListRepository.save(list));
    }

    private String normalize(String name) {
        if (name == null) return "";
        return name.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private IngredientAggregate mergeIngredients(IngredientAggregate a, IngredientAggregate b) {
        // Attempt numeric merge if units match
        if (a.unit != null && a.unit.equalsIgnoreCase(b.unit != null ? b.unit : "")) {
            try {
                double qA = Double.parseDouble(a.quantity != null ? a.quantity.replaceAll("[^0-9.]", "") : "0");
                double qB = Double.parseDouble(b.quantity != null ? b.quantity.replaceAll("[^0-9.]", "") : "0");
                double total = qA + qB;
                String formatted = total == Math.floor(total)
                        ? String.valueOf((int) total)
                        : String.format("%.1f", total);
                return new IngredientAggregate(a.name, formatted, a.unit);
            } catch (NumberFormatException e) {
                // Fall through to combined format
            }
        }
        // Can't merge numerically — combine as text
        String combinedQty = (a.quantity != null ? a.quantity : "") + " + " + (b.quantity != null ? b.quantity : "");
        return new IngredientAggregate(a.name, combinedQty, a.unit);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private ShoppingListDTO toDTO(ShoppingList list) {
        List<ShoppingListDTO.ShoppingListItemDTO> items = list.getItems().stream()
                .map(i -> ShoppingListDTO.ShoppingListItemDTO.builder()
                        .id(i.getId())
                        .ingredientName(i.getIngredientName())
                        .quantity(i.getQuantity())
                        .unit(i.getUnit())
                        .isChecked(i.getIsChecked())
                        .build())
                .collect(Collectors.toList());

        return ShoppingListDTO.builder()
                .id(list.getId())
                .mealPlanId(list.getMealPlan() != null ? list.getMealPlan().getId() : null)
                .generatedAt(list.getGeneratedAt())
                .items(items)
                .build();
    }

    private record IngredientAggregate(String name, String quantity, String unit) {}
}

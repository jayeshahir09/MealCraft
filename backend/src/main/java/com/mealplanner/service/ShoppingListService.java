package com.mealplanner.service;

import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.entity.*;
import com.mealplanner.repository.*;
import com.mealplanner.util.UnitConverter;
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

        // Step 1: Collect and aggregate ingredients from every recipe in the plan
        Map<String, IngredientAggregate> aggregated = new LinkedHashMap<>();

        for (MealPlanEntry entry : plan.getEntries()) {
            Recipe recipe = entry.getRecipe();
            if (recipe.getIngredients() != null) {
                for (Recipe.IngredientItem ingredient : recipe.getIngredients()) {
                    String key = UnitConverter.normalizeIngredientName(ingredient.getName());
                    aggregated.merge(key, new IngredientAggregate(
                            ingredient.getName(), ingredient.getQuantity(), ingredient.getUnit()),
                            this::mergeIngredients);
                }
            }
        }

        // Step 2: Accurate Pantry Subtraction with Unit Conversion
        List<PantryItem> pantryList = pantryRepository.findByUserId(user.getId());
        for (PantryItem p : pantryList) {
            String pKey = UnitConverter.normalizeIngredientName(p.getIngredientName());
            if (aggregated.containsKey(pKey)) {
                IngredientAggregate req = aggregated.get(pKey);
                String pQtyStr = p.getQuantity();
                String pUnit = p.getUnit();

                // If pantry item has no quantity specified, consider it available in stock
                if (pQtyStr == null || pQtyStr.isBlank()) {
                    aggregated.remove(pKey);
                    continue;
                }

                double reqQty = UnitConverter.parseQuantity(req.quantity);
                double pantryQty = UnitConverter.parseQuantity(pQtyStr);

                UnitConverter.UnitCategory reqCat = UnitConverter.getCategory(req.unit);
                UnitConverter.UnitCategory pCat = UnitConverter.getCategory(pUnit);

                if (reqCat != UnitConverter.UnitCategory.UNKNOWN && reqCat == pCat) {
                    double reqBase = UnitConverter.toBaseUnit(reqQty, req.unit);
                    double pantryBase = UnitConverter.toBaseUnit(pantryQty, pUnit);

                    if (pantryBase >= reqBase) {
                        // Fully satisfied by pantry stock
                        aggregated.remove(pKey);
                    } else {
                        // Partially satisfied: subtract and keep missing remainder
                        double remainingBase = reqBase - pantryBase;
                        double remQty = UnitConverter.fromBaseUnit(remainingBase, req.unit);
                        aggregated.put(pKey, new IngredientAggregate(
                                req.name, UnitConverter.formatQuantity(remQty), req.unit));
                    }
                } else if (req.unit == null || req.unit.isBlank() || pUnit == null || pUnit.isBlank()
                        || req.unit.equalsIgnoreCase(pUnit)) {
                    // Direct quantity comparison for discrete/same units
                    if (pantryQty >= reqQty) {
                        aggregated.remove(pKey);
                    } else {
                        double remQty = reqQty - pantryQty;
                        aggregated.put(pKey, new IngredientAggregate(
                                req.name, UnitConverter.formatQuantity(remQty), req.unit));
                    }
                } else {
                    // Incompatible units fallback: fulfill from pantry
                    aggregated.remove(pKey);
                }
            }
        }

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

    private IngredientAggregate mergeIngredients(IngredientAggregate a, IngredientAggregate b) {
        UnitConverter.UnitCategory catA = UnitConverter.getCategory(a.unit);
        UnitConverter.UnitCategory catB = UnitConverter.getCategory(b.unit);

        if (catA != UnitConverter.UnitCategory.UNKNOWN && catA == catB) {
            double qA = UnitConverter.toBaseUnit(UnitConverter.parseQuantity(a.quantity), a.unit);
            double qB = UnitConverter.toBaseUnit(UnitConverter.parseQuantity(b.quantity), b.unit);
            double totalBase = qA + qB;
            String preferredUnit = (a.unit != null && !a.unit.isBlank()) ? a.unit : b.unit;
            double totalTarget = UnitConverter.fromBaseUnit(totalBase, preferredUnit);
            return new IngredientAggregate(a.name, UnitConverter.formatQuantity(totalTarget), preferredUnit);
        } else if (a.unit != null && a.unit.equalsIgnoreCase(b.unit != null ? b.unit : "")) {
            double qA = UnitConverter.parseQuantity(a.quantity);
            double qB = UnitConverter.parseQuantity(b.quantity);
            return new IngredientAggregate(a.name, UnitConverter.formatQuantity(qA + qB), a.unit);
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

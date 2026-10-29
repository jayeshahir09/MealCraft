package com.mealplanner.service;

import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.entity.*;
import com.mealplanner.repository.*;
import com.mealplanner.util.UnitConverter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ShoppingListService {

    private final ShoppingListRepository shoppingListRepository;
    private final ShoppingListItemRepository shoppingListItemRepository;
    private final MealPlanRepository mealPlanRepository;
    private final PantryRepository pantryRepository;
    private final UserRepository userRepository;

    public ShoppingListService(ShoppingListRepository shoppingListRepository,
                               ShoppingListItemRepository shoppingListItemRepository,
                               MealPlanRepository mealPlanRepository,
                               PantryRepository pantryRepository,
                               UserRepository userRepository) {
        this.shoppingListRepository = shoppingListRepository;
        this.shoppingListItemRepository = shoppingListItemRepository;
        this.mealPlanRepository = mealPlanRepository;
        this.pantryRepository = pantryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ShoppingListDTO generateShoppingList(String email, Long mealPlanId) {
        return generateShoppingList(email, mealPlanId, "smart");
    }

    @Transactional
    public ShoppingListDTO generateShoppingList(String email, Long mealPlanId, String mode) {
        User user = getUser(email);
        MealPlan targetPlan = mealPlanRepository.findByIdAndUserId(mealPlanId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Meal plan not found"));

        return processShoppingListGeneration(user, targetPlan, mode);
    }

    @Transactional
    public ShoppingListDTO generateShoppingListByWeek(String email, LocalDate weekStart, String mode) {
        User user = getUser(email);
        MealPlan targetPlan = mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), weekStart)
                .orElseThrow(() -> new IllegalArgumentException("No meal plan found for week starting " + weekStart));

        return processShoppingListGeneration(user, targetPlan, mode);
    }

    private ShoppingListDTO processShoppingListGeneration(User user, MealPlan targetPlan, String mode) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDate currentWeekMonday = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate nextWeekMonday = currentWeekMonday.plusWeeks(1);
        LocalDate targetWeekStart = targetPlan.getWeekStartDate();
        if (targetWeekStart == null) {
            targetWeekStart = currentWeekMonday;
        }

        // Enforce: only allowed for this week or next week
        if (targetWeekStart.isBefore(currentWeekMonday) || targetWeekStart.isAfter(nextWeekMonday)) {
            throw new IllegalArgumentException("Shopping lists can only be generated for this week or next week.");
        }

        boolean isCurrentWeek = targetWeekStart.isEqual(currentWeekMonday);
        boolean isNextWeek = targetWeekStart.isEqual(nextWeekMonday);

        // Step 1: Select relevant entries from the target meal plan
        List<MealPlanEntry> targetEntries = new ArrayList<>();
        String summary;

        if (isCurrentWeek) {
            // Include all un-cooked meals of the current week so delayed or past-cutoff meals are not dropped from grocery/pantry planning
            for (MealPlanEntry entry : targetPlan.getEntries()) {
                if (!entry.isCooked()) {
                    targetEntries.add(entry);
                }
            }
            summary = "Smart list: filtered for all un-cooked meals for the week, adjusted for current pantry stock.";
        } else {
            // Next week advance planning
            for (MealPlanEntry entry : targetPlan.getEntries()) {
                if (!entry.isCooked()) {
                    targetEntries.add(entry);
                }
            }
            summary = "Advance list for next week: full week plan adjusted for projected pantry after finishing this week's meals.";
        }

        // Aggregate ingredients needed for the target entries
        Map<String, IngredientAggregate> aggregated = aggregateIngredients(targetEntries);

        // Step 2: Pantry Deduction with Running Week Consumption Awareness
        List<PantryItem> userPantry = pantryRepository.findByUserId(user.getId());
        Map<String, ProjectedPantryItem> projectedPantry = buildProjectedPantry(userPantry);

        if (isNextWeek) {
            // Mind that remaining meals in the running week will consume pantry items!
            Optional<MealPlan> currentWeekPlanOpt = mealPlanRepository.findByUserIdAndWeekStartDate(user.getId(), currentWeekMonday);
            if (currentWeekPlanOpt.isPresent()) {
                List<MealPlanEntry> currentWeekRemaining = currentWeekPlanOpt.get().getEntries().stream()
                        .filter(e -> !e.isCooked() && isSlotUpcoming(e.getDayOfWeek(), e.getMealType(), now))
                        .collect(Collectors.toList());

                Map<String, IngredientAggregate> runningWeekConsumption = aggregateIngredients(currentWeekRemaining);

                // Deduct running week consumption from projected pantry
                consumeFromProjectedPantry(projectedPantry, runningWeekConsumption);
            }
        }

        // Step 3: Deduct the available (or projected) pantry stock from target ingredients
        deductProjectedPantryFromAggregated(aggregated, projectedPantry);

        // Step 4: Delete old shopping list for this plan if exists
        List<ShoppingList> existingLists = shoppingListRepository.findByMealPlanId(targetPlan.getId());
        if (!existingLists.isEmpty()) {
            shoppingListRepository.deleteAll(existingLists);
        }

        // Step 5: Build and persist new shopping list
        ShoppingList shoppingList = ShoppingList.builder()
                .user(user)
                .mealPlan(targetPlan)
                .build();

        List<ShoppingListItem> items = aggregated.values().stream()
                .map(agg -> {
                    String resolvedUnit = (agg.unit != null && !agg.unit.isBlank())
                            ? agg.unit
                            : UnitConverter.getDefaultUnit(agg.name);
                    String resolvedQty = (agg.quantity != null && !agg.quantity.isBlank())
                            ? agg.quantity
                            : "1";
                    return ShoppingListItem.builder()
                            .shoppingList(shoppingList)
                            .ingredientName(agg.name)
                            .quantity(resolvedQty)
                            .unit(resolvedUnit)
                            .isChecked(false)
                            .build();
                })
                .collect(Collectors.toList());

        shoppingList.setItems(items);
        ShoppingList saved = shoppingListRepository.save(shoppingList);

        ShoppingListDTO dto = toDTO(saved);
        dto.setMode(mode);
        dto.setSummary(summary);
        return dto;
    }

    public static boolean isSlotUpcoming(MealPlanEntry.DayOfWeek slotDay, MealPlanEntry.MealType slotType, LocalDateTime now) {
        if (slotDay == null || slotType == null) return true;
        int currentDayOfWeek = now.getDayOfWeek().getValue(); // 1 = Monday, 7 = Sunday
        int slotDayVal = toDayOfWeekValue(slotDay);

        if (slotDayVal > currentDayOfWeek) {
            return true; // Future day in this week
        }
        if (slotDayVal < currentDayOfWeek) {
            return false; // Past day in this week
        }

        // Same day: check meal cutoff hours
        int hour = now.getHour();
        return switch (slotType) {
            case BREAKFAST -> hour < 11;
            case LUNCH -> hour < 15;
            case SNACK -> hour < 18;
            case DINNER -> hour < 22;
        };
    }

    private static int toDayOfWeekValue(MealPlanEntry.DayOfWeek day) {
        return switch (day) {
            case MON -> 1;
            case TUE -> 2;
            case WED -> 3;
            case THU -> 4;
            case FRI -> 5;
            case SAT -> 6;
            case SUN -> 7;
        };
    }

    private Map<String, IngredientAggregate> aggregateIngredients(Collection<MealPlanEntry> entries) {
        Map<String, IngredientAggregate> aggregated = new LinkedHashMap<>();
        for (MealPlanEntry entry : entries) {
            Recipe recipe = entry.getRecipe();
            if (recipe != null && recipe.getIngredients() != null) {
                for (Recipe.IngredientItem ingredient : recipe.getIngredients()) {
                    if (ingredient.getName() == null || ingredient.getName().isBlank()) continue;
                    String key = UnitConverter.normalizeIngredientName(ingredient.getName());
                    aggregated.merge(key, new IngredientAggregate(
                            ingredient.getName(), ingredient.getQuantity(), ingredient.getUnit()),
                            this::mergeIngredients);
                }
            }
        }
        return aggregated;
    }

    private Map<String, ProjectedPantryItem> buildProjectedPantry(List<PantryItem> pantryList) {
        Map<String, ProjectedPantryItem> map = new HashMap<>();
        for (PantryItem p : pantryList) {
            String key = UnitConverter.normalizeIngredientName(p.getIngredientName());
            String pQtyStr = p.getQuantity();
            String pUnit = p.getUnit();

            if (pQtyStr == null || pQtyStr.isBlank()) {
                map.put(key, new ProjectedPantryItem(p.getIngredientName(), -1, pUnit, UnitConverter.UnitCategory.UNKNOWN, true));
            } else {
                double qty = UnitConverter.parseQuantity(pQtyStr);
                UnitConverter.UnitCategory cat = UnitConverter.getCategory(pUnit);
                if (cat != UnitConverter.UnitCategory.UNKNOWN) {
                    double baseQty = UnitConverter.toBaseUnit(qty, pUnit);
                    map.put(key, new ProjectedPantryItem(p.getIngredientName(), baseQty, pUnit, cat, false));
                } else {
                    map.put(key, new ProjectedPantryItem(p.getIngredientName(), qty, pUnit, UnitConverter.UnitCategory.UNKNOWN, false));
                }
            }
        }
        return map;
    }

    private void consumeFromProjectedPantry(Map<String, ProjectedPantryItem> pantry, Map<String, IngredientAggregate> consumption) {
        for (Map.Entry<String, IngredientAggregate> entry : consumption.entrySet()) {
            String key = entry.getKey();
            if (!pantry.containsKey(key)) continue;

            ProjectedPantryItem item = pantry.get(key);
            if (item.isStaple) continue;

            IngredientAggregate req = entry.getValue();
            double reqQty = UnitConverter.parseQuantity(req.quantity);
            UnitConverter.UnitCategory reqCat = UnitConverter.getCategory(req.unit);

            if (item.category != UnitConverter.UnitCategory.UNKNOWN && item.category == reqCat) {
                double reqBase = UnitConverter.toBaseUnit(reqQty, req.unit);
                item.amount -= reqBase;
                if (item.amount <= 0) {
                    pantry.remove(key);
                }
            } else if (item.unit == null || item.unit.isBlank() || req.unit == null || req.unit.isBlank()
                    || item.unit.equalsIgnoreCase(req.unit)) {
                item.amount -= reqQty;
                if (item.amount <= 0) {
                    pantry.remove(key);
                }
            }
        }
    }

    private void deductProjectedPantryFromAggregated(Map<String, IngredientAggregate> aggregated, Map<String, ProjectedPantryItem> pantry) {
        for (Map.Entry<String, ProjectedPantryItem> pEntry : pantry.entrySet()) {
            String key = pEntry.getKey();
            if (!aggregated.containsKey(key)) continue;

            ProjectedPantryItem pItem = pEntry.getValue();
            IngredientAggregate req = aggregated.get(key);

            if (pItem.isStaple) {
                aggregated.remove(key);
                continue;
            }

            double reqQty = UnitConverter.parseQuantity(req.quantity);
            UnitConverter.UnitCategory reqCat = UnitConverter.getCategory(req.unit);

            if (pItem.category != UnitConverter.UnitCategory.UNKNOWN && pItem.category == reqCat) {
                double reqBase = UnitConverter.toBaseUnit(reqQty, req.unit);
                if (pItem.amount >= reqBase) {
                    pItem.amount -= reqBase;
                    aggregated.remove(key);
                } else {
                    double remainingBase = reqBase - pItem.amount;
                    pItem.amount = 0;
                    double remQty = UnitConverter.fromBaseUnit(remainingBase, req.unit);
                    aggregated.put(key, new IngredientAggregate(req.name, UnitConverter.formatQuantity(remQty), req.unit));
                }
            } else if (req.unit == null || req.unit.isBlank() || pItem.unit == null || pItem.unit.isBlank()
                    || req.unit.equalsIgnoreCase(pItem.unit)) {
                if (pItem.amount >= reqQty) {
                    pItem.amount -= reqQty;
                    aggregated.remove(key);
                } else {
                    double remQty = reqQty - pItem.amount;
                    pItem.amount = 0;
                    aggregated.put(key, new IngredientAggregate(req.name, UnitConverter.formatQuantity(remQty), req.unit));
                }
            } else {
                // Incompatible units fallback: fulfill from pantry
                aggregated.remove(key);
            }
        }
    }

    public ShoppingListDTO getShoppingList(String email, Long shoppingListId) {
        User user = getUser(email);
        ShoppingList list = shoppingListRepository.findByIdAndUserId(shoppingListId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Shopping list not found"));
        return toDTO(list);
    }

    public ShoppingListDTO getShoppingListByMealPlan(String email, Long mealPlanId) {
        User user = getUser(email);
        return shoppingListRepository.findByMealPlanId(mealPlanId).stream()
                .filter(l -> l.getUser().getId().equals(user.getId()))
                .findFirst()
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

        String name = ingredientName.trim();
        String defaultUnit = UnitConverter.getDefaultUnit(name);

        ShoppingListItem item = ShoppingListItem.builder()
                .shoppingList(list)
                .ingredientName(name)
                .quantity("1")
                .unit(defaultUnit)
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

    private static class ProjectedPantryItem {
        String name;
        double amount;
        String unit;
        UnitConverter.UnitCategory category;
        boolean isStaple;

        ProjectedPantryItem(String name, double amount, String unit, UnitConverter.UnitCategory category, boolean isStaple) {
            this.name = name;
            this.amount = amount;
            this.unit = unit;
            this.category = category;
            this.isStaple = isStaple;
        }
    }
}

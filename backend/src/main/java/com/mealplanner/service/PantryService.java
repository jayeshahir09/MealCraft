package com.mealplanner.service;

import com.mealplanner.dto.PantryItemDTO;
import com.mealplanner.entity.PantryItem;
import com.mealplanner.entity.User;
import com.mealplanner.repository.PantryRepository;
import com.mealplanner.repository.UserRepository;
import com.mealplanner.entity.Recipe;
import com.mealplanner.util.UnitConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PantryService {

    private final PantryRepository pantryRepository;
    private final UserRepository userRepository;

    public PantryService(PantryRepository pantryRepository, UserRepository userRepository) {
        this.pantryRepository = pantryRepository;
        this.userRepository = userRepository;
    }

    public List<PantryItemDTO> getPantryItems(String email) {
        User user = getUser(email);
        return pantryRepository.findByUserId(user.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public PantryItemDTO addPantryItem(String email, PantryItemDTO dto) {
        User user = getUser(email);
        String normalizedName = com.mealplanner.util.UnitConverter.normalizeIngredientName(dto.getIngredientName());
        
        // Find existing item by normalized name to update instead of creating duplicate
        PantryItem item = pantryRepository.findByUserId(user.getId()).stream()
                .filter(p -> com.mealplanner.util.UnitConverter.normalizeIngredientName(p.getIngredientName()).equalsIgnoreCase(normalizedName))
                .findFirst()
                .orElseGet(() -> PantryItem.builder().user(user).ingredientName(normalizedName).build());

        item.setIngredientName(normalizedName);
        item.setQuantity(dto.getQuantity() != null ? dto.getQuantity().trim() : null);
        item.setUnit(dto.getUnit() != null ? dto.getUnit().trim() : null);

        return toDTO(pantryRepository.save(item));
    }

    @Transactional
    public void deletePantryItem(String email, Long itemId) {
        User user = getUser(email);
        PantryItem item = pantryRepository.findByUserIdAndId(user.getId(), itemId)
                .orElseThrow(() -> new IllegalArgumentException("Pantry item not found"));
        pantryRepository.delete(item);
    }

    @Transactional
    public void clearPantry(String email) {
        User user = getUser(email);
        List<PantryItem> items = pantryRepository.findByUserId(user.getId());
        pantryRepository.deleteAll(items);
    }

    @Transactional
    public void deductRecipeIngredients(Long userId, Recipe recipe) {
        if (recipe == null || recipe.getIngredients() == null || recipe.getIngredients().isEmpty()) {
            return;
        }

        List<PantryItem> pantryItems = pantryRepository.findByUserId(userId);
        if (pantryItems.isEmpty()) {
            return;
        }

        // Map pantry items by normalized name
        Map<String, PantryItem> pantryMap = new HashMap<>();
        for (PantryItem item : pantryItems) {
            String key = UnitConverter.normalizeIngredientName(item.getIngredientName());
            pantryMap.put(key, item);
        }

        for (Recipe.IngredientItem ingredient : recipe.getIngredients()) {
            if (ingredient.getName() == null || ingredient.getName().isBlank()) {
                continue;
            }

            String key = UnitConverter.normalizeIngredientName(ingredient.getName());
            PantryItem item = pantryMap.get(key);
            if (item == null) {
                continue;
            }

            String pQtyStr = item.getQuantity();
            String pUnit = item.getUnit();

            // If pantry item has no quantity (e.g. staple like salt or uncounted item)
            if (pQtyStr == null || pQtyStr.isBlank()) {
                continue;
            }

            double reqQty = UnitConverter.parseQuantity(ingredient.getQuantity());
            double pQty = UnitConverter.parseQuantity(pQtyStr);

            UnitConverter.UnitCategory reqCat = UnitConverter.getCategory(ingredient.getUnit());
            UnitConverter.UnitCategory pCat = UnitConverter.getCategory(pUnit);

            if (reqCat != UnitConverter.UnitCategory.UNKNOWN && reqCat == pCat) {
                double reqBase = UnitConverter.toBaseUnit(reqQty, ingredient.getUnit());
                double pBase = UnitConverter.toBaseUnit(pQty, pUnit);

                if (pBase <= reqBase) {
                    // Fully consumed -> delete item from pantry
                    pantryRepository.delete(item);
                    pantryMap.remove(key);
                } else {
                    // Remaining amount
                    double remBase = pBase - reqBase;
                    double remQty = UnitConverter.fromBaseUnit(remBase, pUnit);
                    item.setQuantity(UnitConverter.formatQuantity(remQty));
                    pantryRepository.save(item);
                }
            } else if (ingredient.getUnit() == null || ingredient.getUnit().isBlank()
                    || pUnit == null || pUnit.isBlank()
                    || ingredient.getUnit().equalsIgnoreCase(pUnit)) {
                // Discrete or same unit
                if (pQty <= reqQty) {
                    // Fully consumed -> delete item from pantry
                    pantryRepository.delete(item);
                    pantryMap.remove(key);
                } else {
                    double remQty = pQty - reqQty;
                    item.setQuantity(UnitConverter.formatQuantity(remQty));
                    pantryRepository.save(item);
                }
            }
        }
    }

    public List<String> getPantryIngredientNames(Long userId) {
        return pantryRepository.findByUserId(userId)
                .stream()
                .map(p -> p.getIngredientName().toLowerCase())
                .collect(Collectors.toList());
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private PantryItemDTO toDTO(PantryItem item) {
        return PantryItemDTO.builder()
                .id(item.getId())
                .ingredientName(item.getIngredientName())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .build();
    }
}

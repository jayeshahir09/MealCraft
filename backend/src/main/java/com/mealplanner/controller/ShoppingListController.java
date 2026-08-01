package com.mealplanner.controller;

import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.service.ShoppingListService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shopping-list")
@RequiredArgsConstructor
public class ShoppingListController {

    private final ShoppingListService shoppingListService;

    @PostMapping("/generate/{mealPlanId}")
    public ResponseEntity<ShoppingListDTO> generateShoppingList(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long mealPlanId) {
        return ResponseEntity.ok(shoppingListService.generateShoppingList(userDetails.getUsername(), mealPlanId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShoppingListDTO> getShoppingList(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(shoppingListService.getShoppingList(userDetails.getUsername(), id));
    }

    @PatchMapping("/items/{itemId}/toggle")
    public ResponseEntity<ShoppingListDTO.ShoppingListItemDTO> toggleItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(shoppingListService.toggleItem(userDetails.getUsername(), itemId));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<ShoppingListDTO> addManualItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody AddItemRequest request) {
        return ResponseEntity.ok(shoppingListService.addManualItem(userDetails.getUsername(), id, request.getIngredientName()));
    }

    @Data
    static class AddItemRequest {
        private String ingredientName;
    }
}

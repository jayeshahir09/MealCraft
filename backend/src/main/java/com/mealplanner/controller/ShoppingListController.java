package com.mealplanner.controller;

import com.mealplanner.dto.ShoppingListDTO;
import com.mealplanner.service.ShoppingListService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shopping-list")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;

    public ShoppingListController(ShoppingListService shoppingListService) {
        this.shoppingListService = shoppingListService;
    }

    @PostMapping("/generate/{mealPlanId}")
    public ResponseEntity<ShoppingListDTO> generateShoppingList(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long mealPlanId,
            @RequestParam(required = false, defaultValue = "smart") String mode) {
        return ResponseEntity.ok(shoppingListService.generateShoppingList(userDetails.getUsername(), mealPlanId, mode));
    }

    @PostMapping("/generate/week/{weekStart}")
    public ResponseEntity<ShoppingListDTO> generateShoppingListByWeek(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate weekStart,
            @RequestParam(required = false, defaultValue = "smart") String mode) {
        return ResponseEntity.ok(shoppingListService.generateShoppingListByWeek(userDetails.getUsername(), weekStart, mode));
    }

    @GetMapping("/plan/{mealPlanId}")
    public ResponseEntity<ShoppingListDTO> getShoppingListByMealPlan(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long mealPlanId) {
        ShoppingListDTO dto = shoppingListService.getShoppingListByMealPlan(userDetails.getUsername(), mealPlanId);
        return ResponseEntity.ok(dto);
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

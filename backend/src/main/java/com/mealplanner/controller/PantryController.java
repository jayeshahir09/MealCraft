package com.mealplanner.controller;

import com.mealplanner.dto.PantryItemDTO;
import com.mealplanner.service.PantryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pantry")
@RequiredArgsConstructor
public class PantryController {

    private final PantryService pantryService;

    @GetMapping
    public ResponseEntity<List<PantryItemDTO>> getPantry(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(pantryService.getPantryItems(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<PantryItemDTO> addItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PantryItemDTO dto) {
        return ResponseEntity.ok(pantryService.addPantryItem(userDetails.getUsername(), dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        pantryService.deletePantryItem(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearPantry(@AuthenticationPrincipal UserDetails userDetails) {
        pantryService.clearPantry(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}

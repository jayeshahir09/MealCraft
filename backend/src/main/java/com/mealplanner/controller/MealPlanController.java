package com.mealplanner.controller;

import com.mealplanner.dto.MealPlanDTO;
import com.mealplanner.service.MealPlanService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/mealplans")
@RequiredArgsConstructor
public class MealPlanController {

    private final MealPlanService mealPlanService;

    @GetMapping("/{weekStart}")
    public ResponseEntity<MealPlanDTO> getMealPlan(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ResponseEntity.ok(mealPlanService.getMealPlan(userDetails.getUsername(), weekStart));
    }

    @PostMapping("/{weekStart}/assign")
    public ResponseEntity<MealPlanDTO> assignRecipe(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @RequestBody AssignRequest request) {
        return ResponseEntity.ok(mealPlanService.assignRecipeToSlot(
                userDetails.getUsername(), weekStart,
                request.getDayOfWeek(), request.getMealType(), request.getRecipeId()));
    }

    @DeleteMapping("/{weekStart}/slot")
    public ResponseEntity<MealPlanDTO> removeFromSlot(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @RequestParam String dayOfWeek,
            @RequestParam String mealType) {
        return ResponseEntity.ok(mealPlanService.removeRecipeFromSlot(
                userDetails.getUsername(), weekStart, dayOfWeek, mealType));
    }

    @DeleteMapping("/{weekStart}/clear")
    public ResponseEntity<Void> clearWeek(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        mealPlanService.clearWeek(userDetails.getUsername(), weekStart);
        return ResponseEntity.noContent().build();
    }

    @Data
    static class AssignRequest {
        private String dayOfWeek;
        private String mealType;
        private Long recipeId;
    }
}

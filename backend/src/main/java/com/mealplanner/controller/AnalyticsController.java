package com.mealplanner.controller;

import com.mealplanner.service.AnalyticsService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnalytics(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(analyticsService.getAnalytics(userDetails.getUsername()));
    }

    @PostMapping("/log/{recipeId}")
    public ResponseEntity<Map<String, Object>> logCookedRecipe(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long recipeId,
            @RequestBody(required = false) LogRequest request) {
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(analyticsService.logCookedRecipe(userDetails.getUsername(), recipeId, notes));
    }

    @Data
    static class LogRequest {
        private String notes;
    }
}

package com.mealplanner.controller;

import com.mealplanner.dto.PreferenceDTO;
import com.mealplanner.service.PreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferences")
@RequiredArgsConstructor
public class PreferenceController {

    private final PreferenceService preferenceService;

    @GetMapping
    public ResponseEntity<PreferenceDTO> getPreferences(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(preferenceService.getPreferences(userDetails.getUsername()));
    }

    @PutMapping
    public ResponseEntity<PreferenceDTO> updatePreferences(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PreferenceDTO dto) {
        return ResponseEntity.ok(preferenceService.updatePreferences(userDetails.getUsername(), dto));
    }
}

package com.mealplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShoppingListDTO {
    private Long id;
    private Long mealPlanId;
    private LocalDateTime generatedAt;
    private List<ShoppingListItemDTO> items;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ShoppingListItemDTO {
        private Long id;
        private String ingredientName;
        private String quantity;
        private String unit;
        private Boolean isChecked;
    }
}

package com.mealplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PantryItemDTO {
    private Long id;
    private String ingredientName;
    private String quantity;
    private String unit;
}

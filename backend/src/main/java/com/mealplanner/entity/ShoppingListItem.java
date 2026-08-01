package com.mealplanner.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shopping_list_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShoppingListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shopping_list_id", nullable = false)
    private ShoppingList shoppingList;

    @Column(name = "ingredient_name", nullable = false, length = 200)
    private String ingredientName;

    @Column(length = 50)
    private String quantity;

    @Column(length = 50)
    private String unit;

    @Column(name = "is_checked", nullable = false)
    @Builder.Default
    private Boolean isChecked = false;
}

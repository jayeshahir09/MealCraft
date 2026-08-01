package com.mealplanner.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pantry_items",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "ingredient_name"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PantryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "ingredient_name", nullable = false, length = 200)
    private String ingredientName;

    @Column(length = 50)
    private String quantity;

    @Column(length = 50)
    private String unit;
}

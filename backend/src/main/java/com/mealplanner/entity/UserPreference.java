package com.mealplanner.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "diet_type")
    private DietType dietType = DietType.NONE;

    @Builder.Default
    @Column(name = "allergies")
    private String[] allergies = new String[]{};

    @Column(name = "preferred_cuisine", length = 100)
    private String preferredCuisine;

    @Column(name = "max_cook_time_minutes")
    private Integer maxCookTimeMinutes;

    public enum DietType {
        NONE, VEGETARIAN, VEGAN, KETO, GLUTEN_FREE, DAIRY_FREE, LOW_CARB, HIGH_PROTEIN
    }
}

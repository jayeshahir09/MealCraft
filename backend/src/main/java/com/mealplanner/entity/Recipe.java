package com.mealplanner.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "recipes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 300)
    private String title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<IngredientItem> ingredients;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<String> steps;

    @Column(length = 100)
    private String cuisine;

    @Column(name = "estimated_time_minutes")
    private Integer estimatedTimeMinutes;

    @Column(name = "estimated_calories")
    private Integer estimatedCalories;

    @Enumerated(EnumType.STRING)
    @Column(name = "source")
    private RecipeSource source;

    @Column(name = "tags")
    private String[] tags = new String[]{};

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (source == null) source = RecipeSource.AI_GENERATED;
    }

    public enum RecipeSource {
        AI_GENERATED, MANUAL
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredientItem {
        private String name;
        private String quantity;
        private String unit;
    }
}

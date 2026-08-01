package com.mealplanner.repository;

import com.mealplanner.entity.CookingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CookingHistoryRepository extends JpaRepository<CookingHistory, Long> {
    List<CookingHistory> findByUserIdOrderByCookedAtDesc(Long userId);

    @Query("""
        SELECT ch.recipe.cuisine, COUNT(ch) as cnt
        FROM CookingHistory ch
        WHERE ch.user.id = :userId
        GROUP BY ch.recipe.cuisine
        ORDER BY cnt DESC
        """)
    List<Object[]> findTopCuisines(@Param("userId") Long userId);

    @Query("""
        SELECT SUM(ch.recipe.estimatedCalories)
        FROM CookingHistory ch
        WHERE ch.user.id = :userId
        AND ch.cookedAt >= :weekStart
        """)
    Long sumCaloriesThisWeek(@Param("userId") Long userId,
                              @Param("weekStart") java.time.LocalDateTime weekStart);
}

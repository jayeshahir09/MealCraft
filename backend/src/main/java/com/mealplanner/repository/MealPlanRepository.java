package com.mealplanner.repository;

import com.mealplanner.entity.MealPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {
    Optional<MealPlan> findByUserIdAndWeekStartDate(Long userId, LocalDate weekStartDate);
    Optional<MealPlan> findByIdAndUserId(Long id, Long userId);
}

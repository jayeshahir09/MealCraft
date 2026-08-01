package com.mealplanner.repository;

import com.mealplanner.entity.MealPlanEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MealPlanEntryRepository extends JpaRepository<MealPlanEntry, Long> {
}

package com.mealplanner.repository;

import com.mealplanner.entity.ShoppingList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShoppingListRepository extends JpaRepository<ShoppingList, Long> {
    List<ShoppingList> findByUserIdOrderByGeneratedAtDesc(Long userId);
    Optional<ShoppingList> findByIdAndUserId(Long id, Long userId);
    Optional<ShoppingList> findByMealPlanId(Long mealPlanId);
}

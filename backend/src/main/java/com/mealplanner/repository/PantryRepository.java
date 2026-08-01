package com.mealplanner.repository;

import com.mealplanner.entity.PantryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PantryRepository extends JpaRepository<PantryItem, Long> {
    List<PantryItem> findByUserId(Long userId);
    Optional<PantryItem> findByUserIdAndId(Long userId, Long id);
    void deleteByUserIdAndId(Long userId, Long id);
    boolean existsByUserIdAndIngredientNameIgnoreCase(Long userId, String ingredientName);
}

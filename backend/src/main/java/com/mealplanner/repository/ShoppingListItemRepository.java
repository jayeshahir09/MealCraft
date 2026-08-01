package com.mealplanner.repository;

import com.mealplanner.entity.ShoppingListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, Long> {
    Optional<ShoppingListItem> findByIdAndShoppingListUserId(Long id, Long userId);
}

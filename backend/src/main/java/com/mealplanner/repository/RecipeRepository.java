package com.mealplanner.repository;

import com.mealplanner.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Recipe> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT r FROM Recipe r WHERE r.user.id = :userId AND (:cuisine IS NULL OR lower(r.cuisine) = lower(:cuisine))")
    List<Recipe> findByUserIdAndCuisine(@Param("userId") Long userId, @Param("cuisine") String cuisine);

    @Query("SELECT r FROM Recipe r WHERE r.user.id = :userId AND lower(r.title) LIKE lower(concat('%', :query, '%'))")
    List<Recipe> searchByTitle(@Param("userId") Long userId, @Param("query") String query);

    Optional<Recipe> findByUserIdAndTitleIgnoreCase(Long userId, String title);
}

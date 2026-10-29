package com.mealplanner.repository;

import com.mealplanner.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    Optional<EmailOtp> findTopByEmailAndIsUsedFalseOrderByIdDesc(String email);

    Optional<EmailOtp> findTopByEmailOrderByIdDesc(String email);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);

    @Modifying
    @Query("UPDATE EmailOtp o SET o.isUsed = true WHERE o.email = :email AND o.isUsed = false")
    void invalidateAllActiveForEmail(@Param("email") String email);
}

package com.mealplanner.repository;

import com.mealplanner.entity.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long> {
    Optional<AiUsageLog> findByUserIdAndUsageDate(Long userId, LocalDate date);

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO ai_usage_log (user_id, usage_date, call_count)
        VALUES (:userId, :date, 1)
        ON CONFLICT (user_id, usage_date) DO UPDATE SET call_count = ai_usage_log.call_count + 1
        """, nativeQuery = true)
    void incrementCallCount(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Modifying
    @Transactional
    @Query("DELETE FROM AiUsageLog a WHERE a.usageDate < :today")
    void deleteOldUsageLogs(@Param("today") LocalDate today);
}

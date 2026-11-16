package com.mealplanner.repository;

import com.mealplanner.entity.EmailOtp;
import com.mealplanner.entity.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    Optional<EmailOtp> findTopByEmailAndTypeAndIsUsedFalseOrderByIdDesc(String email, OtpType type);

    Optional<EmailOtp> findTopByEmailAndTypeOrderByIdDesc(String email, OtpType type);

    long countByEmailAndTypeAndCreatedAtAfter(String email, OtpType type, LocalDateTime since);

    @Modifying
    @Query("UPDATE EmailOtp o SET o.isUsed = true WHERE o.email = :email AND o.type = :type AND o.isUsed = false")
    void invalidateAllActiveForEmailAndType(@Param("email") String email, @Param("type") OtpType type);

    Optional<EmailOtp> findTopByResetTokenHashOrderByIdDesc(String resetTokenHash);

    // Legacy fallback methods if needed
    default Optional<EmailOtp> findTopByEmailAndIsUsedFalseOrderByIdDesc(String email) {
        return findTopByEmailAndTypeAndIsUsedFalseOrderByIdDesc(email, OtpType.REGISTRATION);
    }

    default Optional<EmailOtp> findTopByEmailOrderByIdDesc(String email) {
        return findTopByEmailAndTypeOrderByIdDesc(email, OtpType.REGISTRATION);
    }

    default long countByEmailAndCreatedAtAfter(String email, LocalDateTime since) {
        return countByEmailAndTypeAndCreatedAtAfter(email, OtpType.REGISTRATION, since);
    }

    default void invalidateAllActiveForEmail(String email) {
        invalidateAllActiveForEmailAndType(email, OtpType.REGISTRATION);
    }
}

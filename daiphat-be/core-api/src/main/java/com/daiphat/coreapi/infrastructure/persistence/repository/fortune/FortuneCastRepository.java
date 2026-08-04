package com.daiphat.coreapi.infrastructure.persistence.repository.fortune;

import com.daiphat.coreapi.infrastructure.persistence.entity.fortune.FortuneCastEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface FortuneCastRepository extends JpaRepository<FortuneCastEntity, Long> {

    Optional<FortuneCastEntity> findByUserIdAndCastDate(UUID userId, LocalDate castDate);

    void deleteByUserIdAndCastDate(UUID userId, LocalDate castDate);

    Optional<FortuneCastEntity> findFirstByUserIdAndCastDateLessThanOrderByCastDateDesc(
            UUID userId,
            LocalDate castDate
    );
}

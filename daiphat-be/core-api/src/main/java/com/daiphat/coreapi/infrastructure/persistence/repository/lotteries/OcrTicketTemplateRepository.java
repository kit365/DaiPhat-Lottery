package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrTicketTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OcrTicketTemplateRepository extends JpaRepository<OcrTicketTemplateEntity, Long> {

    Optional<OcrTicketTemplateEntity> findByIdAndDeletedAtIsNull(Long id);

    List<OcrTicketTemplateEntity> findByStationIdAndDeletedAtIsNullOrderByIsDefaultDescTemplateNameAsc(Long stationId);

    Optional<OcrTicketTemplateEntity> findByStationIdAndIsDefaultTrueAndDeletedAtIsNull(Long stationId);

    @Query("""
            SELECT COUNT(t) > 0
            FROM OcrTicketTemplateEntity t
            WHERE t.isDefault = true
              AND t.active = true
              AND t.deletedAt IS NULL
            """)
    boolean existsActiveDefault();

    long countByIsDefaultTrueAndActiveTrueAndDeletedAtIsNull();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE OcrTicketTemplateEntity t
            SET t.isDefault = false
            WHERE t.stationId = :stationId
              AND t.deletedAt IS NULL
              AND (:excludeId IS NULL OR t.id <> :excludeId)
            """)
    int clearDefaultsForStation(@Param("stationId") Long stationId, @Param("excludeId") Long excludeId);

    @Query("""
            SELECT t FROM OcrTicketTemplateEntity t
            WHERE t.stationId = :stationId
              AND t.active = true
              AND t.deletedAt IS NULL
              AND (t.effectiveFrom IS NULL OR t.effectiveFrom <= :drawDate)
              AND (t.effectiveTo IS NULL OR t.effectiveTo >= :drawDate)
            ORDER BY t.isDefault DESC, t.id DESC
            """)
    List<OcrTicketTemplateEntity> findEffectiveForStationOnDate(
            @Param("stationId") Long stationId,
            @Param("drawDate") java.time.LocalDate drawDate
    );
}

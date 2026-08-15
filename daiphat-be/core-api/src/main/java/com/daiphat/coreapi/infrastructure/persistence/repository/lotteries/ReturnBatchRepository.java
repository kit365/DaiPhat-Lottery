package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReturnBatchRepository
        extends JpaRepository<ReturnBatchEntity, Long>, JpaSpecificationExecutor<ReturnBatchEntity> {

    Optional<ReturnBatchEntity> findByIdAndDeletedAtIsNull(Long id);

    Optional<ReturnBatchEntity> findByLotterySupplier_IdAndDrawDateAndStatusAndDeletedAtIsNull(
            Long lotterySupplierId,
            LocalDate drawDate,
            ReturnBatchStatus status
    );

    Optional<ReturnBatchEntity> findByLotterySupplier_IdAndDrawDateAndDeletedAtIsNull(
            Long lotterySupplierId,
            LocalDate drawDate
    );

    Optional<ReturnBatchEntity> findFirstByLotterySupplier_IdAndDrawDateAndReturnBatchTypeAndDeletedAtIsNullOrderByIdAsc(
            Long lotterySupplierId,
            LocalDate drawDate,
            ReturnBatchType returnBatchType
    );

    Optional<ReturnBatchEntity> findBySourceAllocationBatch_IdAndDeletedAtIsNull(Long allocationBatchId);

    List<ReturnBatchEntity> findAllByLotterySupplier_IdAndDrawDateAndDeletedAtIsNull(
            Long lotterySupplierId,
            LocalDate drawDate
    );

    List<ReturnBatchEntity> findByNoteStartingWithAndDeletedAtIsNull(String notePrefix);

    @Query("""
            SELECT DISTINCT rb FROM ReturnBatchEntity rb
            LEFT JOIN FETCH rb.lotterySupplier
            LEFT JOIN FETCH rb.lines
            WHERE rb.status IN :statuses AND rb.deletedAt IS NULL
            """)
    List<ReturnBatchEntity> findByStatusInAndDeletedAtIsNull(@Param("statuses") Collection<ReturnBatchStatus> statuses);

    @Query("""
            SELECT DISTINCT rb FROM ReturnBatchEntity rb
            LEFT JOIN FETCH rb.lotterySupplier
            LEFT JOIN FETCH rb.lines
            WHERE rb.supplierSettlementId = :supplierSettlementId AND rb.deletedAt IS NULL
            ORDER BY rb.drawDate DESC, rb.id DESC
            """)
    List<ReturnBatchEntity> findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(
            @Param("supplierSettlementId") Long supplierSettlementId
    );

    @Query(value = "SELECT nextval('return_batch_header_code_seq')", nativeQuery = true)
    long nextHeaderBatchCodeSequence();
}

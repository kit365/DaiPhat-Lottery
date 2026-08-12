package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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

    Optional<ReturnBatchEntity> findBySourceAllocationBatch_IdAndDeletedAtIsNull(Long allocationBatchId);

    List<ReturnBatchEntity> findAllByLotterySupplier_IdAndDrawDateAndDeletedAtIsNull(
            Long lotterySupplierId,
            LocalDate drawDate
    );

    List<ReturnBatchEntity> findByNoteStartingWithAndDeletedAtIsNull(String notePrefix);

    List<ReturnBatchEntity> findByStatusInAndDeletedAtIsNull(Collection<ReturnBatchStatus> statuses);

    List<ReturnBatchEntity> findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(
            Long supplierSettlementId
    );

    @org.springframework.data.jpa.repository.Query(value = "SELECT nextval('return_batch_header_code_seq')", nativeQuery = true)
    long nextHeaderBatchCodeSequence();
}

package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReturnBatchRepositoryPort {

    ReturnBatchModel save(ReturnBatchModel model);

    ReturnBatchLineModel saveLine(ReturnBatchLineModel model);

    Optional<ReturnBatchModel> findById(Long id);

    Optional<ReturnBatchLineModel> findLineById(Long lineId);

    Optional<ReturnBatchModel> findPendingBySupplierAndDrawDate(Long supplierId, LocalDate drawDate);

    Optional<ReturnBatchModel> findBySupplierAndDrawDate(Long supplierId, LocalDate drawDate);

    Page<ReturnBatchModel> findAll(
            Pageable pageable,
            Long lotterySupplierId,
            Long supplierSettlementId,
            ReturnBatchStatus status,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            String search
    );

    List<ReturnBatchLineModel> findLinesByBatchId(Long returnBatchId);

    List<ReturnBatchModel> findByStatuses(List<ReturnBatchStatus> statuses);

    List<ReturnBatchModel> findBySupplierSettlementId(Long supplierSettlementId);
}

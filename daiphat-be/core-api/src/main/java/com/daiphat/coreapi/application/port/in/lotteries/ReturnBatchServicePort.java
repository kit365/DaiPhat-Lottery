package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnHandoverRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchLineStatusRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.InspectableReturnSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ReturnBatchServicePort {

    ReturnBatchResponse create(CreateReturnBatchRequest request, UUID operatorId);

    ReturnBatchResponse update(Long id, UpdateReturnBatchRequest request);

    ReturnBatchResponse getById(Long id);

    PageResponse<ReturnBatchResponse> getAll(
            int page,
            int size,
            Long lotterySupplierId,
            Long supplierSettlementId,
            ReturnBatchStatus status,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            String search,
            String sortBy,
            String direction
    );

    List<InspectableReturnSerialResponse> listInspectableSerials(Long batchId);

    ReturnBatchResponse confirmInspection(
            Long batchId,
            ConfirmReturnInspectionRequest request,
            UUID operatorId
    );

    ReturnBatchResponse confirmHandover(
            Long batchId,
            ConfirmReturnHandoverRequest request,
            UUID operatorId
    );

    ReturnBatchResponse attachSerials(Long batchId, Long lineId, AttachReturnSerialsRequest request);

    ReturnBatchResponse detachSerial(Long batchId, Long lineId, Long serialId);

    ReturnBatchResponse updateLineStatus(Long batchId, Long lineId, UpdateReturnBatchLineStatusRequest request);

    /** @deprecated Prefer {@link #confirmInspection} / {@link #confirmHandover}. */
    ReturnBatchResponse markReturned(Long batchId, UUID operatorId);

    /** @deprecated Prefer {@link #confirmInspection} / {@link #confirmHandover}. */
    ReturnBatchResponse confirm(Long batchId, ConfirmReturnBatchRequest request);
}

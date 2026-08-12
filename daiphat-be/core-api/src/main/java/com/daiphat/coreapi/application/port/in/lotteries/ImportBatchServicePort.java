package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchBlockedStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineEntryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchReductionTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchTimePolicyResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportBatchServicePort {

    ImportBatchResponse create(CreateImportBatchRequest request, UUID operatorId);

    ImportBatchResponse update(Long id, UpdateImportBatchRequest request);

    /**
     * Attach invoice evidence URL when the batch currently has none.
     * Works for completed/imported batches (settlement reconciliation fill-in).
     */
    ImportBatchResponse attachInvoiceEvidence(Long id, String invoiceEvidenceUrl);

    Optional<ImportBatchResponse> getActiveDraft(UUID operatorId);

    List<ImportBatchResponse> getIncompleteBatches();

    List<ImportBatchResponse> getBatchesWithoutLines();

    ImportBatchResponse getById(Long id);

    PageResponse<ImportBatchResponse> getAll(
            int page,
            int size,
            Long lotteryStationId,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            ImportBatchStatus status,
            ImportBatchType batchType,
            String sortBy,
            String direction
    );

    List<EnumOptionResponse> getBatchTypeOptions();

    ImportBatchClassificationPreviewResponse previewClassification(ImportBatchClassificationPreviewRequest request);

    ImportBatchEligibleStationsResponse getEligibleStations(
            LocalDate drawDate,
            ImportBatchImportMode importMode,
            Long excludeBatchId
    );

    ImportBatchTimePolicyResponse getTimePolicy();

    int cancelOverdueDrafts();

    ImportBatchResponse deleteLine(Long batchId, Long lineId);

    ImportBatchResponse pauseLine(Long batchId, Long lineId);

    ImportBatchResponse resumeLine(Long batchId, Long lineId);

    ImportBatchReductionTicketsResponse getReductionTickets(Long importBatchId);

    ImportBatchLineEntryTicketsResponse getLineEntryTickets(Long batchId, Long lineId);
}

package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrConfirmImportMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.util.List;

@Builder
public record OcrConfirmImportRequest(
        @NotNull OcrConfirmImportMode mode,
        /** Required when mode = AUTO. */
        Long supplierId,
        String invoiceEvidenceUrl,
        List<String> ticketListImageUrls,
        Boolean forceCreate,
        /** Required when mode = MANUAL. */
        Long importBatchId,
        @NotEmpty @Valid List<OcrConfirmImportTicketRequest> tickets
) {
}

package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.util.List;

@Builder
public record UpdateImportBatchRequest(
        @NotNull Long supplierId,
        @NotNull Integer totalDeclareQuantity,
        String invoiceEvidenceUrl,
        List<String> ticketListImageUrls,
        @Valid List<UpdateImportBatchLineRequest> lines,
        List<Long> removedTicketIds,
        /**
         * When true, PAUSED lines may change declare quantity (dedicated Pause & Adjust flow).
         * Normal edit/save must leave this unset/false.
         */
        Boolean adjustPausedDeclareQuantity,
        /**
         * When true, the operator confirmed completing a PAUSED line by setting declare quantity
         * equal to imported quantity (line becomes IMPORTED). Required for that case.
         */
        Boolean confirmPausedLineImported
) {
}

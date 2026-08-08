package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * doc section 4, Flow 4: POST /lottery-tickets/batch-import -- "Receives
 * confirmed tickets, Receives batchCode, Uploads images to Cloudinary,
 * Performs bulk insertion". batchCode is cross-checked against the
 * ImportBatch the given line belongs to (safety check: the operator is
 * confirming into the batch they think they are).
 */
public record BatchImportScannedTicketsRequest(
        @NotNull(message = "Phiếu nhập lô không được để trống")
        Long importBatchLineId,

        @NotBlank(message = "Mã lô nhập không được để trống")
        String batchCode,

        @Valid
        @NotEmpty(message = "Danh sách vé xác nhận không được để trống")
        List<ConfirmedScannedTicketRequest> tickets,

        Boolean isAutoSave
) {
}

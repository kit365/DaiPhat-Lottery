package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Create the batches the operator selected in the preview.
 *
 * <p>The file is uploaded again rather than the resolved rows being sent back, so
 * nothing the client holds is taken on trust: the backend re-reads the file,
 * re-resolves every station and re-derives every quantity. {@link #fileHash()}
 * must match the hash returned by the preview, which catches a file edited
 * between the two steps.
 *
 * @param drawDates            draw dates the operator ticked; one batch per date
 * @param forceCreateDrawDates dates to create even though an editable batch already exists
 * @param invoiceEvidenceUrl   shared invoice/receipt file URL (image or document)
 * @param ticketListImageUrls  extra ticket-list evidence URLs (images or documents)
 * @param useOriginalFileAsTicketListEvidence when true, also attach the imported CSV/XLSX
 *                                            as ticket-list evidence on each created batch
 */
@Builder
public record ImportBatchFileImportCommitRequest(
        @NotNull(message = "Nhà cung cấp không được để trống")
        Long supplierId,

        @NotBlank(message = "Thiếu mã tệp đã xem trước")
        String fileHash,

        @NotNull(message = "Cấu hình cột không được để trống")
        @Valid
        ImportBatchFileMappingRequest mapping,

        @NotEmpty(message = "Chưa chọn ngày quay nào để tạo phiếu")
        List<LocalDate> drawDates,

        List<LocalDate> forceCreateDrawDates,

        String invoiceEvidenceUrl,

        List<String> ticketListImageUrls,

        Boolean useOriginalFileAsTicketListEvidence
) {

    public boolean isForced(LocalDate drawDate) {
        return forceCreateDrawDates != null && forceCreateDrawDates.contains(drawDate);
    }

    public boolean shouldUseOriginalFileAsTicketListEvidence() {
        return useOriginalFileAsTicketListEvidence == null || useOriginalFileAsTicketListEvidence;
    }
}

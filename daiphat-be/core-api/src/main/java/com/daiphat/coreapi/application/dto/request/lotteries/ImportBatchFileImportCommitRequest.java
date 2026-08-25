package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileCommitMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Create / attach import batches for the draw dates selected in the preview.
 *
 * @param commitMode          AUTO creates new batches; MANUAL maps into selected import-batches
 * @param manualBatchBindings required when commitMode=MANUAL: one importBatchId per drawDate
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

        Boolean useOriginalFileAsTicketListEvidence,

        ImportBatchFileCommitMode commitMode,

        List<ImportBatchFileManualBatchBinding> manualBatchBindings
) {

    public boolean isForced(LocalDate drawDate) {
        return forceCreateDrawDates != null && forceCreateDrawDates.contains(drawDate);
    }

    public boolean shouldUseOriginalFileAsTicketListEvidence() {
        return useOriginalFileAsTicketListEvidence == null || useOriginalFileAsTicketListEvidence;
    }

    public ImportBatchFileCommitMode resolvedCommitMode() {
        return commitMode != null ? commitMode : ImportBatchFileCommitMode.AUTO;
    }

    public Long manualBatchIdFor(LocalDate drawDate) {
        if (manualBatchBindings == null || drawDate == null) {
            return null;
        }
        return manualBatchBindings.stream()
                .filter(b -> drawDate.equals(b.drawDate()))
                .map(ImportBatchFileManualBatchBinding::importBatchId)
                .findFirst()
                .orElse(null);
    }
}

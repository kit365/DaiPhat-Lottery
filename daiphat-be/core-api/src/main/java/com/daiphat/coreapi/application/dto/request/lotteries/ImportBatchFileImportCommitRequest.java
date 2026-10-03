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
 * Import tickets for the draw dates selected in the preview. AUTO creates a batch
 * from the file; MANUAL retains the existing-batch compatibility path.
 *
 * @param manualBatchBindings one existing importBatchId per drawDate in MANUAL mode
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

        @NotEmpty(message = "Chưa chọn ngày quay nào để nhập vé")
        List<LocalDate> drawDates,

        ImportBatchFileCommitMode commitMode,

        @Valid
        List<ImportBatchFileManualBatchBinding> manualBatchBindings,

        String invoiceEvidenceUrl
) {

    public ImportBatchFileCommitMode resolvedCommitMode() {
        return commitMode != null ? commitMode : ImportBatchFileCommitMode.MANUAL;
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

    public ImportBatchSelectionSnapshotRequest selectionSnapshotFor(LocalDate drawDate) {
        if (manualBatchBindings == null || drawDate == null) {
            return null;
        }
        return manualBatchBindings.stream()
                .filter(b -> drawDate.equals(b.drawDate()))
                .map(ImportBatchFileManualBatchBinding::selectionSnapshot)
                .findFirst()
                .orElse(null);
    }
}

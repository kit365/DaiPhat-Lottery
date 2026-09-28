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
 * Import tickets into existing batches for the draw dates selected in the preview.
 *
 * @param manualBatchBindings one existing importBatchId per drawDate
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

        @NotEmpty(message = "Chưa có phiếu nhập cho ngày quay đã chọn")
        @Valid
        List<ImportBatchFileManualBatchBinding> manualBatchBindings
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
}

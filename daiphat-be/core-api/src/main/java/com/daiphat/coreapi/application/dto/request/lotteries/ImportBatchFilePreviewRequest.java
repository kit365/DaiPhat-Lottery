package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileCommitMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Preview an uploaded supplier file. Stateless: nothing is written, so the client
 * can re-submit freely while the user adjusts the column mapping.
 */
@Builder
public record ImportBatchFilePreviewRequest(
        @NotNull(message = "Nhà cung cấp không được để trống")
        Long supplierId,

        @NotNull(message = "Cấu hình cột không được để trống")
        @Valid
        ImportBatchFileMappingRequest mapping,

        Long importBatchId,

        List<ImportBatchFileManualBatchBinding> manualBatchBindings,

        ImportBatchFileCommitMode commitMode
) {
    public ImportBatchFileCommitMode resolvedCommitMode() {
        return commitMode == null ? ImportBatchFileCommitMode.MANUAL : commitMode;
    }
    public Long manualBatchIdFor(LocalDate drawDate) {
        if (manualBatchBindings != null && drawDate != null) {
            for (ImportBatchFileManualBatchBinding binding : manualBatchBindings) {
                if (drawDate.equals(binding.drawDate())) {
                    return binding.importBatchId();
                }
            }
        }
        return importBatchId;
    }
}

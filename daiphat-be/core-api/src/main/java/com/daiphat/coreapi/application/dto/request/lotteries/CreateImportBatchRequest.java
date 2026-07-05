package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record CreateImportBatchRequest(
        @NotNull(message = "Ngày quay không được để trống")
        LocalDate drawDate,

        @NotNull(message = "Nhà cung cấp không được để trống")
        Long supplierId,

        @NotNull(message = "Loại nhập lô không được để trống")
        ImportBatchImportMode importMode,

        String invoiceEvidenceUrl,

        String note,

        @NotEmpty(message = "Danh sách nhà đài không được để trống")
        @Valid
        List<CreateImportBatchLineRequest> lines
) {
}

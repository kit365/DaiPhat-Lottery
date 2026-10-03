package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
public record ImportBatchSelectionSnapshotRequest(
        @NotNull ImportBatchStatus status,
        LocalDateTime updatedAt,
        @NotNull Integer totalDeclareQuantity,
        @NotNull Integer totalImportedQuantity,
        @NotNull @Valid List<ImportBatchLineSelectionSnapshotRequest> lines
) {
}

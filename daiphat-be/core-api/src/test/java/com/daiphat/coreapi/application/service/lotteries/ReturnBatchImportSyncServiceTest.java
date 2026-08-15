package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReturnBatchImportSyncService")
class ReturnBatchImportSyncServiceTest {

    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 8, 14);

    @Mock private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock private ReturnBatchSummaryCalculator returnBatchSummaryCalculator;

    @Test
    @DisplayName("adds a new station and recalculates only the open primary supplier return")
    void refreshOpenPrimarySupplierReturn_enrichesAndRecalculates() {
        ReturnBatchImportSyncService service = new ReturnBatchImportSyncService(
                importBatchLineRepositoryPort,
                returnBatchRepositoryPort,
                returnBatchSummaryCalculator
        );
        when(returnBatchRepositoryPort.findPrimarySupplierReturnBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(Optional.of(ReturnBatchModel.builder()
                        .id(99L)
                        .lotterySupplierId(1L)
                        .drawDate(DRAW_DATE)
                        .status(ReturnBatchStatus.PENDING_INSPECTION)
                        .build()));
        when(importBatchLineRepositoryPort.findEligibleStationIdsBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(List.of(10L, 11L));
        when(returnBatchRepositoryPort.findLinesByBatchId(99L)).thenReturn(List.of(
                ReturnBatchLineModel.builder().id(1L).returnBatchId(99L).lotteryStationId(10L).build()
        ));
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.refreshOpenPrimarySupplierReturn(1L, DRAW_DATE);

        ArgumentCaptor<ReturnBatchLineModel> lineCaptor = ArgumentCaptor.forClass(ReturnBatchLineModel.class);
        verify(returnBatchRepositoryPort).saveLine(lineCaptor.capture());
        assertThat(lineCaptor.getValue().getLotteryStationId()).isEqualTo(11L);
        verify(returnBatchSummaryCalculator).recalculate(99L);
    }

    @Test
    @DisplayName("does not modify a return batch that is no longer open for inspection")
    void refreshOpenPrimarySupplierReturn_skipsClosedBatch() {
        ReturnBatchImportSyncService service = new ReturnBatchImportSyncService(
                importBatchLineRepositoryPort,
                returnBatchRepositoryPort,
                returnBatchSummaryCalculator
        );
        when(returnBatchRepositoryPort.findPrimarySupplierReturnBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(Optional.of(ReturnBatchModel.builder()
                        .id(99L)
                        .status(ReturnBatchStatus.HANDED_OVER)
                        .build()));

        service.refreshOpenPrimarySupplierReturn(1L, DRAW_DATE);

        verify(importBatchLineRepositoryPort, never()).findEligibleStationIdsBySupplierAndDrawDate(any(), any());
        verify(returnBatchRepositoryPort, never()).saveLine(any());
        verify(returnBatchSummaryCalculator, never()).recalculate(any());
    }
}

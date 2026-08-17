package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReturnBatchSummaryCalculator")
class ReturnBatchSummaryCalculatorTest {

    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 7, 31);

    @Mock
    private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;

    @InjectMocks
    private ReturnBatchSummaryCalculator calculator;

    @Test
    @DisplayName("PENDING summary = IN_STOCK count × importCost per ImportBatchLine station")
    void recalculate_fromEligibleImportInventory() {
        ReturnBatchModel batch = ReturnBatchModel.builder()
                .id(1L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .build();
        ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                .id(10L)
                .returnBatchId(1L)
                .lotteryStationId(100L)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO)
                .build();

        when(returnBatchRepositoryPort.findById(1L)).thenReturn(Optional.of(batch));
        when(returnBatchRepositoryPort.findLinesByBatchId(1L)).thenReturn(List.of(line));
        when(lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(10L)).thenReturn(0L);
        when(importBatchLineRepositoryPort.findEligibleBySupplierStationAndDrawDate(7L, 100L, DRAW_DATE))
                .thenReturn(List.of(
                        ImportBatchLineModel.builder()
                                .id(50L)
                                .lotteryStationId(100L)
                                .importCost(new BigDecimal("9500.000"))
                                .build(),
                        ImportBatchLineModel.builder()
                                .id(51L)
                                .lotteryStationId(100L)
                                .importCost(new BigDecimal("9000.000"))
                                .build()
                ));
        when(lotteryTicketSerialRepositoryPort.countReturnEligibleByImportBatchLineId(50L))
                .thenReturn(2L);
        when(lotteryTicketSerialRepositoryPort.countReturnEligibleByImportBatchLineId(51L))
                .thenReturn(1L);
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(inv -> inv.getArgument(0));
        when(returnBatchRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        calculator.recalculate(1L);

        ArgumentCaptor<ReturnBatchLineModel> lineCaptor = ArgumentCaptor.forClass(ReturnBatchLineModel.class);
        verify(returnBatchRepositoryPort).saveLine(lineCaptor.capture());
        assertThat(lineCaptor.getValue().getTotalQuantity()).isEqualTo(3);
        // 2*9500 + 1*9000 = 28000
        assertThat(lineCaptor.getValue().getTotalReturnValue()).isEqualByComparingTo("28000.000");

        ArgumentCaptor<ReturnBatchModel> batchCaptor = ArgumentCaptor.forClass(ReturnBatchModel.class);
        verify(returnBatchRepositoryPort).save(batchCaptor.capture());
        assertThat(batchCaptor.getValue().getTotalQuantity()).isEqualTo(3);
        assertThat(batchCaptor.getValue().getTotalReturnValue()).isEqualByComparingTo("28000.000");
    }

    @Test
    @DisplayName("unattached open lines keep eligible unsold qty after another line is attached")
    void recalculate_mixedAttachedAndEligibleLines() {
        ReturnBatchModel batch = ReturnBatchModel.builder()
                .id(1L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .status(ReturnBatchStatus.INSPECTING)
                .build();
        ReturnBatchLineModel inspected = ReturnBatchLineModel.builder()
                .id(10L)
                .returnBatchId(1L)
                .lotteryStationId(100L)
                .status(com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus.INSPECTED)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO)
                .build();
        ReturnBatchLineModel pending = ReturnBatchLineModel.builder()
                .id(11L)
                .returnBatchId(1L)
                .lotteryStationId(200L)
                .status(com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus.PENDING)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO)
                .build();

        when(returnBatchRepositoryPort.findById(1L)).thenReturn(Optional.of(batch));
        when(returnBatchRepositoryPort.findLinesByBatchId(1L)).thenReturn(List.of(inspected, pending));
        when(lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(10L)).thenReturn(2L);
        when(lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(11L)).thenReturn(0L);
        when(lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(10L)).thenReturn(List.of(
                com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel.builder()
                        .id(1L)
                        .importBatchLineId(50L)
                        .status(LotteryTicketSerialStatus.IN_STOCK)
                        .build(),
                com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel.builder()
                        .id(2L)
                        .importBatchLineId(50L)
                        .status(LotteryTicketSerialStatus.EXPIRED)
                        .build()
        ));
        when(importBatchLineRepositoryPort.findById(50L)).thenReturn(Optional.of(
                ImportBatchLineModel.builder().id(50L).importCost(new BigDecimal("9500.000")).build()
        ));
        when(importBatchLineRepositoryPort.findEligibleBySupplierStationAndDrawDate(7L, 200L, DRAW_DATE))
                .thenReturn(List.of(
                        ImportBatchLineModel.builder()
                                .id(51L)
                                .lotteryStationId(200L)
                                .importCost(new BigDecimal("9000.000"))
                                .build()
                ));
        when(lotteryTicketSerialRepositoryPort.countReturnEligibleByImportBatchLineId(51L)).thenReturn(4L);
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(inv -> inv.getArgument(0));
        when(returnBatchRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        calculator.recalculate(1L);

        ArgumentCaptor<ReturnBatchLineModel> lineCaptor = ArgumentCaptor.forClass(ReturnBatchLineModel.class);
        verify(returnBatchRepositoryPort, org.mockito.Mockito.times(2)).saveLine(lineCaptor.capture());
        assertThat(lineCaptor.getAllValues())
                .anyMatch(line -> line.getId() == 10L && line.getTotalQuantity() == 2)
                .anyMatch(line -> line.getId() == 11L && line.getTotalQuantity() == 4);
    }
}

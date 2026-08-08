package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.SupplierSettlementApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementService")
class SupplierSettlementServiceTest {

    @Mock
    private SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock
    private SupplierSettlementApplicationMapper supplierSettlementApplicationMapper;
    @Mock
    private ImportBatchApplicationMapper importBatchApplicationMapper;
    @Mock
    private ReturnBatchApplicationMapper returnBatchApplicationMapper;
    @Mock
    private SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;

    @InjectMocks
    private SupplierSettlementService supplierSettlementService;

    @Test
    @DisplayName("reuses existing settlement for same supplier and draw date")
    void findOrCreate_reusesExisting() {
        LocalDate drawDate = LocalDate.of(2026, 7, 31);
        LotterySupplierModel supplier = LotterySupplierModel.builder()
                .id(7L)
                .paymentTermDays(3)
                .build();
        SupplierSettlementModel existing = SupplierSettlementModel.builder()
                .id(99L)
                .lotterySupplierId(7L)
                .periodFrom(drawDate)
                .periodTo(drawDate.plusDays(3))
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findBySupplierIdAndPeriodFrom(7L, drawDate))
                .thenReturn(Optional.of(existing));

        SupplierSettlementModel result = supplierSettlementService.findOrCreateForImport(supplier, drawDate);

        assertThat(result.getId()).isEqualTo(99L);
        verify(supplierSettlementRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("creates settlement with periodTo = drawDate + paymentTermDays")
    void findOrCreate_createsWithPaymentTerm() {
        LocalDate drawDate = LocalDate.of(2026, 7, 31);
        LotterySupplierModel supplier = LotterySupplierModel.builder()
                .id(7L)
                .paymentTermDays(5)
                .build();
        when(supplierSettlementRepositoryPort.findBySupplierIdAndPeriodFrom(7L, drawDate))
                .thenReturn(Optional.empty());
        when(supplierSettlementCodeGenerator.generateCode(drawDate)).thenReturn("DS-20260731-0001");
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> {
            SupplierSettlementModel model = invocation.getArgument(0);
            model.setId(11L);
            return model;
        });

        SupplierSettlementModel result = supplierSettlementService.findOrCreateForImport(supplier, drawDate);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        SupplierSettlementModel saved = captor.getValue();
        assertThat(saved.getPeriodFrom()).isEqualTo(drawDate);
        assertThat(saved.getPeriodTo()).isEqualTo(drawDate.plusDays(5));
        assertThat(saved.getSupplierSettlementCode()).isEqualTo("DS-20260731-0001");
        assertThat(saved.getStatus()).isEqualTo(SupplierSettlementStatus.OPEN);
        assertThat(result.getId()).isEqualTo(11L);
    }

    @Test
    @DisplayName("paymentTermDays 0 means periodTo equals periodFrom")
    void findOrCreate_sameDayPaymentTerm() {
        LocalDate drawDate = LocalDate.of(2026, 7, 31);
        LotterySupplierModel supplier = LotterySupplierModel.builder()
                .id(7L)
                .paymentTermDays(0)
                .build();
        when(supplierSettlementRepositoryPort.findBySupplierIdAndPeriodFrom(7L, drawDate))
                .thenReturn(Optional.empty());
        when(supplierSettlementCodeGenerator.generateCode(drawDate)).thenReturn("DS-20260731-0002");
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.findOrCreateForImport(supplier, drawDate);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getPeriodTo()).isEqualTo(drawDate);
    }

    @Test
    @DisplayName("before inspection complete, remaining payable stays 0 even when import value is set")
    void recalculate_beforeInspection_remainingIsZero() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .totalPaidAmount(new BigDecimal("100.000"))
                .totalReturnValue(BigDecimal.ZERO)
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L))
                .thenReturn(new BigDecimal("9500.5"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(5L))
                .thenReturn(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.existsCompletedInspectionReturnBatch(5L)).thenReturn(false);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalImportValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getTotalImportValue()).isEqualByComparingTo("9500.500");
        assertThat(captor.getValue().getRemainingAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("after inspection complete, remaining = IN_STOCK+GOOD cost − paid")
    void recalculate_afterInspection_remainingFromInStockGood() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .totalPaidAmount(new BigDecimal("500.000"))
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L))
                .thenReturn(new BigDecimal("10000.000"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(5L))
                .thenReturn(new BigDecimal("1500.250"));
        when(supplierSettlementRepositoryPort.existsCompletedInspectionReturnBatch(5L)).thenReturn(true);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalReturnValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getTotalImportValue()).isEqualByComparingTo("10000.000");
        assertThat(captor.getValue().getTotalReturnValue()).isEqualByComparingTo("1500.250");
        // remaining = 10000 - 1500.250 - 500 = 7999.750
        assertThat(captor.getValue().getRemainingAmount()).isEqualByComparingTo("7999.750");
    }

    @Test
    @DisplayName("getOverview returns empty batches and zero KPIs when settlement has no linked inventory")
    void getOverview_emptySettlement() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .lotterySupplierId(7L)
                .periodFrom(LocalDate.of(2026, 8, 6))
                .periodTo(LocalDate.of(2026, 8, 6))
                .totalImportValue(BigDecimal.ZERO)
                .totalReturnValue(BigDecimal.ZERO)
                .totalPaidAmount(BigDecimal.ZERO)
                .remainingAmount(BigDecimal.ZERO)
                .status(SupplierSettlementStatus.OPEN)
                .build();
        SupplierSettlementResponse settlementResponse = SupplierSettlementResponse.builder()
                .id(5L)
                .lotterySupplierId(7L)
                .periodFrom(LocalDate.of(2026, 8, 6))
                .periodTo(LocalDate.of(2026, 8, 6))
                .totalImportValue(BigDecimal.ZERO)
                .totalReturnValue(BigDecimal.ZERO)
                .totalPaidAmount(BigDecimal.ZERO)
                .remainingAmount(BigDecimal.ZERO)
                .status(SupplierSettlementStatus.OPEN)
                .statusLabel("Đang mở")
                .build();

        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L)).thenReturn(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(5L)).thenReturn(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.existsCompletedInspectionReturnBatch(5L)).thenReturn(false);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenReturn(settlementResponse);
        when(importBatchRepositoryPort.findBySupplierSettlementId(5L)).thenReturn(List.of());
        when(returnBatchRepositoryPort.findBySupplierSettlementId(5L)).thenReturn(List.of());
        when(lotteryTicketSerialRepositoryPort.aggregateInventoryByStationForSettlement(5L)).thenReturn(List.of());

        SupplierSettlementOverviewResponse overview = supplierSettlementService.getOverview(5L);

        assertThat(overview.settlement().id()).isEqualTo(5L);
        assertThat(overview.importBatches()).isEmpty();
        assertThat(overview.returnBatches()).isEmpty();
        assertThat(overview.inventoryByStation()).isEmpty();
        assertThat(overview.kpis().totalImportedTickets()).isZero();
        assertThat(overview.kpis().totalSoldTickets()).isZero();
        assertThat(overview.kpis().remainingPayableAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}

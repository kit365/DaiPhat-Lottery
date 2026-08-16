package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.SupplierSettlementApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchFileImportServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementAdjustmentRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.SupplierPaymentCutOffCalculator;
import com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementService")
class SupplierSettlementServiceTest {

    @Mock
    private SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    @Mock
    private SupplierSettlementAdjustmentRepositoryPort supplierSettlementAdjustmentRepositoryPort;
    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock
    private LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    @Mock
    private SupplierSettlementApplicationMapper supplierSettlementApplicationMapper;
    @Mock
    private ImportBatchApplicationMapper importBatchApplicationMapper;
    @Mock
    private ReturnBatchApplicationMapper returnBatchApplicationMapper;
    @Mock
    private SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    @Mock
    private SupplierPaymentCutOffCalculator supplierPaymentCutOffCalculator;
    @Mock
    private NotificationServicePort notificationService;
    @Mock
    private UserRepositoryPort userRepositoryPort;
    @Mock
    private ObjectProvider<ImportBatchFileImportServicePort> importBatchFileImportService;
    @Mock
    private Clock clock;

    @InjectMocks
    private SupplierSettlementService supplierSettlementService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private void fixedClock(LocalDate date, LocalTime time) {
        Instant instant = date.atTime(time).atZone(ZONE).toInstant();
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(ZONE);
    }

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
    @DisplayName("before handover, remaining payable is import value minus paid")
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
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalImportValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getTotalImportValue()).isEqualByComparingTo("9500.500");
        assertThat(captor.getValue().getRemainingAmount()).isEqualByComparingTo("9400.500");
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
    @DisplayName("handover after matching confirm still refreshes system return qty/value")
    void recalculate_afterMatchingConfirm_refreshesSystemReturnTotals() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .matchingConfirmedAt(LocalDateTime.of(2026, 8, 14, 10, 0))
                .systemReturnQuantity(0)
                .systemReturnValue(BigDecimal.ZERO)
                .actualReturnTicketQuantity(0)
                .totalPaidAmount(BigDecimal.ZERO)
                .build();
        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L))
                .thenReturn(new BigDecimal("7684.000"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(5L))
                .thenReturn(new BigDecimal("1020.000"));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(5L)).thenReturn(904L);
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(5L)).thenReturn(120L);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalReturnValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getSystemImportQuantity()).isEqualTo(904);
        assertThat(captor.getValue().getSystemReturnQuantity()).isEqualTo(120);
        assertThat(captor.getValue().getSystemReturnValue()).isEqualByComparingTo("1020.000");
        assertThat(captor.getValue().getActualReturnTicketQuantity()).isZero();
    }

    @Test
    @DisplayName("completed settlement keeps frozen matching system return snapshot")
    void recalculate_completedSettlement_keepsSystemReturnSnapshot() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.COMPLETED)
                .matchingConfirmedAt(LocalDateTime.of(2026, 8, 14, 10, 0))
                .systemReturnQuantity(0)
                .systemReturnValue(BigDecimal.ZERO)
                .totalPaidAmount(BigDecimal.ZERO)
                .build();
        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L))
                .thenReturn(new BigDecimal("7684.000"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(5L))
                .thenReturn(new BigDecimal("1020.000"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalReturnValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getSystemReturnQuantity()).isZero();
        verify(supplierSettlementRepositoryPort, never()).countPreparedReturnTicketsBySettlementId(any());
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
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenReturn(settlementResponse);
        when(importBatchRepositoryPort.findBySupplierSettlementId(5L)).thenReturn(List.of());
        when(returnBatchRepositoryPort.findBySupplierSettlementId(5L)).thenReturn(List.of());
        when(lotteryTicketSerialRepositoryPort.aggregateInventoryByStationForSettlement(5L)).thenReturn(List.of());
        when(supplierSettlementRepositoryPort.countExpiredReturnTicketsBySettlementId(5L)).thenReturn(0L);
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(5L)).thenReturn(0L);
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(5L)).thenReturn(0L);

        SupplierSettlementOverviewResponse overview = supplierSettlementService.getOverview(5L);

        assertThat(overview.settlement().id()).isEqualTo(5L);
        assertThat(overview.importBatches()).isEmpty();
        assertThat(overview.returnBatches()).isEmpty();
        assertThat(overview.inventoryByStation()).isEmpty();
        assertThat(overview.kpis().totalImportedTickets()).isZero();
        assertThat(overview.kpis().totalSoldTickets()).isZero();
        assertThat(overview.kpis().totalExpiredReturnTickets()).isZero();
        assertThat(overview.kpis().remainingPayableAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("markReceiptOverdue transitions OPEN past verification deadline without receipt")
    void markReceiptOverdue_marksOnce() {
        fixedClock(LocalDate.of(2026, 8, 8), LocalTime.of(17, 1));
        when(supplierPaymentCutOffCalculator.resolveVerificationDeadline()).thenReturn(LocalTime.of(17, 0));

        SupplierSettlementModel overdueCandidate = SupplierSettlementModel.builder()
                .id(21L)
                .supplierName("Minh Chính")
                .supplierSettlementCode("DS-20260808-0001")
                .periodFrom(LocalDate.of(2026, 8, 8))
                .periodTo(LocalDate.of(2026, 8, 8))
                .supplierSettlementReceiptUrl(null)
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findByStatus(SupplierSettlementStatus.OPEN))
                .thenReturn(List.of(overdueCandidate));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepositoryPort.findAllByRoleCodes(any())).thenReturn(List.of(
                UserModel.builder().id(java.util.UUID.randomUUID()).status(UserStatus.ACTIVE).build()
        ));

        int updated = supplierSettlementService.markReceiptOverdueSettlements();

        assertThat(updated).isEqualTo(1);
        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(SupplierSettlementStatus.RECEIPT_OVERDUE);
        verify(notificationService, times(1)).createNotification(any());
    }

    @Test
    @DisplayName("markReceiptOverdue skips settlements that already have receipt or are before deadline")
    void markReceiptOverdue_skipsNonCandidates() {
        fixedClock(LocalDate.of(2026, 8, 8), LocalTime.of(16, 0));
        when(supplierPaymentCutOffCalculator.resolveVerificationDeadline()).thenReturn(LocalTime.of(17, 0));

        SupplierSettlementModel withReceipt = SupplierSettlementModel.builder()
                .id(22L)
                .periodFrom(LocalDate.of(2026, 8, 8))
                .supplierSettlementReceiptUrl("https://cdn.example/receipt.jpg")
                .status(SupplierSettlementStatus.OPEN)
                .build();
        SupplierSettlementModel beforeDeadline = SupplierSettlementModel.builder()
                .id(23L)
                .periodFrom(LocalDate.of(2026, 8, 8))
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findByStatus(SupplierSettlementStatus.OPEN))
                .thenReturn(List.of(withReceipt, beforeDeadline));

        int updated = supplierSettlementService.markReceiptOverdueSettlements();

        assertThat(updated).isZero();
        verify(supplierSettlementRepositoryPort, never()).save(any());
        verify(notificationService, never()).createNotification(any());
    }
}

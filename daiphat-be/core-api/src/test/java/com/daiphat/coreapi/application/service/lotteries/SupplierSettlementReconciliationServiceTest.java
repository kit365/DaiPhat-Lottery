package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.AddSettlementMonetaryAdjustmentRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CompleteSettlementReconciliationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmSettlementMatchingRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SettlementMatchingAdjustmentItem;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveImportDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveReturnDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveUnitPriceDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SettlementImportPlaceholderRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SettlementExcessImportTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementCompleteResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementAdjustmentResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.SupplierSettlementApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchFileImportServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SettlementResolvableSerialRow;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementAdjustmentRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentGroupType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentReasonCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.lotteries.SettlementDiscrepancyItem;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementAdjustmentModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
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
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementService reconciliation")
class SupplierSettlementReconciliationServiceTest {

    @Mock private SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    @Mock private TransactionRepositoryPort transactionRepositoryPort;
    @Mock private SupplierSettlementAdjustmentRepositoryPort supplierSettlementAdjustmentRepositoryPort;
    @Mock private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock private LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    @Mock private SupplierSettlementApplicationMapper supplierSettlementApplicationMapper;
    @Mock private ImportBatchApplicationMapper importBatchApplicationMapper;
    @Mock private ReturnBatchApplicationMapper returnBatchApplicationMapper;
    @Mock private SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    @Mock private SupplierPaymentCutOffCalculator supplierPaymentCutOffCalculator;
    @Mock private NotificationServicePort notificationService;
    @Mock private UserRepositoryPort userRepositoryPort;
    @Mock private Clock clock;
    @Mock private SupplierSettlementDiscrepancyInventoryHelper discrepancyInventoryHelper;
    @Mock private ObjectProvider<ImportBatchFileImportServicePort> importBatchFileImportService;

    @InjectMocks
    private SupplierSettlementService supplierSettlementService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final UUID ACTOR = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private void fixedNow() {
        Instant instant = LocalDateTime.of(2026, 8, 8, 18, 0).atZone(ZONE).toInstant();
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(ZONE);
    }

    private SupplierSettlementModel openSettlement() {
        return SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.MATCHING)
                .periodFrom(LocalDate.of(2026, 8, 8))
                .periodTo(LocalDate.of(2026, 8, 8))
                .build();
    }

    @Test
    @DisplayName("recalculateAmounts charges full import value when no return batch exists")
    void recalculateAmounts_withoutReturnBatch_keepsFullPayable() {
        SupplierSettlementModel settlement = openSettlement();
        settlement.setTotalPaidAmount(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("1000000.000"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateAmounts(10L);

        assertThat(settlement.getRemainingAmount()).isEqualByComparingTo("1000000.000");
    }

    @Test
    @DisplayName("confirmMatching sets four independent flags and DISCREPANCY_DETECTED")
    void confirmMatching_detectsDiscrepancies() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(100L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("1000000.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(40L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("400000.000"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .importQuantityMismatch(m.isImportQuantityMismatch())
                    .importValueMismatch(m.isImportValueMismatch())
                    .returnQuantityMismatch(m.isReturnQuantityMismatch())
                    .returnValueMismatch(m.isReturnValueMismatch())
                    .originalTicketUnitPrice(m.getOriginalTicketUnitPrice())
                    .reconciledTicketUnitPrice(m.getReconciledTicketUnitPrice())
                    .actualTicketPrice(m.getReconciledTicketUnitPrice())
                    .initialEstimatedSettlementValue(m.getInitialEstimatedSettlementValue())
                    .finalSettlementValue(m.getFinalSettlementValue())
                    .settlementDifferenceAmount(m.getSettlementDifferenceAmount())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                90,
                new BigDecimal("900000.000"),
                40,
                new BigDecimal("400000.000"),
                new BigDecimal("10000.000"),
                "note",
                new BigDecimal("500000.000"),
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);

        assertThat(response.importQuantityMismatch()).isTrue();
        assertThat(response.importValueMismatch()).isTrue();
        assertThat(response.returnQuantityMismatch()).isFalse();
        assertThat(response.returnValueMismatch()).isFalse();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED);
        assertThat(response.originalTicketUnitPrice()).isEqualByComparingTo("10000.000");
        assertThat(response.reconciledTicketUnitPrice()).isEqualByComparingTo("10000.000");
        // initial = original × (systemImport - systemReturn) = 10000 × (100 - 40) = 600000
        assertThat(response.initialEstimatedSettlementValue()).isEqualByComparingTo("600000.000");
        // preliminary final = reconciled × (actualImport - actualReturn) = 10000 × (90 - 40) = 500000
        assertThat(response.finalSettlementValue()).isEqualByComparingTo("500000.000");
        assertThat(response.settlementDifferenceAmount()).isEqualByComparingTo("-100000.000");
        assertThat(response.discrepancyTypes()).containsExactly(
                SupplierSettlementDiscrepancyType.IMPORT_QUANTITY
        );
    }

    @Test
    @DisplayName("confirmMatching uses imported cost after station commission, not NCC defaultImportCost")
    void confirmMatching_originalUnitPriceFromImportedCostNotSupplierDefault() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        settlement.setLotterySupplierId(3L);
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(100L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("880000.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(20L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("176000.000"));
        when(importBatchRepositoryPort.findBySupplierSettlementId(10L)).thenReturn(List.of());
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .originalTicketUnitPrice(m.getOriginalTicketUnitPrice())
                    .reconciledTicketUnitPrice(m.getReconciledTicketUnitPrice())
                    .initialEstimatedSettlementValue(m.getInitialEstimatedSettlementValue())
                    .finalSettlementValue(m.getFinalSettlementValue())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                100,
                new BigDecimal("880000.000"),
                20,
                new BigDecimal("176000.000"),
                new BigDecimal("8800.000"),
                null,
                new BigDecimal("704000.000"),
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);

        assertThat(response.originalTicketUnitPrice()).isEqualByComparingTo("8800.000");
        assertThat(response.reconciledTicketUnitPrice()).isEqualByComparingTo("8800.000");
        // 8800 × (100 − 20) = 704000
        assertThat(response.initialEstimatedSettlementValue()).isEqualByComparingTo("704000.000");
        assertThat(response.finalSettlementValue()).isEqualByComparingTo("704000.000");
        assertThat(response.discrepancyTypes()).isEmpty();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
    }

    @Test
    @DisplayName("confirmMatching with no mismatches goes to READY_FOR_RECALCULATION")
    void confirmMatching_noMismatch() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(50L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("500.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(10L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("100.000"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .originalTicketUnitPrice(m.getOriginalTicketUnitPrice())
                    .reconciledTicketUnitPrice(m.getReconciledTicketUnitPrice())
                    .initialEstimatedSettlementValue(m.getInitialEstimatedSettlementValue())
                    .finalSettlementValue(m.getFinalSettlementValue())
                    .settlementDifferenceAmount(m.getSettlementDifferenceAmount())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                50,
                new BigDecimal("500.000"),
                10,
                new BigDecimal("100.000"),
                new BigDecimal("10.000"),
                null,
                new BigDecimal("400.000"),
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
        assertThat(response.initialEstimatedSettlementValue()).isEqualByComparingTo("400.000");
        assertThat(response.finalSettlementValue()).isEqualByComparingTo("400.000");
        assertThat(response.settlementDifferenceAmount()).isEqualByComparingTo("0.000");
        assertThat(response.discrepancyTypes()).isEmpty();
    }

    @Test
    @DisplayName("confirmMatching keeps ticket total when receipt amount differs and no adjustment is approved")
    void confirmMatching_receiptDifferenceDoesNotChangeFinalSettlement() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(600L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("6000000.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(0L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenReturn(
                SupplierSettlementResponse.builder().id(10L).build()
        );

        supplierSettlementService.confirmMatching(
                10L,
                new ConfirmSettlementMatchingRequest(
                        600,
                        new BigDecimal("6000000.000"),
                        0,
                        BigDecimal.ZERO,
                        new BigDecimal("10000.000"),
                        null,
                        new BigDecimal("500000.000"),
                        List.of()
                ),
                ACTOR
        );

        assertThat(settlement.getFinalSettlementValue()).isEqualByComparingTo("6000000.000");
        assertThat(settlement.getActualPaidAmount()).isEqualByComparingTo("500000.000");
    }

    @Test
    @DisplayName("confirmMatching freezes initial baseline and lowers final when unit price decreases")
    void confirmMatching_priceDecrease_updatesFinalKeepsInitialOnRematch() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        settlement.setInitialEstimatedSettlementValue(new BigDecimal("7200000.000"));
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(1000L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("9000000.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(200L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("1800000.000"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .originalTicketUnitPrice(m.getOriginalTicketUnitPrice())
                    .reconciledTicketUnitPrice(m.getReconciledTicketUnitPrice())
                    .initialEstimatedSettlementValue(m.getInitialEstimatedSettlementValue())
                    .finalSettlementValue(m.getFinalSettlementValue())
                    .settlementDifferenceAmount(m.getSettlementDifferenceAmount())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .importDiscrepancyResolved(m.isImportDiscrepancyResolved())
                    .returnDiscrepancyResolved(m.isReturnDiscrepancyResolved())
                    .unitPriceDiscrepancyResolved(m.isUnitPriceDiscrepancyResolved())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                1000,
                null,
                200,
                null,
                new BigDecimal("8800.000"),
                null,
                new BigDecimal("7040000.000"),
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);

        // Frozen baseline must not be overwritten by rematch recomputation (9000 × 800 = 7_200_000).
        assertThat(response.initialEstimatedSettlementValue()).isEqualByComparingTo("7200000.000");
        assertThat(response.finalSettlementValue()).isEqualByComparingTo("7040000.000");
        assertThat(response.settlementDifferenceAmount()).isEqualByComparingTo("-160000.000");
        assertThat(response.discrepancyTypes()).contains(SupplierSettlementDiscrepancyType.IMPORT_UNIT_PRICE);
        assertThat(response.unitPriceDiscrepancyResolved()).isFalse();
        assertThat(response.importDiscrepancyResolved()).isTrue();
        assertThat(response.returnDiscrepancyResolved()).isTrue();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED);
    }

    @Test
    @DisplayName("confirmMatching return-qty only does not require import resolution")
    void confirmMatching_returnQuantityOnly_doesNotFlagImport() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(100L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("1000000.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(40L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("400000.000"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .discrepancyItems(m.getDiscrepancyItems() == null ? java.util.List.of() : m.getDiscrepancyItems().stream()
                            .map(item -> com.daiphat.coreapi.application.dto.response.lotteries.SettlementDiscrepancyItemResponse.builder()
                                    .type(item.getType())
                                    .direction(item.getDirection())
                                    .difference(item.getDifference())
                                    .unit(item.getUnit())
                                    .build())
                            .toList())
                    .importDiscrepancyResolved(m.isImportDiscrepancyResolved())
                    .returnDiscrepancyResolved(m.isReturnDiscrepancyResolved())
                    .unitPriceDiscrepancyResolved(m.isUnitPriceDiscrepancyResolved())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                100,
                new BigDecimal("1000000.000"),
                30,
                new BigDecimal("300000.000"),
                new BigDecimal("10000.000"),
                null,
                new BigDecimal("700000.000"),
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);
        assertThat(response.discrepancyTypes()).containsExactly(SupplierSettlementDiscrepancyType.RETURN_QUANTITY);
        assertThat(response.discrepancyItems()).isNotEmpty();
        assertThat(response.discrepancyItems().get(0).direction())
                .isEqualTo(com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyDirection.NEGATIVE);
        assertThat(response.discrepancyItems().get(0).difference()).isEqualByComparingTo("-10");
        assertThat(response.importDiscrepancyResolved()).isTrue();
        assertThat(response.returnDiscrepancyResolved()).isFalse();
        assertThat(response.unitPriceDiscrepancyResolved()).isTrue();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED);
    }

    @Test
    @DisplayName("confirmMatching additional costs change final value but not frozen baseline")
    void confirmMatching_additionalCosts_updateFinalKeepInitial() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(100L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("1000000.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(0L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(BigDecimal.ZERO);
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementAdjustmentRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .initialEstimatedSettlementValue(m.getInitialEstimatedSettlementValue())
                    .finalSettlementValue(m.getFinalSettlementValue())
                    .settlementDifferenceAmount(m.getSettlementDifferenceAmount())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                100,
                new BigDecimal("1000000.000"),
                0,
                BigDecimal.ZERO,
                new BigDecimal("10000.000"),
                null,
                new BigDecimal("1030000.000"),
                List.of(
                        new SettlementMatchingAdjustmentItem(
                                new BigDecimal("50000"),
                                SupplierSettlementAdjustmentReasonCode.SHIPPING_FEE,
                                "Phí vận chuyển",
                                null,
                                null
                        ),
                        new SettlementMatchingAdjustmentItem(
                                new BigDecimal("-20000"),
                                SupplierSettlementAdjustmentReasonCode.DISCOUNT,
                                "Chiết khấu",
                                null,
                                null
                        )
                )
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);

        assertThat(response.initialEstimatedSettlementValue()).isEqualByComparingTo("1000000.000");
        assertThat(response.finalSettlementValue()).isEqualByComparingTo("1030000.000");
        assertThat(response.settlementDifferenceAmount()).isEqualByComparingTo("30000.000");
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
        verify(supplierSettlementAdjustmentRepositoryPort).deleteBySettlementIdAndGroupType(
                10L,
                SupplierSettlementAdjustmentGroupType.SETTLEMENT
        );
    }

    @Test
    @DisplayName("confirmMatching manual OTHER adjustment requires a custom name")
    void confirmMatching_paymentDiffWithoutTicketDiscrepancy_requiresCustomName() {
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(50L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("500.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(10L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("100.000"));

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                50,
                new BigDecimal("500.000"),
                10,
                new BigDecimal("100.000"),
                new BigDecimal("10.000"),
                null,
                new BigDecimal("500.000"),
                List.of(new SettlementMatchingAdjustmentItem(
                        new BigDecimal("100.000"),
                        SupplierSettlementAdjustmentReasonCode.OTHER,
                        SupplierSettlementService.AUTO_PAYMENT_DIFFERENCE_NOTE,
                        "  ",
                        false
                ))
        );

        assertThatThrownBy(() -> supplierSettlementService.confirmMatching(10L, request, ACTOR))
                .isInstanceOf(DomainException.class)
                .extracting("internalMessage")
                .asString()
                .contains("bắt buộc");
    }

    @Test
    @DisplayName("confirmMatching persists a manual OTHER adjustment and includes it in final")
    void confirmMatching_paymentDiffWithoutTicketDiscrepancy_persistsNamedOther() {
        fixedNow();
        SupplierSettlementModel settlement = openSettlement();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(10L)).thenReturn(50L);
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("500.000"));
        when(supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(10L)).thenReturn(10L);
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("100.000"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementAdjustmentRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .initialEstimatedSettlementValue(m.getInitialEstimatedSettlementValue())
                    .finalSettlementValue(m.getFinalSettlementValue())
                    .actualPaidAmount(m.getActualPaidAmount())
                    .settlementDifferenceAmount(m.getSettlementDifferenceAmount())
                    .discrepancyTypes(m.getDiscrepancyTypes())
                    .build();
        });

        ConfirmSettlementMatchingRequest request = new ConfirmSettlementMatchingRequest(
                50,
                new BigDecimal("500.000"),
                10,
                new BigDecimal("100.000"),
                new BigDecimal("10.000"),
                null,
                new BigDecimal("500.000"),
                List.of(new SettlementMatchingAdjustmentItem(
                        new BigDecimal("100.000"),
                        SupplierSettlementAdjustmentReasonCode.OTHER,
                        SupplierSettlementService.AUTO_PAYMENT_DIFFERENCE_NOTE,
                        "Phí phát sinh ngoài kỳ",
                        false
                ))
        );

        SupplierSettlementResponse response = supplierSettlementService.confirmMatching(10L, request, ACTOR);

        assertThat(response.initialEstimatedSettlementValue()).isEqualByComparingTo("400.000");
        assertThat(response.finalSettlementValue()).isEqualByComparingTo("500.000");
        assertThat(response.actualPaidAmount()).isEqualByComparingTo("500.000");
        assertThat(response.discrepancyTypes()).isEmpty();
        verify(supplierSettlementAdjustmentRepositoryPort).save(org.mockito.ArgumentMatchers.argThat(model ->
                model.getGroupType() == SupplierSettlementAdjustmentGroupType.SETTLEMENT
                        && model.getReasonCode() == SupplierSettlementAdjustmentReasonCode.OTHER
                        && !model.isAutoGenerated()
                        && "Phí phát sinh ngoài kỳ".equals(model.getCustomName())
                        && model.getAmount().compareTo(new BigDecimal("100.000")) == 0
        ));
    }

    @Test
    @DisplayName("complete closes when recalculated equals finalSettlementValue")
    void complete_equalAmounts_closes() {
        fixedNow();
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.RECALCULATED)
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .recalculatedTotalPaidAmount(new BigDecimal("700.000"))
                .initialEstimatedSettlementValue(new BigDecimal("650.000"))
                .finalSettlementValue(new BigDecimal("700.000"))
                .actualPaidAmount(new BigDecimal("700.000"))
                .settlementDifferenceAmount(new BigDecimal("50.000"))
                .paymentEvidenceUrls(List.of("/uploads/settlement-paid.jpg"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());
        when(transactionRepositoryPort.save(any())).thenAnswer(invocation -> {
            TransactionModel transaction = invocation.getArgument(0);
            transaction.setId(900L);
            return transaction;
        });
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .status(m.getStatus())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .build();
        });

        SettlementCompleteResultResponse result = supplierSettlementService.completeReconciliation(
                10L,
                new CompleteSettlementReconciliationRequest(null),
                ACTOR
        );

        assertThat(result.completed()).isTrue();
        assertThat(result.settlement().status()).isEqualTo(SupplierSettlementStatus.CLOSED);
        assertThat(result.settlement().reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.COMPLETED);
        assertThat(settlement.getTotalPaidAmount()).isEqualByComparingTo("700.000");
        assertThat(settlement.getRemainingAmount()).isEqualByComparingTo("0.000");
    }

    @Test
    @DisplayName("complete records a supplier refund when the reconciled amount is negative")
    void complete_negativeAmount_recordsSupplierRefund() {
        fixedNow();
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.RECALCULATED)
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .recalculatedTotalPaidAmount(new BigDecimal("-20000.000"))
                .initialEstimatedSettlementValue(BigDecimal.ZERO)
                .finalSettlementValue(new BigDecimal("-20000.000"))
                .actualPaidAmount(new BigDecimal("-20000.000"))
                .settlementDifferenceAmount(new BigDecimal("-20000.000"))
                .paymentEvidenceUrls(List.of("/uploads/settlement-refund.jpg"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());
        when(transactionRepositoryPort.save(any())).thenAnswer(invocation -> {
            TransactionModel transaction = invocation.getArgument(0);
            transaction.setId(901L);
            return transaction;
        });
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(invocation -> {
            SupplierSettlementModel model = invocation.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(model.getId())
                    .status(model.getStatus())
                    .reconciliationPhase(model.getReconciliationPhase())
                    .build();
        });

        SettlementCompleteResultResponse result = supplierSettlementService.completeReconciliation(
                10L,
                new CompleteSettlementReconciliationRequest(null),
                ACTOR
        );

        assertThat(result.completed()).isTrue();
        assertThat(settlement.getTotalPaidAmount()).isEqualByComparingTo("0.000");
        verify(transactionRepositoryPort).save(org.mockito.ArgumentMatchers.argThat(transaction ->
                transaction.getTransactionType() == com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType.SUPPLIER_REFUND
                        && transaction.getAmount().compareTo(new BigDecimal("20000.000")) == 0
        ));
    }

    @Test
    @DisplayName("complete with unequal amounts sets PAYMENT_DISCREPANCY and does not close")
    void complete_unequal_paymentDiscrepancy() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.RECALCULATED)
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .recalculatedTotalPaidAmount(new BigDecimal("700.000"))
                .initialEstimatedSettlementValue(new BigDecimal("700.000"))
                .finalSettlementValue(new BigDecimal("700.000"))
                .actualPaidAmount(new BigDecimal("800.000"))
                .settlementDifferenceAmount(new BigDecimal("0.000"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .status(m.getStatus())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .build();
        });

        SettlementCompleteResultResponse result = supplierSettlementService.completeReconciliation(
                10L,
                new CompleteSettlementReconciliationRequest(null),
                ACTOR
        );

        assertThat(result.completed()).isFalse();
        assertThat(result.remainingDifference()).isEqualByComparingTo("100.000");
        assertThat(result.settlement().status()).isEqualTo(SupplierSettlementStatus.OPEN);
        assertThat(result.settlement().reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY);
    }

    @Test
    @DisplayName("complete rejects unresolved import discrepancy")
    void complete_rejectsUnresolvedImport() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.RECALCULATED)
                .importQuantityMismatch(true)
                .importDiscrepancyResolved(false)
                .returnDiscrepancyResolved(true)
                .recalculatedTotalPaidAmount(new BigDecimal("100.000"))
                .finalSettlementValue(new BigDecimal("100.000"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));

        assertThatThrownBy(() -> supplierSettlementService.completeReconciliation(
                10L,
                new CompleteSettlementReconciliationRequest(null),
                ACTOR
        )).isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("complete rejects when payment evidence photos are missing")
    void complete_equalAmounts_requiresPaymentEvidence() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.RECALCULATED)
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .recalculatedTotalPaidAmount(new BigDecimal("700.000"))
                .initialEstimatedSettlementValue(new BigDecimal("700.000"))
                .finalSettlementValue(new BigDecimal("700.000"))
                .actualPaidAmount(new BigDecimal("700.000"))
                .paymentEvidenceUrls(List.of())
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());

        assertThatThrownBy(() -> supplierSettlementService.completeReconciliation(
                10L,
                new CompleteSettlementReconciliationRequest(null),
                ACTOR
        )).isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("recalculate rejects when return discrepancy still open")
    void recalculate_rejectsOpenReturnDiscrepancy() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION)
                .returnQuantityMismatch(true)
                .returnDiscrepancyResolved(false)
                .importDiscrepancyResolved(true)
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));

        assertThatThrownBy(() -> supplierSettlementService.recalculateReconciliation(10L, ACTOR))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("recalculate keeps the actual matched quantity instead of restoring the live system quantity")
    void recalculate_usesActualMatchedQuantity() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION)
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .actualTicketImportQuantity(90)
                .actualReturnTicketQuantity(40)
                .originalTicketUnitPrice(new BigDecimal("10000.000"))
                .reconciledTicketUnitPrice(new BigDecimal("10000.000"))
                .actualPaidAmount(new BigDecimal("500000.000"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        stubRecalculateAmountsBasics();
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        supplierSettlementService.recalculateReconciliation(10L, ACTOR);

        assertThat(settlement.getRecalculatedTotalPaidAmount()).isEqualByComparingTo("500000.000");
        assertThat(settlement.getFinalSettlementValue()).isEqualByComparingTo("500000.000");
        assertThat(settlement.getReconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.RECALCULATED);
    }

    private void stubRecalculateAmountsBasics() {
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(10L))
                .thenReturn(new BigDecimal("1000000.000"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(10L))
                .thenReturn(new BigDecimal("400000.000"));
    }

    private List<SettlementResolvableSerialRow> resolvableRows(long firstId, int count) {
        return LongStream.range(firstId, firstId + count)
                .mapToObj(id -> new SettlementResolvableSerialRow(
                        id, null, null, null, null, null, null, null
                ))
                .toList();
    }

    @Test
    @DisplayName("resolveImport marks selected settlement serials when the system recorded too many imports")
    void resolveImport_systemOverstated_marksSelectedSerialsResolved() {
        fixedNow();
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .importQuantityMismatch(true)
                .importDiscrepancyResolved(false)
                .returnDiscrepancyResolved(true)
                .discrepancyTypes(List.of(SupplierSettlementDiscrepancyType.IMPORT_QUANTITY))
                .discrepancyItems(List.of(SettlementDiscrepancyItem.ofQuantity(
                        SupplierSettlementDiscrepancyType.IMPORT_QUANTITY, -10
                )))
                .originalTicketUnitPrice(new BigDecimal("10000.000"))
                .systemImportQuantity(100)
                .actualTicketImportQuantity(90)
                .systemImportValue(new BigDecimal("1000000.000"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.findImportResolvableSerialsBySettlementId(10L))
                .thenReturn(resolvableRows(201L, 10));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .importDiscrepancyResolved(m.isImportDiscrepancyResolved())
                    .build();
        });

        ResolveImportDiscrepancyRequest request = new ResolveImportDiscrepancyRequest(
                LongStream.rangeClosed(201L, 210L).boxed().toList(),
                TicketCondition.LOST,
                SupplierSettlementAdjustmentReasonCode.MISSING_IMPORT,
                BigDecimal.ZERO,
                "system overstated import",
                true,
                null,
                null,
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.resolveImportDiscrepancy(10L, request, ACTOR);

        assertThat(response.importDiscrepancyResolved()).isTrue();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
        verify(lotteryTicketSerialServicePort, org.mockito.Mockito.times(10)).reportFault(
                any(), any(), eq(ACTOR)
        );
    }

    @Test
    @DisplayName("resolveImport creates system-missing ticket placeholders by station")
    void resolveImport_systemUnderstated_createsMissingTicketsByStation() {
        fixedNow();
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .importQuantityMismatch(true)
                .importDiscrepancyResolved(false)
                .returnDiscrepancyResolved(true)
                .discrepancyTypes(List.of(SupplierSettlementDiscrepancyType.IMPORT_QUANTITY))
                .discrepancyItems(List.of(SettlementDiscrepancyItem.ofQuantity(
                        SupplierSettlementDiscrepancyType.IMPORT_QUANTITY, 5
                )))
                .originalTicketUnitPrice(new BigDecimal("10000.000"))
                .systemImportQuantity(100)
                .actualTicketImportQuantity(105)
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(discrepancyInventoryHelper.createLostPlaceholders(any(), any(), any(), eq(ACTOR), any(), any(), any(), any()))
                .thenReturn(List.of(301L));
        stubRecalculateAmountsBasics();
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .importDiscrepancyResolved(m.isImportDiscrepancyResolved())
                    .build();
        });

        ResolveImportDiscrepancyRequest request = new ResolveImportDiscrepancyRequest(
                null,
                TicketCondition.LOST,
                SupplierSettlementAdjustmentReasonCode.EXCESS_IMPORT,
                null,
                "excess",
                true,
                List.of(new SettlementImportPlaceholderRequest(5L, 5)),
                null,
                null
        );

        SupplierSettlementResponse response = supplierSettlementService.resolveImportDiscrepancy(10L, request, ACTOR);
        assertThat(response.importDiscrepancyResolved()).isTrue();
        verify(discrepancyInventoryHelper).createLostPlaceholders(
                any(), any(), any(), eq(ACTOR), any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("resolveReturn excess serials create excess return receipt and mark resolved")
    void resolveReturn_excessSerials_callsHelper() {
        fixedNow();
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .returnQuantityMismatch(true)
                .returnDiscrepancyResolved(false)
                .importDiscrepancyResolved(true)
                .discrepancyTypes(List.of(SupplierSettlementDiscrepancyType.RETURN_QUANTITY))
                .discrepancyItems(List.of(SettlementDiscrepancyItem.ofQuantity(
                        SupplierSettlementDiscrepancyType.RETURN_QUANTITY, 2
                )))
                .originalTicketUnitPrice(new BigDecimal("10000.000"))
                .systemImportQuantity(100)
                .systemReturnQuantity(40)
                .actualReturnTicketQuantity(42)
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(discrepancyInventoryHelper.acceptExcessReturnSerials(any(), any(), any(), eq(ACTOR), any()))
                .thenReturn(List.of(401L, 402L));
        stubRecalculateAmountsBasics();
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .returnDiscrepancyResolved(m.isReturnDiscrepancyResolved())
                    .build();
        });

        ResolveReturnDiscrepancyRequest request = new ResolveReturnDiscrepancyRequest(
                null,
                null,
                SupplierSettlementAdjustmentReasonCode.EXCESS_RETURN,
                null,
                "excess return",
                true,
                List.of("SN-A", "SN-B")
        );

        SupplierSettlementResponse response = supplierSettlementService.resolveReturnDiscrepancy(10L, request, ACTOR);
        assertThat(response.returnDiscrepancyResolved()).isTrue();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
        verify(discrepancyInventoryHelper).acceptExcessReturnSerials(any(), any(), any(), eq(ACTOR), any());
    }

    @Test
    @DisplayName("resolveReturn excess without eligible serials records an audited non-serial resolution")
    void resolveReturn_excessWithoutEligibleSerials_marksResolvedWithoutAttachingTickets() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .returnQuantityMismatch(true)
                .returnDiscrepancyResolved(false)
                .importDiscrepancyResolved(true)
                .discrepancyTypes(List.of(SupplierSettlementDiscrepancyType.RETURN_QUANTITY))
                .discrepancyItems(List.of(SettlementDiscrepancyItem.ofQuantity(
                        SupplierSettlementDiscrepancyType.RETURN_QUANTITY, 100
                )))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel model = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(model.getId())
                    .reconciliationPhase(model.getReconciliationPhase())
                    .returnDiscrepancyResolved(model.isReturnDiscrepancyResolved())
                    .build();
        });

        SupplierSettlementResponse response = supplierSettlementService.resolveReturnDiscrepancy(
                10L,
                new ResolveReturnDiscrepancyRequest(
                        null,
                        null,
                        SupplierSettlementAdjustmentReasonCode.EXCESS_RETURN,
                        null,
                        null,
                        true,
                        List.of()
                ),
                ACTOR
        );

        ArgumentCaptor<SupplierSettlementAdjustmentModel> adjustmentCaptor =
                ArgumentCaptor.forClass(SupplierSettlementAdjustmentModel.class);
        verify(supplierSettlementAdjustmentRepositoryPort).save(adjustmentCaptor.capture());
        SupplierSettlementAdjustmentModel adjustment = adjustmentCaptor.getValue();
        assertThat(response.returnDiscrepancyResolved()).isTrue();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
        assertThat(adjustment.getLotteryTicketSerialId()).isNull();
        assertThat(adjustment.getReasonCode()).isEqualTo(SupplierSettlementAdjustmentReasonCode.EXCESS_RETURN);
        assertThat(adjustment.getAmount()).isEqualByComparingTo("0.000");
        assertThat(adjustment.getNote()).contains("không còn vé GOOD đủ điều kiện");
        verify(discrepancyInventoryHelper, never()).acceptExcessReturnSerials(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("resolveReturn system-overstated requires exactly the return-batch serial count")
    void resolveReturn_systemOverstated_requiresExactReturnSerialCount() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .returnQuantityMismatch(true)
                .returnDiscrepancyResolved(false)
                .importDiscrepancyResolved(true)
                .discrepancyTypes(List.of(SupplierSettlementDiscrepancyType.RETURN_QUANTITY))
                .discrepancyItems(List.of(SettlementDiscrepancyItem.ofQuantity(
                        SupplierSettlementDiscrepancyType.RETURN_QUANTITY, -2
                )))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));

        ResolveReturnDiscrepancyRequest request = new ResolveReturnDiscrepancyRequest(
                List.of(401L),
                "LOST",
                SupplierSettlementAdjustmentReasonCode.LOST_DURING_RETURN,
                null,
                "Thực tế không thể trả",
                true,
                null
        );

        assertThatThrownBy(() -> supplierSettlementService.resolveReturnDiscrepancy(10L, request, ACTOR))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("addSettlementMonetaryAdjustment rejects without receipt")
    void addMonetary_rejectsWithoutReceipt() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY)
                .supplierSettlementReceiptUrl(null)
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));

        assertThatThrownBy(() -> supplierSettlementService.addSettlementMonetaryAdjustment(
                10L,
                new AddSettlementMonetaryAdjustmentRequest(
                        new BigDecimal("50000"),
                        SupplierSettlementAdjustmentReasonCode.SHIPPING_FEE,
                        "ship fee"
                ),
                ACTOR
        )).isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("addSettlementMonetaryAdjustment persists SETTLEMENT row when receipt present")
    void addMonetary_withReceipt_savesAdjustment() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY)
                .supplierSettlementReceiptUrl("https://cdn.example/receipt.jpg")
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .actualTicketImportQuantity(1)
                .actualReturnTicketQuantity(0)
                .originalTicketUnitPrice(new BigDecimal("700.000"))
                .reconciledTicketUnitPrice(new BigDecimal("700.000"))
                .remainingAmount(new BigDecimal("700.000"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        stubRecalculateAmountsBasics();
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());
        when(supplierSettlementAdjustmentRepositoryPort.save(any())).thenAnswer(inv -> {
            SupplierSettlementAdjustmentModel adjustment = inv.getArgument(0);
            adjustment.setId(501L);
            return adjustment;
        });
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv ->
                SupplierSettlementResponse.builder().id(10L).build()
        );

        SupplierSettlementAdjustmentResponse response = supplierSettlementService.addSettlementMonetaryAdjustment(
                10L,
                new AddSettlementMonetaryAdjustmentRequest(
                        new BigDecimal("50000"),
                        SupplierSettlementAdjustmentReasonCode.SHIPPING_FEE,
                        "ship fee"
                ),
                ACTOR
        );

        assertThat(response.groupType()).isEqualTo(SupplierSettlementAdjustmentGroupType.SETTLEMENT);
        assertThat(response.reasonCode()).isEqualTo(SupplierSettlementAdjustmentReasonCode.SHIPPING_FEE);
        assertThat(response.amount()).isEqualByComparingTo("50000.000");
    }

    @Test
    @DisplayName("complete from PAYMENT_DISCREPANCY requires receipt")
    void complete_paymentDiscrepancy_requiresReceipt() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY)
                .importDiscrepancyResolved(true)
                .returnDiscrepancyResolved(true)
                .recalculatedTotalPaidAmount(new BigDecimal("700.000"))
                .finalSettlementValue(new BigDecimal("700.000"))
                .actualPaidAmount(new BigDecimal("700.000"))
                .supplierSettlementReceiptUrl(null)
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementAdjustmentRepositoryPort.findBySettlementId(10L)).thenReturn(List.of());

        assertThatThrownBy(() -> supplierSettlementService.completeReconciliation(
                10L,
                new CompleteSettlementReconciliationRequest(null),
                ACTOR
        )).isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("resolveUnitPrice marks only unit-price resolved and leaves import/return pending")
    void resolveUnitPrice_doesNotResolveQuantityDiscrepancies() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .discrepancyTypes(List.of(
                        SupplierSettlementDiscrepancyType.IMPORT_UNIT_PRICE,
                        SupplierSettlementDiscrepancyType.IMPORT_QUANTITY
                ))
                .unitPriceDiscrepancyResolved(false)
                .importQuantityMismatch(true)
                .importDiscrepancyResolved(false)
                .returnDiscrepancyResolved(true)
                .originalTicketUnitPrice(new BigDecimal("10000.000"))
                .reconciledTicketUnitPrice(new BigDecimal("8800.000"))
                .actualTicketImportQuantity(100)
                .actualReturnTicketQuantity(20)
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementAdjustmentRepositoryPort.save(any())).thenAnswer(inv -> {
            SupplierSettlementAdjustmentModel m = inv.getArgument(0);
            m.setId(701L);
            return m;
        });
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .importDiscrepancyResolved(m.isImportDiscrepancyResolved())
                    .returnDiscrepancyResolved(m.isReturnDiscrepancyResolved())
                    .unitPriceDiscrepancyResolved(m.isUnitPriceDiscrepancyResolved())
                    .build();
        });

        SupplierSettlementResponse response = supplierSettlementService.resolveUnitPriceDiscrepancy(
                10L,
                new ResolveUnitPriceDiscrepancyRequest("xác nhận giá", true),
                ACTOR
        );

        assertThat(response.unitPriceDiscrepancyResolved()).isTrue();
        assertThat(response.importDiscrepancyResolved()).isFalse();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.RESOLVING_IMPORT_DISCREPANCY);
    }

    @Test
    @DisplayName("resolveImport does not mark unit-price discrepancy resolved")
    void resolveImport_doesNotResolveUnitPrice() {
        fixedNow();
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(10L)
                .status(SupplierSettlementStatus.OPEN)
                .reconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED)
                .discrepancyTypes(List.of(
                        SupplierSettlementDiscrepancyType.IMPORT_UNIT_PRICE,
                        SupplierSettlementDiscrepancyType.IMPORT_QUANTITY
                ))
                .discrepancyItems(List.of(
                        SettlementDiscrepancyItem.ofQuantity(SupplierSettlementDiscrepancyType.IMPORT_QUANTITY, -10),
                        SettlementDiscrepancyItem.ofUnitPrice(new BigDecimal("-1200.000"))
                ))
                .importQuantityMismatch(true)
                .importDiscrepancyResolved(false)
                .unitPriceDiscrepancyResolved(false)
                .returnDiscrepancyResolved(true)
                .originalTicketUnitPrice(new BigDecimal("10000.000"))
                .systemImportQuantity(100)
                .actualTicketImportQuantity(90)
                .systemImportValue(new BigDecimal("1000000.000"))
                .build();
        when(supplierSettlementRepositoryPort.findById(10L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.findImportResolvableSerialsBySettlementId(10L))
                .thenReturn(resolvableRows(201L, 10));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supplierSettlementApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            SupplierSettlementModel m = inv.getArgument(0);
            return SupplierSettlementResponse.builder()
                    .id(m.getId())
                    .reconciliationPhase(m.getReconciliationPhase())
                    .importDiscrepancyResolved(m.isImportDiscrepancyResolved())
                    .unitPriceDiscrepancyResolved(m.isUnitPriceDiscrepancyResolved())
                    .build();
        });

        ResolveImportDiscrepancyRequest request = new ResolveImportDiscrepancyRequest(
                LongStream.rangeClosed(201L, 210L).boxed().toList(),
                TicketCondition.LOST,
                SupplierSettlementAdjustmentReasonCode.MISSING_IMPORT,
                BigDecimal.ZERO,
                "system overstated import",
                true,
                null, null, null);

        SupplierSettlementResponse response = supplierSettlementService.resolveImportDiscrepancy(10L, request, ACTOR);
        assertThat(response.importDiscrepancyResolved()).isTrue();
        assertThat(response.unitPriceDiscrepancyResolved()).isFalse();
        assertThat(response.reconciliationPhase())
                .isEqualTo(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED);
    }
}

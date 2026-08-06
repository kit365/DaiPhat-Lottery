package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.service.streetagent.VendorDepositCalculator;
import com.daiphat.coreapi.domain.service.streetagent.VendorSettlementCalculator;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class VendorAllocationBatchModel {
    private Long id;
    private String batchCode;
    private Long streetAgentProfileId;
    private LocalDate businessDate;
    @Builder.Default private AllocationBatchType batchType = AllocationBatchType.STREET_AGENT;
    @Builder.Default private AllocationBatchStatus status = AllocationBatchStatus.DRAFT;
    private LocalDateTime reservationExpiresAt;
    private BigDecimal faceValueSnapshot;
    private BigDecimal vendorUnitPriceSnapshot;
    private BigDecimal depositRateSnapshot;
    private VendorLateReturnPolicy latePolicySnapshot;
    private LocalTime returnCutoffSnapshot;
    private int allocatedQuantity;
    private int returnedQuantity;
    private int soldQuantity;
    private BigDecimal depositRequiredAmount;
    private BigDecimal depositReceivedAmount;
    private BigDecimal grossCashRemitted;
    private BigDecimal commissionPayable;
    private BigDecimal depositRefundAmount;
    private BigDecimal depositForfeitedAmount;
    private BigDecimal forcedPurchaseAmount;
    private BigDecimal additionalAmountDue;
    private BigDecimal depositBalanceBefore;
    private BigDecimal depositBalanceAfter;
    private LocalDateTime depositReceivedAt;
    private UUID depositReceivedBy;
    private LocalDateTime settledAt;
    private UUID settledBy;
    private String luckyOverrideReason;
    @Builder.Default private List<VendorAllocationBatchDetailModel> details = new ArrayList<>();
    @Builder.Default private List<VendorAllocationSerialModel> serials = new ArrayList<>();

    public static VendorAllocationBatchModel createDraft(
            String batchCode, Long profileId, LocalDate businessDate,
            LocalDateTime reservationExpiresAt, List<VendorAllocationSerialModel> serials,
            String luckyOverrideReason
    ) {
        if (serials == null || serials.isEmpty() || reservationExpiresAt == null) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        serials.forEach(serial -> serial.reserveForDraft(reservationExpiresAt));
        Map<Long, Long> quantities = serials.stream().collect(java.util.stream.Collectors.groupingBy(
                VendorAllocationSerialModel::getStationId, LinkedHashMap::new, java.util.stream.Collectors.counting()));
        return VendorAllocationBatchModel.builder()
                .batchCode(batchCode).streetAgentProfileId(profileId).businessDate(businessDate)
                .status(AllocationBatchStatus.DRAFT).reservationExpiresAt(reservationExpiresAt)
                .allocatedQuantity(serials.size()).luckyOverrideReason(luckyOverrideReason)
                .serials(serials)
                .details(quantities.entrySet().stream().map(entry -> VendorAllocationBatchDetailModel.builder()
                        .stationId(entry.getKey()).drawDate(businessDate).allocatedQuantity(entry.getValue().intValue()).build()).toList())
                .build();
    }

    public boolean isDraftExpired(LocalDateTime now) {
        return status == AllocationBatchStatus.DRAFT && (now == null || !now.isBefore(reservationExpiresAt));
    }

    public void confirmHandover(
            LocalDateTime now, BigDecimal vendorUnitPrice, BigDecimal depositRate,
            VendorLateReturnPolicy latePolicy, LocalTime returnCutoff,
            BigDecimal depositReceivedAmount, BigDecimal depositBalanceBefore, UUID operatorId
    ) {
        if (status != AllocationBatchStatus.DRAFT || isDraftExpired(now) || serials.isEmpty()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        BigDecimal faceValue = serials.getFirst().getFaceValue();
        if (faceValue == null || serials.stream().anyMatch(serial -> !faceValue.equals(serial.getFaceValue()))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        if (vendorUnitPrice == null || vendorUnitPrice.signum() < 0 || vendorUnitPrice.compareTo(faceValue) > 0) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_UNIT_PRICE_EXCEEDS_FACE);
        }
        faceValueSnapshot = faceValue;
        vendorUnitPriceSnapshot = vendorUnitPrice;
        depositRateSnapshot = depositRate;
        latePolicySnapshot = latePolicy;
        returnCutoffSnapshot = returnCutoff;
        BigDecimal required = VendorDepositCalculator.calculate(allocatedQuantity, vendorUnitPrice, depositRate);
        if (depositReceivedAmount == null || depositReceivedAmount.compareTo(required) < 0) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_DEPOSIT_INSUFFICIENT);
        }
        this.depositRequiredAmount = required;
        this.depositReceivedAmount = depositReceivedAmount;
        this.depositBalanceBefore = depositBalanceBefore == null ? BigDecimal.ZERO : depositBalanceBefore;
        this.depositBalanceAfter = this.depositBalanceBefore.add(depositReceivedAmount);
        this.depositReceivedAt = now;
        this.depositReceivedBy = operatorId;
        serials.forEach(VendorAllocationSerialModel::handOver);
        status = AllocationBatchStatus.CONFIRMED;
    }

    public void openReturnSession() {
        if (status != AllocationBatchStatus.CONFIRMED) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        status = AllocationBatchStatus.RETURN_OPEN;
    }

    public void recordReturnedSerials(Collection<Long> serialIds, LocalDateTime returnedAt) {
        if (status != AllocationBatchStatus.RETURN_OPEN || serialIds == null || serialIds.isEmpty()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        Set<Long> uniqueIds = new HashSet<>(serialIds);
        if (uniqueIds.size() != serialIds.size()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        Map<Long, VendorAllocationSerialModel> serialById = serials.stream()
                .collect(java.util.stream.Collectors.toMap(VendorAllocationSerialModel::getSerialId, value -> value));
        for (Long serialId : uniqueIds) {
            VendorAllocationSerialModel serial = serialById.get(serialId);
            if (serial == null) {
                throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
            }
            serial.returnFromStreetAgent(returnedAt);
        }
        recalculateQuantities();
    }

    public VendorSettlementCalculator.Result previewSettlement(LocalDateTime now) {
        if (status != AllocationBatchStatus.RETURN_OPEN) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        recalculateQuantities();
        return VendorSettlementCalculator.calculate(
                allocatedQuantity, returnedQuantity, faceValueSnapshot, vendorUnitPriceSnapshot,
                depositReceivedAmount, isLate(now), latePolicySnapshot);
    }

    public VendorSettlementCalculator.Result settle(LocalDateTime now, BigDecimal profileBalanceBefore, UUID operatorId) {
        VendorSettlementCalculator.Result result = previewSettlement(now);
        BigDecimal held = depositReceivedAmount == null ? BigDecimal.ZERO : depositReceivedAmount;
        BigDecimal before = profileBalanceBefore == null ? BigDecimal.ZERO : profileBalanceBefore;
        if (before.compareTo(held) < 0) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        serials.stream().filter(serial -> serial.getStatus() == AllocationSerialStatus.HANDED_OVER)
                .forEach(VendorAllocationSerialModel::markSoldAtSettlement);
        recalculateQuantities();
        grossCashRemitted = result.grossCashRemitted();
        commissionPayable = result.commissionPayable();
        depositRefundAmount = result.depositRefundAmount();
        depositForfeitedAmount = result.depositForfeitedAmount();
        forcedPurchaseAmount = result.forcedPurchaseAmount();
        additionalAmountDue = result.additionalAmountDue();
        depositBalanceBefore = before;
        depositBalanceAfter = before.subtract(held);
        settledAt = now;
        settledBy = operatorId;
        status = isLate(now) ? AllocationBatchStatus.LATE_SETTLED : AllocationBatchStatus.SETTLED;
        return result;
    }

    private boolean isLate(LocalDateTime now) {
        return now != null && returnCutoffSnapshot != null
                && now.isAfter(businessDate.atTime(returnCutoffSnapshot));
    }

    private void recalculateQuantities() {
        returnedQuantity = (int) serials.stream().filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURNED).count();
        soldQuantity = allocatedQuantity - returnedQuantity;
        Map<Long, int[]> byStation = new HashMap<>();
        serials.forEach(serial -> {
            int[] quantities = byStation.computeIfAbsent(serial.getStationId(), ignored -> new int[2]);
            quantities[0]++;
            if (serial.getStatus() == AllocationSerialStatus.RETURNED) quantities[1]++;
        });
        details.forEach(detail -> {
            int[] quantities = byStation.getOrDefault(detail.getStationId(), new int[2]);
            detail.setAllocatedQuantity(quantities[0]);
            detail.setReturnedQuantity(quantities[1]);
            detail.setSoldQuantity(quantities[0] - quantities[1]);
        });
    }

    public void releaseDraft(AllocationBatchStatus terminalStatus) {
        releaseDraft(terminalStatus, serial -> serial.getDrawDate() != null && serial.isPastDrawNow());
    }

    public void releaseDraft(AllocationBatchStatus terminalStatus, java.util.function.Function<VendorAllocationSerialModel, Boolean> expireAfterRelease) {
        if (status != AllocationBatchStatus.DRAFT || (terminalStatus != AllocationBatchStatus.CANCELLED && terminalStatus != AllocationBatchStatus.EXPIRED)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        serials.forEach(serial -> serial.releaseDraftReservation(Boolean.TRUE.equals(expireAfterRelease.apply(serial))));
        status = terminalStatus;
    }

    public boolean hasAnySerialPastDraw() {
        return serials.stream().anyMatch(VendorAllocationSerialModel::isPastDrawNow);
    }
}

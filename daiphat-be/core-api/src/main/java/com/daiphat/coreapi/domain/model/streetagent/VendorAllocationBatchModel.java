package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.service.streetagent.VendorDepositCalculator;
import com.daiphat.coreapi.domain.service.streetagent.VendorSettlementCalculator;
import com.daiphat.coreapi.domain.service.streetagent.VendorAllocationSuggestionBuilder;
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
    private Integer requestedQuantity;
    private Integer reserveCountSnapshot;
    private BigDecimal reservePercentSnapshot;
    private BigDecimal faceValueSnapshot;
    private BigDecimal vendorUnitPriceSnapshot;
    private BigDecimal commissionRateSnapshot;
    private BigDecimal depositRateSnapshot;
    private VendorLateReturnPolicy latePolicySnapshot;
    private LocalTime returnCutoffSnapshot;
    private LocalTime supplierReturnCutoffSnapshot;
    private Integer returnBufferMinutesSnapshot;
    /** Exact handover/return deadline snapshot. May be on the previous calendar day. */
    private LocalDateTime effectiveHandoverDeadlineAt;
    private int allocatedQuantity;
    private int returnedQuantity;
    private int soldQuantity;
    private BigDecimal depositRequiredAmount;
    private BigDecimal depositReceivedAmount;
    private BigDecimal grossCashRemitted;
    private BigDecimal commissionPayable;
    private BigDecimal depositRefundAmount;
    private BigDecimal depositForfeitedAmount;
    private BigDecimal depositAppliedAmount;
    private BigDecimal depositExcessRefundAmount;
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
        return createDraft(batchCode, profileId, businessDate, reservationExpiresAt, serials,
                luckyOverrideReason, serials == null ? 0 : serials.size(),
                new VendorAllocationSuggestionBuilder.ReservePolicy(0, BigDecimal.ZERO));
    }

    public static VendorAllocationBatchModel createDraft(
            String batchCode, Long profileId, LocalDate businessDate,
            LocalDateTime reservationExpiresAt, List<VendorAllocationSerialModel> serials,
            String luckyOverrideReason, int requestedQuantity,
            VendorAllocationSuggestionBuilder.ReservePolicy reservePolicy
    ) {
        return createDraft(batchCode, profileId, businessDate, LocalDateTime.now(), reservationExpiresAt,
                serials, luckyOverrideReason, requestedQuantity, reservePolicy);
    }

    /** Uses the command timestamp supplied by the application service. */
    public static VendorAllocationBatchModel createDraft(
            String batchCode, Long profileId, LocalDate businessDate,
            LocalDateTime reservedAt, LocalDateTime reservationExpiresAt, List<VendorAllocationSerialModel> serials,
            String luckyOverrideReason, int requestedQuantity,
            VendorAllocationSuggestionBuilder.ReservePolicy reservePolicy
    ) {
        if (serials == null || serials.isEmpty() || reservationExpiresAt == null) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        serials.forEach(serial -> serial.reserveForDraft(reservedAt, reservationExpiresAt));
        Map<Long, Long> quantities = serials.stream().collect(java.util.stream.Collectors.groupingBy(
                VendorAllocationSerialModel::getStationId, LinkedHashMap::new, java.util.stream.Collectors.counting()));
        return VendorAllocationBatchModel.builder()
                .batchCode(batchCode).streetAgentProfileId(profileId).businessDate(businessDate)
                .status(AllocationBatchStatus.DRAFT).reservationExpiresAt(reservationExpiresAt)
                .requestedQuantity(requestedQuantity).reserveCountSnapshot(reservePolicy.fixedReserve())
                .reservePercentSnapshot(reservePolicy.reservePercent())
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
            LocalTime supplierReturnCutoff, Integer returnBufferMinutes, LocalDateTime effectiveHandoverDeadlineAt,
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
        supplierReturnCutoffSnapshot = supplierReturnCutoff;
        returnBufferMinutesSnapshot = returnBufferMinutes;
        this.effectiveHandoverDeadlineAt = effectiveHandoverDeadlineAt;
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

    /** Compatibility overload for callers created before supplier-window snapshots existed. */
    public void confirmHandover(
            LocalDateTime now, BigDecimal vendorUnitPrice, BigDecimal depositRate,
            VendorLateReturnPolicy latePolicy, LocalTime returnCutoff,
            BigDecimal depositReceivedAmount, BigDecimal depositBalanceBefore, UUID operatorId) {
        confirmHandover(now, vendorUnitPrice, depositRate, latePolicy, returnCutoff, null, null,
                businessDate == null || returnCutoff == null ? null : businessDate.atTime(returnCutoff),
                depositReceivedAmount, depositBalanceBefore, operatorId);
    }

    public void openReturnSession() {
        if (status != AllocationBatchStatus.CONFIRMED) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        status = AllocationBatchStatus.RETURN_OPEN;
    }

    public void stageReturnedSerials(Collection<Long> serialIds) {
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
            serial.stageStreetAgentReturn();
        }
    }

    public void removeStagedReturn(Long serialId) {
        if (status != AllocationBatchStatus.RETURN_OPEN || serialId == null) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        VendorAllocationSerialModel serial = serials.stream()
                .filter(value -> Objects.equals(value.getSerialId(), serialId))
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID));
        serial.removeFromStreetAgentReturnInspection();
    }

    /**
     * Kept only for callers compiled before the two-step vendor return receipt flow.
     * New use-cases must stage the physical tickets, then confirm the inspection.
     */
    @Deprecated(forRemoval = false)
    public void recordReturnedSerials(Collection<Long> serialIds, LocalDateTime returnedAt) {
        stageReturnedSerials(serialIds);
        confirmReturnedSerials(List.of(), returnedAt);
    }

    public void confirmReturnedSerials(Collection<Long> rejectedSerialIds, LocalDateTime returnedAt) {
        Map<Long, String> reasons = rejectedSerialIds == null ? Map.of() : rejectedSerialIds.stream()
                .collect(java.util.stream.Collectors.toMap(id -> id, ignored -> "Từ chối khi kiểm nhận"));
        confirmReturnedSerials(reasons, returnedAt);
    }

    public void confirmReturnedSerials(Map<Long, String> rejectedReasons, LocalDateTime returnedAt) {
        if (status != AllocationBatchStatus.RETURN_OPEN) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        Map<Long, String> rejected = rejectedReasons == null ? Map.of() : new LinkedHashMap<>(rejectedReasons);
        Map<Long, VendorAllocationSerialModel> serialById = serials.stream()
                .collect(java.util.stream.Collectors.toMap(VendorAllocationSerialModel::getSerialId, value -> value));
        if (rejected.keySet().stream().anyMatch(id -> !serialById.containsKey(id)
                || serialById.get(id).getStatus() != AllocationSerialStatus.RETURN_PENDING_INSPECTION)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        if (serials.stream().noneMatch(serial -> serial.getStatus() == AllocationSerialStatus.RETURN_PENDING_INSPECTION)
                || rejected.values().stream().anyMatch(reason -> reason == null || reason.isBlank())) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        serials.stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURN_PENDING_INSPECTION)
                .forEach(serial -> {
                    if (rejected.containsKey(serial.getSerialId())) {
                        serial.rejectStreetAgentReturn(rejected.get(serial.getSerialId()).trim());
                    } else {
                        serial.returnFromStreetAgent(returnedAt);
                    }
                });
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

    public VendorSettlementCalculator.Result settle(
            LocalDateTime settledAt, LocalDateTime returnConfirmedAt,
            BigDecimal profileBalanceBefore, UUID operatorId) {
        VendorSettlementCalculator.Result result = previewSettlement(returnConfirmedAt);
        BigDecimal held = depositReceivedAmount == null ? BigDecimal.ZERO : depositReceivedAmount;
        BigDecimal before = profileBalanceBefore == null ? BigDecimal.ZERO : profileBalanceBefore;
        if (before.compareTo(held) < 0) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        serials.stream().filter(serial -> serial.getStatus() == AllocationSerialStatus.HANDED_OVER
                        || serial.getStatus() == AllocationSerialStatus.RETURN_REJECTED)
                .forEach(serial -> serial.markSoldAtSettlement(settledAt));
        recalculateQuantities();
        grossCashRemitted = result.grossCashRemitted();
        commissionPayable = result.commissionPayable();
        depositRefundAmount = result.depositRefundAmount();
        depositForfeitedAmount = result.depositForfeitedAmount();
        depositAppliedAmount = result.depositAppliedAmount();
        depositExcessRefundAmount = result.depositExcessRefundAmount();
        forcedPurchaseAmount = result.forcedPurchaseAmount();
        additionalAmountDue = result.additionalAmountDue();
        depositBalanceBefore = before;
        depositBalanceAfter = before.subtract(held);
        this.settledAt = settledAt;
        settledBy = operatorId;
        status = isLate(returnConfirmedAt) ? AllocationBatchStatus.LATE_SETTLED : AllocationBatchStatus.SETTLED;
        return result;
    }

    /** Compatibility overload; current application service always passes inspection confirmation time. */
    public VendorSettlementCalculator.Result settle(LocalDateTime now, BigDecimal profileBalanceBefore, UUID operatorId) {
        return settle(now, now, profileBalanceBefore, operatorId);
    }

    private boolean isLate(LocalDateTime now) {
        LocalDateTime deadline = effectiveHandoverDeadlineAt != null
                ? effectiveHandoverDeadlineAt
                : businessDate == null || returnCutoffSnapshot == null
                        ? null
                        : businessDate.atTime(returnCutoffSnapshot);
        return now != null && deadline != null && !now.isBefore(deadline);
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

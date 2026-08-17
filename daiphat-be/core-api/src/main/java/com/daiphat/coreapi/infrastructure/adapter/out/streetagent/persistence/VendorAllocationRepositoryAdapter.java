package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.port.out.streetagent.VendorAllocationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.domain.model.streetagent.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.*;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class VendorAllocationRepositoryAdapter implements VendorAllocationRepositoryPort {
    /** Persistence-only detail; never leak this PostgreSQL constraint name into use cases. */
    private static final String OPEN_BATCH_CONSTRAINT = "uq_allocation_batch_one_open_per_profile";
    private static final String ACTIVE_STOCK_CONSTRAINT = "uq_active_agent_ticket_stock";
    private final AllocationBatchRepository batchRepository;
    private final AgentTicketStockRepository agentTicketStockRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final ReturnBatchLineRepository returnBatchLineRepository;
    private final StreetAgentProfileRepository profileRepository;
    private final LotteryStationRepository stationRepository;

    public boolean existsOpenBatchByProfileId(Long profileId, Collection<AllocationBatchStatus> statuses) { return batchRepository.existsByStreetAgentProfile_IdAndStatusIn(profileId, statuses); }

    @Override
    public Optional<VendorAllocationBatchModel> findOpenByProfileId(Long profileId, Collection<AllocationBatchStatus> statuses) {
        return batchRepository.findOpenByProfileId(profileId, statuses, org.springframework.data.domain.PageRequest.of(0, 1)).stream().findFirst()
                .map(this::batchModel);
    }

    @Override
    public Page<VendorAllocationBatchModel> search(
            Long profileId,
            Collection<AllocationBatchStatus> statuses,
            LocalDate businessDateFrom,
            LocalDate businessDateTo,
            String search,
            LocalDate businessDateToday,
            Pageable pageable) {
        // Sort is applied in the Specification (CASE expressions). Do not also pass Sort on Pageable.
        Pageable unsorted = pageable.isUnpaged()
                ? Pageable.unpaged()
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return batchRepository.findAll((root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (profileId != null) {
                predicates.add(cb.equal(root.get("streetAgentProfile").get("id"), profileId));
            }
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }
            if (businessDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("businessDate"), businessDateFrom));
            }
            if (businessDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("businessDate"), businessDateTo));
            }
            if (search != null && !search.isBlank()) {
                String trimmed = search.trim();
                String likePattern = "%" + trimmed.toLowerCase() + "%";
                var profile = root.get("streetAgentProfile");
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("batchCode")), likePattern),
                        cb.like(cb.lower(cb.concat(
                                cb.concat(profile.get("lastName"), " "),
                                profile.get("firstName")
                        )), likePattern),
                        cb.like(profile.get("phone"), "%" + trimmed + "%")
                ));
            }

            // Count queries must not get ORDER BY.
            if (query != null
                    && !Long.class.equals(query.getResultType())
                    && !long.class.equals(query.getResultType())) {
                // 0 = open/unsettled (DRAFT/CONFIRMED/RETURN_OPEN), 1 = terminal.
                var unsettledRank = cb.<Integer>selectCase()
                        .when(root.get("status").in(
                                AllocationBatchStatus.DRAFT,
                                AllocationBatchStatus.CONFIRMED,
                                AllocationBatchStatus.RETURN_OPEN), 0)
                        .otherwise(1);
                if (businessDateToday != null) {
                    var todayRank = cb.<Integer>selectCase()
                            .when(cb.equal(root.get("businessDate"), businessDateToday), 0)
                            .otherwise(1);
                    query.orderBy(
                            cb.asc(unsettledRank),
                            cb.asc(todayRank),
                            cb.desc(root.get("createdAt")));
                } else {
                    query.orderBy(
                            cb.asc(unsettledRank),
                            cb.desc(root.get("createdAt")));
                }
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        }, unsorted).map(this::batchModelSummary);
    }

    public long sumAllocatedForDay(Long profileId, LocalDate date, Collection<AllocationBatchStatus> statuses) { return batchRepository.sumAllocatedForDay(profileId, date, statuses); }
    public List<VendorAllocationSerialModel> findCandidates(LocalDate drawDate) { return serialRepository.findVendorAllocationCandidates(drawDate).stream().map(this::serialModel).toList(); }
    public List<VendorAllocationSerialModel> lockCandidates(Collection<Long> serialIds) { return serialRepository.findAllByIdForAllocationUpdate(serialIds).stream().map(this::serialModel).toList(); }
    public List<VendorAllocationSerialModel> lockCandidatesForStations(LocalDate drawDate, Collection<Long> stationIds) {
        return serialRepository.lockVendorAllocationCandidatesForStations(drawDate, stationIds).stream().map(this::serialModel).toList();
    }
    public Optional<VendorAllocationBatchModel> findById(Long id) { return batchRepository.findById(id).filter(e -> e.getDeletedAt() == null).map(this::batchModel); }
    public Optional<VendorAllocationBatchModel> findByIdForUpdate(Long id) { return batchRepository.findByIdForUpdate(id).map(this::batchModel); }
    public List<VendorAllocationBatchModel> findExpiredDrafts(LocalDateTime now) { return batchRepository.findExpiredDrafts(now).stream().map(this::batchModel).toList(); }
    public List<VendorAllocationBatchModel> findOpenDrafts() { return batchRepository.findAllDrafts().stream().map(this::batchModel).toList(); }

    public VendorAllocationBatchModel save(VendorAllocationBatchModel model) {
        try {
            return saveInternal(model);
        } catch (DataIntegrityViolationException exception) {
            throw translateConstraint(exception);
        }
    }

    private VendorAllocationBatchModel saveInternal(VendorAllocationBatchModel model) {
        AllocationBatchEntity entity = model.getId() == null ? new AllocationBatchEntity() : batchRepository.findById(model.getId()).orElseThrow();
        entity.setBatchCode(model.getBatchCode()); entity.setBatchType(model.getBatchType()); entity.setBusinessDate(model.getBusinessDate()); entity.setStatus(model.getStatus()); entity.setReservationExpiresAt(model.getReservationExpiresAt()); entity.setRequestedQuantity(model.getRequestedQuantity()); entity.setReserveCountSnapshot(model.getReserveCountSnapshot()); entity.setReservePercentSnapshot(model.getReservePercentSnapshot());
        entity.setFaceValueSnapshot(model.getFaceValueSnapshot()); entity.setVendorUnitPriceSnapshot(model.getVendorUnitPriceSnapshot()); entity.setCommissionRateSnapshot(model.getCommissionRateSnapshot()); entity.setDepositRateSnapshot(model.getDepositRateSnapshot()); entity.setLatePolicySnapshot(model.getLatePolicySnapshot()); entity.setReturnCutoffSnapshot(model.getReturnCutoffSnapshot()); entity.setSupplierReturnCutoffSnapshot(model.getSupplierReturnCutoffSnapshot()); entity.setReturnBufferMinutesSnapshot(model.getReturnBufferMinutesSnapshot()); entity.setEffectiveHandoverDeadlineAt(model.getEffectiveHandoverDeadlineAt()); entity.setAllocatedQuantity(model.getAllocatedQuantity()); entity.setReturnedQuantity(model.getReturnedQuantity()); entity.setSoldQuantity(model.getSoldQuantity()); entity.setDepositRequiredAmount(model.getDepositRequiredAmount()); entity.setDepositReceivedAmount(model.getDepositReceivedAmount()); entity.setGrossCashRemitted(model.getGrossCashRemitted()); entity.setCommissionPayable(model.getCommissionPayable()); entity.setDepositRefundAmount(model.getDepositRefundAmount()); entity.setDepositForfeitedAmount(model.getDepositForfeitedAmount()); entity.setDepositAppliedAmount(model.getDepositAppliedAmount()); entity.setDepositExcessRefundAmount(model.getDepositExcessRefundAmount()); entity.setForcedPurchaseAmount(model.getForcedPurchaseAmount()); entity.setAdditionalAmountDue(model.getAdditionalAmountDue()); entity.setDepositBalanceBefore(model.getDepositBalanceBefore()); entity.setDepositBalanceAfter(model.getDepositBalanceAfter()); entity.setDepositReceivedAt(model.getDepositReceivedAt()); entity.setDepositReceivedBy(model.getDepositReceivedBy()); entity.setSettledAt(model.getSettledAt()); entity.setSettledBy(model.getSettledBy()); entity.setLuckyOverrideReason(model.getLuckyOverrideReason());
        if (entity.getStreetAgentProfile() == null || !Objects.equals(entity.getStreetAgentProfile().getId(), model.getStreetAgentProfileId())) entity.setStreetAgentProfile(profileRepository.getReferenceById(model.getStreetAgentProfileId()));
        if (model.getId() == null) {
            Map<Long, AllocationBatchDetailEntity> details = new HashMap<>();
            for (VendorAllocationBatchDetailModel detail : model.getDetails()) {
                AllocationBatchDetailEntity d = AllocationBatchDetailEntity.builder()
                        .allocationBatch(entity)
                        .lotteryStation(stationRepository.getReferenceById(detail.getStationId()))
                        .drawDate(detail.getDrawDate())
                        .allocatedQuantity(detail.getAllocatedQuantity())
                        .returnedQuantity(detail.getReturnedQuantity())
                        .soldQuantity(detail.getSoldQuantity())
                        .eligibleQuantitySnapshot(detail.getEligibleQuantitySnapshot())
                        .agencyReserveQuantitySnapshot(detail.getAgencyReserveQuantitySnapshot())
                        .vendorCapacitySnapshot(detail.getVendorCapacitySnapshot())
                        .build();
                entity.getDetails().add(d);
                details.put(detail.getStationId(), d);
            }
            AllocationBatchEntity saved = batchRepository.saveAndFlush(entity);
            for (VendorAllocationSerialModel serial : model.getSerials()) {
                LotteryTicketSerialEntity ticketSerial = serialRepository.findById(serial.getSerialId())
                        .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID));
                Long serialTicketId = ticketSerial.getTicket() != null ? ticketSerial.getTicket().getId() : null;
                if (serial.getLotteryTicketId() == null) {
                    serial.setLotteryTicketId(serialTicketId);
                }
                serial.requireTicketMatchesSerial(serialTicketId);
                AllocationBatchDetailEntity detail = details.get(serial.getStationId());
                if (detail == null) {
                    throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
                }
                if (!Objects.equals(detail.getAllocationBatch().getId(), saved.getId())) {
                    throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
                }
                AgentTicketStockEntity item = AgentTicketStockEntity.builder()
                        .allocationBatch(saved)
                        .allocationBatchDetail(detail)
                        .lotteryTicket(ticketSerial.getTicket())
                        .lotteryTicketSerial(ticketSerial)
                        .status(serial.getStatus())
                        .reservedAt(serial.getReservedAt())
                        .reservedExpiresAt(serial.getReservedExpiresAt())
                        .returnedAt(serial.getReturnedAt())
                        .soldAt(serial.getSoldAt())
                        .vendorReturnBatchLine(serial.getVendorReturnBatchLineId() == null ? null : returnBatchLineRepository.getReferenceById(serial.getVendorReturnBatchLineId()))
                        .returnRejectionReason(serial.getReturnRejectionReason())
                        .luckyOverride(serial.isLuckyOverride())
                        .luckyOverrideReason(serial.getLuckyOverrideReason())
                        .luckyOverrideBy(serial.getLuckyOverrideBy())
                        .luckyOverrideAt(serial.getLuckyOverrideAt())
                        .build();
                detail.getAgentTicketStocks().add(item);
            }
            batchRepository.saveAndFlush(saved);
        } else {
            Map<Long, VendorAllocationSerialModel> updates = model.getSerials().stream()
                    .collect(Collectors.toMap(VendorAllocationSerialModel::getId, value -> value, (left, right) -> right));
            agentTicketStockRepository.findByAllocationBatch_Id(entity.getId()).forEach(item -> {
                VendorAllocationSerialModel update = updates.get(item.getId());
                if (update != null) {
                    item.setStatus(update.getStatus());
                    item.setReservedAt(update.getReservedAt());
                    item.setReservedExpiresAt(update.getReservedExpiresAt());
                    item.setReturnedAt(update.getReturnedAt());
                    item.setSoldAt(update.getSoldAt());
                    item.setVendorReturnBatchLine(update.getVendorReturnBatchLineId() == null ? null : returnBatchLineRepository.getReferenceById(update.getVendorReturnBatchLineId()));
                    item.setReturnRejectionReason(update.getReturnRejectionReason());
                    item.setLuckyOverride(update.isLuckyOverride());
                    item.setLuckyOverrideReason(update.getLuckyOverrideReason());
                    item.setLuckyOverrideBy(update.getLuckyOverrideBy());
                    item.setLuckyOverrideAt(update.getLuckyOverrideAt());
                }
            });
        }
        if (model.getId() != null) {
            Map<Long, VendorAllocationBatchDetailModel> details = model.getDetails().stream()
                    .collect(Collectors.toMap(VendorAllocationBatchDetailModel::getId, value -> value, (left, right) -> right));
            entity.getDetails().forEach(detail -> {
                VendorAllocationBatchDetailModel update = details.get(detail.getId());
                if (update != null) {
                    detail.setAllocatedQuantity(update.getAllocatedQuantity());
                    detail.setReturnedQuantity(update.getReturnedQuantity());
                    detail.setSoldQuantity(update.getSoldQuantity());
                    detail.setEligibleQuantitySnapshot(update.getEligibleQuantitySnapshot());
                    detail.setAgencyReserveQuantitySnapshot(update.getAgencyReserveQuantitySnapshot());
                    detail.setVendorCapacitySnapshot(update.getVendorCapacitySnapshot());
                }
            });
        }
        return batchModel(batchRepository.save(entity));
    }

    private RuntimeException translateConstraint(DataIntegrityViolationException exception) {
        String message = exception.getMostSpecificCause() == null
                ? null
                : exception.getMostSpecificCause().getMessage();
        if (message != null && message.contains(OPEN_BATCH_CONSTRAINT)) {
            return new DomainException(ErrorCode.VENDOR_ALLOCATION_OPEN_BATCH_EXISTS);
        }
        if (message != null && message.contains(ACTIVE_STOCK_CONSTRAINT)) {
            return new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        return exception;
    }

    public void saveSerials(List<VendorAllocationSerialModel> serials) {
        for (VendorAllocationSerialModel model : serials) {
            LotteryTicketSerialEntity entity = serialRepository.getReferenceById(model.getSerialId());
            entity.setStatus(model.getTicketStatus()); entity.setReservedByAllocationBatchId(
                    model.getTicketStatus() == LotteryTicketSerialStatus.RESERVED
                            || model.getTicketStatus() == LotteryTicketSerialStatus.WITH_STREET_AGENT
                            ? model.getAllocationBatchId() : null);
            if (model.getTicketStatus() == LotteryTicketSerialStatus.IN_STOCK || model.getTicketStatus() == LotteryTicketSerialStatus.WITH_STREET_AGENT || model.getTicketStatus() == LotteryTicketSerialStatus.SOLD) { entity.setReservedAt(null); entity.setReservationExpiresAt(null); }
            else { entity.setReservedAt(model.getReservedAt()); entity.setReservationExpiresAt(model.getReservedExpiresAt()); }
            entity.setLucky(model.isLucky()); entity.setLuckyBadges(model.getLuckyBadges());
        }
        serialRepository.flush();
    }
    public List<VendorAllocationSerialModel> findAllLiveSerials() { return serialRepository.findAll().stream().filter(e -> e.getDeletedAt() == null).map(this::serialModel).toList(); }

    private VendorAllocationBatchModel batchModel(AllocationBatchEntity e) {
        List<VendorAllocationSerialModel> serials = agentTicketStockRepository.findByAllocationBatch_Id(e.getId()).stream().map(this::stockModel).toList();
        return batchModel(e, serials);
    }

    private VendorAllocationBatchModel batchModelSummary(AllocationBatchEntity e) {
        return batchModel(e, List.of());
    }

    private VendorAllocationBatchModel batchModel(AllocationBatchEntity e, List<VendorAllocationSerialModel> serials) {
        List<VendorAllocationBatchDetailModel> details = e.getDetails().stream().map(d -> VendorAllocationBatchDetailModel.builder().id(d.getId()).stationId(d.getLotteryStation().getId()).drawDate(d.getDrawDate()).allocatedQuantity(d.getAllocatedQuantity()).returnedQuantity(d.getReturnedQuantity()).soldQuantity(d.getSoldQuantity()).eligibleQuantitySnapshot(d.getEligibleQuantitySnapshot()).agencyReserveQuantitySnapshot(d.getAgencyReserveQuantitySnapshot()).vendorCapacitySnapshot(d.getVendorCapacitySnapshot()).build()).toList();
        return VendorAllocationBatchModel.builder().id(e.getId()).batchCode(e.getBatchCode()).streetAgentProfileId(e.getStreetAgentProfile().getId()).businessDate(e.getBusinessDate()).batchType(e.getBatchType()).status(e.getStatus()).reservationExpiresAt(e.getReservationExpiresAt()).requestedQuantity(e.getRequestedQuantity()).reserveCountSnapshot(e.getReserveCountSnapshot()).reservePercentSnapshot(e.getReservePercentSnapshot()).faceValueSnapshot(e.getFaceValueSnapshot()).vendorUnitPriceSnapshot(e.getVendorUnitPriceSnapshot()).commissionRateSnapshot(e.getCommissionRateSnapshot()).depositRateSnapshot(e.getDepositRateSnapshot()).latePolicySnapshot(e.getLatePolicySnapshot()).returnCutoffSnapshot(e.getReturnCutoffSnapshot()).supplierReturnCutoffSnapshot(e.getSupplierReturnCutoffSnapshot()).returnBufferMinutesSnapshot(e.getReturnBufferMinutesSnapshot()).effectiveHandoverDeadlineAt(e.getEffectiveHandoverDeadlineAt()).allocatedQuantity(e.getAllocatedQuantity()).returnedQuantity(e.getReturnedQuantity()).soldQuantity(e.getSoldQuantity()).depositRequiredAmount(e.getDepositRequiredAmount()).depositReceivedAmount(e.getDepositReceivedAmount()).grossCashRemitted(e.getGrossCashRemitted()).commissionPayable(e.getCommissionPayable()).depositRefundAmount(e.getDepositRefundAmount()).depositForfeitedAmount(e.getDepositForfeitedAmount()).depositAppliedAmount(e.getDepositAppliedAmount()).depositExcessRefundAmount(e.getDepositExcessRefundAmount()).forcedPurchaseAmount(e.getForcedPurchaseAmount()).additionalAmountDue(e.getAdditionalAmountDue()).depositBalanceBefore(e.getDepositBalanceBefore()).depositBalanceAfter(e.getDepositBalanceAfter()).depositReceivedAt(e.getDepositReceivedAt()).depositReceivedBy(e.getDepositReceivedBy()).settledAt(e.getSettledAt()).settledBy(e.getSettledBy()).luckyOverrideReason(e.getLuckyOverrideReason()).details(details).serials(serials).build();
    }

    private VendorAllocationSerialModel stockModel(AgentTicketStockEntity item) {
        VendorAllocationSerialModel model = serialModel(item.getLotteryTicketSerial());
        model.setId(item.getId());
        model.setAllocationBatchId(item.getAllocationBatch().getId());
        model.setAllocationBatchDetailId(item.getAllocationBatchDetail().getId());
        model.setLotteryTicketId(item.getLotteryTicket().getId());
        model.setStatus(item.getStatus());
        model.setReservedAt(item.getReservedAt());
        model.setReservedExpiresAt(item.getReservedExpiresAt());
        model.setReturnedAt(item.getReturnedAt());
        model.setSoldAt(item.getSoldAt());
        model.setVendorReturnBatchLineId(item.getVendorReturnBatchLine() == null ? null : item.getVendorReturnBatchLine().getId());
        model.setReturnRejectionReason(item.getReturnRejectionReason());
        model.setLuckyOverride(Boolean.TRUE.equals(item.getLuckyOverride()));
        model.setLuckyOverrideReason(item.getLuckyOverrideReason());
        model.setLuckyOverrideBy(item.getLuckyOverrideBy());
        model.setLuckyOverrideAt(item.getLuckyOverrideAt());
        return model;
    }

    private VendorAllocationSerialModel serialModel(LotteryTicketSerialEntity s) {
        LotteryTicketEntity t = s.getTicket();
        LotteryStationEntity st = t.getStation();
        return VendorAllocationSerialModel.builder()
                .serialId(s.getId())
                .lotteryTicketId(t.getId())
                .stationId(st.getId())
                .stationName(st.getName())
                .ticketNumbers(t.getNumbers())
                .serialNumber(s.getSerialNumber())
                .drawDate(t.getDrawDate())
                .drawTime(st.getDrawTime())
                .supplierReturnCutoffTime(s.getImportBatchLine() != null
                        && s.getImportBatchLine().getImportBatch() != null
                        && s.getImportBatchLine().getImportBatch().getSupplier() != null
                        ? s.getImportBatchLine().getImportBatch().getSupplier().getReturnCutOffTime() : null)
                .drawDays(st.getDrawDays())
                .stationActive(st.isActive())
                .ticketActive(Boolean.TRUE.equals(t.getActive()))
                .ticketAggregateStatus(t.getStatus())
                .faceValue(t.getPriceSnapshot())
                .ticketStatus(s.getStatus())
                .ticketCondition(s.getTicketCondition())
                .returnBatchLineId(s.getReturnBatchLineId())
                .lucky(s.isLucky())
                .luckyBadges(s.getLuckyBadges())
                .build();
    }
}

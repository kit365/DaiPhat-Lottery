package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorNoReturnRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.RejectedVendorReturnSerialRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.SettleVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.*;
import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import com.daiphat.coreapi.application.port.in.streetagent.VendorSettlementProjectionServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketAggregateSyncUseCase;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorAllocationRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorDepositTransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.*;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.domain.model.streetagent.*;
import com.daiphat.coreapi.domain.service.streetagent.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class VendorAllocationService implements VendorAllocationServicePort {
    private static final List<AllocationBatchStatus> OPEN = Arrays.stream(AllocationBatchStatus.values())
            .filter(AllocationBatchStatus::isOpen)
            .toList();
    private static final List<AllocationBatchStatus> CAP_CONSUMING = Arrays.stream(AllocationBatchStatus.values())
            .filter(AllocationBatchStatus::isCapConsuming)
            .toList();

    private final VendorAllocationRepositoryPort vendorAllocationRepositoryPort;
    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final VendorSettlementProjectionServicePort vendorSettlementProjectionServicePort;
    private final VendorConfidencePolicyResolver vendorConfidencePolicyResolver;
    private final VendorOperationalTimingResolver vendorOperationalTimingResolver;
    private final LotteryTicketAggregateSyncUseCase lotteryTicketAggregateSyncUseCase;
    private final VendorDepositTransactionRepositoryPort vendorDepositTransactionRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;

    @Autowired
    public VendorAllocationService(
            VendorAllocationRepositoryPort vendorAllocationRepositoryPort,
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            SystemConfigRepositoryPort systemConfigRepositoryPort,
            VendorSettlementProjectionServicePort vendorSettlementProjectionServicePort,
            VendorConfidencePolicyResolver vendorConfidencePolicyResolver,
            VendorOperationalTimingResolver vendorOperationalTimingResolver,
            LotteryTicketAggregateSyncUseCase lotteryTicketAggregateSyncUseCase,
            VendorDepositTransactionRepositoryPort vendorDepositTransactionRepositoryPort,
            ReturnBatchRepositoryPort returnBatchRepositoryPort) {
        this.vendorAllocationRepositoryPort = vendorAllocationRepositoryPort;
        this.streetAgentProfileRepositoryPort = streetAgentProfileRepositoryPort;
        this.systemConfigRepositoryPort = systemConfigRepositoryPort;
        this.vendorSettlementProjectionServicePort = vendorSettlementProjectionServicePort;
        this.vendorConfidencePolicyResolver = vendorConfidencePolicyResolver;
        this.vendorOperationalTimingResolver = vendorOperationalTimingResolver;
        this.lotteryTicketAggregateSyncUseCase = lotteryTicketAggregateSyncUseCase;
        this.vendorDepositTransactionRepositoryPort = vendorDepositTransactionRepositoryPort;
        this.returnBatchRepositoryPort = returnBatchRepositoryPort;
    }

    @Override @Transactional(readOnly = true)
    public List<VendorAllocationCandidateResponse> getCandidates(Long profileId, LocalDate businessDate) {
        LocalDateTime commandNow = now();
        vendorOperationalTimingResolver.requireConfiguredVendorCutoffOpen(businessDate, commandNow);
        requireEligible(profile(profileId), businessDate);
        VendorAllocationSuggestionBuilder.ReservePolicy reserve = counterReservePolicy();
        List<VendorAllocationSerialModel> serials = sellableCandidates(businessDate, commandNow);
        return VendorAllocationSuggestionBuilder.annotate(serials, reserve).stream()
                .map(item -> response(item.serial(), item.vendorEligible(), item.blockedReason()))
                .toList();
    }

    @Override @Transactional(readOnly = true)
    public VendorAllocationSuggestionResponse getSuggestion(Long profileId, LocalDate businessDate, Integer requestedQuantity) {
        return getSuggestion(profileId, businessDate, requestedQuantity, null);
    }

    @Override @Transactional(readOnly = true)
    public VendorAllocationSuggestionResponse getSuggestion(
            Long profileId, LocalDate businessDate, Integer requestedQuantity, BigDecimal faceValue) {
        LocalDateTime commandNow = now();
        vendorOperationalTimingResolver.requireBusinessDateCurrentOrFuture(businessDate, commandNow);
        StreetAgentProfileModel profile = profile(profileId);
        requireEligible(profile, businessDate);
        int remaining = remainingCap(profile, businessDate);
        int requested = requestedQuantity == null ? remaining : requestedQuantity;
        if (requested < 0) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        LocalTime vendorCutoff = vendorOperationalTimingResolver.configuredVendorCutoff();
        if (!commandNow.isBefore(businessDate.atTime(vendorCutoff))) {
            VendorAllocationSuggestionBuilder.Suggestion blockedSuggestion =
                    VendorAllocationSuggestionBuilder.blocked(
                            requested, remaining, counterReservePolicy(),
                            VendorTicketSellabilityPolicy.BLOCKED_RETURN_CUTOFF_REACHED);
            return toSuggestionResponse(blockedSuggestion, faceValue, List.of(), List.of(),
                    businessDate.atTime(vendorCutoff), commandNow);
        }
        List<VendorAllocationSerialModel> raw = vendorAllocationRepositoryPort.findCandidates(businessDate);
        List<VendorAllocationSerialModel> eligibleCandidates = filterSellable(raw, businessDate, commandNow);
        List<BigDecimal> availableFaceValues = eligibleCandidates.stream()
                .map(VendorAllocationSerialModel::getFaceValue)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();
        BigDecimal selectedFaceValue = faceValue != null
                ? faceValue
                : availableFaceValues.size() == 1 ? availableFaceValues.get(0) : null;
        List<VendorAllocationSerialModel> denominationCandidates = selectedFaceValue == null
                ? eligibleCandidates
                : eligibleCandidates.stream()
                        .filter(serial -> serial.getFaceValue() != null
                                && serial.getFaceValue().compareTo(selectedFaceValue) == 0)
                        .toList();
        List<VendorAllocationSerialModel> serials = denominationCandidates;
        if (!serials.isEmpty()) {
            try {
                VendorOperationalTimingResolver.OperationalTiming timing =
                        vendorOperationalTimingResolver.resolveForHandover(businessDate, serials, commandNow);
                if (!commandNow.isBefore(timing.effectiveDeadline())) {
                    VendorAllocationSuggestionBuilder.Suggestion blockedSuggestion =
                            VendorAllocationSuggestionBuilder.blocked(
                                    requested, remaining, counterReservePolicy(),
                                    VendorTicketSellabilityPolicy.BLOCKED_OPERATIONAL_DEADLINE_REACHED);
                    return toSuggestionResponse(blockedSuggestion, selectedFaceValue, availableFaceValues, raw,
                            timing.effectiveDeadline(), commandNow);
                }
            } catch (DomainException ex) {
                if (ex.getErrorCode() == ErrorCode.VENDOR_ALLOCATION_SUPPLIER_RETURN_CUTOFF_MISSING) {
                    VendorAllocationSuggestionBuilder.Suggestion blockedSuggestion =
                            VendorAllocationSuggestionBuilder.blocked(
                                    requested, remaining, counterReservePolicy(),
                                    VendorTicketSellabilityPolicy.BLOCKED_SUPPLIER_RETURN_CUTOFF_MISSING);
                    return toSuggestionResponse(blockedSuggestion, selectedFaceValue, availableFaceValues, raw,
                            businessDate.atTime(vendorCutoff), commandNow);
                }
                throw ex;
            }
        }
        String blockedReason = serials.isEmpty()
                ? VendorTicketSellabilityPolicy.resolveBlockedReason(
                        businessDate,
                        remaining,
                        faceValue == null ? raw : denominationCandidates,
                        commandNow)
                : null;
        VendorAllocationSuggestionBuilder.Suggestion suggestion =
                VendorAllocationSuggestionBuilder.build(serials, remaining, requested, counterReservePolicy(), blockedReason);
        LocalDateTime displayedDeadline = serials.isEmpty() ? businessDate.atTime(vendorCutoff)
                : vendorOperationalTimingResolver.resolveForHandover(businessDate, serials, commandNow).effectiveDeadline();
        return toSuggestionResponse(suggestion, selectedFaceValue, availableFaceValues, raw, displayedDeadline, commandNow);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse createDraft(CreateVendorAllocationDraftRequest request, boolean canOverrideLuckyTicket) {
        LocalDateTime commandNow = now();
        vendorOperationalTimingResolver.requireConfiguredVendorCutoffOpen(request.businessDate(), commandNow);
        StreetAgentProfileModel profile = profileForUpdate(request.streetAgentProfileId());
        requireEligible(profile, request.businessDate());
        Set<Long> ids = new LinkedHashSet<>(request.serialIds());
        if (ids.size() != request.serialIds().size()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        int remaining = remainingCap(profile, request.businessDate());
        if (ids.size() > remaining) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_EXCEEDED);
        }
        // Lock all station inventory first (station id order in repository) and only then selected
        // serials. This matches every draft transaction's lock ordering and avoids AB/BA deadlocks.
        List<VendorAllocationSerialModel> selectedPreview = vendorAllocationRepositoryPort.findCandidates(request.businessDate()).stream()
                .filter(candidate -> ids.contains(candidate.getSerialId()))
                .toList();
        if (selectedPreview.size() != ids.size()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        List<VendorAllocationSerialModel> lockedStationInventory = vendorAllocationRepositoryPort.lockCandidatesForStations(
                request.businessDate(), selectedPreview.stream().map(VendorAllocationSerialModel::getStationId).distinct().sorted().toList());
        List<VendorAllocationSerialModel> serials = vendorAllocationRepositoryPort.lockCandidates(ids.stream().sorted().toList());
        if (serials.size() != ids.size() || serials.stream().anyMatch(s -> !s.isEligibleForDraft(request.businessDate(), commandNow))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        if (request.faceValue() != null && serials.stream().anyMatch(s -> s.getFaceValue() == null
                || s.getFaceValue().compareTo(request.faceValue()) != 0)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        boolean lucky = serials.stream().anyMatch(VendorAllocationSerialModel::isLucky);
        if (lucky && (!canOverrideLuckyTicket || blank(request.luckyOverrideReason()))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LUCKY_OVERRIDE_REQUIRED);
        }
        if (serials.stream().map(VendorAllocationSerialModel::getFaceValue).filter(Objects::nonNull).distinct().count() != 1) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        VendorOperationalTimingResolver.OperationalTiming timing =
                vendorOperationalTimingResolver.resolveForHandover(request.businessDate(), serials, commandNow);
        vendorOperationalTimingResolver.requireHandoverDeadlineOpen(timing, commandNow);
        int requested = request.requestedQuantity() == null ? ids.size() : request.requestedQuantity();
        BigDecimal selectedFaceValue = serials.stream()
                .map(VendorAllocationSerialModel::getFaceValue)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        List<VendorAllocationSerialModel> lockedEligibleInventory = filterSellable(
                lockedStationInventory, request.businessDate(), commandNow).stream()
                .filter(candidate -> selectedFaceValue == null
                        || (candidate.getFaceValue() != null
                        && candidate.getFaceValue().compareTo(selectedFaceValue) == 0))
                .toList();
        VendorAllocationSuggestionBuilder.Suggestion lockedQuote = VendorAllocationSuggestionBuilder.build(
                lockedEligibleInventory, remaining, requested, counterReservePolicy(), null);
        if (ids.size() > lockedQuote.allowedQuantity()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_COUNTER_RESERVE_VIOLATED);
        }
        if (lockedQuote.shortfallQuantity() > 0 && !Boolean.TRUE.equals(request.acceptShortfall())) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SHORTFALL_CONFIRMATION_REQUIRED);
        }
        if (ids.size() != lockedQuote.allowedQuantity()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SUGGESTION_STALE);
        }
        Map<Long, Long> selectedByStation = serials.stream().collect(Collectors.groupingBy(
                VendorAllocationSerialModel::getStationId, Collectors.counting()));
        Map<Long, Integer> quotaByStation = lockedQuote.stations().stream().collect(Collectors.toMap(
                VendorAllocationSuggestionBuilder.StationSuggestion::stationId,
                VendorAllocationSuggestionBuilder.StationSuggestion::suggestedCount));
        if (selectedByStation.entrySet().stream().anyMatch(entry -> entry.getValue() > quotaByStation.getOrDefault(entry.getKey(), 0))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_COUNTER_RESERVE_VIOLATED);
        }
        VendorDraftReservation reservation = VendorDraftReservation.create(
                commandNow,
                integerConfig(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES));
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft(
                "VND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                profile.getId(), request.businessDate(), commandNow, reservation.expiresAt(), serials,
                lucky ? request.luckyOverrideReason().trim() : null,
                requested, counterReservePolicy());
        Map<Long, VendorAllocationSuggestionBuilder.StationSuggestion> stationQuotes = lockedQuote.stations().stream()
                .collect(Collectors.toMap(VendorAllocationSuggestionBuilder.StationSuggestion::stationId, value -> value));
        batch.getDetails().forEach(detail -> {
            VendorAllocationSuggestionBuilder.StationSuggestion quote = stationQuotes.get(detail.getStationId());
            if (quote != null) {
                detail.setEligibleQuantitySnapshot(quote.normalEligibleQuantity());
                detail.setAgencyReserveQuantitySnapshot(quote.effectiveAgencyReserveQuantity());
                detail.setVendorCapacitySnapshot(quote.vendorCapacity());
            }
        });
        try {
            VendorAllocationBatchModel saved = vendorAllocationRepositoryPort.save(batch);
            serials.forEach(s -> s.markReservedByBatch(saved.getId()));
            saveSerialsAndSync(serials);
            return batchResponse(saved, remaining - serials.size(), null, null);
        } catch (DataIntegrityViolationException ex) {
            if (isOpenBatchConstraint(ex)) {
                throw new DomainException(ErrorCode.VENDOR_ALLOCATION_OPEN_BATCH_EXISTS);
            }
            throw ex;
        }
    }

    @Override @Transactional(readOnly = true)
    public VendorAllocationBatchResponse getById(Long id) {
        VendorAllocationBatchModel batch = batch(id);
        return batchResponse(batch, remaining(batch), null, null);
    }

    @Override
    @Transactional
    public VendorConfirmationQuoteResponse getConfirmationQuote(Long id) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        LocalDateTime now = now();
        VendorOperationalTimingResolver.OperationalTiming timing = requireActionableDraft(batch, now);
        BigDecimal commissionRate = decimalConfig(SystemConfigEnum.VENDOR_COMMISSION_RATE);
        BigDecimal unitPrice = vendorUnitPrice(batch, commissionRate);
        BigDecimal depositRate = decimalConfig(SystemConfigEnum.VENDOR_DEPOSIT_RATE);
        LocalTime returnCutoff = timing.vendorCutoff();
        String latePolicy = stringConfig(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY);
        BigDecimal required = VendorDepositCalculator.calculate(
                batch.getAllocatedQuantity(), unitPrice, depositRate);
        String fingerprint = quoteFingerprint(
                batch, commissionRate, unitPrice, depositRate, timing.effectiveDeadline(),
                timing.supplierReturnCutoff(), timing.bufferMinutes(), latePolicy);
        return new VendorConfirmationQuoteResponse(
                batch.getId(),
                batch.getAllocatedQuantity(),
                unitPrice,
                depositRate,
                required,
                returnCutoff,
                latePolicy,
                fingerprint,
                now,
                timing.effectiveDeadline()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public VendorAllocationBatchResponse getOpenBatch(Long profileId) {
        profile(profileId);
        return vendorAllocationRepositoryPort.findOpenByProfileId(profileId, OPEN)
                .map(batch -> batchResponse(batch, remaining(batch), null, null))
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<VendorAllocationBatchResponse> list(
            Long profileId,
            Collection<AllocationBatchStatus> statuses,
            LocalDate businessDateFrom,
            LocalDate businessDateTo,
            int page,
            int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        Page<VendorAllocationBatchModel> result = vendorAllocationRepositoryPort.search(
                profileId,
                statuses,
                businessDateFrom,
                businessDateTo,
                PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(
                result.map(batch -> batchResponse(batch, 0, null, null)),
                safePage,
                safeSize);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse confirm(Long id, ConfirmVendorAllocationRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        LocalDateTime now = now();
        VendorOperationalTimingResolver.OperationalTiming timing = requireActionableDraft(batch, now);
        StreetAgentProfileModel profile = profileForUpdate(batch.getStreetAgentProfileId());
        // The profile may have changed while the draft was being held; do not hand over on stale eligibility.
        profile.requireVendorAllocationPrerequisites(batch.getBusinessDate());
        // A DRAFT has never received a deposit. Any existing balance at this point is a
        // pre-existing/legacy balance and must be reconciled before new money is accepted.
        if (!profile.hasClearedLegacyDeposit()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LEGACY_DEPOSIT);
        }
        if (batch.getAllocatedQuantity() > remainingCapIncludingCurrentBatch(profile, batch)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_EXCEEDED);
        }
        BigDecimal commissionRate = decimalConfig(SystemConfigEnum.VENDOR_COMMISSION_RATE);
        BigDecimal unitPrice = vendorUnitPrice(batch, commissionRate);
        BigDecimal depositRate = decimalConfig(SystemConfigEnum.VENDOR_DEPOSIT_RATE);
        String latePolicy = stringConfig(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY);
        String expectedFingerprint = quoteFingerprint(
                batch, commissionRate, unitPrice, depositRate, timing.effectiveDeadline(),
                timing.supplierReturnCutoff(), timing.bufferMinutes(), latePolicy);
        // HTTP validation requires the fingerprint. The legacy one-argument DTO constructor is
        // retained only for direct server-side callers compiled before this API hardening.
        if (blank(request.quoteFingerprint()) || !request.quoteFingerprint().equals(expectedFingerprint)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_QUOTE_STALE);
        }
        batch.setCommissionRateSnapshot(commissionRate);
        batch.confirmHandover(
                now,
                unitPrice,
                depositRate,
                VendorLateReturnPolicy.valueOf(latePolicy),
                timing.vendorCutoff(),
                timing.supplierReturnCutoff(),
                timing.bufferMinutes(),
                timing.effectiveDeadline(),
                request.depositReceivedAmount(),
                profile.getDepositBalance(),
                operatorId);
        profile.setDepositBalance(batch.getDepositBalanceAfter());
        streetAgentProfileRepositoryPort.save(profile);
        vendorDepositTransactionRepositoryPort.record(new VendorDepositTransactionRepositoryPort.DepositTransaction(
                profile.getId(), batch.getId(), TransactionBusinessType.VENDOR_DEPOSIT, batch.getBusinessDate(),
                batch.getDepositReceivedAmount(), now, operatorId,
                "Nhận cọc khi xác nhận bàn giao"));
        saveSerialsAndSync(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse openReturnSession(Long id) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        batch.openReturnSession();
        if (returnBatchRepositoryPort != null) {
            ensureStreetAgentReturnBatch(batch);
        }
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse recordReturns(Long id, ReturnVendorAllocationSerialsRequest request) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        if (returnBatchRepositoryPort == null) {
            batch.stageReturnedSerials(request.serialIds());
            saveSerialsAndSync(batch.getSerials());
            return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.PENDING_INSPECTION
                && receipt.getStatus() != ReturnBatchStatus.INSPECTING) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        batch.stageReturnedSerials(request.serialIds());
        Map<Long, Long> lineByStation = returnBatchRepositoryPort.findLinesByBatchId(receipt.getId()).stream()
                .collect(Collectors.toMap(ReturnBatchLineModel::getLotteryStationId, ReturnBatchLineModel::getId));
        Set<Long> staged = new HashSet<>(request.serialIds());
        batch.getSerials().stream().filter(serial -> staged.contains(serial.getSerialId()))
                .forEach(serial -> serial.setVendorReturnBatchLineId(lineByStation.get(serial.getStationId())));
        receipt.setStatus(ReturnBatchStatus.INSPECTING);
        returnBatchRepositoryPort.save(receipt);
        saveSerialsAndSync(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse removeReturn(Long id, Long serialId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        if (returnBatchRepositoryPort == null) {
            batch.removeStagedReturn(serialId);
            saveSerialsAndSync(batch.getSerials());
            return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.PENDING_INSPECTION
                && receipt.getStatus() != ReturnBatchStatus.INSPECTING) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        batch.removeStagedReturn(serialId);
        boolean hasPendingInspection = batch.getSerials().stream()
                .anyMatch(serial -> serial.getStatus() == AllocationSerialStatus.RETURN_PENDING_INSPECTION);
        receipt.setStatus(hasPendingInspection ? ReturnBatchStatus.INSPECTING : ReturnBatchStatus.PENDING_INSPECTION);
        returnBatchRepositoryPort.save(receipt);
        saveSerialsAndSync(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse confirmReturnInspection(
            Long id, ConfirmVendorReturnInspectionRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        Map<Long, String> rejectedReasons = rejectedReasons(request);
        if (returnBatchRepositoryPort == null) {
            LocalDateTime confirmedAt = now();
            batch.confirmReturnedSerials(rejectedReasons, confirmedAt);
            restoreAcceptedReturnStock(batch, confirmedAt);
            saveSerialsAndSync(batch.getSerials());
            return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.INSPECTING) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        LocalDateTime confirmedAt = now();
        batch.confirmReturnedSerials(rejectedReasons, confirmedAt);
        restoreAcceptedReturnStock(batch, confirmedAt);
        refreshStreetAgentReturnLines(receipt, batch);
        receipt.setStatus(ReturnBatchStatus.RECEIVED);
        receipt.setConfirmedAt(confirmedAt);
        receipt.setReturnedAt(confirmedAt);
        receipt.setReturnedBy(operatorId);
        if (request != null && !blank(request.note())) {
            receipt.setNote(request.note().trim());
        }
        returnBatchRepositoryPort.save(receipt);
        saveSerialsAndSync(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse confirmNoReturnedTickets(
            Long id, ConfirmVendorNoReturnRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        if (returnBatchRepositoryPort == null) {
            batch.confirmNoReturnedTickets();
            return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.PENDING_INSPECTION
                && receipt.getStatus() != ReturnBatchStatus.INSPECTING) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        batch.confirmNoReturnedTickets();
        LocalDateTime confirmedAt = now();
        receipt.setStatus(ReturnBatchStatus.RECEIVED);
        receipt.setConfirmedAt(confirmedAt);
        receipt.setReturnedAt(confirmedAt);
        receipt.setReturnedBy(operatorId);
        if (request != null && !blank(request.note())) {
            receipt.setNote(request.note().trim());
        } else {
            receipt.setNote("Người bán vé số không trả vé; toàn bộ vé còn giữ tính là đã bán.");
        }
        refreshStreetAgentReturnLines(receipt, batch);
        returnBatchRepositoryPort.save(receipt);
        saveSerialsAndSync(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
    }

    @Override @Transactional(readOnly = true)
    public VendorSettlementPreviewResponse previewSettlement(Long id) {
        VendorAllocationBatchModel batch = batch(id);
        ReturnBatchModel receipt = requireReturnReceiptReadyForSettlement(batch);
        LocalDateTime timing = settlementTiming(batch);
        VendorSettlementCalculator.Result result = batch.previewSettlement(timing);
        return settlementPreview(batch, result, isLate(batch, timing), receipt);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse settle(Long id, SettleVendorAllocationRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        ReturnBatchModel receipt = requireReturnReceiptReadyForSettlement(batch);
        StreetAgentProfileModel profile = profileForUpdate(batch.getStreetAgentProfileId());
        LocalDateTime settledAt = now();
        LocalDateTime returnConfirmedAt = settlementTiming(batch);
        VendorSettlementCalculator.Result expected = batch.previewSettlement(returnConfirmedAt);
        String expectedFingerprint = settlementFingerprint(batch, expected, isLate(batch, returnConfirmedAt), receipt);
        if (request == null || !request.confirmed() || blank(request.settlementFingerprint())
                || !request.settlementFingerprint().equals(expectedFingerprint)) {
            throw new DomainException(ErrorCode.VENDOR_SETTLEMENT_PREVIEW_STALE);
        }
        VendorSettlementCalculator.CounterCashMovement cashMovement =
                VendorSettlementCalculator.counterCashMovement(expected);
        batch.settle(settledAt, returnConfirmedAt, profile.getDepositBalance(), operatorId);
        profile.setDepositBalance(batch.getDepositBalanceAfter());
        streetAgentProfileRepositoryPort.save(profile);
        recordSettlementCashMovement(batch, cashMovement, settledAt, operatorId);
        saveSerialsAndSync(batch.getSerials());
        VendorAllocationBatchModel saved = vendorAllocationRepositoryPort.save(batch);
        VendorSettlementProjectionServicePort.ProjectionLinks links =
                vendorSettlementProjectionServicePort.projectOnSettle(
                        saved, profile, operatorId, settledAt,
                        returnBatchRepositoryPort == null ? null : requireStreetAgentReturnBatch(saved).getId());
        if (links == null) {
            // Compatibility with older adapters/test doubles while the projection is optional.
            links = new VendorSettlementProjectionServicePort.ProjectionLinks(null, null);
        }
        streetAgentProfileRepositoryPort.save(profile);
        return batchResponse(saved, remaining(saved), links.agentSettlementId(), links.dailySalesReportId());
    }

    private void recordSettlementCashMovement(
            VendorAllocationBatchModel batch,
            VendorSettlementCalculator.CounterCashMovement cashMovement,
            LocalDateTime settledAt,
            UUID operatorId) {
        if (cashMovement.dueFromVendor().signum() > 0) {
            vendorDepositTransactionRepositoryPort.record(new VendorDepositTransactionRepositoryPort.DepositTransaction(
                    batch.getStreetAgentProfileId(), batch.getId(),
                    TransactionBusinessType.VENDOR_SETTLEMENT_COLLECTION, batch.getBusinessDate(),
                    cashMovement.dueFromVendor(), settledAt, operatorId,
                    "Thu tiền quyết toán từ người bán vé số"));
        }
        if (cashMovement.payableToVendor().signum() > 0) {
            vendorDepositTransactionRepositoryPort.record(new VendorDepositTransactionRepositoryPort.DepositTransaction(
                    batch.getStreetAgentProfileId(), batch.getId(), TransactionBusinessType.VENDOR_PAYOUT,
                    batch.getBusinessDate(), cashMovement.payableToVendor(), settledAt, operatorId,
                    "Chi tiền quyết toán cho người bán vé số"));
        }
    }

    @Override @Transactional
    public void cancel(Long id) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        if (batch.getStatus() != AllocationBatchStatus.DRAFT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        release(batch, AllocationBatchStatus.CANCELLED, now());
    }

    @Override @Transactional
    public int expireDrafts() {
        LocalDateTime now = now();
        List<VendorAllocationBatchModel> batches = vendorAllocationRepositoryPort.findOpenDrafts();
        int expired = 0;
        for (VendorAllocationBatchModel batch : batches) {
            if (shouldExpireDraft(batch, now)) {
                release(batch, AllocationBatchStatus.EXPIRED, now);
                expired++;
            }
        }
        return expired;
    }

    private List<VendorAllocationSerialModel> sellableCandidates(LocalDate businessDate, LocalDateTime commandNow) {
        return filterSellable(vendorAllocationRepositoryPort.findCandidates(businessDate), businessDate, commandNow);
    }

    private ReturnBatchModel ensureStreetAgentReturnBatch(VendorAllocationBatchModel batch) {
        return returnBatchRepositoryPort.findStreetAgentByAllocationBatchId(batch.getId())
                .orElseGet(() -> {
                    ReturnBatchModel created = returnBatchRepositoryPort.save(ReturnBatchModel.builder()
                            .batchCode("VND-RET-" + batch.getBatchCode())
                            .returnBatchType(ReturnBatchType.STREET_AGENT_RETURN)
                            .sourceAllocationBatchId(batch.getId())
                            .drawDate(batch.getBusinessDate())
                            .status(ReturnBatchStatus.PENDING_INSPECTION)
                            .totalQuantity(0)
                            .totalReturnValue(BigDecimal.ZERO)
                            .note("Phiếu nhận vé trả từ người bán dạo")
                            .build());
                    batch.getDetails().stream()
                            .sorted(Comparator.comparing(VendorAllocationBatchDetailModel::getStationId))
                            .forEach(detail -> returnBatchRepositoryPort.saveLine(ReturnBatchLineModel.builder()
                                    .returnBatchId(created.getId())
                                    .lotteryStationId(detail.getStationId())
                                    .status(ReturnBatchLineStatus.PENDING)
                                    .totalQuantity(0)
                                    .totalReturnValue(BigDecimal.ZERO)
                                    .build()));
                    return returnBatchRepositoryPort.findById(created.getId()).orElse(created);
                });
    }

    private ReturnBatchModel requireStreetAgentReturnBatch(VendorAllocationBatchModel batch) {
        ReturnBatchModel receipt = returnBatchRepositoryPort.findStreetAgentByAllocationBatchId(batch.getId())
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE));
        if (receipt.getReturnBatchType() != ReturnBatchType.STREET_AGENT_RETURN
                || !Objects.equals(receipt.getSourceAllocationBatchId(), batch.getId())) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        return receipt;
    }

    /**
     * The physical return receipt is the gate before any financial calculation. A batch in
     * RETURN_OPEN alone is not sufficient because its serial outcome can still change.
     */
    private ReturnBatchModel requireReturnReceiptReadyForSettlement(VendorAllocationBatchModel batch) {
        if (returnBatchRepositoryPort == null) {
            // Legacy unit-test adapters do not model return receipts. Production wiring always does.
            return null;
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.RECEIVED) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        return receipt;
    }

    private void refreshStreetAgentReturnLines(ReturnBatchModel receipt, VendorAllocationBatchModel batch) {
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(receipt.getId());
        int totalQuantity = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        for (ReturnBatchLineModel line : lines) {
            int accepted = (int) batch.getSerials().stream()
                    .filter(serial -> Objects.equals(serial.getVendorReturnBatchLineId(), line.getId()))
                    .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURNED)
                    .count();
            line.applyQuantityAndUnitCost(accepted, batch.getFaceValueSnapshot());
            line.setStatus(accepted > 0 ? ReturnBatchLineStatus.SUCCESS : ReturnBatchLineStatus.PENDING);
            returnBatchRepositoryPort.saveLine(line);
            totalQuantity += accepted;
            totalValue = totalValue.add(line.getTotalReturnValue());
        }
        receipt.setTotalQuantity(totalQuantity);
        receipt.setTotalReturnValue(totalValue);
    }

    private void restoreAcceptedReturnStock(VendorAllocationBatchModel batch, LocalDateTime confirmedAt) {
        batch.getSerials().stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURNED)
                .filter(serial -> serial.getTicketStatus() == LotteryTicketSerialStatus.WITH_STREET_AGENT)
                .forEach(serial -> serial.restoreAcceptedReturnToStock(!serial.isPastDrawAt(confirmedAt)));
    }

    private Map<Long, String> rejectedReasons(ConfirmVendorReturnInspectionRequest request) {
        if (request == null || request.rejectedSerials() == null || request.rejectedSerials().isEmpty()) {
            return Map.of();
        }
        Map<Long, String> reasons = new LinkedHashMap<>();
        for (RejectedVendorReturnSerialRequest rejected : request.rejectedSerials()) {
            if (rejected == null || rejected.serialId() == null || blank(rejected.reason())
                    || reasons.putIfAbsent(rejected.serialId(), rejected.reason().trim()) != null) {
                throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
            }
        }
        return reasons;
    }

    private LocalDateTime settlementTiming(VendorAllocationBatchModel batch) {
        if (returnBatchRepositoryPort == null) {
            return now();
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.RECEIVED || receipt.getConfirmedAt() == null) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        return receipt.getConfirmedAt();
    }

    private List<VendorAllocationSerialModel> filterSellable(
            List<VendorAllocationSerialModel> raw, LocalDate businessDate, LocalDateTime commandNow) {
        return raw.stream()
                .filter(serial -> VendorTicketSellabilityPolicy.isSellableForVendor(serial, businessDate, commandNow))
                .toList();
    }

    private void release(VendorAllocationBatchModel batch, AllocationBatchStatus state, LocalDateTime at) {
        batch.releaseDraft(state, serial -> serial.isPastDrawAt(at));
        saveSerialsAndSync(batch.getSerials());
        vendorAllocationRepositoryPort.save(batch);
    }

    private void requireEligible(StreetAgentProfileModel p, LocalDate date) {
        p.requireVendorAllocationPrerequisites(date);
        if (vendorAllocationRepositoryPort.existsOpenBatchByProfileId(p.getId(), OPEN)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_OPEN_BATCH_EXISTS);
        }
        if (!p.hasClearedLegacyDeposit()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LEGACY_DEPOSIT);
        }
    }

    /**
     * Revalidates a draft at its decisive boundary (quote/confirm). This intentionally uses the
     * current configuration: an unconfirmed draft has not created a financial snapshot yet.
     */
    private VendorOperationalTimingResolver.OperationalTiming requireActionableDraft(
            VendorAllocationBatchModel batch,
            LocalDateTime commandNow) {
        if (batch.getStatus() != AllocationBatchStatus.DRAFT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        if (vendorOperationalTimingResolver.isBusinessDatePast(batch.getBusinessDate(), commandNow)) {
            release(batch, AllocationBatchStatus.EXPIRED, commandNow);
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_BUSINESS_DATE_PASSED);
        }
        if (batch.getSerials().stream().anyMatch(serial -> serial.isPastDrawAt(commandNow))) {
            release(batch, AllocationBatchStatus.EXPIRED, commandNow);
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        if (batch.isDraftExpired(commandNow) || batch.getSerials().stream().anyMatch(serial ->
                serial.getStatus() != AllocationSerialStatus.DRAFT_RESERVED
                        || serial.getTicketStatus() != LotteryTicketSerialStatus.RESERVED
                        || serial.getReservedExpiresAt() == null
                        || !commandNow.isBefore(serial.getReservedExpiresAt()))) {
            release(batch, AllocationBatchStatus.EXPIRED, commandNow);
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        VendorOperationalTimingResolver.OperationalTiming timing =
                vendorOperationalTimingResolver.resolveForHandover(batch.getBusinessDate(), batch.getSerials(), commandNow);
        if (vendorOperationalTimingResolver.isDraftExpired(batch.getReservationExpiresAt(), timing, commandNow)) {
            release(batch, AllocationBatchStatus.EXPIRED, commandNow);
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_OPERATIONAL_DEADLINE_REACHED);
        }
        return timing;
    }

    private boolean shouldExpireDraft(VendorAllocationBatchModel batch, LocalDateTime commandNow) {
        if (batch.isDraftExpired(commandNow)
                || batch.getSerials().stream().anyMatch(serial -> serial.isPastDrawAt(commandNow))
                || vendorOperationalTimingResolver.isBusinessDatePast(batch.getBusinessDate(), commandNow)) {
            return true;
        }
        try {
            VendorOperationalTimingResolver.OperationalTiming timing = vendorOperationalTimingResolver
                    .resolveForHandover(batch.getBusinessDate(), batch.getSerials(), commandNow);
            return vendorOperationalTimingResolver.isDraftExpired(batch.getReservationExpiresAt(), timing, commandNow);
        } catch (DomainException ex) {
            // A temporarily incomplete supplier schedule must block quote/confirm with SAG_033,
            // but does not silently discard a still-valid draft.
            if (ex.getErrorCode() == ErrorCode.VENDOR_ALLOCATION_SUPPLIER_RETURN_CUTOFF_MISSING) {
                return false;
            }
            throw ex;
        }
    }

    private StreetAgentProfileModel profile(Long id) {
        return streetAgentProfileRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
    }

    private StreetAgentProfileModel profileForUpdate(Long id) {
        return streetAgentProfileRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
    }

    private VendorAllocationBatchModel batch(Long id) {
        return vendorAllocationRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
    }

    private int remaining(VendorAllocationBatchModel b) {
        return remainingCap(profile(b.getStreetAgentProfileId()), b.getBusinessDate());
    }

    private int remainingCap(StreetAgentProfileModel profile, LocalDate businessDate) {
        int consumed = Math.toIntExact(vendorAllocationRepositoryPort.sumAllocatedForDay(
                profile.getId(), businessDate, CAP_CONSUMING));
        return VendorDailyCapCalculator.remaining(
                profile.effectiveBaseDailyCap(),
                vendorConfidencePolicyResolver.capPercentage(profile.getConfidenceTier()),
                consumed);
    }

    /** Remaining cap for confirm must include this draft rather than accidentally counting it twice. */
    private int remainingCapIncludingCurrentBatch(StreetAgentProfileModel profile, VendorAllocationBatchModel batch) {
        long consumed = vendorAllocationRepositoryPort.sumAllocatedForDay(profile.getId(), batch.getBusinessDate(), CAP_CONSUMING);
        long withoutThisDraft = Math.max(0, consumed - batch.getAllocatedQuantity());
        return VendorDailyCapCalculator.remaining(
                profile.effectiveBaseDailyCap(),
                vendorConfidencePolicyResolver.capPercentage(profile.getConfidenceTier()),
                Math.toIntExact(withoutThisDraft));
    }

    private VendorAllocationBatchResponse batchResponse(
            VendorAllocationBatchModel b,
            int cap,
            Long agentSettlementId,
            Long dailySalesReportId) {
        BigDecimal agencyNet = null;
        if (b.getGrossCashRemitted() != null && b.getCommissionPayable() != null) {
            agencyNet = b.getGrossCashRemitted().subtract(b.getCommissionPayable());
        }
        ReturnBatchModel returnBatch = returnBatchRepositoryPort == null ? null
                : returnBatchRepositoryPort.findStreetAgentByAllocationBatchId(b.getId()).orElse(null);
        Long returnBatchId = returnBatch == null ? null : returnBatch.getId();
        return new VendorAllocationBatchResponse(
                b.getId(),
                b.getBatchCode(),
                b.getStreetAgentProfileId(),
                b.getBusinessDate(),
                b.getStatus().name(),
                b.getReservationExpiresAt(),
                b.getRequestedQuantity(),
                b.getReserveCountSnapshot(),
                b.getReservePercentSnapshot(),
                b.getAllocatedQuantity(),
                cap,
                b.getFaceValueSnapshot(),
                b.getVendorUnitPriceSnapshot(),
                b.getCommissionRateSnapshot(),
                b.getDepositRateSnapshot(),
                b.getLatePolicySnapshot() == null ? null : b.getLatePolicySnapshot().name(),
                b.getReturnCutoffSnapshot(),
                b.getSupplierReturnCutoffSnapshot(),
                b.getReturnBufferMinutesSnapshot(),
                b.getEffectiveHandoverDeadlineAt(),
                b.getDepositRequiredAmount(),
                b.getDepositReceivedAmount(),
                b.getDepositBalanceBefore(),
                b.getDepositBalanceAfter(),
                b.getDepositReceivedAt(),
                b.getSettledAt(),
                b.getReturnedQuantity(),
                b.getSoldQuantity(),
                b.getGrossCashRemitted(),
                b.getCommissionPayable(),
                agencyNet,
                b.getDepositRefundAmount(),
                b.getDepositForfeitedAmount(),
                b.getDepositAppliedAmount(),
                b.getDepositExcessRefundAmount(),
                b.getForcedPurchaseAmount(),
                b.getAdditionalAmountDue(),
                agentSettlementId,
                dailySalesReportId,
                returnBatchId,
                returnWorkflow(b, returnBatch),
                b.getDetails().stream()
                        .map(d -> new VendorAllocationBatchDetailResponse(
                                d.getStationId(),
                                d.getDrawDate(),
                                d.getAllocatedQuantity(),
                                d.getReturnedQuantity(),
                                d.getSoldQuantity()))
                        .toList(),
                b.getSerials().stream().map(this::serialResponse).toList());
    }

    private VendorAllocationReturnWorkflowResponse returnWorkflow(
            VendorAllocationBatchModel batch, ReturnBatchModel receipt) {
        int handedOver = (int) batch.getSerials().stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.HANDED_OVER).count();
        int pending = (int) batch.getSerials().stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURN_PENDING_INSPECTION).count();
        int accepted = (int) batch.getSerials().stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURNED).count();
        int rejected = (int) batch.getSerials().stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURN_REJECTED).count();
        boolean settled = batch.getStatus() == AllocationBatchStatus.SETTLED
                || batch.getStatus() == AllocationBatchStatus.LATE_SETTLED;
        ReturnBatchStatus receiptStatus = receipt == null ? null : receipt.getStatus();
        String stage = settled ? "SETTLED"
                : receiptStatus == ReturnBatchStatus.RECEIVED ? "READY_FOR_SETTLEMENT"
                : receiptStatus == ReturnBatchStatus.INSPECTING ? "INSPECTION"
                : batch.getStatus() == AllocationBatchStatus.CONFIRMED ? "READY_FOR_RETURN"
                : "RETURN_ENTRY";
        boolean editable = batch.getStatus() == AllocationBatchStatus.RETURN_OPEN
                && (receiptStatus == ReturnBatchStatus.PENDING_INSPECTION || receiptStatus == ReturnBatchStatus.INSPECTING);
        boolean readyForSettlement = batch.getStatus() == AllocationBatchStatus.RETURN_OPEN
                && receiptStatus == ReturnBatchStatus.RECEIVED;
        return new VendorAllocationReturnWorkflowResponse(
                receipt == null ? null : receipt.getId(),
                receiptStatus == null ? null : receiptStatus.name(),
                stage,
                handedOver,
                pending,
                accepted,
                rejected,
                // A rejected return is not accepted back into inventory and is therefore
                // still counted as vendor-held/sold for the workflow summary.
                handedOver + rejected,
                editable,
                receiptStatus == ReturnBatchStatus.INSPECTING && pending > 0,
                batch.getStatus() == AllocationBatchStatus.RETURN_OPEN
                        && (receiptStatus == ReturnBatchStatus.PENDING_INSPECTION
                        || receiptStatus == ReturnBatchStatus.INSPECTING)
                        && pending == 0 && handedOver > 0 && accepted == 0 && rejected == 0,
                readyForSettlement,
                readyForSettlement);
    }

    private VendorSettlementPreviewResponse settlementPreview(
            VendorAllocationBatchModel batch,
            VendorSettlementCalculator.Result result,
            boolean late,
            ReturnBatchModel receipt) {
        VendorSettlementCalculator.CounterCashMovement counterCash =
                VendorSettlementCalculator.counterCashMovement(result);
        return new VendorSettlementPreviewResponse(
                batch.getId(),
                batch.getAllocatedQuantity(),
                result.soldQuantity(),
                result.returnedQuantity(),
                result.grossCashRemitted(),
                result.commissionPayable(),
                batch.getCommissionRateSnapshot(),
                result.agencyNetSalesAmount(),
                result.depositRefundAmount(),
                result.depositForfeitedAmount(),
                result.depositAppliedAmount(),
                result.depositExcessRefundAmount(),
                result.forcedPurchaseAmount(),
                result.additionalAmountDue(),
                counterCash.dueFromVendor(),
                counterCash.payableToVendor(),
                late,
                batch.getLatePolicySnapshot() == null ? null : batch.getLatePolicySnapshot().name(),
                settlementFingerprint(batch, result, late, receipt));
    }

    /**
     * Ties the UI confirmation to the exact finalized return outcome and financial snapshot.
     * It deliberately contains no client-provided money: the server remains the source of truth.
     */
    private String settlementFingerprint(
            VendorAllocationBatchModel batch,
            VendorSettlementCalculator.Result result,
            boolean late,
            ReturnBatchModel receipt) {
        String serialOutcome = batch.getSerials().stream()
                .sorted(Comparator.comparing(VendorAllocationSerialModel::getSerialId))
                .map(serial -> serial.getSerialId() + ":" + serial.getStatus())
                .collect(Collectors.joining(","));
        String material = String.join("|",
                String.valueOf(batch.getId()), String.valueOf(batch.getStatus()),
                String.valueOf(batch.getBusinessDate()), String.valueOf(batch.getReturnCutoffSnapshot()),
                String.valueOf(batch.getFaceValueSnapshot()), String.valueOf(batch.getVendorUnitPriceSnapshot()),
                String.valueOf(batch.getDepositReceivedAmount()), String.valueOf(batch.getLatePolicySnapshot()),
                String.valueOf(late), String.valueOf(receipt == null ? null : receipt.getId()),
                String.valueOf(receipt == null ? null : receipt.getStatus()),
                String.valueOf(receipt == null ? null : receipt.getConfirmedAt()),
                String.valueOf(result.soldQuantity()), String.valueOf(result.returnedQuantity()),
                String.valueOf(result.grossCashRemitted()), String.valueOf(result.commissionPayable()),
                String.valueOf(result.depositRefundAmount()), String.valueOf(result.depositForfeitedAmount()),
                String.valueOf(result.depositAppliedAmount()), String.valueOf(result.depositExcessRefundAmount()),
                String.valueOf(result.forcedPurchaseAmount()), String.valueOf(result.additionalAmountDue()),
                serialOutcome);
        return sha256(material);
    }

    private boolean isLate(VendorAllocationBatchModel batch, LocalDateTime now) {
        LocalDateTime deadline = batch.getEffectiveHandoverDeadlineAt() != null
                ? batch.getEffectiveHandoverDeadlineAt()
                : batch.getReturnCutoffSnapshot() == null ? null
                        : batch.getBusinessDate().atTime(batch.getReturnCutoffSnapshot());
        return deadline != null && now != null && !now.isBefore(deadline);
    }

    private LocalDateTime now() {
        return vendorOperationalTimingResolver.now();
    }

    private VendorAllocationSerialResponse serialResponse(VendorAllocationSerialModel serial) {
        return new VendorAllocationSerialResponse(
                serial.getSerialId(),
                serial.getStationId(),
                serial.getStationName(),
                serial.getTicketNumbers(),
                serial.getSerialNumber(),
                serial.getDrawDate(),
                serial.getFaceValue(),
                serial.isLucky(),
                badges(serial.getLuckyBadges()),
                serial.getStatus() == null ? null : serial.getStatus().name(),
                serial.getTicketStatus() == null ? null : serial.getTicketStatus().name(),
                serial.getReturnedAt());
    }

    private VendorAllocationCandidateResponse response(
            VendorAllocationSerialModel s, boolean ok, String reason) {
        return new VendorAllocationCandidateResponse(
                s.getSerialId(),
                s.getStationId(),
                s.getStationName(),
                s.getTicketNumbers(),
                s.getSerialNumber(),
                s.getDrawDate(),
                s.getFaceValue(),
                s.isLucky(),
                badges(s.getLuckyBadges()),
                ok,
                reason);
    }

    private VendorAllocationSuggestionResponse toSuggestionResponse(
            VendorAllocationSuggestionBuilder.Suggestion suggestion,
            BigDecimal faceValue,
            List<BigDecimal> availableFaceValues,
            List<VendorAllocationSerialModel> rawCandidates,
            LocalDateTime effectiveDeadlineAt,
            LocalDateTime commandNow) {
        return new VendorAllocationSuggestionResponse(
                faceValue,
                availableFaceValues,
                suggestion.requestedQuantity(),
                suggestion.remainingDailyCap(),
                suggestion.capLimitedQuantity(),
                suggestion.totalVendorCapacity(),
                suggestion.allowedQuantity(),
                suggestion.suggestedQuantity(),
                suggestion.counterReservePerStation(),
                suggestion.counterReservePercentPerStation(),
                suggestion.shortfallQuantity(),
                suggestion.capShortfallQuantity(),
                suggestion.inventoryShortfallQuantity(),
                suggestion.shortageReasons(),
                suggestion.blockedReason(),
                reasonDetails(suggestion, rawCandidates, effectiveDeadlineAt, commandNow),
                suggestion.stations().stream()
                        .map(station -> new VendorAllocationSuggestionResponse.StationGroup(
                                station.stationId(),
                                station.stationName(),
                                station.availableCount(),
                                station.normalEligibleQuantity(),
                                station.luckyQuantity(),
                                station.fixedReserveQuantity(),
                                station.percentReserveQuantity(),
                                station.effectiveAgencyReserveQuantity(),
                                station.vendorCapacity(),
                                station.suggestedCount(),
                                station.selectableCount(),
                                station.tickets().stream()
                                        .map(ticket -> new VendorAllocationSuggestionResponse.TicketGroup(
                                                ticket.ticketNumbers(),
                                                ticket.faceValue(),
                                                ticket.lucky(),
                                                ticket.luckyBadges(),
                                                ticket.availableCount(),
                                                ticket.suggestedCount(),
                                                ticket.selectableCount(),
                                                ticket.vendorEligible(),
                                                ticket.blockedReason(),
                                                ticket.serials().stream()
                                                        .map(serial -> new VendorAllocationSuggestionResponse.SerialItem(
                                                                serial.serialId(),
                                                                serial.serialNumber(),
                                                                serial.lucky(),
                                                                serial.luckyBadges(),
                                                                serial.vendorEligible(),
                                                                serial.blockedReason(),
                                                                serial.suggested()))
                                                        .toList()))
                                        .toList()))
                        .toList());
    }

    private List<VendorAllocationSuggestionResponse.ReasonDetail> reasonDetails(
            VendorAllocationSuggestionBuilder.Suggestion suggestion,
            List<VendorAllocationSerialModel> rawCandidates,
            LocalDateTime effectiveDeadlineAt,
            LocalDateTime commandNow) {
        LinkedHashSet<String> reasonCodes = new LinkedHashSet<>(suggestion.shortageReasons());
        if (!blank(suggestion.blockedReason())) {
            reasonCodes.add(suggestion.blockedReason());
        }

        List<VendorAllocationSuggestionResponse.ReasonDetail> details = new ArrayList<>();
        for (String code : reasonCodes) {
            if (VendorTicketSellabilityPolicy.BLOCKED_RETURN_CUTOFF_REACHED.equals(code)
                    || VendorTicketSellabilityPolicy.BLOCKED_OPERATIONAL_DEADLINE_REACHED.equals(code)) {
                details.add(new VendorAllocationSuggestionResponse.ReasonDetail(
                        code, effectiveDeadlineAt == null ? null : effectiveDeadlineAt.toLocalTime(), effectiveDeadlineAt,
                        null, null, null, null, null,
                        suggestion.remainingDailyCap(), suggestion.requestedQuantity()));
                continue;
            }
            if (VendorTicketSellabilityPolicy.BLOCKED_SUPPLIER_RETURN_CUTOFF_MISSING.equals(code)) {
                details.add(new VendorAllocationSuggestionResponse.ReasonDetail(
                        code, null, null, null, null, null, null, null,
                        suggestion.remainingDailyCap(), suggestion.requestedQuantity()));
                continue;
            }
            if ("DAILY_CAP_LIMIT".equals(code)
                    || VendorTicketSellabilityPolicy.BLOCKED_DAILY_CAP_EXHAUSTED.equals(code)) {
                details.add(new VendorAllocationSuggestionResponse.ReasonDetail(
                        code, null, null, null, null, null, null, null,
                        suggestion.remainingDailyCap(), suggestion.requestedQuantity()));
                continue;
            }
            if ("INSUFFICIENT_STATION_CAPACITY".equals(code)) {
                int eligible = suggestion.stations().stream()
                        .mapToInt(VendorAllocationSuggestionBuilder.StationSuggestion::normalEligibleQuantity)
                        .sum();
                int reserve = suggestion.stations().stream()
                        .mapToInt(VendorAllocationSuggestionBuilder.StationSuggestion::effectiveAgencyReserveQuantity)
                        .sum();
                details.add(new VendorAllocationSuggestionResponse.ReasonDetail(
                        code, null, null, null, null, eligible, reserve, suggestion.totalVendorCapacity(),
                        suggestion.remainingDailyCap(), suggestion.requestedQuantity()));
                continue;
            }
            if (VendorTicketSellabilityPolicy.BLOCKED_DRAW_TIME_PASSED.equals(code)) {
                rawCandidates.stream()
                        .filter(candidate -> VendorTicketSellabilityPolicy.isScheduledDrawDay(
                                candidate.getDrawDate(), candidate.getDrawDays()))
                        .filter(candidate -> VendorTicketSellabilityPolicy.isPastDraw(
                                candidate.getDrawDate(), candidate.getDrawTime(), commandNow))
                        .collect(Collectors.toMap(
                                VendorAllocationSerialModel::getStationId,
                                candidate -> candidate,
                                (first, ignored) -> first,
                                LinkedHashMap::new))
                        .values()
                        .forEach(candidate -> details.add(new VendorAllocationSuggestionResponse.ReasonDetail(
                                code, null, null, candidate.getStationName(), candidate.getDrawTime(), null, null, null,
                                suggestion.remainingDailyCap(), suggestion.requestedQuantity())));
                if (!details.isEmpty()) {
                    continue;
                }
            }
            details.add(new VendorAllocationSuggestionResponse.ReasonDetail(
                    code, null, null, null, null, null, null, null,
                    suggestion.remainingDailyCap(), suggestion.requestedQuantity()));
        }
        return List.copyOf(details);
    }

    private List<String> badges(String raw) {
        return blank(raw)
                ? List.of()
                : Arrays.stream(raw.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toList();
    }

    private boolean blank(String v) {
        return v == null || v.isBlank();
    }

    private void saveSerialsAndSync(List<VendorAllocationSerialModel> serials) {
        vendorAllocationRepositoryPort.saveSerials(serials);
        serials.stream()
                .map(VendorAllocationSerialModel::getLotteryTicketId)
                .filter(Objects::nonNull)
                .distinct()
                .forEach(lotteryTicketAggregateSyncUseCase::syncTicketAggregate);
    }

    private boolean isOpenBatchConstraint(DataIntegrityViolationException ex) {
        Throwable cause = ex.getMostSpecificCause();
        String message = cause == null ? null : cause.getMessage();
        return message != null && message.contains("uq_allocation_batch_one_open_per_profile");
    }

    private String stringConfig(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(c -> c.getConfigValue())
                .orElse(key.getDefaultValue());
    }

    private int integerConfig(SystemConfigEnum key) {
        try {
            return Integer.parseInt(stringConfig(key).trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private VendorAllocationSuggestionBuilder.ReservePolicy counterReservePolicy() {
        return new VendorAllocationSuggestionBuilder.ReservePolicy(
                integerConfig(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION),
                decimalConfig(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PERCENT_PER_STATION));
    }

    private BigDecimal decimalConfig(SystemConfigEnum key) {
        try {
            return new BigDecimal(stringConfig(key).trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private BigDecimal vendorUnitPrice(VendorAllocationBatchModel batch, BigDecimal commissionRate) {
        if (commissionRate == null || commissionRate.signum() < 0 || commissionRate.compareTo(BigDecimal.ONE) > 0
                || batch.getSerials().isEmpty() || batch.getSerials().getFirst().getFaceValue() == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        return batch.getSerials().getFirst().getFaceValue()
                .multiply(BigDecimal.ONE.subtract(commissionRate))
                .setScale(0, RoundingMode.HALF_UP);
    }

    private String quoteFingerprint(VendorAllocationBatchModel batch, BigDecimal commissionRate,
                                    BigDecimal unitPrice, BigDecimal depositRate,
                                    LocalDateTime effectiveDeadlineAt, LocalTime supplierReturnCutoff,
                                    int returnBufferMinutes, String latePolicy) {
        String material = String.join("|",
                String.valueOf(batch.getId()), String.valueOf(batch.getAllocatedQuantity()),
                String.valueOf(batch.getFaceValueSnapshot()), String.valueOf(commissionRate),
                String.valueOf(unitPrice), String.valueOf(depositRate), String.valueOf(effectiveDeadlineAt),
                String.valueOf(supplierReturnCutoff), String.valueOf(returnBufferMinutes),
                String.valueOf(latePolicy), String.valueOf(batch.getReservationExpiresAt()));
        return sha256(material);
    }

    private String sha256(String material) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

}

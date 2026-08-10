package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.SettleVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.*;
import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import com.daiphat.coreapi.application.port.in.streetagent.VendorSettlementProjectionServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketAggregateSyncUseCase;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorAllocationRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.AgentDepositTransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.*;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.domain.model.streetagent.*;
import com.daiphat.coreapi.domain.service.streetagent.*;
import com.daiphat.coreapi.shared.util.SystemConfigValueValidator;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
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
    private final LotteryTicketAggregateSyncUseCase lotteryTicketAggregateSyncUseCase;
    private final AgentDepositTransactionRepositoryPort agentDepositTransactionRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;

    @Autowired
    public VendorAllocationService(
            VendorAllocationRepositoryPort vendorAllocationRepositoryPort,
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            SystemConfigRepositoryPort systemConfigRepositoryPort,
            VendorSettlementProjectionServicePort vendorSettlementProjectionServicePort,
            VendorConfidencePolicyResolver vendorConfidencePolicyResolver,
            LotteryTicketAggregateSyncUseCase lotteryTicketAggregateSyncUseCase,
            AgentDepositTransactionRepositoryPort agentDepositTransactionRepositoryPort,
            ReturnBatchRepositoryPort returnBatchRepositoryPort) {
        this.vendorAllocationRepositoryPort = vendorAllocationRepositoryPort;
        this.streetAgentProfileRepositoryPort = streetAgentProfileRepositoryPort;
        this.systemConfigRepositoryPort = systemConfigRepositoryPort;
        this.vendorSettlementProjectionServicePort = vendorSettlementProjectionServicePort;
        this.vendorConfidencePolicyResolver = vendorConfidencePolicyResolver;
        this.lotteryTicketAggregateSyncUseCase = lotteryTicketAggregateSyncUseCase;
        this.agentDepositTransactionRepositoryPort = agentDepositTransactionRepositoryPort;
        this.returnBatchRepositoryPort = returnBatchRepositoryPort;
    }

    /** Compatibility constructor for legacy unit tests; production uses Spring's full constructor. */
    @Deprecated
    public VendorAllocationService(
            VendorAllocationRepositoryPort vendorAllocationRepositoryPort,
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            SystemConfigRepositoryPort systemConfigRepositoryPort,
            VendorSettlementProjectionServicePort vendorSettlementProjectionServicePort) {
        this.vendorAllocationRepositoryPort = vendorAllocationRepositoryPort;
        this.streetAgentProfileRepositoryPort = streetAgentProfileRepositoryPort;
        this.systemConfigRepositoryPort = systemConfigRepositoryPort;
        this.vendorSettlementProjectionServicePort = vendorSettlementProjectionServicePort;
        this.vendorConfidencePolicyResolver = new VendorConfidencePolicyResolver(systemConfigRepositoryPort);
        this.lotteryTicketAggregateSyncUseCase = ticketId -> { };
        this.agentDepositTransactionRepositoryPort = transaction -> { };
        this.returnBatchRepositoryPort = null;
    }

    @Override @Transactional(readOnly = true)
    public List<VendorAllocationCandidateResponse> getCandidates(Long profileId, LocalDate businessDate) {
        requireEligible(profile(profileId), businessDate);
        VendorAllocationSuggestionBuilder.ReservePolicy reserve = counterReservePolicy();
        List<VendorAllocationSerialModel> serials = sellableCandidates(businessDate);
        return VendorAllocationSuggestionBuilder.annotate(serials, reserve).stream()
                .map(item -> response(item.serial(), item.vendorEligible(), item.blockedReason()))
                .toList();
    }

    @Override @Transactional(readOnly = true)
    public VendorAllocationSuggestionResponse getSuggestion(Long profileId, LocalDate businessDate, Integer requestedQuantity) {
        StreetAgentProfileModel profile = profile(profileId);
        requireEligible(profile, businessDate);
        int remaining = remainingCap(profile, businessDate);
        List<VendorAllocationSerialModel> raw = vendorAllocationRepositoryPort.findCandidates(businessDate);
        List<VendorAllocationSerialModel> serials = filterSellable(raw, businessDate);
        String blockedReason = serials.isEmpty()
                ? VendorTicketSellabilityPolicy.resolveBlockedReason(businessDate, remaining, raw)
                : null;
        int requested = requestedQuantity == null ? remaining : requestedQuantity;
        if (requested < 0) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        VendorAllocationSuggestionBuilder.Suggestion suggestion =
                VendorAllocationSuggestionBuilder.build(serials, remaining, requested, counterReservePolicy(), blockedReason);
        return toSuggestionResponse(suggestion);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse createDraft(CreateVendorAllocationDraftRequest request, boolean canOverrideLuckyTicket) {
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
        if (serials.size() != ids.size() || serials.stream().anyMatch(s -> !s.isEligibleForDraft(request.businessDate()))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        boolean lucky = serials.stream().anyMatch(VendorAllocationSerialModel::isLucky);
        if (lucky && (!canOverrideLuckyTicket || blank(request.luckyOverrideReason()))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LUCKY_OVERRIDE_REQUIRED);
        }
        if (serials.stream().map(VendorAllocationSerialModel::getFaceValue).filter(Objects::nonNull).distinct().count() != 1) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        int requested = request.requestedQuantity() == null ? ids.size() : request.requestedQuantity();
        VendorAllocationSuggestionBuilder.Suggestion lockedQuote = VendorAllocationSuggestionBuilder.build(
                filterSellable(lockedStationInventory, request.businessDate()), remaining, requested, counterReservePolicy(), null);
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
                now(),
                integerConfig(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES));
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft(
                "VND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                profile.getId(), request.businessDate(), reservation.expiresAt(), serials,
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
    @Transactional(readOnly = true)
    public VendorConfirmationQuoteResponse getConfirmationQuote(Long id) {
        VendorAllocationBatchModel batch = batch(id);
        if (batch.getStatus() != AllocationBatchStatus.DRAFT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        LocalDateTime now = now();
        if (batch.isDraftExpired(now)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        if (batch.getSerials() != null && batch.getSerials().stream()
                .anyMatch(VendorAllocationSerialModel::isPastDrawNow)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        BigDecimal commissionRate = decimalConfig(SystemConfigEnum.VENDOR_COMMISSION_RATE);
        BigDecimal unitPrice = vendorUnitPrice(batch, commissionRate);
        BigDecimal depositRate = decimalConfig(SystemConfigEnum.VENDOR_DEPOSIT_RATE);
        LocalTime returnCutoff = resolveReturnWindow(batch, now).effectiveVendorCutoff();
        String latePolicy = stringConfig(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY);
        BigDecimal required = VendorDepositCalculator.calculate(
                batch.getAllocatedQuantity(), unitPrice, depositRate);
        String fingerprint = quoteFingerprint(batch, commissionRate, unitPrice, depositRate, returnCutoff, latePolicy);
        return new VendorConfirmationQuoteResponse(
                batch.getId(),
                batch.getAllocatedQuantity(),
                unitPrice,
                depositRate,
                required,
                returnCutoff,
                latePolicy,
                fingerprint,
                now
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
        if (batch.isDraftExpired(now)) {
            release(batch, AllocationBatchStatus.EXPIRED);
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        if (batch.getSerials().stream().anyMatch(VendorAllocationSerialModel::isPastDrawNow)) {
            release(batch, AllocationBatchStatus.EXPIRED);
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        StreetAgentProfileModel profile = profileForUpdate(batch.getStreetAgentProfileId());
        // The profile may have changed while the draft was being held; do not hand over on stale eligibility.
        profile.requireVendorAllocationPrerequisites(batch.getBusinessDate());
        if (batch.getAllocatedQuantity() > remainingCapIncludingCurrentBatch(profile, batch)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_EXCEEDED);
        }
        BigDecimal commissionRate = decimalConfig(SystemConfigEnum.VENDOR_COMMISSION_RATE);
        BigDecimal unitPrice = vendorUnitPrice(batch, commissionRate);
        BigDecimal depositRate = decimalConfig(SystemConfigEnum.VENDOR_DEPOSIT_RATE);
        String latePolicy = stringConfig(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY);
        ReturnWindow returnWindow = resolveReturnWindow(batch, now);
        String expectedFingerprint = quoteFingerprint(batch, commissionRate, unitPrice, depositRate,
                returnWindow.effectiveVendorCutoff(), latePolicy);
        // HTTP validation requires the fingerprint. The legacy one-argument DTO constructor is
        // retained only for direct server-side callers compiled before this API hardening.
        if (request.quoteFingerprint() != null && !request.quoteFingerprint().equals(expectedFingerprint)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_QUOTE_STALE);
        }
        batch.setCommissionRateSnapshot(commissionRate);
        if (!now.toLocalDate().isBefore(batch.getBusinessDate())
                && !now.toLocalTime().isBefore(returnWindow.effectiveVendorCutoff())) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        batch.confirmHandover(
                now,
                unitPrice,
                depositRate,
                VendorLateReturnPolicy.valueOf(latePolicy),
                returnWindow.effectiveVendorCutoff(),
                returnWindow.supplierReturnCutoff(),
                returnWindow.bufferMinutes(),
                request.depositReceivedAmount(),
                profile.getDepositBalance(),
                operatorId);
        profile.setDepositBalance(batch.getDepositBalanceAfter());
        streetAgentProfileRepositoryPort.save(profile);
        agentDepositTransactionRepositoryPort.record(new AgentDepositTransactionRepositoryPort.DepositTransaction(
                profile.getId(), batch.getId(), "RECEIVED", batch.getBusinessDate(),
                batch.getDepositRequiredAmount(), batch.getDepositReceivedAmount(), BigDecimal.ZERO, BigDecimal.ZERO,
                batch.getDepositBalanceBefore(), batch.getDepositBalanceAfter(), now, operatorId,
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
    public VendorAllocationBatchResponse confirmReturnInspection(
            Long id, ConfirmVendorReturnInspectionRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        if (returnBatchRepositoryPort == null) {
            batch.confirmReturnedSerials(request == null ? null : request.rejectedSerialIds(), now());
            saveSerialsAndSync(batch.getSerials());
            return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch), null, null);
        }
        ReturnBatchModel receipt = requireStreetAgentReturnBatch(batch);
        if (receipt.getStatus() != ReturnBatchStatus.INSPECTING) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        LocalDateTime confirmedAt = now();
        batch.confirmReturnedSerials(request == null ? null : request.rejectedSerialIds(), confirmedAt);
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

    @Override @Transactional(readOnly = true)
    public VendorSettlementPreviewResponse previewSettlement(Long id) {
        VendorAllocationBatchModel batch = batch(id);
        LocalDateTime timing = settlementTiming(batch);
        VendorSettlementCalculator.Result result = batch.previewSettlement(timing);
        return settlementPreview(batch, result, isLate(batch, timing));
    }

    @Override @Transactional
    public VendorAllocationBatchResponse settle(Long id, SettleVendorAllocationRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        StreetAgentProfileModel profile = profileForUpdate(batch.getStreetAgentProfileId());
        LocalDateTime settledAt = now();
        LocalDateTime returnConfirmedAt = settlementTiming(batch);
        VendorSettlementCalculator.Result expected = batch.previewSettlement(returnConfirmedAt);
        BigDecimal expectedReceived = expected.forcedPurchaseAmount().signum() > 0
                ? expected.additionalAmountDue() : expected.grossCashRemitted();
        BigDecimal expectedPaid = expected.commissionPayable()
                .add(expected.depositRefundAmount()).add(expected.depositExcessRefundAmount());
        if (request.cashReceivedFromVendor().compareTo(expectedReceived) != 0
                || request.cashPaidToVendor().compareTo(expectedPaid) != 0) {
            throw new DomainException(ErrorCode.VENDOR_SETTLEMENT_CASH_MISMATCH);
        }
        batch.settle(settledAt, returnConfirmedAt, profile.getDepositBalance(), operatorId);
        batch.getSerials().stream()
                .filter(serial -> serial.getStatus() == AllocationSerialStatus.RETURNED)
                .forEach(serial -> serial.restoreAcceptedReturnToStock(!serial.isPastDrawNow()));
        profile.setDepositBalance(batch.getDepositBalanceAfter());
        streetAgentProfileRepositoryPort.save(profile);
        agentDepositTransactionRepositoryPort.record(new AgentDepositTransactionRepositoryPort.DepositTransaction(
                profile.getId(), batch.getId(), "SETTLED", batch.getBusinessDate(),
                batch.getDepositRequiredAmount(), batch.getDepositReceivedAmount(), BigDecimal.ZERO,
                batch.getDepositRefundAmount().add(batch.getDepositExcessRefundAmount()),
                batch.getDepositBalanceBefore(), batch.getDepositBalanceAfter(), settledAt, operatorId,
                batch.getDepositForfeitedAmount().signum() > 0 ? "Giữ cọc do trả trễ" : "Quyết toán cọc"));
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

    @Override
    @Deprecated
    public VendorAllocationBatchResponse settle(Long id, UUID operatorId) {
        VendorSettlementPreviewResponse preview = previewSettlement(id);
        BigDecimal received = preview.forcedPurchaseAmount().signum() > 0
                ? preview.additionalAmountDue() : preview.grossCashRemitted();
        BigDecimal paid = preview.commissionPayable().add(preview.depositRefundAmount())
                .add(preview.depositExcessRefundAmount());
        return settle(id, new SettleVendorAllocationRequest(received, paid), operatorId);
    }

    @Override @Transactional
    public void cancel(Long id) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        if (batch.getStatus() != AllocationBatchStatus.DRAFT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        release(batch, AllocationBatchStatus.CANCELLED);
    }

    @Override @Transactional
    public int expireDrafts() {
        LocalDateTime now = now();
        List<VendorAllocationBatchModel> batches = vendorAllocationRepositoryPort.findOpenDrafts();
        int expired = 0;
        for (VendorAllocationBatchModel batch : batches) {
            if (batch.isDraftExpired(now) || batch.hasAnySerialPastDraw()) {
                release(batch, AllocationBatchStatus.EXPIRED);
                expired++;
            }
        }
        return expired;
    }

    private List<VendorAllocationSerialModel> sellableCandidates(LocalDate businessDate) {
        return filterSellable(vendorAllocationRepositoryPort.findCandidates(businessDate), businessDate);
    }

    private ReturnWindow resolveReturnWindow(VendorAllocationBatchModel batch, LocalDateTime at) {
        LocalTime configuredVendorCutoff = timeConfig(SystemConfigEnum.VENDOR_RETURN_CUTOFF);
        if (returnBatchRepositoryPort == null) {
            return new ReturnWindow(configuredVendorCutoff, null, 0);
        }
        List<LocalTime> supplierCutoffs = batch.getSerials().stream()
                .map(VendorAllocationSerialModel::getSupplierReturnCutoffTime)
                .filter(Objects::nonNull)
                .toList();
        if (supplierCutoffs.size() != batch.getSerials().size() || supplierCutoffs.isEmpty()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        LocalTime supplierCutoff = supplierCutoffs.stream().min(LocalTime::compareTo).orElseThrow();
        int bufferMinutes = integerConfig(SystemConfigEnum.RETURN_BUFFER_TIME);
        LocalTime safeSupplierCutoff = supplierCutoff.minusMinutes(bufferMinutes);
        LocalTime effective = configuredVendorCutoff.isBefore(safeSupplierCutoff)
                ? configuredVendorCutoff : safeSupplierCutoff;
        return new ReturnWindow(effective, supplierCutoff, bufferMinutes);
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

    private record ReturnWindow(LocalTime effectiveVendorCutoff, LocalTime supplierReturnCutoff, int bufferMinutes) {}

    private List<VendorAllocationSerialModel> filterSellable(
            List<VendorAllocationSerialModel> raw, LocalDate businessDate) {
        return raw.stream()
                .filter(serial -> VendorTicketSellabilityPolicy.isSellableForVendor(serial, businessDate))
                .toList();
    }

    private void release(VendorAllocationBatchModel batch, AllocationBatchStatus state) {
        batch.releaseDraft(state, VendorAllocationSerialModel::isPastDrawNow);
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
        Long returnBatchId = returnBatchRepositoryPort == null ? null
                : returnBatchRepositoryPort.findStreetAgentByAllocationBatchId(b.getId())
                .map(ReturnBatchModel::getId).orElse(null);
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

    private VendorSettlementPreviewResponse settlementPreview(
            VendorAllocationBatchModel batch,
            VendorSettlementCalculator.Result result,
            boolean late) {
        return new VendorSettlementPreviewResponse(
                batch.getId(),
                batch.getAllocatedQuantity(),
                result.soldQuantity(),
                result.returnedQuantity(),
                result.grossCashRemitted(),
                result.commissionPayable(),
                result.agencyNetSalesAmount(),
                result.depositRefundAmount(),
                result.depositForfeitedAmount(),
                result.depositAppliedAmount(),
                result.depositExcessRefundAmount(),
                result.forcedPurchaseAmount(),
                result.additionalAmountDue(),
                late,
                batch.getLatePolicySnapshot() == null ? null : batch.getLatePolicySnapshot().name());
    }

    private boolean isLate(VendorAllocationBatchModel batch, LocalDateTime now) {
        return batch.getReturnCutoffSnapshot() != null
                && now.isAfter(batch.getBusinessDate().atTime(batch.getReturnCutoffSnapshot()));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(DrawScheduleUtils.VIETNAM_ZONE);
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
            VendorAllocationSuggestionBuilder.Suggestion suggestion) {
        return new VendorAllocationSuggestionResponse(
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
                                    LocalTime returnCutoff, String latePolicy) {
        String material = String.join("|",
                String.valueOf(batch.getId()), String.valueOf(batch.getAllocatedQuantity()),
                String.valueOf(batch.getFaceValueSnapshot()), String.valueOf(commissionRate),
                String.valueOf(unitPrice), String.valueOf(depositRate), String.valueOf(returnCutoff),
                String.valueOf(latePolicy), String.valueOf(batch.getReservationExpiresAt()));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private LocalTime timeConfig(SystemConfigEnum key) {
        return SystemConfigValueValidator.parseLocalTime(stringConfig(key), key.getConfigName());
    }
}

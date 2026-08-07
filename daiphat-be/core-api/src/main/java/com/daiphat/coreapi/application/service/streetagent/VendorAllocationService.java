package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.*;
import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorAllocationRepositoryPort;
import com.daiphat.coreapi.domain.exception.*;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.domain.model.streetagent.*;
import com.daiphat.coreapi.domain.service.streetagent.*;
import com.daiphat.coreapi.shared.util.SystemConfigValueValidator;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VendorAllocationService implements VendorAllocationServicePort {
    private static final List<AllocationBatchStatus> OPEN = List.of(AllocationBatchStatus.DRAFT, AllocationBatchStatus.CONFIRMED, AllocationBatchStatus.RETURN_OPEN);
    private final VendorAllocationRepositoryPort vendorAllocationRepositoryPort;
    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    @Override @Transactional(readOnly = true)
    public List<VendorAllocationCandidateResponse> getCandidates(Long profileId, LocalDate businessDate) {
        requireEligible(profile(profileId), businessDate);
        int reserve = integerConfig(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION);
        List<VendorAllocationSerialModel> serials = sellableCandidates(businessDate);
        return VendorAllocationSuggestionBuilder.annotate(serials, reserve).stream()
                .map(item -> response(item.serial(), item.vendorEligible(), item.blockedReason()))
                .toList();
    }

    @Override @Transactional(readOnly = true)
    public VendorAllocationSuggestionResponse getSuggestion(Long profileId, LocalDate businessDate) {
        StreetAgentProfileModel profile = profile(profileId);
        requireEligible(profile, businessDate);
        int reserve = integerConfig(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION);
        int remaining = VendorDailyCapCalculator.remaining(
                profile.getDailyTicketCap(),
                profile.getConfidenceTier(),
                Math.toIntExact(vendorAllocationRepositoryPort.sumAllocatedForDay(profile.getId(), businessDate, OPEN)));
        List<VendorAllocationSerialModel> raw = vendorAllocationRepositoryPort.findCandidates(businessDate);
        List<VendorAllocationSerialModel> serials = filterSellable(raw, businessDate);
        String blockedReason = serials.isEmpty()
                ? VendorTicketSellabilityPolicy.resolveBlockedReason(businessDate, remaining, raw)
                : null;
        VendorAllocationSuggestionBuilder.Suggestion suggestion =
                VendorAllocationSuggestionBuilder.build(serials, remaining, reserve, blockedReason);
        return toSuggestionResponse(suggestion);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse createDraft(CreateVendorAllocationDraftRequest request) {
        StreetAgentProfileModel profile = profile(request.streetAgentProfileId());
        requireEligible(profile, request.businessDate());
        Set<Long> ids = new LinkedHashSet<>(request.serialIds());
        if (ids.size() != request.serialIds().size()) throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        int remaining = VendorDailyCapCalculator.remaining(profile.getDailyTicketCap(), profile.getConfidenceTier(), Math.toIntExact(vendorAllocationRepositoryPort.sumAllocatedForDay(profile.getId(), request.businessDate(), OPEN)));
        if (ids.size() > remaining) throw new DomainException(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_EXCEEDED);
        List<VendorAllocationSerialModel> serials = vendorAllocationRepositoryPort.lockCandidates(ids);
        if (serials.size() != ids.size() || serials.stream().anyMatch(s -> !s.isEligibleForDraft(request.businessDate()))) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        boolean lucky = serials.stream().anyMatch(VendorAllocationSerialModel::isLucky);
        if (lucky && (!hasLuckyOverrideAuthority() || blank(request.luckyOverrideReason()))) throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LUCKY_OVERRIDE_REQUIRED);
        requireCounterReserve(serials, request.businessDate(), integerConfig(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION));
        VendorDraftReservation reservation = VendorDraftReservation.create(
                now(),
                integerConfig(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES));
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft(
                "VND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                profile.getId(), request.businessDate(), reservation.expiresAt(), serials,
                lucky ? request.luckyOverrideReason().trim() : null);
        VendorAllocationBatchModel saved = vendorAllocationRepositoryPort.save(batch);
        serials.forEach(s -> s.markReservedByBatch(saved.getId()));
        vendorAllocationRepositoryPort.saveSerials(serials);
        return batchResponse(saved, remaining - serials.size());
    }

    @Override @Transactional(readOnly = true)
    public VendorAllocationBatchResponse getById(Long id) { VendorAllocationBatchModel batch=batch(id); return batchResponse(batch, remaining(batch)); }

    @Override
    @Transactional(readOnly = true)
    public VendorAllocationBatchResponse getOpenBatch(Long profileId) {
        profile(profileId);
        return vendorAllocationRepositoryPort.findOpenByProfileId(profileId, OPEN)
                .map(batch -> batchResponse(batch, remaining(batch)))
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
                result.map(batch -> batchResponse(batch, 0)),
                safePage,
                safeSize);
    }

    @Override @Transactional
    public VendorAllocationBatchResponse confirm(Long id, ConfirmVendorAllocationRequest request, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id).orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
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
        batch.confirmHandover(now, decimalConfig(SystemConfigEnum.VENDOR_DEFAULT_UNIT_PRICE),
                decimalConfig(SystemConfigEnum.VENDOR_DEPOSIT_RATE), VendorLateReturnPolicy.valueOf(stringConfig(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY)),
                timeConfig(SystemConfigEnum.VENDOR_RETURN_CUTOFF), request.depositReceivedAmount(), profile.getDepositBalance(), operatorId);
        profile.setDepositBalance(batch.getDepositBalanceAfter());
        streetAgentProfileRepositoryPort.save(profile);
        vendorAllocationRepositoryPort.saveSerials(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch));
    }

    @Override @Transactional
    public VendorAllocationBatchResponse openReturnSession(Long id) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        batch.openReturnSession();
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch));
    }

    @Override @Transactional
    public VendorAllocationBatchResponse recordReturns(Long id, ReturnVendorAllocationSerialsRequest request) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        batch.recordReturnedSerials(request.serialIds(), now());
        vendorAllocationRepositoryPort.saveSerials(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch));
    }

    @Override @Transactional(readOnly = true)
    public VendorSettlementPreviewResponse previewSettlement(Long id) {
        VendorAllocationBatchModel batch = batch(id);
        VendorSettlementCalculator.Result result = batch.previewSettlement(now());
        return settlementPreview(batch, result, isLate(batch, now()));
    }

    @Override @Transactional
    public VendorAllocationBatchResponse settle(Long id, UUID operatorId) {
        VendorAllocationBatchModel batch = vendorAllocationRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));
        StreetAgentProfileModel profile = profileForUpdate(batch.getStreetAgentProfileId());
        batch.settle(now(), profile.getDepositBalance(), operatorId);
        profile.setDepositBalance(batch.getDepositBalanceAfter());
        streetAgentProfileRepositoryPort.save(profile);
        vendorAllocationRepositoryPort.saveSerials(batch.getSerials());
        return batchResponse(vendorAllocationRepositoryPort.save(batch), remaining(batch));
    }

    @Override @Transactional public void cancel(Long id) { VendorAllocationBatchModel batch=vendorAllocationRepositoryPort.findByIdForUpdate(id).orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND)); if (batch.getStatus()!=AllocationBatchStatus.DRAFT) throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE); release(batch, AllocationBatchStatus.CANCELLED); }
    @Override @Transactional public int expireDrafts() {
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

    private List<VendorAllocationSerialModel> filterSellable(List<VendorAllocationSerialModel> raw, LocalDate businessDate) {
        return raw.stream()
                .filter(serial -> VendorTicketSellabilityPolicy.isSellableForVendor(serial, businessDate))
                .toList();
    }

    private void release(VendorAllocationBatchModel batch, AllocationBatchStatus state) {
        batch.releaseDraft(state, VendorAllocationSerialModel::isPastDrawNow);
        vendorAllocationRepositoryPort.saveSerials(batch.getSerials());
        vendorAllocationRepositoryPort.save(batch);
    }
    private void requireCounterReserve(List<VendorAllocationSerialModel> selected, LocalDate date, int reserve) { Map<Long,Long> selectedNormal=selected.stream().filter(s->!s.isLucky()).collect(Collectors.groupingBy(VendorAllocationSerialModel::getStationId,Collectors.counting())); Map<Long,Long> available=sellableCandidates(date).stream().filter(s->!s.isLucky()).collect(Collectors.groupingBy(VendorAllocationSerialModel::getStationId,Collectors.counting())); if(selectedNormal.entrySet().stream().anyMatch(e->available.getOrDefault(e.getKey(),0L)-e.getValue()<reserve)) throw new DomainException(ErrorCode.VENDOR_ALLOCATION_COUNTER_RESERVE_VIOLATED); }
    private void requireEligible(StreetAgentProfileModel p, LocalDate date) {
        p.requireVendorAllocationPrerequisites(date);
        if (vendorAllocationRepositoryPort.existsOpenBatchByProfileId(p.getId(), OPEN)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_OPEN_BATCH_EXISTS);
        }
        if (!p.hasClearedLegacyDeposit()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LEGACY_DEPOSIT);
        }
    }
    private StreetAgentProfileModel profile(Long id){return streetAgentProfileRepositoryPort.findById(id).orElseThrow(()->new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));}
    private StreetAgentProfileModel profileForUpdate(Long id){return streetAgentProfileRepositoryPort.findByIdForUpdate(id).orElseThrow(()->new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));}
    private VendorAllocationBatchModel batch(Long id){return vendorAllocationRepositoryPort.findById(id).orElseThrow(()->new DomainException(ErrorCode.VENDOR_ALLOCATION_NOT_FOUND));}
    private int remaining(VendorAllocationBatchModel b){return VendorDailyCapCalculator.remaining(profile(b.getStreetAgentProfileId()).getDailyTicketCap(),profile(b.getStreetAgentProfileId()).getConfidenceTier(),Math.toIntExact(vendorAllocationRepositoryPort.sumAllocatedForDay(b.getStreetAgentProfileId(),b.getBusinessDate(),OPEN)));}
    private VendorAllocationBatchResponse batchResponse(VendorAllocationBatchModel b,int cap){return new VendorAllocationBatchResponse(b.getId(),b.getBatchCode(),b.getStreetAgentProfileId(),b.getBusinessDate(),b.getStatus().name(),b.getReservationExpiresAt(),b.getAllocatedQuantity(),cap,b.getFaceValueSnapshot(),b.getVendorUnitPriceSnapshot(),b.getDepositRateSnapshot(),b.getLatePolicySnapshot()==null?null:b.getLatePolicySnapshot().name(),b.getReturnCutoffSnapshot(),b.getDepositRequiredAmount(),b.getDepositReceivedAmount(),b.getDepositBalanceBefore(),b.getDepositBalanceAfter(),b.getDepositReceivedAt(),b.getSettledAt(),b.getReturnedQuantity(),b.getSoldQuantity(),b.getGrossCashRemitted(),b.getCommissionPayable(),b.getDepositRefundAmount(),b.getDepositForfeitedAmount(),b.getForcedPurchaseAmount(),b.getAdditionalAmountDue(),b.getDetails().stream().map(d -> new VendorAllocationBatchDetailResponse(d.getStationId(),d.getDrawDate(),d.getAllocatedQuantity(),d.getReturnedQuantity(),d.getSoldQuantity())).toList(),b.getSerials().stream().map(this::serialResponse).toList());}
    private VendorSettlementPreviewResponse settlementPreview(VendorAllocationBatchModel batch, VendorSettlementCalculator.Result result, boolean late) { return new VendorSettlementPreviewResponse(batch.getId(), batch.getAllocatedQuantity(), result.soldQuantity(), result.returnedQuantity(), result.grossCashRemitted(), result.commissionPayable(), result.agencyNetSalesAmount(), result.depositRefundAmount(), result.depositForfeitedAmount(), result.forcedPurchaseAmount(), result.additionalAmountDue(), late, batch.getLatePolicySnapshot() == null ? null : batch.getLatePolicySnapshot().name()); }
    private boolean isLate(VendorAllocationBatchModel batch, LocalDateTime now) { return batch.getReturnCutoffSnapshot() != null && now.isAfter(batch.getBusinessDate().atTime(batch.getReturnCutoffSnapshot())); }
    private LocalDateTime now() { return LocalDateTime.now(DrawScheduleUtils.VIETNAM_ZONE); }
    private VendorAllocationSerialResponse serialResponse(VendorAllocationSerialModel serial) { return new VendorAllocationSerialResponse(serial.getSerialId(), serial.getStationId(), serial.getStationName(), serial.getTicketNumbers(), serial.getSerialNumber(), serial.getDrawDate(), serial.getFaceValue(), serial.isLucky(), badges(serial.getLuckyBadges()), serial.getStatus() == null ? null : serial.getStatus().name(), serial.getTicketStatus() == null ? null : serial.getTicketStatus().name(), serial.getReturnedAt()); }
    private VendorAllocationCandidateResponse response(VendorAllocationSerialModel s,boolean ok,String reason){return new VendorAllocationCandidateResponse(s.getSerialId(),s.getStationId(),s.getStationName(),s.getTicketNumbers(),s.getSerialNumber(),s.getDrawDate(),s.getFaceValue(),s.isLucky(),badges(s.getLuckyBadges()),ok,reason);}
    private VendorAllocationSuggestionResponse toSuggestionResponse(VendorAllocationSuggestionBuilder.Suggestion suggestion) {
        return new VendorAllocationSuggestionResponse(
                suggestion.remainingDailyCap(),
                suggestion.suggestedQuantity(),
                suggestion.counterReservePerStation(),
                suggestion.blockedReason(),
                suggestion.stations().stream()
                        .map(station -> new VendorAllocationSuggestionResponse.StationGroup(
                                station.stationId(),
                                station.stationName(),
                                station.availableCount(),
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
                                                                serial.suggested()
                                                        ))
                                                        .toList()
                                        ))
                                        .toList()
                        ))
                        .toList()
        );
    }
    private List<String> badges(String raw){return blank(raw)?List.of():Arrays.stream(raw.split(",")).map(String::trim).filter(v->!v.isEmpty()).toList();}
    private boolean hasLuckyOverrideAuthority(){return SecurityContextHolder.getContext().getAuthentication()!=null && SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream().anyMatch(a->"streetAgent:manage".equals(a.getAuthority()));}
    private boolean blank(String v){return v==null||v.isBlank();}
    private String stringConfig(SystemConfigEnum key){return systemConfigRepositoryPort.findActiveByConfigKey(key.name()).map(c->c.getConfigValue()).orElse(key.getDefaultValue());}
    private int integerConfig(SystemConfigEnum key) {
        try {
            return Integer.parseInt(stringConfig(key).trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
    private BigDecimal decimalConfig(SystemConfigEnum key) {
        try {
            return new BigDecimal(stringConfig(key).trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
    private LocalTime timeConfig(SystemConfigEnum key) {
        return SystemConfigValueValidator.parseLocalTime(stringConfig(key), key.getConfigName());
    }
}

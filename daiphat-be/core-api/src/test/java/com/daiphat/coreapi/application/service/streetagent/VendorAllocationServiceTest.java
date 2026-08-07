package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorAllocationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorLateReturnPolicy;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationBatchModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import com.daiphat.coreapi.domain.service.streetagent.VendorTicketSellabilityPolicy;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class VendorAllocationServiceTest {
    private final LocalDate businessDate = LocalDate.of(2026, 8, 10);
    private VendorAllocationRepositoryPort allocationRepositoryPort;
    private StreetAgentProfileRepositoryPort profileRepositoryPort;
    private SystemConfigRepositoryPort systemConfigRepositoryPort;
    private VendorAllocationService service;

    @BeforeEach
    void setUp() {
        allocationRepositoryPort = mock(VendorAllocationRepositoryPort.class);
        profileRepositoryPort = mock(StreetAgentProfileRepositoryPort.class);
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(eligibleProfile()));
        systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
        when(systemConfigRepositoryPort.findActiveByConfigKey(anyString())).thenAnswer(invocation -> {
            SystemConfigEnum config = SystemConfigEnum.valueOf(invocation.getArgument(0));
            return Optional.of(SystemConfigModel.builder().configKey(config.name()).configValue(config.getDefaultValue()).build());
        });
        service = new VendorAllocationService(allocationRepositoryPort, profileRepositoryPort, systemConfigRepositoryPort);
    }

    @Test
    void blocks_inactive_profile_before_inventory_checks() {
        StreetAgentProfileRepositoryPort profileRepositoryPort = mock(StreetAgentProfileRepositoryPort.class);
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder().status(StreetAgentProfileStatus.INACTIVE).build()));
        service = new VendorAllocationService(allocationRepositoryPort, profileRepositoryPort, mock(SystemConfigRepositoryPort.class));

        assertThatThrownBy(() -> service.getSuggestion(7L, businessDate))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_PROFILE_INACTIVE");
        verify(allocationRepositoryPort, never()).findCandidates(any());
    }

    @Test
    void blocks_missing_daily_cap_with_specific_code() {
        StreetAgentProfileRepositoryPort profileRepositoryPort = mock(StreetAgentProfileRepositoryPort.class);
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder().dailyTicketCap(null).build()));
        service = new VendorAllocationService(allocationRepositoryPort, profileRepositoryPort, mock(SystemConfigRepositoryPort.class));

        assertThatThrownBy(() -> service.createDraft(request(101L)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_DAILY_CAP_MISSING");
        verify(allocationRepositoryPort, never()).existsOpenBatchByProfileId(any(), anyCollection());
    }

    @Test
    void blocks_outstanding_deposit_with_specific_code() {
        StreetAgentProfileRepositoryPort profileRepositoryPort = mock(StreetAgentProfileRepositoryPort.class);
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder().depositBalance(new BigDecimal("50000")).build()));
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(false);
        service = new VendorAllocationService(allocationRepositoryPort, profileRepositoryPort, mock(SystemConfigRepositoryPort.class));

        assertThatThrownBy(() -> service.createDraft(request(101L)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_LEGACY_DEPOSIT");
    }

    @Test
    void blocks_open_batch_before_legacy_deposit_on_suggestion() {
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder().depositBalance(new BigDecimal("90000")).build()));
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(true);

        assertThatThrownBy(() -> service.getSuggestion(7L, businessDate))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_OPEN_BATCH_EXISTS");
        verify(allocationRepositoryPort, never()).findCandidates(any());
    }

    @Test
    void confirm_holds_deposit_without_blocking_as_legacy() {
        VendorAllocationBatchModel batch = draftBatch(99L);
        when(allocationRepositoryPort.findByIdForUpdate(99L)).thenReturn(Optional.of(batch));
        when(profileRepositoryPort.findByIdForUpdate(7L)).thenReturn(Optional.of(eligibleProfile()));
        when(allocationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(profileRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(1L);

        var response = service.confirm(99L, new ConfirmVendorAllocationRequest(BigDecimal.valueOf(90000)), UUID.randomUUID());

        assertThat(response.status()).isEqualTo(AllocationBatchStatus.CONFIRMED.name());
        assertThat(response.depositReceivedAmount()).isEqualByComparingTo("90000");
        assertThat(response.depositBalanceAfter()).isEqualByComparingTo("90000");
        // Held balance while batch is open must not be treated as legacy on next gate:
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder().depositBalance(new BigDecimal("90000")).build()));
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(true);
        assertThatThrownBy(() -> service.getSuggestion(7L, businessDate))
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_OPEN_BATCH_EXISTS");
    }

    @Test
    void blocks_expired_contract_with_specific_code() {
        StreetAgentProfileRepositoryPort profileRepositoryPort = mock(StreetAgentProfileRepositoryPort.class);
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder()
                        .contractStartDate(businessDate.minusYears(2))
                        .contractEndDate(businessDate.minusYears(1))
                        .build()));
        service = new VendorAllocationService(allocationRepositoryPort, profileRepositoryPort, mock(SystemConfigRepositoryPort.class));

        assertThatThrownBy(() -> service.getCandidates(7L, businessDate))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_CONTRACT_INACTIVE");
    }

    @Test
    void blocks_vendor_that_already_has_an_open_batch() {
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(true);

        assertThatThrownBy(() -> service.createDraft(request(101L)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_OPEN_BATCH_EXISTS");
        verify(allocationRepositoryPort).existsOpenBatchByProfileId(eq(7L), anyCollection());
        verify(allocationRepositoryPort, never()).lockCandidates(anyCollection());
    }

    @Test
    void blocks_when_today_cap_would_be_exceeded() {
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(false);
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(1L);

        assertThatThrownBy(() -> service.createDraft(request(101L)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_DAILY_CAP_EXCEEDED");
        verify(allocationRepositoryPort, never()).lockCandidates(anyCollection());
    }

    @Test
    void suggestion_returnsDrawTimePassed_whenInventoryPastDrawToday() {
        LocalDate today = DrawScheduleUtils.today();
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder()
                        .contractStartDate(today.minusDays(1))
                        .contractEndDate(today.plusDays(1))
                        .build()));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(today), anyCollection())).thenReturn(0L);
        when(allocationRepositoryPort.findCandidates(today)).thenReturn(List.of(
                serialWithDrawTime(1L, today, DrawScheduleUtils.nowTime().minusMinutes(5))
        ));

        var suggestion = service.getSuggestion(7L, today);

        assertThat(suggestion.stations()).isEmpty();
        assertThat(suggestion.blockedReason()).isEqualTo(VendorTicketSellabilityPolicy.BLOCKED_DRAW_TIME_PASSED);
    }

    @Test
    void createDraft_rejects_serial_past_draw_time() {
        LocalDate today = DrawScheduleUtils.today();
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                eligibleProfileBuilder()
                        .contractStartDate(today.minusDays(1))
                        .contractEndDate(today.plusDays(1))
                        .build()));
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(false);
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(today), anyCollection())).thenReturn(0L);
        when(allocationRepositoryPort.lockCandidates(anyCollection())).thenReturn(List.of(
                serialWithDrawTime(101L, today, DrawScheduleUtils.nowTime().minusMinutes(5))
        ));

        assertThatThrownBy(() -> service.createDraft(new CreateVendorAllocationDraftRequest(7L, today, List.of(101L), null)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_SERIAL_INVALID");
    }

    @Test
    void suggestion_groups_inventory_and_applies_daily_cap_plan() {
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(0L);
        when(allocationRepositoryPort.findCandidates(businessDate)).thenReturn(List.of(
                serial(1L, 1L, "Đài HCM", "001001", "S1", false),
                serial(2L, 1L, "Đài HCM", "001001", "S2", false),
                serial(3L, 1L, "Đài HCM", "001002", "S3", false),
                serial(4L, 1L, "Đài HCM", "001002", "S4", false),
                serial(5L, 1L, "Đài HCM", "001003", "S5", true)
        ));

        var suggestion = service.getSuggestion(7L, businessDate);

        assertThat(suggestion.remainingDailyCap()).isEqualTo(1);
        assertThat(suggestion.stations()).hasSize(1);
        assertThat(suggestion.stations().getFirst().tickets()).hasSize(3);
        assertThat(suggestion.stations().getFirst().tickets().stream()
                .filter(t -> "001003".equals(t.ticketNumbers()))
                .findFirst())
                .get()
                .extracting(t -> t.lucky(), t -> t.suggestedCount())
                .containsExactly(true, 0);
        // Only 4 normal serials vs default counter reserve 10 → no plannable capacity
        assertThat(suggestion.suggestedQuantity()).isZero();
    }

    @Test
    void rejects_a_serial_that_another_staff_member_has_already_reserved() {
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(false);
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(0L);
        VendorAllocationSerialModel alreadyReserved = VendorAllocationSerialModel.builder()
                .serialId(101L).ticketStatus(LotteryTicketSerialStatus.RESERVED).build();
        when(allocationRepositoryPort.lockCandidates(anyCollection())).thenReturn(List.of(alreadyReserved));

        assertThatThrownBy(() -> service.createDraft(request(101L)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_SERIAL_INVALID");
    }

    @Test
    void suggestion_rejects_when_legacy_deposit_remains() {
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                StreetAgentProfileModel.builder().id(7L).contractCode("HD-001")
                        .contractDocumentUrl("https://cdn.example.com/contracts/signed.pdf")
                        .contractStartDate(businessDate.minusDays(1)).contractEndDate(businessDate.plusDays(1))
                        .dailyTicketCap(4).confidenceTier(VendorConfidenceTier.NEW)
                        .depositBalance(new BigDecimal("100000")).build()));
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(false);

        assertThatThrownBy(() -> service.getSuggestion(7L, businessDate))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_LEGACY_DEPOSIT");
    }

    @Test
    void suggestion_rejects_when_contract_inactive() {
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(
                StreetAgentProfileModel.builder().id(7L).contractCode("HD-001")
                        .contractStartDate(businessDate.minusDays(30)).contractEndDate(businessDate.minusDays(1))
                        .dailyTicketCap(4).confidenceTier(VendorConfidenceTier.NEW)
                        .depositBalance(BigDecimal.ZERO).build()));

        assertThatThrownBy(() -> service.getSuggestion(7L, businessDate))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode().name())
                .isEqualTo("VENDOR_ALLOCATION_CONTRACT_INACTIVE");
    }

    @Test
    void getOpenBatch_returns_null_when_vendor_has_no_open_batch() {
        when(allocationRepositoryPort.findOpenByProfileId(eq(7L), anyCollection())).thenReturn(Optional.empty());

        assertThat(service.getOpenBatch(7L)).isNull();
    }

    @Test
    void getOpenBatch_returns_draft_for_restore() {
        VendorAllocationBatchModel draft = VendorAllocationBatchModel.builder()
                .id(99L)
                .batchCode("VND-TEST")
                .streetAgentProfileId(7L)
                .businessDate(businessDate)
                .status(AllocationBatchStatus.DRAFT)
                .allocatedQuantity(25)
                .serials(List.of())
                .build();
        when(allocationRepositoryPort.findOpenByProfileId(eq(7L), anyCollection())).thenReturn(Optional.of(draft));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(25L);

        var response = service.getOpenBatch(7L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(99L);
        assertThat(response.batchCode()).isEqualTo("VND-TEST");
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.allocatedQuantity()).isEqualTo(25);
    }

    @Test
    void list_maps_paged_batches() {
        VendorAllocationBatchModel draft = VendorAllocationBatchModel.builder()
                .id(99L)
                .batchCode("VND-TEST")
                .streetAgentProfileId(7L)
                .businessDate(businessDate)
                .status(AllocationBatchStatus.DRAFT)
                .allocatedQuantity(25)
                .serials(List.of())
                .build();
        when(allocationRepositoryPort.search(eq(7L), any(), isNull(), isNull(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(draft)));

        var page = service.list(7L, List.of(AllocationBatchStatus.DRAFT), null, null, 1, 10);

        assertThat(page.getRecordList()).hasSize(1);
        assertThat(page.getRecordList().getFirst().batchCode()).isEqualTo("VND-TEST");
        assertThat(page.getPagination().getTotalRecords()).isEqualTo(1);
    }

    @Test
    void confirm_records_actual_deposit_and_updates_profile_balance_once() {
        VendorAllocationBatchModel batch = draftBatch(99L);
        when(allocationRepositoryPort.findByIdForUpdate(99L)).thenReturn(Optional.of(batch));
        when(profileRepositoryPort.findByIdForUpdate(7L)).thenReturn(Optional.of(eligibleProfile()));
        when(allocationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(profileRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(1L);

        var response = service.confirm(99L, new ConfirmVendorAllocationRequest(BigDecimal.valueOf(900)), UUID.randomUUID());

        assertThat(response.status()).isEqualTo(AllocationBatchStatus.CONFIRMED.name());
        assertThat(response.depositRequiredAmount()).isEqualByComparingTo("900");
        assertThat(response.depositReceivedAmount()).isEqualByComparingTo("900");
        assertThat(response.returnCutoffSnapshot()).isEqualTo(java.time.LocalTime.of(15, 0));
        assertThat(response.depositBalanceBefore()).isZero();
        assertThat(response.depositBalanceAfter()).isEqualByComparingTo("900");
        assertThat(response.serials()).singleElement().extracting(
                serial -> serial.allocationStatus(),
                serial -> serial.ticketStatus())
                .containsExactly("HANDED_OVER", "WITH_STREET_AGENT");
        verify(profileRepositoryPort).save(argThat(profile -> profile.getDepositBalance().compareTo(BigDecimal.valueOf(900)) == 0));
    }

    @Test
    void confirm_rejects_deposit_below_required_amount() {
        VendorAllocationBatchModel batch = draftBatch(99L);
        when(allocationRepositoryPort.findByIdForUpdate(99L)).thenReturn(Optional.of(batch));
        when(profileRepositoryPort.findByIdForUpdate(7L)).thenReturn(Optional.of(eligibleProfile()));

        assertThatThrownBy(() -> service.confirm(99L, new ConfirmVendorAllocationRequest(BigDecimal.valueOf(899)), UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(com.daiphat.coreapi.domain.exception.ErrorCode.VENDOR_ALLOCATION_DEPOSIT_INSUFFICIENT);
        verify(profileRepositoryPort, never()).save(any());
    }

    @Test
    void return_session_and_scan_returned_serial_to_stock() {
        VendorAllocationBatchModel batch = draftBatch(99L);
        batch.confirmHandover(java.time.LocalDateTime.now(), BigDecimal.valueOf(9000), new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT, java.time.LocalTime.of(15, 0), BigDecimal.valueOf(900), BigDecimal.ZERO, UUID.randomUUID());
        when(allocationRepositoryPort.findByIdForUpdate(99L)).thenReturn(Optional.of(batch));
        when(allocationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(1L);

        service.openReturnSession(99L);
        var response = service.recordReturns(99L, new ReturnVendorAllocationSerialsRequest(List.of(101L)));

        assertThat(response.status()).isEqualTo(AllocationBatchStatus.RETURN_OPEN.name());
        assertThat(response.returnedQuantity()).isOne();
        assertThat(response.serials()).singleElement().extracting(
                serial -> serial.allocationStatus(),
                serial -> serial.ticketStatus(),
                serial -> serial.returnedAt())
                .containsExactly("RETURNED", "IN_STOCK", batch.getSerials().getFirst().getReturnedAt());
        assertThat(batch.getSerials().getFirst().getTicketStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
    }

    @Test
    void settle_on_time_clears_held_deposit_and_closes_batch() {
        VendorAllocationBatchModel batch = draftBatch(99L);
        UUID operatorId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        batch.confirmHandover(
                now,
                BigDecimal.valueOf(9000),
                new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT,
                LocalTime.of(23, 59),
                BigDecimal.valueOf(90000),
                BigDecimal.ZERO,
                operatorId);
        batch.openReturnSession();
        batch.recordReturnedSerials(List.of(101L), now.plusMinutes(1));

        StreetAgentProfileModel profile = eligibleProfileBuilder()
                .depositBalance(new BigDecimal("90000"))
                .build();
        when(allocationRepositoryPort.findByIdForUpdate(99L)).thenReturn(Optional.of(batch));
        when(profileRepositoryPort.findByIdForUpdate(7L)).thenReturn(Optional.of(profile));
        when(allocationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(profileRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(0L);

        var response = service.settle(99L, operatorId);

        assertThat(response.status()).isEqualTo(AllocationBatchStatus.SETTLED.name());
        assertThat(response.depositBalanceAfter()).isEqualByComparingTo("0");
        assertThat(profile.getDepositBalance()).isEqualByComparingTo("0");
        when(allocationRepositoryPort.existsOpenBatchByProfileId(eq(7L), anyCollection())).thenReturn(false);
        when(profileRepositoryPort.findById(7L)).thenReturn(Optional.of(profile));
        when(allocationRepositoryPort.sumAllocatedForDay(eq(7L), eq(businessDate), anyCollection())).thenReturn(0L);
        when(allocationRepositoryPort.findCandidates(businessDate)).thenReturn(List.of());
        var suggestion = service.getSuggestion(7L, businessDate);
        assertThat(suggestion).isNotNull();
    }

    private CreateVendorAllocationDraftRequest request(Long serialId) {
        return new CreateVendorAllocationDraftRequest(7L, businessDate, List.of(serialId), null);
    }

    private VendorAllocationSerialModel serialWithDrawTime(Long serialId, LocalDate drawDate, LocalTime drawTime) {
        return VendorAllocationSerialModel.builder()
                .serialId(serialId)
                .stationId(1L)
                .stationName("Đài HCM")
                .ticketNumbers("001001")
                .serialNumber("S" + serialId)
                .drawDate(drawDate)
                .drawTime(drawTime)
                .drawDays(List.of(drawDate.getDayOfWeek()))
                .faceValue(BigDecimal.valueOf(10_000))
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .lucky(false)
                .build();
    }

    private VendorAllocationSerialModel serial(
            Long serialId, Long stationId, String stationName, String ticketNumbers, String serialNumber, boolean lucky) {
        return VendorAllocationSerialModel.builder()
                .serialId(serialId)
                .stationId(stationId)
                .stationName(stationName)
                .ticketNumbers(ticketNumbers)
                .serialNumber(serialNumber)
                .drawDate(businessDate)
                .faceValue(BigDecimal.valueOf(10_000))
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .lucky(lucky)
                .build();
    }

    private VendorAllocationBatchModel draftBatch(Long id) {
        VendorAllocationSerialModel serial = serial(101L, 1L, "Đài HCM", "001001", "S1", false);
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft(
                "VND-TEST", 7L, businessDate, java.time.LocalDateTime.now().plusMinutes(15), List.of(serial), null);
        batch.setId(id);
        serial.markReservedByBatch(id);
        return batch;
    }

    private StreetAgentProfileModel eligibleProfile() {
        return eligibleProfileBuilder().build();
    }

    private StreetAgentProfileModel.StreetAgentProfileModelBuilder eligibleProfileBuilder() {
        return StreetAgentProfileModel.builder().id(7L)
                .status(StreetAgentProfileStatus.ACTIVE)
                .contractCode("HD-001")
                .contractDocumentUrl("https://cdn.example.com/contracts/signed.pdf")
                .contractStartDate(businessDate.minusDays(1)).contractEndDate(businessDate.plusDays(1))
                .dailyTicketCap(4).confidenceTier(VendorConfidenceTier.NEW)
                .depositBalance(BigDecimal.ZERO);
    }
}

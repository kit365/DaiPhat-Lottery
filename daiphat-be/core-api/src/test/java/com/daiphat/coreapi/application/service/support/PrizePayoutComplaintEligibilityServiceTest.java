package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PrizePayoutComplaintEligibilityService")
class PrizePayoutComplaintEligibilityServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_CUSTOMER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort =
            mock(PrizePayoutRequestRepositoryPort.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private PrizePayoutComplaintEligibilityService service;

    @BeforeEach
    void setUp() {
        service = new PrizePayoutComplaintEligibilityService(
                prizePayoutRequestRepositoryPort, systemConfigRepositoryPort);
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey("REFUND_COMPLAINT_PROCESSING_WAIT_HOURS"))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("48").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey("REFUND_COMPLAINT_GRACE_DAYS"))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("7").build()));
    }

    @Test
    @DisplayName("Slow processing rejects when payout has not waited long enough")
    void slowProcessing_tooEarly() {
        stubPayout(PrizePayoutRequestStatus.PENDING, LocalDateTime.now().minusHours(5), null);

        assertThatThrownBy(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_TOO_EARLY);
    }

    @Test
    @DisplayName("Slow processing allows after wait hours in PENDING")
    void slowProcessing_pendingAfterWait_ok() {
        stubPayout(PrizePayoutRequestStatus.PENDING, LocalDateTime.now().minusHours(49), null);

        assertThatCode(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Slow processing allows APPROVED after wait hours")
    void slowProcessing_approvedAfterWait_ok() {
        stubPayout(PrizePayoutRequestStatus.APPROVED, LocalDateTime.now().minusHours(50), null);

        assertThatCode(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Slow processing rejects COMPLETED status")
    void slowProcessing_wrongStatus() {
        stubPayout(PrizePayoutRequestStatus.COMPLETED, LocalDateTime.now().minusHours(49),
                LocalDateTime.now().minusHours(49));

        assertThatThrownBy(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_STATUS_INVALID);
    }

    @Test
    @DisplayName("Paid issue rejects before COMPLETED")
    void paidIssue_beforeCompleted() {
        stubPayout(PrizePayoutRequestStatus.PENDING, LocalDateTime.now().minusHours(1), null);

        assertThatThrownBy(() -> service.validate(paidCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_STATUS_INVALID);
    }

    @Test
    @DisplayName("Paid issue allows COMPLETED within grace days from completedAt")
    void paidIssue_withinGrace_ok() {
        LocalDateTime completedAt = LocalDateTime.now().minusDays(2);
        stubPayout(PrizePayoutRequestStatus.COMPLETED, LocalDateTime.now().minusDays(10), completedAt);

        assertThatCode(() -> service.validate(paidCategory(), "10", CUSTOMER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Paid issue past grace days from completedAt is rejected")
    void paidIssue_graceExpired() {
        LocalDateTime completedAt = LocalDateTime.now().minusDays(8);
        stubPayout(PrizePayoutRequestStatus.COMPLETED, completedAt, completedAt);

        assertThatThrownBy(() -> service.validate(paidCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("Wrong owner is rejected")
    void wrongOwner() {
        stubPayout(PrizePayoutRequestStatus.COMPLETED, LocalDateTime.now().minusDays(1),
                LocalDateTime.now().minusDays(1));

        assertThatThrownBy(() -> service.validate(paidCategory(), "10", OTHER_CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REF_PRIZE_PAYOUT_MISMATCH);
    }

    private void stubPayout(
            PrizePayoutRequestStatus status,
            LocalDateTime updatedAt,
            LocalDateTime completedAt) {
        when(prizePayoutRequestRepositoryPort.findById(10L)).thenReturn(Optional.of(
                PrizePayoutRequestModel.builder()
                        .id(10L)
                        .customerId(CUSTOMER_ID)
                        .status(status)
                        .updatedAt(updatedAt)
                        .completedAt(completedAt)
                        .build()));
    }

    private TicketCategoryModel slowCategory() {
        return TicketCategoryModel.builder()
                .id(1L)
                .code(PrizePayoutComplaintEligibilityService.CATEGORY_SLOW_PROCESSING)
                .requiredRefType(TicketRefType.PRIZE_CLAIM)
                .build();
    }

    private TicketCategoryModel paidCategory() {
        return TicketCategoryModel.builder()
                .id(2L)
                .code(PrizePayoutComplaintEligibilityService.CATEGORY_PAID_ISSUE)
                .requiredRefType(TicketRefType.PRIZE_CLAIM)
                .build();
    }
}

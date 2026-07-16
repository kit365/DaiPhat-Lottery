package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
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
@DisplayName("RefundComplaintEligibilityService")
class RefundComplaintEligibilityServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_CUSTOMER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private RefundComplaintEligibilityService service;

    @BeforeEach
    void setUp() {
        service = new RefundComplaintEligibilityService(refundRequestRepositoryPort, systemConfigRepositoryPort);
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey("REFUND_COMPLAINT_PROCESSING_WAIT_HOURS"))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("48").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey("REFUND_COMPLAINT_GRACE_DAYS"))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("7").build()));
    }

    @Test
    @DisplayName("Case 1 rejects when refund has not waited long enough")
    void slowProcessing_tooEarly() {
        stubRefund(RefundRequestStatus.READY_TO_PAY, LocalDateTime.now().minusHours(5));

        assertThatThrownBy(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REFUND_COMPLAINT_TOO_EARLY);
    }

    @Test
    @DisplayName("Case 1 allows after wait hours in READY_TO_PAY")
    void slowProcessing_readyAfterWait_ok() {
        stubRefund(RefundRequestStatus.READY_TO_PAY, LocalDateTime.now().minusHours(49));

        assertThatCode(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Case 1 rejects when status is not WAITING_FOR_INFO/READY_TO_PAY")
    void slowProcessing_wrongStatus() {
        stubRefund(RefundRequestStatus.PAID, LocalDateTime.now().minusHours(49));

        assertThatThrownBy(() -> service.validate(slowCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REFUND_COMPLAINT_STATUS_INVALID);
    }

    @Test
    @DisplayName("Case 2 rejects before PAID")
    void paidIssue_beforePaid() {
        stubRefund(RefundRequestStatus.READY_TO_PAY, LocalDateTime.now().minusHours(1));

        assertThatThrownBy(() -> service.validate(paidCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REFUND_COMPLAINT_STATUS_INVALID);
    }

    @Test
    @DisplayName("Case 2 allows PAID within grace days")
    void paidIssue_withinGrace_ok() {
        stubRefund(RefundRequestStatus.PAID, LocalDateTime.now().minusDays(2));

        assertThatCode(() -> service.validate(paidCategory(), "10", CUSTOMER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Final state past grace days is rejected")
    void paidIssue_graceExpired() {
        stubRefund(RefundRequestStatus.PAID, LocalDateTime.now().minusDays(8));

        assertThatThrownBy(() -> service.validate(paidCategory(), "10", CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REFUND_COMPLAINT_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("Wrong owner is rejected")
    void wrongOwner() {
        stubRefund(RefundRequestStatus.PAID, LocalDateTime.now().minusDays(1));

        assertThatThrownBy(() -> service.validate(paidCategory(), "10", OTHER_CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REF_REFUND_MISMATCH);
    }

    private void stubRefund(RefundRequestStatus status, LocalDateTime updatedAt) {
        when(refundRequestRepositoryPort.findById(10L)).thenReturn(Optional.of(
                RefundRequestModel.builder()
                        .id(10L)
                        .requestedBy(CUSTOMER_ID)
                        .status(status)
                        .updatedAt(updatedAt)
                        .build()));
    }

    private TicketCategoryModel slowCategory() {
        return TicketCategoryModel.builder()
                .id(1L)
                .code(RefundComplaintEligibilityService.CATEGORY_SLOW_PROCESSING)
                .requiredRefType(TicketRefType.REFUND_REQUEST)
                .build();
    }

    private TicketCategoryModel paidCategory() {
        return TicketCategoryModel.builder()
                .id(2L)
                .code(RefundComplaintEligibilityService.CATEGORY_PAID_ISSUE)
                .requiredRefType(TicketRefType.REFUND_REQUEST)
                .build();
    }
}

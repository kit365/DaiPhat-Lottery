package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketCommentRequest;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketCommentResponse;
import com.daiphat.coreapi.application.mapper.support.SupportApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketCommentRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupportTicketService comment operations")
class SupportTicketServiceCommentTest {

    private static final Long TICKET_ID = 10L;
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID STAFF_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private SupportTicketRepositoryPort supportTicketRepositoryPort;
    @Mock
    private SupportTicketCommentRepositoryPort supportTicketCommentRepositoryPort;
    @Mock
    private TicketCategoryRepositoryPort ticketCategoryRepositoryPort;
    @Mock
    private OrderRepositoryPort orderRepositoryPort;
    @Mock
    private UserRepositoryPort userRepositoryPort;
    @Mock
    private StoragePort storagePort;
    @Mock
    private SupportApplicationMapper supportApplicationMapper;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private RefundComplaintEligibilityService refundComplaintEligibilityService;
    @Mock
    private OrderComplaintEligibilityService orderComplaintEligibilityService;
    @Mock
    private PrizePayoutComplaintEligibilityService prizePayoutComplaintEligibilityService;
    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;

    private SupportTicketService supportTicketService;

    @BeforeEach
    void setUp() {
        supportTicketService = new SupportTicketService(
                supportTicketRepositoryPort,
                supportTicketCommentRepositoryPort,
                ticketCategoryRepositoryPort,
                orderRepositoryPort,
                userRepositoryPort,
                storagePort,
                supportApplicationMapper,
                eventPublisher,
                refundComplaintEligibilityService,
                orderComplaintEligibilityService,
                prizePayoutComplaintEligibilityService,
                systemConfigRepositoryPort);
    }

    @Test
    void addComment_customerOnClosedTicket_throwsNotAllowed() {
        SupportTicketModel ticket = ticket(TicketStatus.CLOSED);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> supportTicketService.addComment(
                        TICKET_ID,
                        CUSTOMER_ID,
                        false,
                        new CreateSupportTicketCommentRequest("Need help"),
                        null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);
    }

    @Test
    void addComment_customerTwiceInRow_throwsTurnViolation() {
        SupportTicketModel ticket = ticket(TicketStatus.IN_PROGRESS);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID))
                .thenReturn(List.of(comment(TicketCommentSenderRole.CUSTOMER, "Initial")));

        assertThatThrownBy(() -> supportTicketService.addComment(
                        TICKET_ID,
                        CUSTOMER_ID,
                        false,
                        new CreateSupportTicketCommentRequest("Follow up"),
                        null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_TURN_VIOLATION);
    }

    @Test
    void addComment_customerAfterOperator_movesWaitingForCustomerToInProgress() {
        SupportTicketModel ticket = ticket(TicketStatus.WAITING_FOR_CUSTOMER);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID))
                .thenReturn(List.of(
                        comment(TicketCommentSenderRole.CUSTOMER, "Initial"),
                        comment(TicketCommentSenderRole.OPERATOR, "Need more info")));
        when(supportTicketCommentRepositoryPort.save(any())).thenAnswer(invocation -> {
            SupportTicketCommentModel model = invocation.getArgument(0);
            model.setId(99L);
            return model;
        });
        when(supportTicketRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supportApplicationMapper.toCommentResponse(any())).thenReturn(
                new SupportTicketCommentResponse(
                        99L, CUSTOMER_ID, TicketCommentSenderRole.CUSTOMER, "Here is more detail", null, null));

        supportTicketService.addComment(
                TICKET_ID, CUSTOMER_ID, false, new CreateSupportTicketCommentRequest("Here is more detail"), null);

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
    }

    @Test
    void addComment_operator_setsWaitingForCustomer() {
        SupportTicketModel ticket = ticket(TicketStatus.IN_PROGRESS);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID))
                .thenReturn(List.of(comment(TicketCommentSenderRole.CUSTOMER, "Initial")));
        when(supportTicketCommentRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supportApplicationMapper.toCommentResponse(any())).thenReturn(
                new SupportTicketCommentResponse(
                        1L, STAFF_ID, TicketCommentSenderRole.OPERATOR, "We are checking", null, null));

        supportTicketService.addComment(
                TICKET_ID, STAFF_ID, true, new CreateSupportTicketCommentRequest("We are checking"), null);

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.WAITING_FOR_CUSTOMER);
    }

    @Test
    void addComment_operatorOnOpenTicket_throwsMustAssignFirst() {
        SupportTicketModel ticket = ticket(TicketStatus.OPEN);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> supportTicketService.addComment(
                        TICKET_ID,
                        STAFF_ID,
                        true,
                        new CreateSupportTicketCommentRequest("Hello"),
                        null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_OPERATOR_MUST_ASSIGN_FIRST);

        verify(supportTicketCommentRepositoryPort, never()).save(any());
    }

    @Test
    void addComment_blankContent_throwsInvalidContent() {
        SupportTicketModel ticket = ticket(TicketStatus.IN_PROGRESS);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID))
                .thenReturn(List.of(comment(TicketCommentSenderRole.OPERATOR, "Reply")));

        assertThatThrownBy(() -> supportTicketService.addComment(
                        TICKET_ID, CUSTOMER_ID, false, new CreateSupportTicketCommentRequest("   "), null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_CONTENT_INVALID);

        verify(supportTicketCommentRepositoryPort, never()).save(any());
    }

    private SupportTicketModel ticket(TicketStatus status) {
        return SupportTicketModel.builder()
                .id(TICKET_ID)
                .customerId(CUSTOMER_ID)
                .status(status)
                .build();
    }

    private SupportTicketCommentModel comment(TicketCommentSenderRole role, String content) {
        return SupportTicketCommentModel.builder()
                .supportTicketId(TICKET_ID)
                .senderRole(role)
                .content(content)
                .build();
    }
}

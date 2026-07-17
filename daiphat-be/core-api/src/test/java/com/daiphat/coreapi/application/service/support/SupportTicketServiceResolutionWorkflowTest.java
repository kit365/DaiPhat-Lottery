package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.request.support.ResolutionFeedbackRequest;
import com.daiphat.coreapi.application.dto.request.support.StaffSupportTicketResponseRequest;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.event.SupportTicketClosedEvent;
import com.daiphat.coreapi.application.event.SupportTicketRejectedEvent;
import com.daiphat.coreapi.application.event.SupportTicketReopenedEvent;
import com.daiphat.coreapi.application.mapper.support.SupportApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketCommentRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.support.StaffTicketResponseAction;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupportTicketService resolution workflow")
class SupportTicketServiceResolutionWorkflowTest {

    private static final Long TICKET_ID = 1L;
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID STAFF_ID = UUID.randomUUID();

    @Mock private SupportTicketRepositoryPort supportTicketRepositoryPort;
    @Mock private SupportTicketCommentRepositoryPort supportTicketCommentRepositoryPort;
    @Mock private TicketCategoryRepositoryPort ticketCategoryRepositoryPort;
    @Mock private OrderRepositoryPort orderRepositoryPort;
    @Mock private UserRepositoryPort userRepositoryPort;
    @Mock private StoragePort storagePort;
    @Mock private SupportApplicationMapper supportApplicationMapper;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private RefundComplaintEligibilityService refundComplaintEligibilityService;
    @Mock private SystemConfigRepositoryPort systemConfigRepositoryPort;

    @InjectMocks
    private SupportTicketService supportTicketService;

    @Test
    void respondByStaff_reject_setsRejectedReasonAndPublishesEvent() {
        SupportTicketModel ticket = ticket(TicketStatus.IN_PROGRESS);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportTicketCommentRepositoryPort.save(any())).thenAnswer(inv -> {
            SupportTicketCommentModel comment = inv.getArgument(0);
            if (comment.getId() == null) {
                comment.setId(200L);
            }
            return comment;
        });
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.REJECTED));

        supportTicketService.respondByStaff(
                TICKET_ID,
                STAFF_ID,
                new StaffSupportTicketResponseRequest("Không đủ điều kiện", StaffTicketResponseAction.REJECT),
                null);

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.REJECTED);
        assertThat(ticketCaptor.getValue().getRejectedReasonId()).isEqualTo(200L);
        verify(eventPublisher).publishEvent(any(SupportTicketRejectedEvent.class));
    }

    @Test
    void submitResolutionFeedback_satisfied_closesTicket() {
        SupportTicketModel ticket = ticket(TicketStatus.RESOLVED);
        ticket.setCustomerId(CUSTOMER_ID);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.CLOSED));

        supportTicketService.submitResolutionFeedback(TICKET_ID, CUSTOMER_ID, new ResolutionFeedbackRequest(true));

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.CLOSED);
        verify(eventPublisher).publishEvent(any(SupportTicketClosedEvent.class));
    }

    @Test
    void submitResolutionFeedback_dissatisfied_reopensToUnassignedQueue() {
        SupportTicketModel ticket = ticket(TicketStatus.RESOLVED);
        ticket.setCustomerId(CUSTOMER_ID);
        ticket.setAssignedTo(STAFF_ID);
        ticket.setResolvedReasonId(11L);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ticketCategoryRepositoryPort.findById(1L)).thenReturn(Optional.of(
                TicketCategoryModel.builder().id(1L).priority(2).name("Cat").code("CAT").build()));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.OPEN));

        supportTicketService.submitResolutionFeedback(TICKET_ID, CUSTOMER_ID, new ResolutionFeedbackRequest(false));

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.OPEN);
        assertThat(ticketCaptor.getValue().getAssignedTo()).isNull();
        assertThat(ticketCaptor.getValue().getDueAt()).isNotNull();
        assertThat(ticketCaptor.getValue().getResolvedReasonId()).isNull();
        verify(eventPublisher).publishEvent(any(SupportTicketReopenedEvent.class));
    }

    @Test
    void autoCloseResolvedTickets_closesTicketsOlderThanCutoff() {
        SupportTicketModel expired = ticket(TicketStatus.RESOLVED);
        expired.setResolvedAt(LocalDateTime.now().minusHours(49));
        when(systemConfigRepositoryPort.findActiveByConfigKey(
                SystemConfigEnum.SUPPORT_TICKET_AUTO_CLOSE_HOURS.name()))
                .thenReturn(Optional.empty());
        when(supportTicketRepositoryPort.findResolvedBefore(any())).thenReturn(List.of(expired));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int closed = supportTicketService.autoCloseResolvedTickets();

        assertThat(closed).isEqualTo(1);
        assertThat(expired.getStatus()).isEqualTo(TicketStatus.CLOSED);
        verify(eventPublisher).publishEvent(any(SupportTicketClosedEvent.class));
    }

    private SupportTicketModel ticket(TicketStatus status) {
        return SupportTicketModel.builder()
                .id(TICKET_ID)
                .customerId(CUSTOMER_ID)
                .ticketCategoryId(1L)
                .title("Issue")
                .status(status)
                .build();
    }

    private SupportTicketResponse mockResponse(TicketStatus status) {
        return new SupportTicketResponse(
                TICKET_ID, 1L, CUSTOMER_ID, STAFF_ID, "Issue", "desc", null, null, null,
                status, null, null, null, null, null, null, null, List.of(),
                null, null, null, null);
    }
}

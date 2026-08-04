package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.request.support.ResolveSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.event.SupportTicketAssignedEvent;
import com.daiphat.coreapi.application.event.SupportTicketClosedEvent;
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
import com.daiphat.coreapi.domain.model.UserModel;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupportTicketService staff operations")
class SupportTicketServiceStaffTest {

    private static final Long TICKET_ID = 20L;
    private static final UUID STAFF_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

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
    void assignByStaff_openTicket_assignsAndPublishesEvent() {
        SupportTicketModel ticket = ticket(TicketStatus.OPEN);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepositoryPort.findById(STAFF_ID)).thenReturn(Optional.of(UserModel.builder().firstName("An").build()));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.IN_PROGRESS));

        supportTicketService.assignByStaff(TICKET_ID, STAFF_ID);

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(ticketCaptor.getValue().getAssignedTo()).isEqualTo(STAFF_ID);

        ArgumentCaptor<SupportTicketCommentModel> commentCaptor = ArgumentCaptor.forClass(SupportTicketCommentModel.class);
        verify(supportTicketCommentRepositoryPort).save(commentCaptor.capture());
        assertThat(commentCaptor.getValue().getSenderRole()).isEqualTo(TicketCommentSenderRole.SYSTEM);
        assertThat(commentCaptor.getValue().getContent()).isEqualTo("An đã tiếp nhận ticket");

        verify(eventPublisher).publishEvent(any(SupportTicketAssignedEvent.class));
    }

    @Test
    void assignByStaff_whenNotOpen_throwsCannotAssign() {
        when(supportTicketRepositoryPort.findById(TICKET_ID))
                .thenReturn(Optional.of(ticket(TicketStatus.IN_PROGRESS)));

        assertThatThrownBy(() -> supportTicketService.assignByStaff(TICKET_ID, STAFF_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_CANNOT_ASSIGN);

        verify(supportTicketRepositoryPort, never()).save(any());
    }

    @Test
    void resolveByStaff_inProgress_setsResolvedAndPublishesEvent() {
        SupportTicketModel ticket = ticket(TicketStatus.IN_PROGRESS);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportTicketCommentRepositoryPort.save(any())).thenAnswer(invocation -> {
            SupportTicketCommentModel comment = invocation.getArgument(0);
            if (comment.getId() == null) {
                comment.setId(100L);
            }
            return comment;
        });
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.CLOSED));

        supportTicketService.resolveByStaff(TICKET_ID, STAFF_ID, new ResolveSupportTicketRequest("Đã hoàn tiền"));

        ArgumentCaptor<SupportTicketModel> ticketCaptor = ArgumentCaptor.forClass(SupportTicketModel.class);
        verify(supportTicketRepositoryPort).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(ticketCaptor.getValue().getResponse()).isEqualTo("Đã hoàn tiền");
        assertThat(ticketCaptor.getValue().getResolvedReasonId()).isEqualTo(100L);
        assertThat(ticketCaptor.getValue().getResolvedAt()).isNotNull();

        verify(supportTicketCommentRepositoryPort, org.mockito.Mockito.atLeast(2)).save(any());
        verify(eventPublisher).publishEvent(any(SupportTicketClosedEvent.class));
    }

    @Test
    void resolveByStaff_whenClosed_throwsCommentNotAllowed() {
        when(supportTicketRepositoryPort.findById(TICKET_ID))
                .thenReturn(Optional.of(ticket(TicketStatus.CLOSED)));

        assertThatThrownBy(() -> supportTicketService.resolveByStaff(
                        TICKET_ID, STAFF_ID, new ResolveSupportTicketRequest("Done")))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);
    }

    @Test
    void getByIdForStaff_doesNotMutateTicket() {
        SupportTicketModel ticket = ticket(TicketStatus.OPEN);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.OPEN));

        supportTicketService.getByIdForStaff(TICKET_ID, STAFF_ID);

        verify(supportTicketRepositoryPort, never()).save(any());
        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.OPEN);
        assertThat(ticket.getAssignedTo()).isNull();
    }

    @Test
    void getTicketsForStaff_usesRepositoryWithStatuses() {
        SupportTicketModel ticket = ticket(TicketStatus.OPEN);
        Page<SupportTicketModel> page = new PageImpl<>(List.of(ticket));
        when(supportTicketRepositoryPort.findAllForStaff(
                        any(Pageable.class), any(), eq(null), eq(null), eq(null), eq(null), eq(null)))
                .thenReturn(page);
        when(userRepositoryPort.findById(CUSTOMER_ID))
                .thenReturn(Optional.of(UserModel.builder().firstName("Customer").lastName("A").build()));

        var result = supportTicketService.getTicketsForStaff(
                1, 10, "OPEN,IN_PROGRESS", null, null, "dueAt", "asc", null, null, null);

        assertThat(result.getRecordList()).hasSize(1);
        verify(supportTicketRepositoryPort).findAllForStaff(
                any(Pageable.class), any(), eq(null), eq(null), eq(null), eq(null), eq(null));
    }

    @Test
    void getTicketsForStaff_withRefundFilters_passesToRepository() {
        Page<SupportTicketModel> page = new PageImpl<>(List.of());
        when(supportTicketRepositoryPort.findAllForStaff(
                        any(Pageable.class), any(), eq(null), eq(null),
                        eq(com.daiphat.coreapi.domain.model.enums.support.TicketRefType.REFUND_REQUEST),
                        eq(5L),
                        eq(List.of("REFUND_SLOW_PROCESSING", "REFUND_PAID_ISSUE"))))
                .thenReturn(page);

        supportTicketService.getTicketsForStaff(
                1, 10, null, null, null, "dueAt", "asc",
                "REFUND_REQUEST", 5L, "REFUND_SLOW_PROCESSING,REFUND_PAID_ISSUE");

        verify(supportTicketRepositoryPort).findAllForStaff(
                any(Pageable.class), any(), eq(null), eq(null),
                eq(com.daiphat.coreapi.domain.model.enums.support.TicketRefType.REFUND_REQUEST),
                eq(5L),
                eq(List.of("REFUND_SLOW_PROCESSING", "REFUND_PAID_ISSUE")));
    }

    @Test
    void getByIdForStaff_enrichesDetailResponse() {
        SupportTicketModel ticket = ticket(TicketStatus.OPEN);
        when(supportTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(ticket));
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(TICKET_ID)).thenReturn(List.of());
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(mockResponse(TicketStatus.OPEN));
        when(ticketCategoryRepositoryPort.findById(1L)).thenReturn(Optional.of(
                com.daiphat.coreapi.domain.model.support.TicketCategoryModel.builder()
                        .id(1L)
                        .name("Hoàn tiền chậm")
                        .code("REFUND_SLOW_PROCESSING")
                        .build()));
        when(userRepositoryPort.findById(CUSTOMER_ID))
                .thenReturn(Optional.of(UserModel.builder().firstName("Customer").lastName("A").build()));

        SupportTicketResponse response = supportTicketService.getByIdForStaff(TICKET_ID, STAFF_ID);

        assertThat(response.customerName()).isEqualTo("A Customer");
        assertThat(response.ticketCategoryName()).isEqualTo("Hoàn tiền chậm");
        assertThat(response.ticketCategoryCode()).isEqualTo("REFUND_SLOW_PROCESSING");
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

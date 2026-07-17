package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketRequest;
import com.daiphat.coreapi.application.event.SupportTicketCreatedEvent;
import com.daiphat.coreapi.application.mapper.support.SupportApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketCommentRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupportTicketService create operations")
class SupportTicketServiceCreateTest {

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
                systemConfigRepositoryPort);
    }

    @Test
    void create_publishesCreatedEvent() {
        TicketCategoryModel category = TicketCategoryModel.builder()
                .id(1L)
                .name("Hoàn tiền")
                .code("REFUND_SLOW_PROCESSING")
                .priority(2)
                .requiredRefType(TicketRefType.REFUND_REQUEST)
                .build();
        CreateSupportTicketRequest request = new CreateSupportTicketRequest(
                1L,
                "Hoàn tiền chậm",
                "Chưa nhận được tiền",
                "8",
                TicketRefType.REFUND_REQUEST);

        when(ticketCategoryRepositoryPort.findById(1L)).thenReturn(Optional.of(category));
        when(supportTicketRepositoryPort.save(any())).thenAnswer(invocation -> {
            SupportTicketModel ticket = invocation.getArgument(0);
            ticket.setId(99L);
            return ticket;
        });
        when(supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(99L)).thenReturn(List.of());
        when(supportApplicationMapper.toTicketResponse(any(), any())).thenReturn(
                new com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse(
                        99L, 1L, CUSTOMER_ID, null, "Hoàn tiền chậm", "Chưa nhận được tiền",
                        null, "8", TicketRefType.REFUND_REQUEST, TicketStatus.OPEN,
                        null, null, null, null, null, null, null, List.of(),
                        null, null, null, null));
        when(ticketCategoryRepositoryPort.findById(1L)).thenReturn(Optional.of(category));
        when(userRepositoryPort.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

        supportTicketService.create(CUSTOMER_ID, request, null);

        verify(eventPublisher).publishEvent(any(SupportTicketCreatedEvent.class));
    }
}

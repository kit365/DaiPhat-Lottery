package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.request.order.HandleOrderTicketIncidentRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentOutcome;
import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderIncidentTicketService")
class OrderIncidentTicketServiceTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort =
            mock(LotteryTicketSerialRepositoryPort.class);
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort =
            mock(LotteryTicketSerialServicePort.class);
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort = mock(LotteryTicketRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort =
            mock(OrderDetailSerialRepositoryPort.class);

    private OrderIncidentTicketService service;

    private final UUID orderId = UUID.randomUUID();
    private final UUID staffId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new OrderIncidentTicketService(
                orderRepositoryPort,
                lotteryTicketSerialRepositoryPort,
                lotteryTicketSerialServicePort,
                lotteryTicketRepositoryPort,
                lotteryTicketServicePort,
                orderDetailSerialRepositoryPort
        );
    }

    @Test
    @DisplayName("rejects non-PREPARING order")
    void rejectsNonPreparing() {
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(
                OrderModel.builder().id(orderId).status(OrderStatus.PAID).orderDetails(List.of()).build()));

        assertThatThrownBy(() -> service.handleIncidents(
                orderId,
                staffId,
                new HandleOrderTicketIncidentRequest(List.of(1L), TicketIncidentReason.DAMAGED, null)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_INVALID_STATUS);
    }

    @Test
    @DisplayName("replaces serial when IN_STOCK candidate exists")
    void replacesWhenStockAvailable() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .id(10L)
                .lotteryTicketId(100L)
                .lotteryTicketSerialId(1L)
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .price(BigDecimal.TEN)
                .allocatedSerialIds(new ArrayList<>(List.of(1L)))
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .orderDetails(new ArrayList<>(List.of(detail)))
                .build();

        LotteryTicketSerialModel oldSerial = LotteryTicketSerialModel.builder()
                .id(1L)
                .ticketId(100L)
                .serialNumber("OLD-001")
                .status(LotteryTicketSerialStatus.SOLD)
                .build();
        LotteryTicketSerialModel replacement = LotteryTicketSerialModel.builder()
                .id(2L)
                .ticketId(100L)
                .serialNumber("NEW-002")
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();
        LotteryTicketSerialModel heldReplacement = LotteryTicketSerialModel.builder()
                .id(2L)
                .ticketId(100L)
                .serialNumber("NEW-002")
                .status(LotteryTicketSerialStatus.SOLD)
                .ticketCondition(com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(lotteryTicketSerialServicePort.getByIdOrThrow(1L)).thenReturn(oldSerial);
        when(lotteryTicketRepositoryPort.findById(100L)).thenReturn(Optional.of(
                LotteryTicketModel.builder().id(100L).numbers("12345").build()));
        when(lotteryTicketServicePort.getById(100L)).thenReturn(
                LotteryTicketResponse.builder().id(100L).numbers("12345").stationName("Đài TP").build());
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(100L))
                .thenReturn(List.of(oldSerial, replacement));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(lotteryTicketSerialServicePort.getByIdOrThrow(2L)).thenReturn(heldReplacement);
        when(orderRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        HandleOrderTicketIncidentResponse response = service.handleIncidents(
                orderId,
                staffId,
                new HandleOrderTicketIncidentRequest(List.of(10L), TicketIncidentReason.DAMAGED, "rách góc"));

        assertThat(response.results()).hasSize(1);
        assertThat(response.results().getFirst().outcome()).isEqualTo(TicketIncidentOutcome.REPLACED);
        assertThat(response.results().getFirst().newSerialNumber()).isEqualTo("NEW-002");
        assertThat(detail.getLotteryTicketSerialId()).isEqualTo(1L);
        assertThat(detail.getReplacedByTicketSerialId()).isEqualTo(2L);
        assertThat(oldSerial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
        assertThat(oldSerial.getTicketCondition()).isEqualTo(com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.DAMAGED);

        verify(orderDetailSerialRepositoryPort).replaceSerialAllocation(10L, 1L, 2L);
    }

    @Test
    @DisplayName("returns NO_REPLACEMENT when no IN_STOCK serial")
    void noReplacementWhenOutOfStock() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .id(10L)
                .lotteryTicketSerialId(1L)
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .price(BigDecimal.TEN)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .orderDetails(new ArrayList<>(List.of(detail)))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(lotteryTicketSerialServicePort.getByIdOrThrow(1L)).thenReturn(
                LotteryTicketSerialModel.builder()
                        .id(1L)
                        .ticketId(100L)
                        .serialNumber("OLD-001")
                        .status(LotteryTicketSerialStatus.SOLD)
                        .build());
        when(lotteryTicketRepositoryPort.findById(100L)).thenReturn(Optional.of(
                LotteryTicketModel.builder().id(100L).numbers("12345").build()));
        when(lotteryTicketServicePort.getById(100L)).thenReturn(
                LotteryTicketResponse.builder().id(100L).numbers("12345").build());
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(100L)).thenReturn(List.of());
        when(orderRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        HandleOrderTicketIncidentResponse response = service.handleIncidents(
                orderId,
                staffId,
                new HandleOrderTicketIncidentRequest(List.of(10L), TicketIncidentReason.LOST, null));

        assertThat(response.results()).hasSize(1);
        assertThat(response.results().getFirst().outcome()).isEqualTo(TicketIncidentOutcome.NO_REPLACEMENT);
        verify(lotteryTicketSerialServicePort, never()).markSold(any());
        verify(lotteryTicketSerialRepositoryPort).save(any(LotteryTicketSerialModel.class));
    }
}

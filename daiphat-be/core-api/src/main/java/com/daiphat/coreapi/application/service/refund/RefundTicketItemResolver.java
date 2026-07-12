package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundEligibleTicketItemResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class RefundTicketItemResolver {

    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;

    public List<RefundEligibleTicketItemResponse> resolveFromOrder(OrderModel order) {
        if (order == null || order.getOrderDetails() == null || order.getOrderDetails().isEmpty()) {
            return List.of();
        }

        Map<Long, LotteryTicketResponse> ticketsById = new LinkedHashMap<>();
        Map<Long, LotteryTicketSerialModel> serialsById = new LinkedHashMap<>();

        return order.getOrderDetails().stream()
                .filter(detail -> detail.getStatus() == OrderDetailStatus.ACTIVE
                        || detail.getStatus() == OrderDetailStatus.INACTIVE
                        || detail.getStatus() == OrderDetailStatus.REFUND_PENDING)
                .map(detail -> toRefundTicketItem(detail, ticketsById, serialsById))
                .toList();
    }

    private RefundEligibleTicketItemResponse toRefundTicketItem(
            OrderDetailModel detail,
            Map<Long, LotteryTicketResponse> ticketsById,
            Map<Long, LotteryTicketSerialModel> serialsById
    ) {
        LotteryTicketResponse ticket = resolveTicket(detail.getLotteryTicketId(), ticketsById);
        LotteryTicketSerialModel serial = resolveSerial(detail.getLotteryTicketSerialId(), serialsById);
        BigDecimal unitPrice = detail.getPrice() != null ? detail.getPrice() : BigDecimal.ZERO;
        int quantity = detail.getEffectiveQuantity();
        String numbers = ticket != null ? ticket.numbers() : null;
        if ((numbers == null || numbers.isBlank()) && serial != null) {
            numbers = serial.getSerialNumber();
        }

        return RefundEligibleTicketItemResponse.builder()
                .orderDetailId(detail.getId())
                .numbers(numbers)
                .stationName(ticket != null ? ticket.stationName() : null)
                .drawDate(ticket != null ? ticket.drawDate() : null)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .subtotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)))
                .build();
    }

    private LotteryTicketResponse resolveTicket(
            Long lotteryTicketId,
            Map<Long, LotteryTicketResponse> ticketsById
    ) {
        if (lotteryTicketId == null) {
            return null;
        }
        return ticketsById.computeIfAbsent(lotteryTicketId, id -> {
            try {
                return lotteryTicketServicePort.getById(id);
            } catch (RuntimeException ex) {
                return null;
            }
        });
    }

    private LotteryTicketSerialModel resolveSerial(
            Long lotteryTicketSerialId,
            Map<Long, LotteryTicketSerialModel> serialsById
    ) {
        if (lotteryTicketSerialId == null) {
            return null;
        }
        return serialsById.computeIfAbsent(lotteryTicketSerialId, id -> {
            try {
                return lotteryTicketSerialServicePort.getByIdOrThrow(id);
            } catch (RuntimeException ex) {
                return null;
            }
        });
    }
}

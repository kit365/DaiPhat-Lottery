package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundEligibleTicketItemResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class RefundTicketItemResolver {

    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;

    public List<RefundEligibleTicketItemResponse> resolveFromOrder(OrderModel order) {
        return resolveFromOrder(order, null);
    }

    /**
     * Builds ticket rows for a refund. When {@code orderDetailIds} is non-empty, only those lines
     * are included (partial inspection refunds).
     */
    public List<RefundEligibleTicketItemResponse> resolveFromOrder(
            OrderModel order,
            Collection<Long> orderDetailIds
    ) {
        if (order == null || order.getOrderDetails() == null || order.getOrderDetails().isEmpty()) {
            return List.of();
        }

        Set<Long> detailIdFilter = orderDetailIds == null || orderDetailIds.isEmpty()
                ? null
                : new HashSet<>(orderDetailIds);

        Map<Long, LotteryTicketResponse> ticketsById = new LinkedHashMap<>();
        Map<Long, LotteryTicketSerialModel> serialsById = new LinkedHashMap<>();

        return order.getOrderDetails().stream()
                .filter(detail -> detailIdFilter == null || detailIdFilter.contains(detail.getId()))
                .filter(detail -> detail.getStatus() == OrderDetailStatus.ACTIVE
                        || detail.getStatus() == OrderDetailStatus.INACTIVE
                        || detail.getStatus() == OrderDetailStatus.REFUND_PENDING
                        || detail.getStatus() == OrderDetailStatus.REFUNDED)
                .map(detail -> toRefundTicketItem(detail, ticketsById, serialsById))
                .toList();
    }

    private RefundEligibleTicketItemResponse toRefundTicketItem(
            OrderDetailModel detail,
            Map<Long, LotteryTicketResponse> ticketsById,
            Map<Long, LotteryTicketSerialModel> serialsById
    ) {
        LotteryTicketResponse ticket = resolveTicket(detail.getLotteryTicketId(), ticketsById);
        // Prefer current serial on the line; for NO_REPLACEMENT incidents this is the faulted serial.
        Long serialId = detail.getLotteryTicketSerialId() != null
                ? detail.getLotteryTicketSerialId()
                : detail.getReplacedByTicketSerialId();
        LotteryTicketSerialModel serial = resolveSerial(serialId, serialsById);
        BigDecimal unitPrice = detail.getPrice() != null ? detail.getPrice() : BigDecimal.ZERO;
        int quantity = detail.getEffectiveQuantity();
        String numbers = ticket != null ? ticket.numbers() : null;
        if ((numbers == null || numbers.isBlank()) && serial != null) {
            numbers = serial.getSerialNumber();
        }

        boolean hasIncident = isIncidentSerial(serial);
        LotteryTicketSerialStatus serialStatus = serial != null ? serial.getStatus() : null;

        return RefundEligibleTicketItemResponse.builder()
                .orderDetailId(detail.getId())
                .numbers(numbers)
                .serialNumber(serial != null ? serial.getSerialNumber() : null)
                .stationName(ticket != null ? ticket.stationName() : null)
                .drawDate(ticket != null ? ticket.drawDate() : null)
                .ticketImg(ticket != null ? ticket.ticketImg() : null)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .subtotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)))
                .serialStatus(hasIncident && serialStatus != null ? serialStatus.name() : null)
                .serialStatusLabel(hasIncident && serialStatus != null ? serialStatus.getLabel() : null)
                .hasIncident(hasIncident)
                .faultedBy(hasIncident && serial.getFaultedBy() != null ? serial.getFaultedBy().name() : null)
                .faultedByDisplayName(hasIncident && serial.getFaultedBy() != null
                        ? serial.getFaultedBy().getDisplayName()
                        : null)
                .damagedReason(hasIncident ? serial.getDamagedReason() : null)
                .damagedEvidenceUrl(hasIncident ? serial.getDamagedEvidenceUrl() : null)
                .build();
    }

    private static boolean isIncidentSerial(LotteryTicketSerialModel serial) {
        if (serial == null || serial.getStatus() == null) {
            return false;
        }
        return serial.getStatus() == LotteryTicketSerialStatus.LOST
                || serial.getStatus() == LotteryTicketSerialStatus.DAMAGED;
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

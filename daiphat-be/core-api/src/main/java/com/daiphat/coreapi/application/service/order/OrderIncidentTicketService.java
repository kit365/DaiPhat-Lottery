package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.request.order.HandleOrderTicketIncidentRequest;
import com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse;
import com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse.TicketIncidentItemResult;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.order.OrderIncidentTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentOutcome;
import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderIncidentTicketService implements OrderIncidentTicketServicePort {

    private final OrderRepositoryPort orderRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort;

    @Override
    @Transactional
    public HandleOrderTicketIncidentResponse handleIncidents(
            UUID orderId,
            UUID staffId,
            HandleOrderTicketIncidentRequest request
    ) {
        log.info("Staff {} handling ticket incidents for order {}", staffId, orderId);

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new DomainException(
                    ErrorCode.ORDER_INVALID_STATUS,
                    "Chỉ được xử lý vé sự cố khi đơn đang ở trạng thái PREPARING.");
        }

        repairPrematureSoldSerials(order);

        Set<Long> requestedIds = new LinkedHashSet<>(request.orderDetailIds());
        if (requestedIds.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chọn ít nhất một vé sự cố.");
        }

        List<TicketIncidentItemResult> results = new ArrayList<>();
        for (Long detailId : requestedIds) {
            OrderDetailModel detail = findDetail(order, detailId);
            results.add(handleSingleDetail(order, detail, request.reason(), request.note(), staffId));
        }

        order.recalculateTotalAmount();
        orderRepositoryPort.save(order);
        return new HandleOrderTicketIncidentResponse(results);
    }

    @Override
    @Transactional
    public HandleOrderTicketIncidentResponse handlePartialRefundIncidents(
            UUID orderId,
            UUID staffId,
            java.util.List<com.daiphat.coreapi.application.dto.request.order.TicketIncidentItemRequest> incidents,
            String note
    ) {
        log.info("Staff {} handling partial refund incidents for order {}", staffId, orderId);

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PREPARING
                && order.getStatus() != OrderStatus.PENDING_PICKUP) {
            throw new DomainException(
                    ErrorCode.ORDER_INVALID_STATUS,
                    "Chỉ được xử lý vé sự cố khi đơn đang PREPARING hoặc PENDING_PICKUP.");
        }

        repairPrematureSoldSerials(order);

        if (incidents == null || incidents.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chọn ít nhất một vé sự cố.");
        }

        List<TicketIncidentItemResult> results = new ArrayList<>();
        for (com.daiphat.coreapi.application.dto.request.order.TicketIncidentItemRequest incident : incidents) {
            OrderDetailModel detail = findDetail(order, incident.orderDetailId());
            results.add(handlePartialRefundSingleDetail(order, detail, incident, note, staffId));
        }

        order.recalculateTotalAmount();
        orderRepositoryPort.save(order);
        return new HandleOrderTicketIncidentResponse(results);
    }

    private TicketIncidentItemResult handleSingleDetail(
            OrderModel order,
            OrderDetailModel detail,
            TicketIncidentReason reason,
            String note,
            UUID staffId
    ) {
        if (detail.getStatus() != OrderDetailStatus.ACTIVE) {
            throw new DomainException(
                    ErrorCode.ORDER_DETAIL_INVALID_STATUS,
                    "Chỉ xử lý sự cố cho vé đang hiệu lực (ACTIVE).");
        }

        Long oldSerialId = resolvePrimarySerialId(detail);
        if (oldSerialId == null) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND, "Chi tiết đơn thiếu mã vé serial.");
        }

        LotteryTicketSerialModel oldSerial = lotteryTicketSerialServicePort.getByIdOrThrow(oldSerialId);
        LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(oldSerial.getTicketId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        Optional<LotteryTicketSerialModel> replacementOpt = lotteryTicketSerialRepositoryPort
                .findAllByTicketId(ticket.getId()).stream()
                .filter(LotteryTicketSerialModel::isAvailableForSale)
                .filter(candidate -> !Objects.equals(candidate.getId(), oldSerialId))
                .findFirst();

        String numbers = ticket.getNumbers();
        String stationName = null;
        try {
            stationName = lotteryTicketServicePort.getById(ticket.getId()).stationName();
        } catch (RuntimeException ignored) {
            // optional enrichment
        }

        if (replacementOpt.isEmpty()) {
            applyFault(oldSerial, reason, note != null && !note.isBlank() ? note : reason.getLabel(), null);
            lotteryTicketSerialRepositoryPort.save(oldSerial);
            return TicketIncidentItemResult.builder()
                    .orderDetailId(detail.getId())
                    .outcome(TicketIncidentOutcome.NO_REPLACEMENT)
                    .reason(reason)
                    .numbers(numbers)
                    .stationName(stationName)
                    .oldSerialNumber(oldSerial.getSerialNumber())
                    .oldTicketSerialId(oldSerialId)
                    .message("Hết vé thay thế cùng bộ số. Hoàn tiền từng phần sẽ được hỗ trợ ở bước tiếp theo.")
                    .build();
        }

        LotteryTicketSerialModel replacement = replacementOpt.get();
        applyFault(oldSerial, reason, note != null && !note.isBlank() ? note : reason.getLabel(), null);
        lotteryTicketSerialRepositoryPort.save(oldSerial);

        LotteryTicketModel replacementTicket = lotteryTicketRepositoryPort.findById(replacement.getTicketId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        LotteryTicketSerialModel heldReplacement = lotteryTicketSerialServicePort.markProxyHoldingForPaidOrder(
                replacement.getId(),
                order.getId()
        );

        Long newSerialId = heldReplacement.getId();
        detail.applySerialReplacement(heldReplacement.getTicketId(), newSerialId, replacementTicket.getPriceSnapshot());
        orderDetailSerialRepositoryPort.replaceSerialAllocation(detail.getId(), oldSerialId, newSerialId);

        return TicketIncidentItemResult.builder()
                .orderDetailId(detail.getId())
                .outcome(TicketIncidentOutcome.REPLACED)
                .reason(reason)
                .numbers(numbers)
                .stationName(stationName)
                .oldSerialNumber(oldSerial.getSerialNumber())
                .newSerialNumber(heldReplacement.getSerialNumber())
                .oldTicketSerialId(oldSerialId)
                .newTicketSerialId(newSerialId)
                .message(String.format(
                        "Đã tự động đổi sang vé %s cho bộ số %s",
                        heldReplacement.getSerialNumber(),
                        numbers != null ? numbers : ""))
                .build();
    }

    private TicketIncidentItemResult handlePartialRefundSingleDetail(
            OrderModel order,
            OrderDetailModel detail,
            com.daiphat.coreapi.application.dto.request.order.TicketIncidentItemRequest incident,
            String note,
            UUID staffId
    ) {
        if (detail.getStatus() != OrderDetailStatus.ACTIVE) {
            throw new DomainException(
                    ErrorCode.ORDER_DETAIL_INVALID_STATUS,
                    "Chỉ xử lý sự cố cho vé đang hiệu lực (ACTIVE).");
        }

        Long oldSerialId = resolvePrimarySerialId(detail);
        if (oldSerialId == null) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND, "Chi tiết đơn thiếu mã vé serial.");
        }

        LotteryTicketSerialModel oldSerial = lotteryTicketSerialServicePort.getByIdOrThrow(oldSerialId);
        LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(oldSerial.getTicketId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        String numbers = ticket.getNumbers();
        String stationName = null;
        try {
            stationName = lotteryTicketServicePort.getById(ticket.getId()).stationName();
        } catch (RuntimeException ignored) {
            // optional enrichment
        }

        if (incident.replacementTicketId() == null) {
            // No replacement → mark reported serial as faulted; partial refund follows.
            applyFault(
                    oldSerial,
                    incident.reason(),
                    incident.damagedReason() != null ? incident.damagedReason() : incident.reason().getLabel(),
                    incident.damagedEvidenceUrl());
            lotteryTicketSerialRepositoryPort.save(oldSerial);
            return TicketIncidentItemResult.builder()
                    .orderDetailId(detail.getId())
                    .outcome(TicketIncidentOutcome.NO_REPLACEMENT)
                    .reason(incident.reason())
                    .numbers(numbers)
                    .stationName(stationName)
                    .oldSerialNumber(oldSerial.getSerialNumber())
                    .oldTicketSerialId(oldSerialId)
                    .message("Hết vé thay thế cùng bộ số. Hoàn tiền từng phần sẽ được hỗ trợ ở bước tiếp theo.")
                    .build();
        }

        // Apply fault to old serial (status / faultedBy / damagedReason / evidence for DAMAGED)
        applyFault(
                oldSerial,
                incident.reason(),
                incident.damagedReason() != null ? incident.damagedReason() : incident.reason().getLabel(),
                incident.damagedEvidenceUrl());
        lotteryTicketSerialRepositoryPort.save(oldSerial);

        // Find available candidate for the provided replacementTicketId (which is actually the specific serial ID)
        LotteryTicketSerialModel replacementOpt = lotteryTicketSerialRepositoryPort
                .findById(incident.replacementTicketId())
                .filter(LotteryTicketSerialModel::isAvailableForSale)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND, "Vé thay thế không còn khả dụng."));

        LotteryTicketModel replacementTicket = lotteryTicketRepositoryPort.findById(replacementOpt.getTicketId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        LotteryTicketSerialModel heldReplacement = lotteryTicketSerialServicePort.markProxyHoldingForPaidOrder(
                replacementOpt.getId(),
                order.getId()
        );

        Long newSerialId = heldReplacement.getId();
        detail.applySerialReplacement(heldReplacement.getTicketId(), newSerialId, replacementTicket.getPriceSnapshot());
        orderDetailSerialRepositoryPort.replaceSerialAllocation(detail.getId(), oldSerialId, newSerialId);

        return TicketIncidentItemResult.builder()
                .orderDetailId(detail.getId())
                .outcome(TicketIncidentOutcome.REPLACED)
                .reason(incident.reason())
                .numbers(numbers)
                .stationName(stationName)
                .oldSerialNumber(oldSerial.getSerialNumber())
                .newSerialNumber(heldReplacement.getSerialNumber())
                .oldTicketSerialId(oldSerialId)
                .newTicketSerialId(newSerialId)
                .message(String.format(
                        "Đã tự động đổi sang vé %s cho bộ số %s",
                        heldReplacement.getSerialNumber(),
                        numbers != null ? numbers : ""))
                .build();
    }

    /**
     * Legacy online payment marked serials SOLD before staff inspection.
     * Convert back to PROXY_HOLDING so replace/fault works during PREPARING.
     */
    private void repairPrematureSoldSerials(OrderModel order) {
        if (order.getId() == null || order.getOrderDetails() == null) {
            return;
        }
        if (order.getStatus() != OrderStatus.PREPARING) {
            return;
        }
        for (OrderDetailModel detail : order.getOrderDetails()) {
            if (detail.getStatus() != OrderDetailStatus.ACTIVE) {
                continue;
            }
            Long serialId = resolvePrimarySerialId(detail);
            if (serialId == null) {
                continue;
            }
            LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId).orElse(null);
            if (serial == null || serial.getStatus() != LotteryTicketSerialStatus.SOLD) {
                continue;
            }
            lotteryTicketServicePort.markProxyHoldingForPaidOrder(serialId, order.getId());
        }
    }

    private void applyFault(
            LotteryTicketSerialModel serial,
            TicketIncidentReason reason,
            String damagedReason,
            String damagedEvidenceUrl
    ) {
        LotteryTicketSerialFaultedBy faultedBy = LotteryTicketSerialFaultedBy.INTERNAL_FAULT;
        if (reason == TicketIncidentReason.LOST) {
            serial.markLost(faultedBy, damagedReason);
        } else {
            serial.markDamaged(faultedBy, damagedReason, damagedEvidenceUrl);
        }
    }

    private OrderDetailModel findDetail(OrderModel order, Long detailId) {
        if (order.getOrderDetails() == null) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND);
        }
        return order.getOrderDetails().stream()
                .filter(d -> Objects.equals(d.getId(), detailId))
                .findFirst()
                .orElseThrow(() -> new DomainException(
                        ErrorCode.REFUND_REQUEST_ORDER_MISMATCH,
                        "Chi tiết đơn hàng không thuộc đơn đang xử lý."));
    }

    /**
     * Current serial to deliver / report against.
     * After a successful replacement, prefer {@code replacedByTicketSerialId}.
     */
    private Long resolvePrimarySerialId(OrderDetailModel detail) {
        if (detail.getReplacedByTicketSerialId() != null) {
            return detail.getReplacedByTicketSerialId();
        }
        if (detail.getLotteryTicketSerialId() != null) {
            return detail.getLotteryTicketSerialId();
        }
        if (detail.getAllocatedSerialIds() != null && !detail.getAllocatedSerialIds().isEmpty()) {
            return detail.getAllocatedSerialIds().getFirst();
        }
        if (detail.getId() != null) {
            List<Long> persisted = orderDetailSerialRepositoryPort.findSerialIdsByOrderDetailId(detail.getId());
            if (!persisted.isEmpty()) {
                return persisted.getFirst();
            }
        }
        return null;
    }
}

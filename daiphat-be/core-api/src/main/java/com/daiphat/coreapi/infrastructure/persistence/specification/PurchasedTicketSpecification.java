package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class PurchasedTicketSpecification {

    /**
     * Chỉ lấy vé thuộc đơn đã mua thành công (đã thanh toán / đang xử lý / đã lấy).
     * Loại trừ đơn chờ thanh toán và đơn đã hủy (timeout PayOS, hủy tay...).
     */
    private static final Set<OrderStatus> PURCHASED_ORDER_STATUSES = EnumSet.of(
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.PENDING_PICKUP,
            OrderStatus.COMPLETED
    );

    private PurchasedTicketSpecification() {
    }

    public static Specification<OrderDetailEntity> purchasedByUser(
            UUID userId,
            LocalDate fromDate,
            LocalDate toDate,
            String ticketNumber
    ) {
        return (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }

            Join<OrderDetailEntity, OrderEntity> order = root.join("order");
            Join<OrderDetailEntity, LotteryTicketSerialEntity> serial = root.join("lotteryTicketSerial");
            Join<LotteryTicketSerialEntity, LotteryTicketEntity> ticket = serial.join("ticket");

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(order.get("user").get("id"), userId));
            predicates.add(order.get("status").in(PURCHASED_ORDER_STATUSES));

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(order.get("createdAt"), fromDate.atStartOfDay()));
            }
            if (toDate != null) {
                LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(order.get("createdAt"), endExclusive));
            }
            if (ticketNumber != null && !ticketNumber.isBlank()) {
                String pattern = "%" + ticketNumber.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(ticket.get("numbers")), pattern),
                        cb.like(cb.lower(serial.get("serialNumber")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

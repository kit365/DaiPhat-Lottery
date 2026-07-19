package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class PurchasedTicketSpecification {

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

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(order.get("createdAt"), fromDate.atStartOfDay()));
            }
            if (toDate != null) {
                LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(order.get("createdAt"), endExclusive));
            }
            if (ticketNumber != null && !ticketNumber.isBlank()) {
                String pattern = "%" + ticketNumber.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(ticket.get("numbers")), pattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

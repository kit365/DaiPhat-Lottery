package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity_;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class OrderSpecification {

    private OrderSpecification() {
    }

    public static Specification<OrderEntity> myOrders(
            UUID userId,
            OrderStatus status,
            OrderType orderType,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get(OrderEntity_.user).get(UserEntity_.id), userId));

            if (status != null) {
                predicates.add(cb.equal(root.get(OrderEntity_.status), status));
            }

            if (orderType != null) {
                predicates.add(cb.equal(root.get(OrderEntity_.orderType), orderType));
            }

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get(OrderEntity_.createdAt), fromDate.atStartOfDay()));
            }

            if (toDate != null) {
                LocalDateTime endOfDayExclusive = toDate.plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(root.get(OrderEntity_.createdAt), endOfDayExclusive));
            }

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get(OrderEntity_.orderCode)), likePattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
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
            List<OrderStatus> statuses,
            List<OrderType> orderTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get(OrderEntity_.USER).get(UserEntity_.ID), userId));

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get(OrderEntity_.STATUS).in(statuses));
            }

            if (orderTypes != null && !orderTypes.isEmpty()) {
                predicates.add(root.get(OrderEntity_.ORDER_TYPE).in(orderTypes));
            }

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get(OrderEntity_.CREATED_AT), fromDate.atStartOfDay()));
            }

            if (toDate != null) {
                LocalDateTime endOfDayExclusive = toDate.plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(root.get(OrderEntity_.CREATED_AT), endOfDayExclusive));
            }

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get(OrderEntity_.ORDER_CODE)), likePattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<OrderEntity> orders(
            List<OrderStatus> statuses,
            List<OrderType> orderTypes,
            List<OrderReceiveType> receiveTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get(OrderEntity_.STATUS).in(statuses));
            }

            if (orderTypes != null && !orderTypes.isEmpty()) {
                predicates.add(root.get(OrderEntity_.ORDER_TYPE).in(orderTypes));
            }

            if (receiveTypes != null && !receiveTypes.isEmpty()) {
                predicates.add(root.get(OrderEntity_.RECEIVE_TYPE).in(receiveTypes));
            }

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get(OrderEntity_.CREATED_AT), fromDate.atStartOfDay()));
            }

            if (toDate != null) {
                LocalDateTime endOfDayExclusive = toDate.plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(root.get(OrderEntity_.CREATED_AT), endOfDayExclusive));
            }

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(OrderEntity_.ORDER_CODE)), likePattern),
                        cb.like(cb.lower(root.get(OrderEntity_.NAME)), likePattern),
                        cb.like(cb.lower(root.get(OrderEntity_.PHONE)), likePattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public final class RefundRequestSpecification {

    private RefundRequestSpecification() {
    }

    public static Specification<RefundRequestEntity> filter(
            UUID requestedBy,
            RefundRequestStatus status,
            UUID orderId,
            String search
    ) {
        return filter(requestedBy, status, null, orderId, search);
    }

    public static Specification<RefundRequestEntity> filter(
            UUID requestedBy,
            RefundRequestStatus status,
            Collection<RefundRequestStatus> statuses,
            UUID orderId,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (requestedBy != null) {
                predicates.add(cb.equal(root.get("requestedBy").get("id"), requestedBy));
            }

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            } else if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (orderId != null) {
                predicates.add(cb.equal(root.get("order").get("id"), orderId));
            }

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                var orderJoin = root.join("order");
                var requestedByJoin = root.join("requestedBy");
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("refundReason")), likePattern),
                        cb.like(cb.lower(root.get("rejectReason")), likePattern),
                        cb.like(cb.lower(orderJoin.get("orderCode")), likePattern),
                        cb.like(cb.lower(requestedByJoin.get("fullName")), likePattern),
                        cb.like(cb.lower(requestedByJoin.get("email")), likePattern),
                        cb.like(cb.lower(requestedByJoin.get("phoneNumber")), likePattern),
                        cb.like(cb.toString(root.get("id")), likePattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
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
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (requestedBy != null) {
                predicates.add(cb.equal(root.get("requestedBy").get("id"), requestedBy));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (orderId != null) {
                predicates.add(cb.equal(root.get("order").get("id"), orderId));
            }

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("refundReason")), likePattern),
                        cb.like(cb.lower(root.get("rejectReason")), likePattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

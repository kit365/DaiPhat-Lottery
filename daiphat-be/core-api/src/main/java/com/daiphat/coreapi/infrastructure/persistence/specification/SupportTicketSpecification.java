package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class SupportTicketSpecification {

    private SupportTicketSpecification() {
    }

    public static Specification<SupportTicketEntity> filter(
            UUID customerId,
            TicketStatus status,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), likePattern),
                        cb.like(cb.lower(root.get("description")), likePattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

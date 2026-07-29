package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public final class PrizePayoutRequestSpecification {

    private PrizePayoutRequestSpecification() {
    }

    public static Specification<PrizePayoutRequestEntity> filter(
            UUID customerId,
            PrizePayoutRequestStatus status,
            Collection<PrizePayoutRequestStatus> statuses,
            String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            } else if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("requestCode")), pattern),
                        cb.like(cb.lower(root.get("accountHolderName")), pattern),
                        cb.like(cb.lower(root.get("customer").get("fullName")), pattern),
                        cb.like(cb.lower(root.get("customer").get("phone")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

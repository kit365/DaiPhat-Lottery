package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class StreetAgentProfileSpecification {

    private StreetAgentProfileSpecification() {
    }

    public static Specification<StreetAgentProfileEntity> filter(
            String search,
            StreetAgentProfileStatus status
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.concat(
                                cb.concat(root.get("lastName"), " "),
                                root.get("firstName")
                        )), likePattern),
                        cb.like(root.get("phone"), "%" + search.trim() + "%"),
                        cb.like(root.get("cccd"), "%" + search.trim() + "%")
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

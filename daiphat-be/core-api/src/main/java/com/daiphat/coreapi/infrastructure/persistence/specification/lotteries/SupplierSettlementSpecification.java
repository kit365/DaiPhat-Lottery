package com.daiphat.coreapi.infrastructure.persistence.specification.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class SupplierSettlementSpecification {

    private SupplierSettlementSpecification() {
    }

    public static Specification<SupplierSettlementEntity> filter(
            Long lotterySupplierId,
            SupplierSettlementStatus status,
            LocalDate periodFrom,
            LocalDate periodTo,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (lotterySupplierId != null) {
                predicates.add(cb.equal(root.get("lotterySupplier").get("id"), lotterySupplierId));
            }
            if (status != null) {
                if (status == SupplierSettlementStatus.COMPLETED) {
                    predicates.add(root.get("status").in(
                            SupplierSettlementStatus.COMPLETED,
                            SupplierSettlementStatus.CLOSED
                    ));
                } else {
                    predicates.add(cb.equal(root.get("status"), status));
                }
            }
            if (periodFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("periodFrom"), periodFrom));
            }
            if (periodTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("periodFrom"), periodTo));
            }
            if (search != null && !search.isBlank()) {
                var supplier = root.join("lotterySupplier", JoinType.LEFT);
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(supplier.get("name")), likePattern),
                        cb.like(cb.lower(supplier.get("code")), likePattern),
                        cb.like(cb.lower(root.get("supplierSettlementCode")), likePattern)
                ));
                if (query != null) {
                    query.distinct(true);
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

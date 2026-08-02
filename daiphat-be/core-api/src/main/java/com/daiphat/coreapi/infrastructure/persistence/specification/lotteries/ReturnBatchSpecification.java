package com.daiphat.coreapi.infrastructure.persistence.specification.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class ReturnBatchSpecification {

    private ReturnBatchSpecification() {
    }

    public static Specification<ReturnBatchEntity> filter(
            Long lotterySupplierId,
            Long supplierSettlementId,
            ReturnBatchStatus status,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (lotterySupplierId != null) {
                predicates.add(cb.equal(root.get("lotterySupplier").get("id"), lotterySupplierId));
            }
            if (supplierSettlementId != null) {
                predicates.add(cb.equal(root.get("supplierSettlementId"), supplierSettlementId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (drawDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("drawDate"), drawDateFrom));
            }
            if (drawDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("drawDate"), drawDateTo));
            }
            if (search != null && !search.isBlank()) {
                var supplier = root.join("lotterySupplier", JoinType.LEFT);
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(supplier.get("name")), likePattern),
                        cb.like(cb.lower(supplier.get("code")), likePattern)
                ));
                if (query != null) {
                    query.distinct(true);
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

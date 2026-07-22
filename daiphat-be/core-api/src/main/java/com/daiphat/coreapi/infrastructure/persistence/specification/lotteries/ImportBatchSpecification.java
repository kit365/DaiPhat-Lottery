package com.daiphat.coreapi.infrastructure.persistence.specification.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class ImportBatchSpecification {

    private ImportBatchSpecification() {
    }

    public static Specification<ImportBatchEntity> filter(
            Long lotteryStationId,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            ImportBatchStatus status,
            ImportBatchType batchType
    ) {
        return (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();
            Join<ImportBatchEntity, ImportBatchLineEntity> linesJoin = null;

            if (lotteryStationId != null || batchType != null) {
                linesJoin = root.join("lines", JoinType.INNER);
            }

            if (lotteryStationId != null && linesJoin != null) {
                predicates.add(cb.equal(linesJoin.get("lotteryStation").get("id"), lotteryStationId));
            }

            if (drawDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("drawDate"), drawDateFrom));
            }

            if (drawDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("drawDate"), drawDateTo));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (batchType != null && linesJoin != null) {
                predicates.add(cb.equal(linesJoin.get("batchType"), batchType));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

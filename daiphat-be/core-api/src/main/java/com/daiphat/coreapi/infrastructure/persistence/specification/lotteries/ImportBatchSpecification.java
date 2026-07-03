package com.daiphat.coreapi.infrastructure.persistence.specification.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
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
            LocalDate drawDate,
            ImportBatchStatus status,
            ImportBatchType batchType
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (lotteryStationId != null) {
                predicates.add(cb.equal(root.get("lotteryStation").get("id"), lotteryStationId));
            }

            if (drawDate != null) {
                predicates.add(cb.equal(root.get("drawDate"), drawDate));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (batchType != null) {
                predicates.add(cb.equal(root.get("batchType"), batchType));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

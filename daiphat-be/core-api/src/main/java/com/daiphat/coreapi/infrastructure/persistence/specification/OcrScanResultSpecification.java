package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public final class OcrScanResultSpecification {

    private OcrScanResultSpecification() {
    }

    public static Specification<OcrScanResultEntity> filter(String scanId, Long importBatchLineId) {
        return filter(scanId, importBatchLineId, null, null);
    }

    public static Specification<OcrScanResultEntity> filter(
            String scanId,
            Long importBatchLineId,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));

            if (StringUtils.hasText(scanId)) {
                predicates.add(cb.equal(root.get(OcrScanResultEntity_.scanId), scanId.trim()));
            }
            if (importBatchLineId != null) {
                predicates.add(cb.equal(root.get(OcrScanResultEntity_.importBatchLineId), importBatchLineId));
            }
            if (fromDate != null) {
                LocalDateTime from = fromDate.atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get(OcrScanResultEntity_.scannedAt), from));
            }
            if (toDate != null) {
                LocalDateTime to = toDate.atTime(LocalTime.MAX);
                predicates.add(cb.lessThanOrEqualTo(root.get(OcrScanResultEntity_.scannedAt), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

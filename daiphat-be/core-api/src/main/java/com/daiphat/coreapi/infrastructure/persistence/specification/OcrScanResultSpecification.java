package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public final class OcrScanResultSpecification {

    private OcrScanResultSpecification() {
    }

    public static Specification<OcrScanResultEntity> filter(String scanId, Long importBatchLineId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));

            if (StringUtils.hasText(scanId)) {
                predicates.add(cb.equal(root.get(OcrScanResultEntity_.scanId), scanId.trim()));
            }
            if (importBatchLineId != null) {
                predicates.add(cb.equal(root.get(OcrScanResultEntity_.importBatchLineId), importBatchLineId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

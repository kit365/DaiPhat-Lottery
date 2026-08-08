package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryScanLogEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryScanLogEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class LotteryScanLogSpecification {

    private LotteryScanLogSpecification() {
    }

    public static Specification<LotteryScanLogEntity> filter(
            ScanEventType eventType,
            Long lotteryTicketSerialId,
            UUID scannedBy,
            LocalDate scannedAtFrom,
            LocalDate scannedAtTo
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));

            if (eventType != null) {
                predicates.add(cb.equal(root.get(LotteryScanLogEntity_.eventType), eventType));
            }
            if (lotteryTicketSerialId != null) {
                predicates.add(cb.equal(root.get(LotteryScanLogEntity_.lotteryTicketSerialId), lotteryTicketSerialId));
            }
            if (scannedBy != null) {
                predicates.add(cb.equal(root.get(LotteryScanLogEntity_.scannedBy).get("id"), scannedBy));
            }
            if (scannedAtFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get(LotteryScanLogEntity_.scannedAt), scannedAtFrom.atStartOfDay()));
            }
            if (scannedAtTo != null) {
                LocalDateTime endOfDay = scannedAtTo.plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(root.get(LotteryScanLogEntity_.scannedAt), endOfDay));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

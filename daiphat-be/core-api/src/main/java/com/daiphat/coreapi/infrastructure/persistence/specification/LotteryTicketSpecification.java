package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class LotteryTicketSpecification {

    private LotteryTicketSpecification() {
    }

    public static Specification<LotteryTicketEntity> byId(Long id) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get(LotteryTicketEntity_.id), id),
                cb.isNull(root.get(BaseEntity_.deletedAt))
        );
    }

    public static Specification<LotteryTicketEntity> filter(
            Long stationId,
            List<Long> stationIds,
            LotteryTicketStatus status,
            List<LocalDate> drawDates,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));

            if (stationId != null) {
                predicates.add(cb.equal(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.id), stationId));
            }
            if (stationIds != null && !stationIds.isEmpty()) {
                predicates.add(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.id).in(stationIds));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get(LotteryTicketEntity_.status), status));
            }
            if (drawDates != null && !drawDates.isEmpty()) {
                predicates.add(root.get(LotteryTicketEntity_.drawDate).in(drawDates));
            }
            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.numbers)), searchPattern),
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.batchCode)), searchPattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<LotteryTicketEntity> filterPublic(
            Long stationId,
            List<Long> stationIds,
            List<LocalDate> drawDates,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));
            predicates.add(cb.equal(root.get(LotteryTicketEntity_.status), LotteryTicketStatus.IN_STOCK));
            predicates.add(cb.greaterThan(root.get(LotteryTicketEntity_.quantity), 0));
            predicates.add(cb.isTrue(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.isActive)));
            predicates.add(cb.isNull(root.get(LotteryTicketEntity_.station).get(BaseEntity_.deletedAt)));

            if (stationId != null) {
                predicates.add(cb.equal(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.id), stationId));
            }
            if (stationIds != null && !stationIds.isEmpty()) {
                predicates.add(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.id).in(stationIds));
            }
            if (drawDates != null && !drawDates.isEmpty()) {
                predicates.add(root.get(LotteryTicketEntity_.drawDate).in(drawDates));
            }
            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.numbers)), searchPattern),
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.batchCode)), searchPattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

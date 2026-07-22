package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity_;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalTime;
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
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            Long importBatchLineId,
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
            if (drawDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get(LotteryTicketEntity_.drawDate), drawDateFrom));
            }
            if (drawDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get(LotteryTicketEntity_.drawDate), drawDateTo));
            }
            if (importBatchLineId != null) {
                Subquery<Long> subquery = query.subquery(Long.class);
                var serialRoot = subquery.from(LotteryTicketSerialEntity.class);
                subquery.select(cb.literal(1L)).where(
                        cb.equal(serialRoot.get(LotteryTicketSerialEntity_.ticket), root),
                        cb.isNull(serialRoot.get(BaseEntity_.deletedAt)),
                        cb.equal(serialRoot.get(LotteryTicketSerialEntity_.importBatchLine).get(ImportBatchLineEntity_.id), importBatchLineId)
                );
                predicates.add(cb.exists(subquery));
            }
            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.numbers)), searchPattern),
                        batchCodeExistsPredicate(root, query, cb, searchPattern)
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
            predicates.add(cb.isTrue(root.get(LotteryTicketEntity_.active)));
            var serialJoin = root.join("serials", jakarta.persistence.criteria.JoinType.INNER);
            predicates.add(cb.equal(serialJoin.get("status"), com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK));
            predicates.add(cb.isNull(serialJoin.get("deletedAt")));
            query.distinct(true);
            predicates.add(cb.isTrue(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.isActive)));
            predicates.add(cb.isNull(root.get(LotteryTicketEntity_.station).get(BaseEntity_.deletedAt)));

            // Sale cutoff: tickets stop being publicly sellable once their draw has happened,
            // even if the expiry scheduler has not flipped their status yet.
            LocalDate today = DrawScheduleUtils.today();
            LocalTime now = DrawScheduleUtils.nowTime();
            predicates.add(cb.greaterThanOrEqualTo(root.get(LotteryTicketEntity_.drawDate), today));
            predicates.add(cb.or(
                    cb.notEqual(root.get(LotteryTicketEntity_.drawDate), today),
                    cb.isNull(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.drawTime)),
                    cb.greaterThan(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.drawTime), now)
            ));

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
                        batchCodeExistsPredicate(root, query, cb, searchPattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate batchCodeExistsPredicate(
            jakarta.persistence.criteria.Root<LotteryTicketEntity> root,
            jakarta.persistence.criteria.CriteriaQuery<?> query,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            String searchPattern
    ) {
        Subquery<Long> subquery = query.subquery(Long.class);
        var serialRoot = subquery.from(LotteryTicketSerialEntity.class);
        var batchLineJoin = serialRoot.join(LotteryTicketSerialEntity_.importBatchLine, JoinType.INNER);
        subquery.select(cb.literal(1L)).where(
                cb.equal(serialRoot.get(LotteryTicketSerialEntity_.ticket), root),
                cb.isNull(serialRoot.get(BaseEntity_.deletedAt)),
                cb.like(cb.lower(batchLineJoin.get(ImportBatchLineEntity_.batchCode)), searchPattern)
        );
        return cb.exists(subquery);
    }
}

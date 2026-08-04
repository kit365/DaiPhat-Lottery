package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity_;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.TicketNumberSearchUtils;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

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
                if (status == LotteryTicketStatus.IN_STOCK) {
                    predicates.add(cb.greaterThan(root.get(LotteryTicketEntity_.quantity), 0));
                }
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
                String searchPattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
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
        return filterPublic(stationId, stationIds, drawDates, search, null, null, null, null);
    }

    public static Specification<LotteryTicketEntity> filterPublic(
            Long stationId,
            List<Long> stationIds,
            List<LocalDate> drawDates,
            String search,
            TicketSearchMode searchMode
    ) {
        return filterPublic(stationId, stationIds, drawDates, search, searchMode, null, null, null);
    }

    public static Specification<LotteryTicketEntity> filterPublic(
            Long stationId,
            List<Long> stationIds,
            List<LocalDate> drawDates,
            String search,
            TicketSearchMode searchMode,
            List<String> searches,
            List<String> tailRanges,
            List<String> numberTypes
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));
            predicates.add(cb.equal(root.get(LotteryTicketEntity_.status), LotteryTicketStatus.IN_STOCK));
            predicates.add(cb.isTrue(root.get(LotteryTicketEntity_.active)));
            var serialJoin = root.join("serials", jakarta.persistence.criteria.JoinType.INNER);
            predicates.add(cb.equal(serialJoin.get("status"), com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK));
            predicates.add(cb.equal(serialJoin.get("ticketCondition"), com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD));
            predicates.add(cb.isNull(serialJoin.get("returnBatchLineId")));
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

            Path<String> numbersPath = root.get(LotteryTicketEntity_.numbers);

            if (search != null && !search.isBlank()) {
                TicketSearchMode mode = searchMode != null ? searchMode : TicketSearchMode.CONTAINS;
                if (mode == TicketSearchMode.CONTAINS) {
                    String searchPattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                    predicates.add(cb.or(
                            cb.like(cb.lower(numbersPath), searchPattern),
                            batchCodeExistsPredicate(root, query, cb, searchPattern)
                    ));
                } else {
                    predicates.add(numbersMatchPredicate(cb, numbersPath, search, mode));
                }
            }

            List<String> fragments = TicketNumberSearchUtils.normalizeSearchFragments(searches);
            if (!fragments.isEmpty()) {
                List<Predicate> orFragments = new ArrayList<>();
                for (String fragment : fragments) {
                    orFragments.add(numbersMatchPredicate(cb, numbersPath, fragment, TicketSearchMode.CONTAINS));
                }
                predicates.add(cb.or(orFragments.toArray(new Predicate[0])));
            }

            List<int[]> ranges = TicketNumberSearchUtils.parseTailRanges(tailRanges);
            if (!ranges.isEmpty()) {
                Expression<Integer> length = cb.length(numbersPath);
                Expression<String> tail = cb.substring(numbersPath, cb.diff(length, 1));
                List<Predicate> rangePredicates = new ArrayList<>();
                for (int[] range : ranges) {
                    String from = String.format(Locale.ROOT, "%02d", range[0]);
                    String to = String.format(Locale.ROOT, "%02d", range[1]);
                    rangePredicates.add(cb.and(
                            cb.greaterThanOrEqualTo(length, 2),
                            cb.greaterThanOrEqualTo(tail, from),
                            cb.lessThanOrEqualTo(tail, to)
                    ));
                }
                predicates.add(cb.or(rangePredicates.toArray(new Predicate[0])));
            }

            Predicate numberTypePredicate = numberTypesPredicate(cb, numbersPath, numberTypes);
            if (numberTypePredicate != null) {
                predicates.add(numberTypePredicate);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate numberTypesPredicate(
            CriteriaBuilder cb,
            Path<String> numbersPath,
            List<String> numberTypes
    ) {
        if (numberTypes == null || numberTypes.isEmpty()) {
            return null;
        }
        Expression<Integer> length = cb.length(numbersPath);
        Expression<String> digit1 = cb.substring(numbersPath, cb.diff(length, 1), cb.literal(1));
        Expression<String> digit2 = cb.substring(numbersPath, length, cb.literal(1));
        Expression<String> tail = cb.substring(numbersPath, cb.diff(length, 1));

        List<Predicate> typePredicates = new ArrayList<>();
        for (String raw : numberTypes) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String type = raw.trim().toUpperCase(Locale.ROOT);
            switch (type) {
                case "DOUBLE" -> typePredicates.add(cb.and(
                        cb.greaterThanOrEqualTo(length, 2),
                        cb.equal(digit1, digit2)
                ));
                case "SEQUENTIAL" -> {
                    List<Predicate> sequentialTails = new ArrayList<>();
                    for (int i = 0; i <= 8; i++) {
                        String value = String.format(Locale.ROOT, "%d%d", i, i + 1);
                        sequentialTails.add(cb.equal(tail, value));
                    }
                    typePredicates.add(cb.and(
                            cb.greaterThanOrEqualTo(length, 2),
                            cb.or(sequentialTails.toArray(new Predicate[0]))
                    ));
                }
                case "REPEATING" -> {
                    // Entire number is the same digit, length 3–6 (111, 000000, ...)
                    List<Predicate> sameDigitNumbers = new ArrayList<>();
                    for (char digit = '0'; digit <= '9'; digit++) {
                        for (int len = 3; len <= 6; len++) {
                            sameDigitNumbers.add(cb.equal(numbersPath, String.valueOf(digit).repeat(len)));
                        }
                    }
                    typePredicates.add(cb.or(sameDigitNumbers.toArray(new Predicate[0])));
                }
                default -> {
                    // ignore unknown
                }
            }
        }
        if (typePredicates.isEmpty()) {
            return null;
        }
        return cb.or(typePredicates.toArray(new Predicate[0]));
    }

    private static Predicate numbersMatchPredicate(
            CriteriaBuilder cb,
            Path<String> numbersPath,
            String search,
            TicketSearchMode mode
    ) {
        String pattern = TicketNumberSearchUtils.toPattern(search, mode);
        if (pattern == null) {
            return cb.conjunction();
        }
        if (TicketNumberSearchUtils.isExact(mode)) {
            return cb.equal(cb.lower(numbersPath), pattern);
        }
        return cb.like(cb.lower(numbersPath), pattern);
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

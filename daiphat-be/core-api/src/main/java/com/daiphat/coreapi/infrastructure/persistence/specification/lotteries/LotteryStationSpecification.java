package com.daiphat.coreapi.infrastructure.persistence.specification.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class LotteryStationSpecification {

    private LotteryStationSpecification() {
    }

    public static Specification<LotteryStationEntity> filter(
            String search,
            LotteryStationStatus status,
            String type,
            String region,
            List<String> drawDay
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(LotteryStationEntity_.deletedAt)));

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(LotteryStationEntity_.name)), likePattern),
                        cb.like(cb.lower(root.get(LotteryStationEntity_.province)), likePattern),
                        cb.like(cb.lower(root.get(LotteryStationEntity_.region).get(LotteryRegionEntity_.code)), likePattern),
                        cb.like(cb.lower(root.get(LotteryStationEntity_.description)), likePattern)
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get(LotteryStationEntity_.status), status));
            }

            if (type != null && !type.isBlank()) {
                try {
                    LotteryStationType productType = LotteryStationType.valueOf(type.trim().toUpperCase());
                    predicates.add(cb.equal(
                            root.get(LotteryStationEntity_.region).get(LotteryRegionEntity_.type),
                            productType
                    ));
                } catch (IllegalArgumentException ignored) {
                    predicates.add(cb.disjunction());
                }
            }

            if (region != null && !region.isBlank()) {
                predicates.add(cb.equal(
                        cb.upper(root.get(LotteryStationEntity_.region).get(LotteryRegionEntity_.code)),
                        LotteryRegionModel.normalizeCode(region.trim())
                ));
            }

            Set<String> normalizedDrawDays = normalizeDrawDays(drawDay);
            if (!normalizedDrawDays.isEmpty()) {
                List<Predicate> drawDayPredicates = new ArrayList<>();
                for (String day : normalizedDrawDays) {
                    drawDayPredicates.add(
                            cb.like(
                                    cb.upper(root.get(LotteryStationEntity_.drawDays).as(String.class)),
                                    "%" + day + "%"
                            )
                    );
                }
                predicates.add(cb.or(drawDayPredicates.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Set<String> normalizeDrawDays(List<String> drawDays) {
        Set<String> normalized = new LinkedHashSet<>();
        if (drawDays == null) {
            return normalized;
        }

        for (String drawDay : drawDays) {
            if (drawDay == null || drawDay.isBlank()) {
                continue;
            }
            normalized.add(drawDay.trim().toUpperCase(Locale.ROOT));
        }
        return normalized;
    }
}

package com.daiphat.coreapi.infrastructure.persistence.specification.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity_;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.DayOfWeek;
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
            String type,
            String region,
            String drawDay,
            Boolean isActive
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

            List<String> normalizedRegions = normalizeRegions(region);
            if (!normalizedRegions.isEmpty()) {
                predicates.add(
                        cb.upper(root.get(LotteryStationEntity_.region).get(LotteryRegionEntity_.code))
                                .in(normalizedRegions)
                );
            }

            Set<DayOfWeek> normalizedDrawDays = normalizeDrawDays(drawDay);
            if (!normalizedDrawDays.isEmpty()) {
                List<Predicate> drawDayPredicates = new ArrayList<>();
                for (DayOfWeek day : normalizedDrawDays) {
                    drawDayPredicates.add(drawDayContains(root, cb, day));
                }
                predicates.add(cb.or(drawDayPredicates.toArray(new Predicate[0])));
            }

            if (isActive != null) {
                predicates.add(cb.equal(root.get(LotteryStationEntity_.isActive), isActive));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate drawDayContains(
            jakarta.persistence.criteria.Root<LotteryStationEntity> root,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            DayOfWeek day
    ) {
        Expression<?> dayJson = cb.function(
                "jsonb_build_array",
                Object.class,
                cb.literal(day.name())
        );
        return cb.isTrue(
                cb.function(
                        "jsonb_contains",
                        Boolean.class,
                        root.get(LotteryStationEntity_.drawDays),
                        dayJson
                )
        );
    }

    private static List<String> normalizeRegions(String region) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String value : expandParamValues(region)) {
            normalized.add(LotteryRegionModel.normalizeCode(value));
        }
        return List.copyOf(normalized);
    }

    private static Set<DayOfWeek> normalizeDrawDays(String drawDay) {
        Set<DayOfWeek> normalized = new LinkedHashSet<>();
        for (String value : expandParamValues(drawDay)) {
            try {
                normalized.add(DayOfWeek.valueOf(value.trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {
                // Skip invalid draw-day filter values.
            }
        }
        return normalized;
    }

    private static List<String> expandParamValues(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<String> expanded = new ArrayList<>();
        for (String part : value.split(",")) {
            if (!part.isBlank()) {
                expanded.add(part.trim());
            }
        }
        return expanded;
    }
}

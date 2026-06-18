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
import java.util.List;

public final class LotteryStationSpecification {

    private LotteryStationSpecification() {
    }

    public static Specification<LotteryStationEntity> filter(
            String search,
            LotteryStationStatus status,
            String type,
            String region
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

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public final class LotteryProductSpecification {

    private LotteryProductSpecification() {
    }

    public static Specification<LotteryStationEntity> filter(
            String search,
            LotteryProductStatus status,
            String type
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), likePattern),
                        cb.like(cb.lower(root.get("province")), likePattern),
                        cb.like(cb.lower(root.get("region")), likePattern),
                        cb.like(cb.lower(root.get("description")), likePattern)
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (type != null && !type.isBlank()) {
                try {
                    LotteryProductType productType = LotteryProductType.valueOf(type.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("type"), productType));
                } catch (IllegalArgumentException ignored) {
                    predicates.add(cb.disjunction());
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

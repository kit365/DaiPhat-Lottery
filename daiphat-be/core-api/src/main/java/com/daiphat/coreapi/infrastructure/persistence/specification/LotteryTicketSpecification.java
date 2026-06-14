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
            Long productId,
            LotteryTicketStatus status,
            LocalDate drawDate,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get(BaseEntity_.deletedAt)));

            if (productId != null) {
                predicates.add(cb.equal(root.get(LotteryTicketEntity_.station).get(LotteryStationEntity_.id), productId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get(LotteryTicketEntity_.status), status));
            }
            if (drawDate != null) {
                predicates.add(cb.equal(root.get(LotteryTicketEntity_.drawDate), drawDate));
            }
            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.serialNumber)), searchPattern),
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.numbers)), searchPattern),
                        cb.like(cb.lower(root.get(LotteryTicketEntity_.batchCode)), searchPattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<LotteryTicketEntity> deleted() {
        return (root, query, cb) -> cb.isNotNull(root.get(BaseEntity_.deletedAt));
    }
}

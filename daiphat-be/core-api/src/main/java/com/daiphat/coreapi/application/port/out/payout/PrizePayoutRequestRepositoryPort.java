package com.daiphat.coreapi.application.port.out.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface PrizePayoutRequestRepositoryPort {

    Optional<PrizePayoutRequestModel> findById(Long id);

    PrizePayoutRequestModel save(PrizePayoutRequestModel model);

    boolean existsByRequestCode(String requestCode);

    boolean existsBySerialIdAndStatuses(Long serialId, Collection<PrizePayoutRequestStatus> statuses);

    Optional<PrizePayoutRequestModel> findPendingBySerialId(Long serialId);

    Map<Long, PrizePayoutRequestModel> findPendingBySerialIds(Collection<Long> serialIds);

    Page<PrizePayoutRequestModel> findAll(
            Pageable pageable,
            UUID customerId,
            PrizePayoutRequestStatus status,
            Collection<PrizePayoutRequestStatus> statuses,
            String search);

    long countByStatus(PrizePayoutRequestStatus status, UUID customerId, String search);

    long countPendingByCustomerId(UUID customerId);

    BigDecimal sumGrossAmountByStatus(PrizePayoutRequestStatus status);
}

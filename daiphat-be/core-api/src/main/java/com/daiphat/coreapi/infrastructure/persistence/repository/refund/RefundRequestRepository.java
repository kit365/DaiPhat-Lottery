package com.daiphat.coreapi.infrastructure.persistence.repository.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RefundRequestRepository extends JpaRepository<RefundRequestEntity, Long>,
        JpaSpecificationExecutor<RefundRequestEntity> {

    boolean existsByBankAccount_IdAndStatus(Long bankAccountId, RefundRequestStatus status);
}

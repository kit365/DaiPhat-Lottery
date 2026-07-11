package com.daiphat.coreapi.infrastructure.persistence.repository.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RefundRequestRepository extends JpaRepository<RefundRequestEntity, Long>,
        JpaSpecificationExecutor<RefundRequestEntity> {

    boolean existsByBankAccount_IdAndStatus(Long bankAccountId, RefundRequestStatus status);

    boolean existsByOrder_IdAndStatusIn(UUID orderId, Collection<RefundRequestStatus> statuses);

    boolean existsByOrder_Id(UUID orderId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from RefundRequestEntity r where r.order.id in :orderIds")
    int deleteByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);

    @Query("""
            select r
            from RefundRequestEntity r
            where r.status in :statuses
              and r.createdAt <= :createdBefore
            """)
    List<RefundRequestEntity> findByStatusInAndCreatedAtBefore(
            @Param("statuses") Collection<RefundRequestStatus> statuses,
            @Param("createdBefore") LocalDateTime createdBefore
    );
}

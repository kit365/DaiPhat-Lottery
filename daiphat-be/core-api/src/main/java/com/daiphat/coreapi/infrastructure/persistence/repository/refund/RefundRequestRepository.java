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

    long countByRequestedBy_IdAndCreatedAtGreaterThanEqual(UUID requestedById, LocalDateTime createdFrom);

    @Query(value = """
            SELECT DISTINCT od.refund_request_id
              FROM order_details od
             WHERE od.order_id IN (:orderIds)
               AND od.refund_request_id IS NOT NULL
            """, nativeQuery = true)
    List<Long> findIdsLinkedToOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE order_details
               SET refund_request_id = NULL
             WHERE order_id IN (:orderIds)
               AND refund_request_id IS NOT NULL
            """, nativeQuery = true)
    int unlinkOrderDetailsByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from RefundRequestEntity r where r.id in :ids")
    int deleteByIdIn(@Param("ids") Collection<Long> ids);

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

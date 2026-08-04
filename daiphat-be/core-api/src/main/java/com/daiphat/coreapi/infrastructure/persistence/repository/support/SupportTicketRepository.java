package com.daiphat.coreapi.infrastructure.persistence.repository.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicketEntity, Long>,
        JpaSpecificationExecutor<SupportTicketEntity> {

    List<SupportTicketEntity> findByStatusAndResolvedAtBefore(TicketStatus status, LocalDateTime cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM SupportTicketEntity t WHERE t.id = :id")
    java.util.Optional<SupportTicketEntity> findByIdForUpdate(@Param("id") Long id);

    long countByCustomer_IdAndStatusNotIn(UUID customerId, List<TicketStatus> statuses);

    @Query("""
            SELECT COUNT(t) FROM SupportTicketEntity t
            WHERE t.customer.id = :customerId
              AND (
                    t.status IN :inProgressStatuses
                 OR (
                        t.status = com.daiphat.coreapi.domain.model.enums.support.TicketStatus.REJECTED
                    AND (
                            t.customerLastViewedAt IS NULL
                         OR t.customerLastViewedAt < COALESCE(t.resolvedAt, t.updatedAt)
                        )
                    )
              )
            """)
    long countAttentionTickets(
            @Param("customerId") UUID customerId,
            @Param("inProgressStatuses") List<TicketStatus> inProgressStatuses);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE SupportTicketEntity t
               SET t.customerLastViewedAt = :viewedAt
             WHERE t.customer.id = :customerId
               AND t.status = com.daiphat.coreapi.domain.model.enums.support.TicketStatus.REJECTED
               AND (
                        t.customerLastViewedAt IS NULL
                     OR t.customerLastViewedAt < COALESCE(t.resolvedAt, t.updatedAt)
                   )
            """)
    int markRejectedTicketsViewed(
            @Param("customerId") UUID customerId,
            @Param("viewedAt") LocalDateTime viewedAt);
}

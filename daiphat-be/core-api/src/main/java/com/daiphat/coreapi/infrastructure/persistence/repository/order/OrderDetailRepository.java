package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OrderDetailRepository extends JpaRepository<OrderDetailEntity, Long>, JpaSpecificationExecutor<OrderDetailEntity> {

    boolean existsByOrder_IdAndRefundRequestIsNotNull(UUID orderId);

    List<OrderDetailEntity> findByOrder_Id(UUID orderId);

    List<OrderDetailEntity> findByRefundRequest_Id(Long refundRequestId);

    @Query("""
            select distinct od
            from OrderDetailEntity od
            join fetch od.order o
            join fetch o.user u
            join fetch od.lotteryTicketSerial s
            join fetch s.ticket t
            join fetch t.station st
            where st.id = :stationId
              and t.drawDate = :drawDate
              and o.status in :statuses
              and u.id is not null
            """)
    List<OrderDetailEntity> findEligibleTicketsForDraw(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate,
            @Param("statuses") Collection<OrderStatus> statuses
    );

    @Query("select d.id from OrderDetailEntity d where d.refundRequest.id = :refundRequestId")
    List<Long> findIdsByRefundRequestId(@Param("refundRequestId") Long refundRequestId);

    @Query("""
            select d.order.id
            from OrderDetailEntity d
            where d.refundRequest.id = :refundRequestId
            """)
    List<UUID> findOrderIdsByRefundRequestId(@Param("refundRequestId") Long refundRequestId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE order_details
               SET refund_request_id = :refundRequestId
             WHERE order_id = :orderId
               AND refund_request_id IS NULL
            """, nativeQuery = true)
    int linkUnlinkedDetailsByOrderId(
            @Param("orderId") UUID orderId,
            @Param("refundRequestId") Long refundRequestId
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE order_details
               SET refund_request_id = :refundRequestId,
                   status = 'REFUND_PENDING'
             WHERE id IN (:detailIds)
               AND refund_request_id IS NULL
            """, nativeQuery = true)
    int linkUnlinkedDetailsByIds(
            @Param("detailIds") List<Long> detailIds,
            @Param("refundRequestId") Long refundRequestId
    );
}

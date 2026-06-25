package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailSerialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderDetailSerialRepository extends JpaRepository<OrderDetailSerialEntity, Long> {

    boolean existsByLotteryTicketSerial_Id(Long lotteryTicketSerialId);

    @Query("""
            select ods
            from OrderDetailSerialEntity ods
            join fetch ods.lotteryTicketSerial
            where ods.orderDetail.id = :orderDetailId
            """)
    List<OrderDetailSerialEntity> findByOrderDetailIdWithSerial(@Param("orderDetailId") Long orderDetailId);

    @Query("""
            select ods.lotteryTicketSerial.id
            from OrderDetailSerialEntity ods
            where ods.orderDetail.id = :orderDetailId
            """)
    List<Long> findSerialIdsByOrderDetailId(@Param("orderDetailId") Long orderDetailId);
}
package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryRegionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.RefundRequestRepository;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Seeds ORD-SEED-* orders and SEED-* lottery ticket serials for local workflow testing.
 * Idempotent: removes only seeder-owned data on every run, then recreates a fresh dataset
 * with timestamps anchored to the current execution time.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.order.seed.enabled", havingValue = "true")
@Order(50)
public class OrderSeedInitializer implements ApplicationRunner {

    private static final String ORDER_CODE_PREFIX = "ORD-SEED-";
    private static final String TICKET_SERIAL_PREFIX = "SEED-";
    private static final String PAYMENT_REF_PREFIX = "PAYOS-SEED-";
    private static final String SYSTEM_ACTOR = "order-seed";
    private static final String SEED_STATION_NAME = "Ve so seed test";
    private static final String DEFAULT_SEED_PHONE = "0900000000";
    private static final int AVAILABLE_TICKET_BATCH_SIZE = 5;
    private static final int SERIALS_PER_TICKET = 10;
    private static final int PAYMENT_TTL_MINUTES = 10;

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final UserRepository userRepository;
    private final LotteryRegionRepository lotteryRegionRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity member = findSeedMember();
        UserEntity operator = findSeedOperator();
        if (member == null || operator == null) {
            log.warn("Skip order seed because member/operator account is missing.");
            return;
        }

        SeedTime time = SeedTime.atNow();
        resetPreviousSeedData();

        LotteryStationEntity station = ensureSeedStation(operator, time);
        seedAvailableTickets(operator, station, time);

        seedOnlinePendingPaymentOrder(member, operator, station, time);
        seedOnlinePaidOrder(member, operator, station, time);
        seedOnlinePreparingOrder(member, operator, station, time);
        seedPreparingFullReplaceOrder(member, operator, station, time);
        seedPreparingPartialReplaceOrder(member, operator, station, time);
        seedOnlinePendingPickupOrder(member, operator, station, time);
        seedOnlineCompletedOrder(member, operator, station, time);
        seedDirectCompletedOrder(member, operator, station, time);
        seedPaymentTimeoutCancelledOrder(member, operator, station, time);
        seedAdminForceCancelledOrder(member, operator, station, time);
        seedRefundPaidOrder(member, operator, station, time);
        seedRefundWaitingForInfoOrder(member, operator, station, time);
        seedRefundReadyToPayOrder(member, operator, station, time);
        seedRefundManualResolutionOrder(member, operator, station, time);
        seedReplacedTicketOrder(member, operator, station, time);

        log.info("Order seed complete: refreshed {} scenarios with timestamps at {}.", 15, time.base());
    }

    private void resetPreviousSeedData() {
        int removedTransactions = transactionRepository.deleteByPaymentRefStartingWith(PAYMENT_REF_PREFIX);
        if (removedTransactions > 0) {
            log.info("Removed {} previous PAYOS-SEED-* transactions.", removedTransactions);
        }

        List<OrderEntity> seedOrders = orderRepository.findByOrderCodeStartingWith(ORDER_CODE_PREFIX);
        if (!seedOrders.isEmpty()) {
            List<UUID> orderIds = seedOrders.stream().map(OrderEntity::getId).toList();

            List<Long> refundIds = refundRequestRepository.findIdsLinkedToOrderIdIn(orderIds);
            if (!refundIds.isEmpty()) {
                refundRequestRepository.unlinkOrderDetailsByOrderIdIn(orderIds);
                refundRequestRepository.deleteByIdIn(refundIds);
            }
            orderRepository.deleteAll(seedOrders);
            log.info("Removed {} previous ORD-SEED-* orders.", seedOrders.size());
        }

        resetSeedTicketSerials();

        // Deletes above are only queued in the persistence context. Tickets use IDENTITY ids,
        // so re-inserts below would hit the DB before the queued deletes and violate
        // uk_lottery_ticket_station_numbers_draw_date. Flush to push deletes first.
        lotteryTicketRepository.flush();
    }

    private void resetSeedTicketSerials() {
        List<LotteryTicketSerialEntity> seedSerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWithAndDeletedAtIsNull(TICKET_SERIAL_PREFIX);
        if (seedSerials.isEmpty()) {
            return;
        }

        // Break self-FK before delete: newer replacement serials point at older seed serials.
        List<Long> seedSerialIds = seedSerials.stream().map(LotteryTicketSerialEntity::getId).toList();
        lotteryTicketSerialRepository.clearReplacedForTicketIdRefs(seedSerialIds);

        Set<Long> ticketIds = new HashSet<>();
        for (LotteryTicketSerialEntity serial : seedSerials) {
            ticketIds.add(serial.getTicket().getId());
            lotteryTicketSerialRepository.delete(serial);
        }

        for (Long ticketId : ticketIds) {
            if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                lotteryTicketRepository.deleteById(ticketId);
            }
        }

        log.info("Removed {} previous SEED-* ticket serials.", seedSerials.size());
    }

    private void seedAvailableTickets(UserEntity operator, LotteryStationEntity station, SeedTime time) {
        seedAvailableTicketsForDate(operator, station, time.today(), time);
        seedAvailableTicketsForDate(operator, station, time.tomorrow(), time);
    }

    private void seedAvailableTicketsForDate(
            UserEntity operator,
            LotteryStationEntity station,
            LocalDate drawDate,
            SeedTime time
    ) {
        String dailySeedPrefix = "SEED-AVAILABLE-" + drawDate.format(DateTimeFormatter.BASIC_ISO_DATE) + "-";
        for (int index = 1; index <= AVAILABLE_TICKET_BATCH_SIZE; index++) {
            String serialPrefix = dailySeedPrefix + String.format("%03d", index);
            createSeedAvailableTicket(station, operator, index, serialPrefix, drawDate, time);
        }
    }

    private void createSeedAvailableTicket(
            LotteryStationEntity station,
            UserEntity operator,
            int index,
            String serialPrefix,
            LocalDate drawDate,
            SeedTime time
    ) {
        String numbers = String.format("%06d", index * 111111 % 1_000_000);
        LocalDateTime importedAt = time.minutesAgo(30);
        String batchCode = "SEED-AVAILABLE-" + drawDate.format(DateTimeFormatter.BASIC_ISO_DATE)
                + "-" + String.format("%03d", index);
        String primarySerial = serialPrefix + "-01";

        LotteryTicketEntity ticket = lotteryTicketRepository
                .findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(station.getId(), numbers, drawDate)
                .map(existing -> {
                    existing.setTicketImg("https://picsum.photos/seed/" + primarySerial + "/800/500");
                    existing.setBatchCode(batchCode);

                    existing.setPriceSnapshot(station.getPrice());
                    existing.setStatus(LotteryTicketStatus.IN_STOCK);
                    existing.setUpdatedAt(time.base());
                    existing.setLastModifiedBy(SYSTEM_ACTOR);
                    return lotteryTicketRepository.save(existing);
                })
                .orElseGet(() -> lotteryTicketRepository.save(
                        LotteryTicketEntity.builder()
                                .station(station)
                                .ticketImg("https://picsum.photos/seed/" + primarySerial + "/800/500")
                                .numbers(numbers)
                                .drawDate(drawDate)
                                .batchCode(batchCode)

                                .priceSnapshot(station.getPrice())
                                .status(LotteryTicketStatus.IN_STOCK)
                                .createdAt(importedAt)
                                .updatedAt(time.base())
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));

        for (int serialIndex = 1; serialIndex <= SERIALS_PER_TICKET; serialIndex++) {
            String serialNumber = serialPrefix + "-" + String.format("%02d", serialIndex);
            lotteryTicketSerialRepository.save(
                    LotteryTicketSerialEntity.builder()
                            .ticket(ticket)
                            .ticketImg(ticket.getTicketImg())
                            .serialNumber(serialNumber)
                            .status(LotteryTicketSerialStatus.IN_STOCK)
                            .inputSource(InputSource.MANUAL)
                            .importedBy(operator)
                            .importedAt(importedAt)
                            .verified(true)
                            .verifiedBy(operator)
                            .verifiedAt(time.minutesAgo(20))
                            .createdAt(importedAt)
                            .updatedAt(time.base())
                            .createdBy(SYSTEM_ACTOR)
                            .lastModifiedBy(SYSTEM_ACTOR)
                            .build()
            );
        }
    }

    private void seedOnlinePendingPaymentOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-ONLINE-001", "123456",
                LotteryTicketStatus.IN_STOCK, LotteryTicketSerialStatus.RESERVED, time
        );

        LocalDateTime createdAt = time.minutesAgo(3);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-ONLINE-001", OrderType.ONLINE, station.getPrice(),
                OrderStatus.PENDING_PAYMENT, createdAt
        );
        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, createdAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.PENDING,
                paymentRefFor("ONLINE-001"), "Seed online pending payment", createdAt, null
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedOnlinePaidOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-ONLINE-002", "234567",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(1);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-ONLINE-002", OrderType.ONLINE, station.getPrice(),
                OrderStatus.PAID, paidAt
        );
        order.setExpectedPickupAt(time.minutesFromNow(120));

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, paidAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("ONLINE-002"), "Seed online paid order", paidAt, paidAt
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedOnlinePreparingOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-ONLINE-003", "345678",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(10);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-ONLINE-003", OrderType.ONLINE, station.getPrice(),
                OrderStatus.PREPARING, paidAt
        );
        order.setExpectedPickupAt(time.minutesFromNow(90));

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, paidAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("ONLINE-003"), "Seed online preparing order", paidAt, paidAt
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    /**
     * PREPARING order with 3 tickets, each having an IN_STOCK replacement serial
     * on the same lottery ticket — full replacement workflow (no refund).
     */
    private void seedPreparingFullReplaceOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity serial1 = createSeedSoldSerialWithOptionalReplacement(
                station, operator, "SEED-PREP-FULL-001", "SEED-PREP-FULL-001-R", "710101", time
        );
        LotteryTicketSerialEntity serial2 = createSeedSoldSerialWithOptionalReplacement(
                station, operator, "SEED-PREP-FULL-002", "SEED-PREP-FULL-002-R", "710202", time
        );
        LotteryTicketSerialEntity serial3 = createSeedSoldSerialWithOptionalReplacement(
                station, operator, "SEED-PREP-FULL-003", "SEED-PREP-FULL-003-R", "710303", time
        );

        LocalDateTime paidAt = time.minutesAgo(12);
        BigDecimal unitPrice = station.getPrice();
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(3));

        OrderEntity order = buildOrder(
                member, "ORD-SEED-PREP-FULL-001", OrderType.ONLINE, totalAmount,
                OrderStatus.PREPARING, paidAt
        );
        order.setExpectedPickupAt(time.minutesFromNow(85));

        List<OrderDetailEntity> details = List.of(
                buildDetail(order, serial1, unitPrice, OrderDetailStatus.ACTIVE, paidAt),
                buildDetail(order, serial2, unitPrice, OrderDetailStatus.ACTIVE, paidAt),
                buildDetail(order, serial3, unitPrice, OrderDetailStatus.ACTIVE, paidAt)
        );
        TransactionEntity transaction = buildOnlineTransaction(
                order, totalAmount, TransactionStatus.COMPLETED,
                paymentRefFor("PREP-FULL-001"),
                "Seed PREPARING full-replace order (3/3 replacements in stock)",
                paidAt, paidAt
        );

        attachAggregate(order, details, transaction);
        orderRepository.save(order);
    }

    /**
     * PREPARING order with 3 tickets: 2 have IN_STOCK replacements, 1 does not —
     * partial replacement flow that triggers a refund for the unavailable ticket.
     */
    private void seedPreparingPartialReplaceOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity replaceable1 = createSeedSoldSerialWithOptionalReplacement(
                station, operator, "SEED-PREP-PART-001", "SEED-PREP-PART-001-R", "720101", time
        );
        LotteryTicketSerialEntity replaceable2 = createSeedSoldSerialWithOptionalReplacement(
                station, operator, "SEED-PREP-PART-002", "SEED-PREP-PART-002-R", "720202", time
        );
        LotteryTicketSerialEntity noReplacement = createSeedSoldSerialWithOptionalReplacement(
                station, operator, "SEED-PREP-PART-003", null, "720303", time
        );

        LocalDateTime paidAt = time.minutesAgo(11);
        BigDecimal unitPrice = station.getPrice();
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(3));

        OrderEntity order = buildOrder(
                member, "ORD-SEED-PREP-PARTIAL-001", OrderType.ONLINE, totalAmount,
                OrderStatus.PREPARING, paidAt
        );
        order.setExpectedPickupAt(time.minutesFromNow(80));

        List<OrderDetailEntity> details = List.of(
                buildDetail(order, replaceable1, unitPrice, OrderDetailStatus.ACTIVE, paidAt),
                buildDetail(order, replaceable2, unitPrice, OrderDetailStatus.ACTIVE, paidAt),
                buildDetail(order, noReplacement, unitPrice, OrderDetailStatus.ACTIVE, paidAt)
        );
        TransactionEntity transaction = buildOnlineTransaction(
                order, totalAmount, TransactionStatus.COMPLETED,
                paymentRefFor("PREP-PARTIAL-001"),
                "Seed PREPARING partial-replace order (2/3 replacements in stock)",
                paidAt, paidAt
        );

        attachAggregate(order, details, transaction);
        orderRepository.save(order);
    }

    private void seedOnlinePendingPickupOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-ONLINE-004", "456789",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(25);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-ONLINE-004", OrderType.ONLINE, station.getPrice(),
                OrderStatus.PENDING_PICKUP, paidAt
        );
        order.setExpectedPickupAt(time.minutesFromNow(30));

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, paidAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("ONLINE-004"), "Seed online pending pickup order", paidAt, paidAt
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedOnlineCompletedOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-ONLINE-005", "567890",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(45);
        LocalDateTime pickedUpAt = time.minutesAgo(5);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-ONLINE-005", OrderType.ONLINE, station.getPrice(),
                OrderStatus.COMPLETED, paidAt
        );
        order.setExpectedPickupAt(time.minutesAgo(15));
        order.setActualPickedUpAt(pickedUpAt);
        order.setPickedUpBy(operator);

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, paidAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("ONLINE-005"), "Seed online completed order", paidAt, paidAt
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedDirectCompletedOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-DIRECT-001", "223344",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime completedAt = time.base();
        OrderEntity order = buildOrder(
                member, "ORD-SEED-DIRECT-001", OrderType.DIRECT, station.getPrice(),
                OrderStatus.COMPLETED, completedAt
        );
        order.setActualPickedUpAt(completedAt);
        order.setPickedUpBy(operator);

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, completedAt);
        TransactionEntity transaction = buildTransaction(
                order, station.getPrice(), TransactionType.OFFLINE, TransactionStatus.COMPLETED,
                null, "Seed direct completed payment", completedAt
        );
        transaction.setPaidAt(completedAt);
        transaction.setCodCollectedAt(completedAt);
        transaction.setCodCollectedBy(operator);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedPaymentTimeoutCancelledOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-CANCELLED-001", "334455",
                LotteryTicketStatus.IN_STOCK, LotteryTicketSerialStatus.RESERVED, time
        );

        LocalDateTime createdAt = time.minutesAgo(PAYMENT_TTL_MINUTES + 5);
        LocalDateTime cancelledAt = time.minutesAgo(2);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-CANCELLED-001", OrderType.ONLINE, station.getPrice(),
                OrderStatus.CANCELLED, createdAt
        );
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.SYSTEM_PAYMENT_TIMEOUT);
        order.setCancelReason("Seed payment window expired");

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, createdAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.CANCELLED,
                paymentRefFor("CANCELLED-001"), "Seed payment timeout", createdAt, null
        );
        transaction.setCancelledAt(cancelledAt);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedAdminForceCancelledOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-CANCELLED-002", "445566",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(20);
        LocalDateTime cancelledAt = time.minutesAgo(8);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-CANCELLED-002", OrderType.ONLINE, station.getPrice(),
                OrderStatus.CANCELLED, paidAt
        );
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.ADMIN_FORCE_CANCEL);
        order.setCancelReason("Seed admin force cancel");

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, paidAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("CANCELLED-002"), "Seed admin cancelled order", paidAt, paidAt
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedRefundPaidOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-REFUND-001", "998877",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(60);
        LocalDateTime cancelledAt = time.minutesAgo(30);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-REFUND-001", OrderType.ONLINE, station.getPrice(),
                OrderStatus.CANCELLED, paidAt
        );
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.CUSTOMER_REQUEST);
        order.setCancelReason("Seed refunded order");

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.REFUNDED, cancelledAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.REFUNDED,
                paymentRefFor("REFUND-001"), "Seed refunded payment", paidAt, paidAt
        );

        RefundRequestEntity refund = buildRefund(
                member, operator, station.getPrice(), "Seed paid refund",
                RefundRequestStatus.PAID, cancelledAt
        );
        refund = refundRequestRepository.save(refund);
        detail.setRefundRequest(refund);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedRefundWaitingForInfoOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-REFUND-002", "887766",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(50);
        LocalDateTime cancelledAt = time.minutesAgo(15);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-REFUND-002", OrderType.ONLINE, station.getPrice(),
                OrderStatus.CANCELLED, paidAt
        );
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.CUSTOMER_REQUEST);
        order.setCancelReason("Seed waiting-for-bank-info refund");

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.REFUNDED, cancelledAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("REFUND-002"), "Seed waiting refund payment", paidAt, paidAt
        );

        RefundRequestEntity refund = buildRefund(
                member, null, station.getPrice(), "Seed waiting for bank account info",
                RefundRequestStatus.WAITING_FOR_INFO, cancelledAt
        );
        refund = refundRequestRepository.save(refund);
        detail.setRefundRequest(refund);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedRefundReadyToPayOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-REFUND-003", "776655",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(70);
        LocalDateTime cancelledAt = time.minutesAgo(55);
        LocalDateTime reviewedAt = time.minutesAgo(50);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-REFUND-003", OrderType.ONLINE, station.getPrice(),
                OrderStatus.CANCELLED, paidAt
        );
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.CUSTOMER_REQUEST);
        order.setCancelReason("Seed ready-to-pay refund");

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.REFUNDED, cancelledAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("REFUND-003"), "Seed ready-to-pay refund payment", paidAt, paidAt
        );

        RefundRequestEntity refund = buildRefund(
                member, operator, station.getPrice(), "Seed ready to transfer refund",
                RefundRequestStatus.READY_TO_PAY, reviewedAt
        );
        refund = refundRequestRepository.save(refund);
        detail.setRefundRequest(refund);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedRefundManualResolutionOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity ticketSerial = createSeedTicketSerial(
                station, operator, "SEED-REFUND-004", "665544",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(90);
        LocalDateTime cancelledAt = time.minutesAgo(75);
        LocalDateTime reviewedAt = time.minutesAgo(70);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-REFUND-004", OrderType.ONLINE, station.getPrice(),
                OrderStatus.CANCELLED, paidAt
        );
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.CUSTOMER_REQUEST);
        order.setCancelReason("Seed manual resolution refund");

        OrderDetailEntity detail = buildDetail(order, ticketSerial, station.getPrice(), OrderDetailStatus.REFUNDED, cancelledAt);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("REFUND-004"), "Seed manual resolution payment", paidAt, paidAt
        );

        RefundRequestEntity refund = buildRefund(
                member, operator, station.getPrice(), "Seed manual resolution required",
                RefundRequestStatus.MANUAL_RESOLUTION, reviewedAt
        );
        refund.setOperatorNote("Seed: bank transfer failed twice");
        refund = refundRequestRepository.save(refund);
        detail.setRefundRequest(refund);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private void seedReplacedTicketOrder(
            UserEntity member,
            UserEntity operator,
            LotteryStationEntity station,
            SeedTime time
    ) {
        LotteryTicketSerialEntity oldTicketSerial = createSeedTicketSerial(
                station, operator, "SEED-REPLACED-001", "556677",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );
        LotteryTicketSerialEntity newTicketSerial = createSeedTicketSerial(
                station, operator, "SEED-REPLACED-002", "556688",
                LotteryTicketStatus.SOLD_OUT, LotteryTicketSerialStatus.SOLD, time
        );

        LocalDateTime paidAt = time.minutesAgo(40);
        LocalDateTime pickedUpAt = time.minutesAgo(10);
        OrderEntity order = buildOrder(
                member, "ORD-SEED-REPLACED-001", OrderType.ONLINE, station.getPrice(),
                OrderStatus.COMPLETED, paidAt
        );
        order.setExpectedPickupAt(time.minutesAgo(20));
        order.setActualPickedUpAt(pickedUpAt);
        order.setPickedUpBy(operator);

        OrderDetailEntity detail = buildDetail(order, oldTicketSerial, station.getPrice(), OrderDetailStatus.ACTIVE, paidAt);
        detail.setReplacedByTicketSerial(newTicketSerial);
        TransactionEntity transaction = buildOnlineTransaction(
                order, station.getPrice(), TransactionStatus.COMPLETED,
                paymentRefFor("REPLACED-001"), "Seed replaced ticket order", paidAt, paidAt
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
    }

    private UserEntity findSeedMember() {
        return userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_MEMBER)).stream()
                .findFirst()
                .orElse(null);
    }

    private UserEntity findSeedOperator() {
        return userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR)).stream()
                .findFirst()
                .orElse(null);
    }

    private LotteryStationEntity ensureSeedStation(UserEntity operator, SeedTime time) {
        LotteryRegionEntity mienNam = lotteryRegionRepository.findByCodeIgnoreCase("MIEN_NAM")
                .orElseThrow();
        return lotteryStationRepository.findAll().stream()
                .filter(station -> SEED_STATION_NAME.equalsIgnoreCase(station.getName()))
                .findFirst()
                .map(station -> {
                    station.setApprovedAt(time.base());
                    station.setUpdatedAt(time.base());
                    return lotteryStationRepository.save(station);
                })
                .orElseGet(() -> lotteryStationRepository.save(
                        LotteryStationEntity.builder()
                                .name(SEED_STATION_NAME)
                                .province("Ho Chi Minh")
                                .region(mienNam)
                                .price(BigDecimal.valueOf(10_000))
                                .commissionRate(new BigDecimal("0.0500"))
                                .inventoryCount(100)
                                .drawDays(List.of(DayOfWeek.MONDAY))
                                .drawTime(LocalTime.of(16, 15))
                                .nextDrawDate(DrawScheduleUtils.resolveNextDrawDate(
                                        List.of(DayOfWeek.MONDAY),
                                        LocalTime.of(16, 15)
                                ))
                                .isActive(true)
                                .approvedBy(operator)
                                .approvedAt(time.base())
                                .description("Station dung de seed test order.")
                                .createdAt(time.base())
                                .updatedAt(time.base())
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));
    }

    private LotteryTicketSerialEntity createSeedTicketSerial(
            LotteryStationEntity station,
            UserEntity operator,
            String serialNumber,
            String numbers,
            LotteryTicketStatus ticketStatus,
            LotteryTicketSerialStatus serialStatus,
            SeedTime time
    ) {
        return createSeedSoldSerialWithOptionalReplacement(
                station, operator, serialNumber, null, numbers, ticketStatus, serialStatus, time
        );
    }

    /**
     * Creates a SOLD serial for an order line and optionally an IN_STOCK replacement
     * serial on the same lottery ticket (station + numbers + drawDate).
     * Replacement candidates and auto-replace both require another IN_STOCK serial
     * for that ticket identity.
     */
    private LotteryTicketSerialEntity createSeedSoldSerialWithOptionalReplacement(
            LotteryStationEntity station,
            UserEntity operator,
            String soldSerialNumber,
            String replacementSerialNumber,
            String numbers,
            SeedTime time
    ) {
        boolean hasReplacement = replacementSerialNumber != null && !replacementSerialNumber.isBlank();
        return createSeedSoldSerialWithOptionalReplacement(
                station,
                operator,
                soldSerialNumber,
                replacementSerialNumber,
                numbers,
                hasReplacement ? LotteryTicketStatus.IN_STOCK : LotteryTicketStatus.SOLD_OUT,
                LotteryTicketSerialStatus.SOLD,
                time
        );
    }

    private LotteryTicketSerialEntity createSeedSoldSerialWithOptionalReplacement(
            LotteryStationEntity station,
            UserEntity operator,
            String soldSerialNumber,
            String replacementSerialNumber,
            String numbers,
            LotteryTicketStatus ticketStatus,
            LotteryTicketSerialStatus soldSerialStatus,
            SeedTime time
    ) {
        LocalDateTime importedAt = time.minutesAgo(30);
        LocalDate drawDate = time.today();
        boolean hasReplacement = replacementSerialNumber != null && !replacementSerialNumber.isBlank();

        LotteryTicketEntity ticket = lotteryTicketRepository
                .findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(station.getId(), numbers, drawDate)
                .map(existing -> {
                    existing.setTicketImg("https://picsum.photos/seed/" + soldSerialNumber + "/800/500");
                    existing.setBatchCode(soldSerialNumber);

                    existing.setPriceSnapshot(station.getPrice());
                    existing.setStatus(ticketStatus);
                    existing.setUpdatedAt(time.base());
                    existing.setLastModifiedBy(SYSTEM_ACTOR);
                    return lotteryTicketRepository.save(existing);
                })
                .orElseGet(() -> lotteryTicketRepository.save(
                        LotteryTicketEntity.builder()
                                .station(station)
                                .ticketImg("https://picsum.photos/seed/" + soldSerialNumber + "/800/500")
                                .numbers(numbers)
                                .drawDate(drawDate)
                                .batchCode(soldSerialNumber)

                                .priceSnapshot(station.getPrice())
                                .status(ticketStatus)
                                .createdAt(importedAt)
                                .updatedAt(time.base())
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));

        LotteryTicketSerialEntity.LotteryTicketSerialEntityBuilder soldSerialBuilder = LotteryTicketSerialEntity.builder()
                .ticket(ticket)
                .ticketImg(ticket.getTicketImg())
                .serialNumber(soldSerialNumber)
                .status(soldSerialStatus)
                .inputSource(InputSource.MANUAL)
                .importedBy(operator)
                .importedAt(importedAt)
                .verified(true)
                .verifiedBy(operator)
                .verifiedAt(time.minutesAgo(20))
                .createdAt(importedAt)
                .updatedAt(time.base())
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR);
        if (soldSerialStatus == LotteryTicketSerialStatus.RESERVED) {
            soldSerialBuilder.reservedAt(time.minutesAgo(5));
            soldSerialBuilder.reservationExpiresAt(time.minutesFromNow(20));
        }
        LotteryTicketSerialEntity soldSerial = lotteryTicketSerialRepository.save(soldSerialBuilder.build());

        int existingSerials = 1;
        if (hasReplacement) {
            lotteryTicketSerialRepository.save(
                    LotteryTicketSerialEntity.builder()
                            .ticket(ticket)
                            .ticketImg(ticket.getTicketImg())
                            .serialNumber(replacementSerialNumber)
                            .status(LotteryTicketSerialStatus.IN_STOCK)
                            .inputSource(InputSource.MANUAL)
                            .importedBy(operator)
                            .importedAt(importedAt)
                            .verified(true)
                            .verifiedBy(operator)
                            .verifiedAt(time.minutesAgo(20))
                            .createdAt(importedAt)
                            .updatedAt(time.base())
                            .createdBy(SYSTEM_ACTOR)
                            .lastModifiedBy(SYSTEM_ACTOR)
                            .build()
            );
            existingSerials++;
        }

        // Pad remaining slots so each seed ticket has ~10 linked serials.
        // Keep availability semantics: IN_STOCK tickets (incl. reserved-with-stock)
        // get IN_STOCK fillers; fully sold-out tickets get SOLD fillers.
        LotteryTicketSerialStatus fillerStatus = hasReplacement || ticketStatus == LotteryTicketStatus.IN_STOCK
                ? LotteryTicketSerialStatus.IN_STOCK
                : soldSerialStatus;
        for (int serialIndex = existingSerials + 1; serialIndex <= SERIALS_PER_TICKET; serialIndex++) {
            String fillerSerialNumber = soldSerialNumber + "-F" + String.format("%02d", serialIndex);
            LotteryTicketSerialEntity.LotteryTicketSerialEntityBuilder fillerBuilder = LotteryTicketSerialEntity.builder()
                    .ticket(ticket)
                    .ticketImg(ticket.getTicketImg())
                    .serialNumber(fillerSerialNumber)
                    .status(fillerStatus)
                    .inputSource(InputSource.MANUAL)
                    .importedBy(operator)
                    .importedAt(importedAt)
                    .verified(true)
                    .verifiedBy(operator)
                    .verifiedAt(time.minutesAgo(20))
                    .createdAt(importedAt)
                    .updatedAt(time.base())
                    .createdBy(SYSTEM_ACTOR)
                    .lastModifiedBy(SYSTEM_ACTOR);
            if (fillerStatus == LotteryTicketSerialStatus.RESERVED) {
                fillerBuilder.reservedAt(time.minutesAgo(5));
                fillerBuilder.reservationExpiresAt(time.minutesFromNow(20));
            }
            lotteryTicketSerialRepository.save(fillerBuilder.build());
        }

        return soldSerial;
    }

    private OrderEntity buildOrder(
            UserEntity user,
            String orderCode,
            OrderType orderType,
            BigDecimal totalAmount,
            OrderStatus status,
            LocalDateTime timestamp
    ) {
        return OrderEntity.builder()
                .user(user)
                .name(fullNameOf(user))
                .phone(phoneOf(user))
                .orderCode(orderCode)
                .orderType(orderType)
                .receiveType(OrderReceiveType.COUNTER_PICKUP)
                .totalAmount(totalAmount)
                .status(status)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private OrderDetailEntity buildDetail(
            OrderEntity order,
            LotteryTicketSerialEntity ticketSerial,
            BigDecimal price,
            OrderDetailStatus status,
            LocalDateTime timestamp
    ) {
        OrderDetailEntity detail = OrderDetailEntity.builder()
                .order(order)
                .lotteryTicket(ticketSerial.getTicket())
                .lotteryTicketSerial(ticketSerial)
                .quantity(1)
                .price(price)
                .status(status)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
        detail.setAllocatedSerials(new ArrayList<>(List.of(
                OrderDetailSerialEntity.builder()
                        .orderDetail(detail)
                        .lotteryTicketSerial(ticketSerial)
                        .createdAt(timestamp)
                        .build()
        )));
        return detail;
    }

    private TransactionEntity buildOnlineTransaction(
            OrderEntity order,
            BigDecimal amount,
            TransactionStatus status,
            String paymentRef,
            String note,
            LocalDateTime timestamp,
            LocalDateTime paidAt
    ) {
        TransactionEntity transaction = buildTransaction(
                order, amount, TransactionType.ONLINE, status, paymentRef, note, timestamp
        );
        transaction.setGateway(PaymentGateway.PAYOS);
        transaction.setPaidAt(paidAt);
        return transaction;
    }

    private TransactionEntity buildTransaction(
            OrderEntity order,
            BigDecimal amount,
            TransactionType type,
            TransactionStatus status,
            String paymentRef,
            String note,
            LocalDateTime timestamp
    ) {
        return TransactionEntity.builder()
                .order(order)
                .amount(amount)
                .paymentRef(paymentRef)
                .status(status)
                .note(note)
                .type(type)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private RefundRequestEntity buildRefund(
            UserEntity requestedBy,
            UserEntity reviewedBy,
            BigDecimal amount,
            String reason,
            RefundRequestStatus status,
            LocalDateTime timestamp
    ) {
        RefundRequestEntity.RefundRequestEntityBuilder builder = RefundRequestEntity.builder()
                .refundType(RefundType.ORDER_DETAIL)
                .requestedBy(requestedBy)
                .requestRole(RefundRequestRole.CUSTOMER)
                .refundAmount(amount)
                .refundReason(reason)
                .status(status)
                .fundSource(RefundFundSource.COMPANY_FUND)
                .reimburseStatus(ReimburseStatus.NONE)
                .attemptNumber(1)
                .retryCount(0)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR);

        if (reviewedBy != null) {
            builder.reviewedBy(reviewedBy).reviewedAt(timestamp);
        }

        return builder.build();
    }

    private void attachAggregate(OrderEntity order, OrderDetailEntity detail, TransactionEntity transaction) {
        attachAggregate(order, List.of(detail), transaction);
    }

    private void attachAggregate(
            OrderEntity order,
            List<OrderDetailEntity> details,
            TransactionEntity transaction
    ) {
        order.setOrderDetails(new ArrayList<>(details));
        order.setTransactions(new ArrayList<>(List.of(transaction)));
    }

    private String fullNameOf(UserEntity user) {
        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";
        String fullName = (lastName + " " + firstName).trim();
        return fullName.isBlank() ? "Seed Customer" : fullName;
    }

    private String phoneOf(UserEntity user) {
        String phone = user.getPhone() != null ? user.getPhone().trim() : "";
        return phone.isBlank() ? DEFAULT_SEED_PHONE : phone;
    }

    private String paymentRefFor(String scenarioSuffix) {
        return PAYMENT_REF_PREFIX + scenarioSuffix;
    }

    private record SeedTime(LocalDateTime base) {
        static SeedTime atNow() {
            return new SeedTime(LocalDateTime.now());
        }

        LocalDate today() {
            return base.toLocalDate();
        }

        LocalDate tomorrow() {
            return base.toLocalDate().plusDays(1);
        }

        LocalDateTime minutesAgo(int minutes) {
            return base.minusMinutes(minutes);
        }

        LocalDateTime minutesFromNow(int minutes) {
            return base.plusMinutes(minutes);
        }
    }
}

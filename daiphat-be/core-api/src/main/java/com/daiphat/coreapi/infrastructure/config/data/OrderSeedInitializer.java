package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderRefundStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderRefundEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lottery.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lottery.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.order.seed.enabled", havingValue = "true")
public class OrderSeedInitializer implements ApplicationRunner {

    private static final String SEED_ONLINE_PENDING_CODE = "ORD-SEED-ONLINE-001";
    private static final String SEED_ONLINE_PREPARING_CODE = "ORD-SEED-ONLINE-002";
    private static final String SEED_ONLINE_PICKUP_CODE = "ORD-SEED-ONLINE-003";
    private static final String SEED_DIRECT_COMPLETED_CODE = "ORD-SEED-DIRECT-001";
    private static final String SEED_ONLINE_REFUND_APPROVED_CODE = "ORD-SEED-REFUND-001";
    private static final String SEED_ONLINE_REFUND_REJECTED_CODE = "ORD-SEED-REFUND-002";
    private static final String SEED_ONLINE_REPLACED_CODE = "ORD-SEED-REPLACED-001";
    private static final String SYSTEM_ACTOR = "SYSTEM";
    private static final String SEED_STATION_NAME = "Ve so seed test";
    private static final String DEFAULT_SEED_PHONE = "0900000000";
    private static final int AVAILABLE_TICKET_BATCH_SIZE = 5;

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final LotteryTicketRepository lotteryTicketRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity member = findSeedMember();
        UserEntity operator = findSeedOperator();
        if (member == null || operator == null) {
            log.warn("Skip order seed because member/operator account is missing.");
            return;
        }

        LotteryStationEntity station = ensureSeedStation(operator);

        seedAvailableTickets(operator, station);
        seedOnlinePendingOrder(member, operator, station);
        seedOnlinePreparingOrder(member, operator, station);
        seedOnlinePendingPickupOrder(member, operator, station);
        seedDirectCompletedOrder(member, operator, station);
        seedRefundApprovedOrder(member, operator, station);
        seedRefundRejectedOrder(member, operator, station);
        seedReplacedTicketOrder(member, operator, station);
    }

    private void seedAvailableTickets(UserEntity operator, LotteryStationEntity station) {
        seedAvailableTicketsForDate(operator, station, LocalDate.now());
        seedAvailableTicketsForDate(operator, station, LocalDate.now().plusDays(1));
    }

    private void seedAvailableTicketsForDate(
            UserEntity operator,
            LotteryStationEntity station,
            LocalDate drawDate
    ) {
        String dailySeedPrefix = "SEED-AVAILABLE-" + drawDate.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-";

        long todaySeedCount = lotteryTicketRepository.findAll().stream()
                .filter(ticket -> ticket.getSerialNumber() != null && ticket.getSerialNumber().startsWith(dailySeedPrefix))
                .filter(ticket -> ticket.getDeletedAt() == null)
                .count();

        int nextIndex = 1;
        while (todaySeedCount < AVAILABLE_TICKET_BATCH_SIZE) {
            String serialNumber = dailySeedPrefix + String.format("%03d", nextIndex);
            if (lotteryTicketRepository.findAll().stream()
                    .noneMatch(ticket -> serialNumber.equalsIgnoreCase(ticket.getSerialNumber()))) {
                createSeedAvailableTicket(station, operator, nextIndex, serialNumber, drawDate);
                todaySeedCount++;
            }
            nextIndex++;
        }
    }

    private void createSeedAvailableTicket(
            LotteryStationEntity station,
            UserEntity operator,
            int index,
            String serialNumber,
            LocalDate drawDate
    ) {
        String numbers = String.format("%06d", index * 111111 % 1_000_000);
        String batchCode = String.format("BATCH-AVAILABLE-%03d", index);

        lotteryTicketRepository.save(
                LotteryTicketEntity.builder()
                        .station(station)
                        .ticketImg("https://picsum.photos/seed/" + serialNumber + "/800/500")
                        .serialNumber(serialNumber)
                        .numbers(numbers)
                        .drawDate(drawDate)
                        .batchCode(batchCode)
                        .status(LotteryTicketStatus.IN_STOCK)
                        .importedBy(operator)
                        .importedAt(LocalDateTime.now().minusHours(2))
                        .verified(true)
                        .verifiedBy(operator)
                        .verifiedAt(LocalDateTime.now().minusHours(1))
                        .createdAt(LocalDateTime.now().minusHours(2))
                        .updatedAt(LocalDateTime.now().minusHours(1))
                        .createdBy(SYSTEM_ACTOR)
                        .lastModifiedBy(SYSTEM_ACTOR)
                        .build()
        );
    }

    private void seedOnlinePendingOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_ONLINE_PENDING_CODE)) {
            return;
        }

        LotteryTicketEntity ticket = ensureSeedTicket(
                station,
                operator,
                "SEED-ONLINE-001",
                "123456",
                "BATCH-ONLINE-001",
                LotteryTicketStatus.RESERVED
        );

        LocalDateTime now = LocalDateTime.now();
        OrderEntity order = buildOrder(member, SEED_ONLINE_PENDING_CODE, OrderType.ONLINE, station.getPrice(), OrderStatus.PENDING_PAYMENT, now);
        OrderDetailEntity detail = buildDetail(order, ticket, station.getPrice(), OrderDetailStatus.ACTIVE, now);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.ONLINE,
                TransactionStatus.PENDING,
                "PAYOS-SEED-PENDING-001",
                "Seed online pending payment",
                now
        );

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
        log.info("Seeded online pending order [{}].", SEED_ONLINE_PENDING_CODE);
    }

    private void seedOnlinePreparingOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_ONLINE_PREPARING_CODE)) {
            return;
        }

        LotteryTicketEntity ticket = ensureSeedTicket(
                station,
                operator,
                "SEED-ONLINE-002",
                "234567",
                "BATCH-ONLINE-002",
                LotteryTicketStatus.SOLD
        );

        LocalDateTime now = LocalDateTime.now().minusMinutes(30);
        OrderEntity order = buildOrder(member, SEED_ONLINE_PREPARING_CODE, OrderType.ONLINE, station.getPrice(), OrderStatus.PREPARING, now);
        OrderDetailEntity detail = buildDetail(order, ticket, station.getPrice(), OrderDetailStatus.ACTIVE, now);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.ONLINE,
                TransactionStatus.COMPLETED,
                "PAYOS-SEED-SUCCESS-002",
                "Seed online preparing order",
                now
        );
        transaction.setPaidAt(now.minusMinutes(5));

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
        log.info("Seeded online preparing order [{}].", SEED_ONLINE_PREPARING_CODE);
    }

    private void seedOnlinePendingPickupOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_ONLINE_PICKUP_CODE)) {
            return;
        }

        LotteryTicketEntity ticket = ensureSeedTicket(
                station,
                operator,
                "SEED-ONLINE-003",
                "345678",
                "BATCH-ONLINE-003",
                LotteryTicketStatus.SOLD
        );

        LocalDateTime now = LocalDateTime.now().minusHours(1);
        OrderEntity order = buildOrder(member, SEED_ONLINE_PICKUP_CODE, OrderType.ONLINE, station.getPrice(), OrderStatus.PENDING_PICKUP, now);
        OrderDetailEntity detail = buildDetail(order, ticket, station.getPrice(), OrderDetailStatus.ACTIVE, now);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.ONLINE,
                TransactionStatus.COMPLETED,
                "PAYOS-SEED-SUCCESS-003",
                "Seed online pending pickup order",
                now
        );
        transaction.setPaidAt(now.minusMinutes(10));

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
        log.info("Seeded online pending pickup order [{}].", SEED_ONLINE_PICKUP_CODE);
    }

    private void seedDirectCompletedOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_DIRECT_COMPLETED_CODE)) {
            return;
        }

        LotteryTicketEntity ticket = ensureSeedTicket(
                station,
                operator,
                "SEED-DIRECT-001",
                "223344",
                "BATCH-DIRECT-001",
                LotteryTicketStatus.SOLD
        );

        LocalDateTime now = LocalDateTime.now();
        OrderEntity order = buildOrder(member, SEED_DIRECT_COMPLETED_CODE, OrderType.DIRECT, station.getPrice(), OrderStatus.COMPLETED, now);
        order.setActualPickedUpAt(now);
        order.setPickedUpBy(operator);

        OrderDetailEntity detail = buildDetail(order, ticket, station.getPrice(), OrderDetailStatus.ACTIVE, now);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.OFFLINE,
                TransactionStatus.COMPLETED,
                null,
                "Seed direct completed payment",
                now
        );
        transaction.setPaidAt(now);
        transaction.setCodCollectedAt(now);
        transaction.setCodCollectedBy(operator);

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
        log.info("Seeded direct completed order [{}].", SEED_DIRECT_COMPLETED_CODE);
    }

    private void seedRefundApprovedOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_ONLINE_REFUND_APPROVED_CODE)) {
            return;
        }

        LotteryTicketEntity ticket = ensureSeedTicket(
                station,
                operator,
                "SEED-REFUND-001",
                "998877",
                "BATCH-REFUND-001",
                LotteryTicketStatus.SOLD
        );

        LocalDateTime now = LocalDateTime.now();
        OrderEntity order = buildOrder(member, SEED_ONLINE_REFUND_APPROVED_CODE, OrderType.ONLINE, station.getPrice(), OrderStatus.CANCELLED, now);
        order.setCancelledAt(now);
        order.setCancelReason("Seed refunded order");

        OrderDetailEntity detail = buildDetail(order, ticket, station.getPrice(), OrderDetailStatus.REFUNDED, now);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.ONLINE,
                TransactionStatus.REFUNDED,
                "PAYOS-SEED-PAID-001",
                "Seed refunded payment",
                now
        );
        transaction.setPaidAt(now.minusHours(1));

        OrderRefundEntity refund = buildRefund(detail, OrderRefundStatus.APPROVED, station.getPrice(), "Seed approved refund", now);
        refund.setBankBin("970436");
        refund.setBankName("Vietcombank");
        refund.setBankAccountNo("123456789");
        refund.setBankAccountName("NGUYEN VAN A");
        refund.setRefundAt(now);
        refund.setRefundApprovedBy(operator);

        attachAggregate(order, detail, transaction);
        detail.setRefunds(new ArrayList<>(List.of(refund)));
        orderRepository.save(order);
        log.info("Seeded approved refund order [{}].", SEED_ONLINE_REFUND_APPROVED_CODE);
    }

    private void seedRefundRejectedOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_ONLINE_REFUND_REJECTED_CODE)) {
            return;
        }

        LotteryTicketEntity ticket = ensureSeedTicket(
                station,
                operator,
                "SEED-REFUND-002",
                "887766",
                "BATCH-REFUND-002",
                LotteryTicketStatus.SOLD
        );

        LocalDateTime now = LocalDateTime.now().minusHours(2);
        OrderEntity order = buildOrder(member, SEED_ONLINE_REFUND_REJECTED_CODE, OrderType.ONLINE, station.getPrice(), OrderStatus.PENDING_PICKUP, now);
        OrderDetailEntity detail = buildDetail(order, ticket, station.getPrice(), OrderDetailStatus.ACTIVE, now);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.ONLINE,
                TransactionStatus.COMPLETED,
                "PAYOS-SEED-PAID-002",
                "Seed rejected refund payment",
                now
        );
        transaction.setPaidAt(now.minusMinutes(20));

        OrderRefundEntity refund = buildRefund(detail, OrderRefundStatus.REJECTED, station.getPrice(), "Tu choi hoan tien do ve van hop le.", now);

        attachAggregate(order, detail, transaction);
        detail.setRefunds(new ArrayList<>(List.of(refund)));
        orderRepository.save(order);
        log.info("Seeded rejected refund order [{}].", SEED_ONLINE_REFUND_REJECTED_CODE);
    }

    private void seedReplacedTicketOrder(UserEntity member, UserEntity operator, LotteryStationEntity station) {
        if (orderRepository.existsByOrderCode(SEED_ONLINE_REPLACED_CODE)) {
            return;
        }

        LotteryTicketEntity oldTicket = ensureSeedTicket(
                station,
                operator,
                "SEED-REPLACED-001",
                "556677",
                "BATCH-REPLACED-001",
                LotteryTicketStatus.SOLD
        );
        LotteryTicketEntity newTicket = ensureSeedTicket(
                station,
                operator,
                "SEED-REPLACED-002",
                "556688",
                "BATCH-REPLACED-002",
                LotteryTicketStatus.SOLD
        );

        LocalDateTime now = LocalDateTime.now().minusHours(3);
        OrderEntity order = buildOrder(member, SEED_ONLINE_REPLACED_CODE, OrderType.ONLINE, station.getPrice(), OrderStatus.COMPLETED, now);
        order.setActualPickedUpAt(now.plusMinutes(30));
        order.setPickedUpBy(operator);

        OrderDetailEntity detail = buildDetail(order, oldTicket, station.getPrice(), OrderDetailStatus.ACTIVE, now);
        detail.setReplacedByTicket(newTicket);
        TransactionEntity transaction = buildTransaction(
                order,
                station.getPrice(),
                TransactionType.ONLINE,
                TransactionStatus.COMPLETED,
                "PAYOS-SEED-PAID-003",
                "Seed replaced ticket order",
                now
        );
        transaction.setPaidAt(now.minusMinutes(10));

        attachAggregate(order, detail, transaction);
        orderRepository.save(order);
        log.info("Seeded replaced ticket order [{}].", SEED_ONLINE_REPLACED_CODE);
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

    private LotteryStationEntity ensureSeedStation(UserEntity operator) {
        return lotteryStationRepository.findAll().stream()
                .filter(station -> SEED_STATION_NAME.equalsIgnoreCase(station.getName()))
                .findFirst()
                .orElseGet(() -> lotteryStationRepository.save(
                        LotteryStationEntity.builder()
                                .name(SEED_STATION_NAME)
                                .province("Ho Chi Minh")
                                .region("Mien Nam")
                                .type(LotteryStationType.TRADITIONAL)
                                .numberLength(6)
                                .minNumber(0)
                                .maxNumber(999999)
                                .price(BigDecimal.valueOf(10_000))
                                .inventoryCount(100)
                                .drawSchedule("MONDAY")
                                .drawTime("16:15")
                                .nextDrawDate(LocalDate.now().plusDays(1))
                                .status(LotteryStationStatus.ACTIVE)
                                .approvedBy(operator)
                                .approvedAt(LocalDateTime.now())
                                .description("Station dung de seed test order.")
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));
    }

    private LotteryTicketEntity ensureSeedTicket(
            LotteryStationEntity station,
            UserEntity operator,
            String serialNumber,
            String numbers,
            String batchCode,
            LotteryTicketStatus status
    ) {
        return lotteryTicketRepository.findAll().stream()
                .filter(ticket -> serialNumber.equalsIgnoreCase(ticket.getSerialNumber()))
                .findFirst()
                .orElseGet(() -> lotteryTicketRepository.save(
                        LotteryTicketEntity.builder()
                                .station(station)
                                .ticketImg("https://picsum.photos/seed/" + serialNumber + "/800/500")
                                .serialNumber(serialNumber)
                                .numbers(numbers)
                                .drawDate(LocalDate.now())
                                .batchCode(batchCode)
                                .status(status)
                                .importedBy(operator)
                                .importedAt(LocalDateTime.now().minusHours(2))
                                .verified(true)
                                .verifiedBy(operator)
                                .verifiedAt(LocalDateTime.now().minusHours(1))
                                .createdAt(LocalDateTime.now().minusHours(2))
                                .updatedAt(LocalDateTime.now().minusHours(1))
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));
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
            LotteryTicketEntity ticket,
            BigDecimal price,
            OrderDetailStatus status,
            LocalDateTime timestamp
    ) {
        return OrderDetailEntity.builder()
                .order(order)
                .lotteryTicket(ticket)
                .price(price)
                .status(status)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
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

    private OrderRefundEntity buildRefund(
            OrderDetailEntity detail,
            OrderRefundStatus status,
            BigDecimal amount,
            String reason,
            LocalDateTime timestamp
    ) {
        return OrderRefundEntity.builder()
                .orderDetail(detail)
                .status(status)
                .refundAmount(amount)
                .refundReason(reason)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private void attachAggregate(OrderEntity order, OrderDetailEntity detail, TransactionEntity transaction) {
        detail.setRefunds(new ArrayList<>());
        order.setOrderDetails(new ArrayList<>(List.of(detail)));
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
}

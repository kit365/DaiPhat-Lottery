package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Links {@link StatusCoverageImportBatchSeedInitializer} inventory to realistic orders:
 * every IBSTATUS-* serial in RESERVED / SOLD belongs to an order whose
 * status matches the transaction workflow being exercised. Company-hold
 * (proxy) orders reuse leftover SOLD serials with {@link OrderDetailStatus#PROXY_HOLDING}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.status-coverage.enabled", havingValue = "true")
@Order(113)
public class StatusCoverageOrderSeedInitializer implements ApplicationRunner {

    private static final String SYSTEM_ACTOR = "status-coverage-order-seed";
    private static final String ORDER_CODE_PREFIX = StatusCoverageSeedCleanup.ORDER_CODE_PREFIX;
    private static final String PAYMENT_REF_PREFIX = StatusCoverageSeedCleanup.PAYMENT_REF_PREFIX;
    private static final String SERIAL_PREFIX = "IBSTATUS-";

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity member = findSeedMember();
        UserEntity operator = findSeedOperator();
        if (member == null || operator == null) {
            log.warn("Skip status-coverage order seed: member or operator account missing.");
            return;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        resetPreviousSeedData();

        List<LotteryTicketSerialEntity> transactionSerials = loadTransactionSerials();
        if (transactionSerials.isEmpty()) {
            log.warn("Skip status-coverage order seed: no IBSTATUS transaction serials found.");
            return;
        }

        List<LotteryTicketEntity> tickets = loadSortedCoverageTickets(transactionSerials);
        if (tickets.size() < 4) {
            log.warn(
                    "Skip status-coverage order seed: expected 4 coverage tickets, found {}.",
                    tickets.size()
            );
            return;
        }

        Map<Long, List<LotteryTicketSerialEntity>> reservedByTicket =
                groupSerialsByTicket(transactionSerials, LotteryTicketSerialStatus.RESERVED);
        Map<Long, List<LotteryTicketSerialEntity>> soldByTicket =
                groupSerialsByTicket(transactionSerials, LotteryTicketSerialStatus.SOLD);
        Map<Long, List<LotteryTicketSerialEntity>> soldForPaidOrders = takePrefix(soldByTicket, 3);
        Map<Long, List<LotteryTicketSerialEntity>> soldForProxyOrders = skipPrefix(soldByTicket, 3);

        BigDecimal unitPrice = resolveUnitPrice(tickets);

        int orderCount = 0;

        orderCount += seedReservedOrders(member, tickets, reservedByTicket, unitPrice, now);
        orderCount += seedSoldOrders(member, operator, tickets, soldForPaidOrders, unitPrice, now);
        orderCount += seedProxyHoldingOrders(member, tickets, soldForProxyOrders, unitPrice, now);

        syncAllCoverageTicketStatuses(tickets, now);

        lotteryTicketSerialRepository.flush();
        log.info("Status-coverage order seed complete: {} orders for {} transaction serials.", orderCount, transactionSerials.size());
    }

    private int seedReservedOrders(
            UserEntity member,
            List<LotteryTicketEntity> tickets,
            Map<Long, List<LotteryTicketSerialEntity>> reservedByTicket,
            BigDecimal unitPrice,
            LocalDateTime now
    ) {
        int created = 0;
        created += createTransactionOrder(
                member,
                null,
                "RES-001",
                OrderType.ONLINE,
                OrderStatus.PENDING_PAYMENT,
                LotteryTicketSerialStatus.RESERVED,
                List.of(0, 1, 2),
                tickets,
                reservedByTicket,
                unitPrice,
                now.minusMinutes(8),
                null,
                null,
                true
        );
        created += createTransactionOrder(
                member,
                null,
                "RES-002",
                OrderType.ONLINE,
                OrderStatus.PENDING_PAYMENT,
                LotteryTicketSerialStatus.RESERVED,
                List.of(3),
                tickets,
                reservedByTicket,
                unitPrice,
                now.minusMinutes(5),
                null,
                null,
                true
        );
        return created;
    }

    private int seedSoldOrders(
            UserEntity member,
            UserEntity operator,
            List<LotteryTicketEntity> tickets,
            Map<Long, List<LotteryTicketSerialEntity>> soldByTicket,
            BigDecimal unitPrice,
            LocalDateTime now
    ) {
        int created = 0;
        LocalDateTime paidAt = now.minusMinutes(20);

        created += createTransactionOrder(
                member,
                operator,
                "PAID-001",
                OrderType.ONLINE,
                OrderStatus.PAID,
                LotteryTicketSerialStatus.SOLD,
                List.of(0, 1),
                tickets,
                soldByTicket,
                unitPrice,
                paidAt,
                now.plusMinutes(90),
                null,
                false
        );
        created += createTransactionOrder(
                member,
                operator,
                "PREP-001",
                OrderType.ONLINE,
                OrderStatus.PREPARING,
                LotteryTicketSerialStatus.SOLD,
                List.of(2, 3),
                tickets,
                soldByTicket,
                unitPrice,
                paidAt.minusMinutes(3),
                now.plusMinutes(75),
                null,
                false
        );
        return created;
    }

    private int seedProxyHoldingOrders(
            UserEntity member,
            List<LotteryTicketEntity> tickets,
            Map<Long, List<LotteryTicketSerialEntity>> proxyByTicket,
            BigDecimal unitPrice,
            LocalDateTime now
    ) {
        int created = 0;
        LocalDateTime paidAt = now.minusMinutes(15);

        created += createTransactionOrder(
                member,
                null,
                "PROXY-PREP-001",
                OrderType.ONLINE,
                OrderStatus.PREPARING,
                LotteryTicketSerialStatus.SOLD,
                List.of(0, 1),
                tickets,
                proxyByTicket,
                unitPrice,
                paidAt,
                now.plusMinutes(60),
                null,
                true
        );
        created += createTransactionOrder(
                member,
                null,
                "PROXY-PREP-002",
                OrderType.ONLINE,
                OrderStatus.PREPARING,
                LotteryTicketSerialStatus.SOLD,
                List.of(2, 3),
                tickets,
                proxyByTicket,
                unitPrice,
                paidAt.minusMinutes(2),
                now.plusMinutes(55),
                null,
                true
        );
        return created;
    }

    private int createTransactionOrder(
            UserEntity member,
            UserEntity operator,
            String codeSuffix,
            OrderType orderType,
            OrderStatus orderStatus,
            LotteryTicketSerialStatus expectedSerialStatus,
            List<Integer> ticketIndices,
            List<LotteryTicketEntity> tickets,
            Map<Long, List<LotteryTicketSerialEntity>> serialsByTicket,
            BigDecimal unitPrice,
            LocalDateTime createdAt,
            LocalDateTime expectedPickupAt,
            LocalDateTime actualPickedUpAt,
            boolean linkReservationOnSerial
    ) {
        List<OrderDetailEntity> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (int ticketIndex : ticketIndices) {
            LotteryTicketEntity ticket = tickets.get(ticketIndex);
            List<LotteryTicketSerialEntity> serials = serialsByTicket.getOrDefault(ticket.getId(), List.of());
            if (serials.isEmpty()) {
                log.warn(
                        "Skip order {}: no {} serials for ticket {}.",
                        codeSuffix,
                        expectedSerialStatus,
                        ticket.getNumbers()
                );
                continue;
            }
            if (serials.stream().anyMatch(serial -> serial.getStatus() != expectedSerialStatus)) {
                throw new IllegalStateException(
                        "Ticket " + ticket.getNumbers() + " serials do not match " + expectedSerialStatus
                );
            }

            // One order-detail per lottery-ticket-serial (matches live purchase flow).
            for (LotteryTicketSerialEntity serial : serials) {
                details.add(buildDetail(
                        null,
                        ticket,
                        serial,
                        unitPrice,
                        OrderDetailStatus.PROXY_HOLDING,
                        createdAt
                ));
                totalAmount = totalAmount.add(unitPrice);
            }
        }

        if (details.isEmpty()) {
            return 0;
        }

        OrderEntity order = buildOrder(
                member,
                ORDER_CODE_PREFIX + codeSuffix,
                orderType,
                totalAmount,
                orderStatus,
                createdAt
        );
        if (expectedPickupAt != null) {
            order.setExpectedPickupAt(expectedPickupAt);
        }
        if (actualPickedUpAt != null) {
            order.setActualPickedUpAt(actualPickedUpAt);
            if (operator != null) {
                order.setPickedUpBy(operator);
            }
        }

        for (OrderDetailEntity detail : details) {
            detail.setOrder(order);
        }

        TransactionEntity transaction = buildTransactionForOrder(
                order,
                totalAmount,
                orderType,
                orderStatus,
                PAYMENT_REF_PREFIX + codeSuffix,
                "Status-coverage " + orderStatus.name() + " order",
                createdAt
        );

        order.setOrderDetails(new ArrayList<>(details));
        order.setTransactions(new ArrayList<>(List.of(transaction)));
        orderRepository.save(order);

        if (linkReservationOnSerial) {
            linkReservationFields(order, details, createdAt);
        }

        return 1;
    }

    private void syncAllCoverageTicketStatuses(List<LotteryTicketEntity> tickets, LocalDateTime now) {
        if (tickets.isEmpty()) {
            return;
        }
        LotteryStationEntity station = tickets.getFirst().getStation();
        for (LotteryTicketEntity ticket : tickets) {
            StatusCoverageTicketStatusHelper.syncTicketStatusFromSerials(
                    ticket.getId(),
                    station,
                    now,
                    SYSTEM_ACTOR,
                    lotteryTicketRepository,
                    lotteryTicketSerialRepository
            );
        }
    }

    private void linkReservationFields(
            OrderEntity order,
            List<OrderDetailEntity> details,
            LocalDateTime timestamp
    ) {
        for (OrderDetailEntity detail : details) {
            LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
            if (serial == null) {
                continue;
            }
            serial.setReservedByOrderId(order.getId());
            serial.setReservedAt(timestamp.minusMinutes(5));
            serial.setReservationExpiresAt(timestamp.plusMinutes(25));
            serial.setUpdatedAt(timestamp);
            serial.setLastModifiedBy(SYSTEM_ACTOR);
            lotteryTicketSerialRepository.save(serial);
        }
    }

    private OrderDetailEntity buildDetail(
            OrderEntity order,
            LotteryTicketEntity ticket,
            LotteryTicketSerialEntity serial,
            BigDecimal unitPrice,
            OrderDetailStatus status,
            LocalDateTime timestamp
    ) {
        return OrderDetailEntity.builder()
                .order(order)
                .lotteryTicket(ticket)
                .lotteryTicketSerial(serial)
                .quantity(1)
                .price(unitPrice)
                .status(status)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private TransactionEntity buildTransactionForOrder(
            OrderEntity order,
            BigDecimal amount,
            OrderType orderType,
            OrderStatus orderStatus,
            String paymentRef,
            String note,
            LocalDateTime timestamp
    ) {
        TransactionStatus transactionStatus = orderStatus == OrderStatus.PENDING_PAYMENT
                ? TransactionStatus.PENDING
                : TransactionStatus.COMPLETED;

        TransactionEntity transaction = TransactionEntity.builder()
                .order(order)
                .amount(amount)
                .paymentRef(paymentRef)
                .status(transactionStatus)
                .note(note)
                .type(orderType == OrderType.DIRECT ? TransactionType.OFFLINE : TransactionType.ONLINE)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();

        if (orderType == OrderType.ONLINE) {
            transaction.setGateway(PaymentGateway.PAYOS);
        }
        if (transactionStatus == TransactionStatus.COMPLETED) {
            transaction.setPaidAt(timestamp);
        }
        return transaction;
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

    private List<LotteryTicketSerialEntity> loadTransactionSerials() {
        return lotteryTicketSerialRepository.findBySerialNumberPrefixWithTicketFetched(SERIAL_PREFIX)
                .stream()
                .filter(serial ->
                        serial.getStatus() == LotteryTicketSerialStatus.RESERVED
                                || serial.getStatus() == LotteryTicketSerialStatus.SOLD)
                .toList();
    }

    private List<LotteryTicketEntity> loadSortedCoverageTickets(List<LotteryTicketSerialEntity> transactionSerials) {
        Map<Long, LotteryTicketEntity> ticketsById = new HashMap<>();
        for (LotteryTicketSerialEntity serial : transactionSerials) {
            LotteryTicketEntity ticket = serial.getTicket();
            if (ticket != null && ticket.getId() != null) {
                ticketsById.putIfAbsent(ticket.getId(), ticket);
            }
        }
        return ticketsById.values().stream()
                .sorted(Comparator.comparing(LotteryTicketEntity::getNumbers))
                .toList();
    }

    private Map<Long, List<LotteryTicketSerialEntity>> groupSerialsByTicket(
            List<LotteryTicketSerialEntity> serials,
            LotteryTicketSerialStatus status
    ) {
        Map<Long, List<LotteryTicketSerialEntity>> grouped = new HashMap<>();
        for (LotteryTicketSerialEntity serial : serials) {
            if (serial.getStatus() != status) {
                continue;
            }
            Long ticketId = serial.getTicket().getId();
            grouped.computeIfAbsent(ticketId, key -> new ArrayList<>()).add(serial);
        }
        grouped.values().forEach(list ->
                list.sort(Comparator.comparing(LotteryTicketSerialEntity::getSerialNumber)));
        return grouped;
    }

    private Map<Long, List<LotteryTicketSerialEntity>> takePrefix(
            Map<Long, List<LotteryTicketSerialEntity>> grouped,
            int count
    ) {
        Map<Long, List<LotteryTicketSerialEntity>> sliced = new HashMap<>();
        grouped.forEach((ticketId, serials) ->
                sliced.put(ticketId, serials.subList(0, Math.min(count, serials.size()))));
        return sliced;
    }

    private Map<Long, List<LotteryTicketSerialEntity>> skipPrefix(
            Map<Long, List<LotteryTicketSerialEntity>> grouped,
            int count
    ) {
        Map<Long, List<LotteryTicketSerialEntity>> sliced = new HashMap<>();
        grouped.forEach((ticketId, serials) -> {
            if (serials.size() > count) {
                sliced.put(ticketId, serials.subList(count, serials.size()));
            }
        });
        return sliced;
    }

    private BigDecimal resolveUnitPrice(List<LotteryTicketEntity> tickets) {
        for (LotteryTicketEntity ticket : tickets) {
            if (ticket.getPriceSnapshot() != null) {
                return ticket.getPriceSnapshot();
            }
            if (ticket.getStation() != null && ticket.getStation().getPrice() != null) {
                return ticket.getStation().getPrice();
            }
        }
        return BigDecimal.valueOf(10_000);
    }

    private void resetPreviousSeedData() {
        StatusCoverageSeedCleanup.resetOrders(transactionRepository, orderRepository);
    }

    private UserEntity findSeedMember() {
        return userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_MEMBER)).stream()
                .findFirst()
                .orElse(null);
    }

    private UserEntity findSeedOperator() {
        List<UserEntity> operators = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR));
        if (!operators.isEmpty()) {
            return operators.getFirst();
        }
        List<UserEntity> admins = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ADMIN));
        return admins.isEmpty() ? null : admins.getFirst();
    }

    private String fullNameOf(UserEntity user) {
        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";
        String fullName = (lastName + " " + firstName).trim();
        return fullName.isBlank() ? "Seed Customer" : fullName;
    }

    private String phoneOf(UserEntity user) {
        String phone = user.getPhone() != null ? user.getPhone().trim() : "";
        return phone.isBlank() ? "0900000001" : phone;
    }
}

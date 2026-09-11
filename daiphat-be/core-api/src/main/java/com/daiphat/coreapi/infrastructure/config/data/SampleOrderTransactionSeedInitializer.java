package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryRegionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

/**
 * Local sample data for orders, transactions, and lottery ticket inventory.
 * Idempotent: removes only SAMPLE-* seeder-owned data on every run, then recreates a fresh dataset
 * with timestamps anchored to the current execution time.
 */
@Component
@Profile("local")
@ConditionalOnProperty(value = "daiphat.sample-order.seed.enabled", havingValue = "true")
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class SampleOrderTransactionSeedInitializer implements ApplicationRunner {

    private static final String SEED_ACTOR = "sample-order-seed";
    /** Unique test station — must not collide with synchronized southern stations. */
    private static final String SEED_STATION_NAME = "DongThapStationTest";
    private static final String SEED_STATION_PROVINCE = "DongThapStationTest";
    private static final String LEGACY_SEED_STATION_NAME = "Ve so sample seed";
    private static final BigDecimal SEED_STATION_PRICE = BigDecimal.valueOf(10_000);
    private static final BigDecimal SEED_STATION_COMMISSION_RATE = new BigDecimal("0.0500");
    private static final List<DayOfWeek> SEED_STATION_DRAW_DAYS =
            List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
    private static final LocalTime SEED_STATION_DRAW_TIME = LocalTime.of(16, 15);
    private static final String TICKET_SERIAL_PREFIX = "SAMPLE-SEED-SERIAL-";
    private static final int TICKET_COUNT = 10;
    private static final int SERIALS_PER_TICKET = 10;

    private static final List<String> SAMPLE_ORDER_CODES = List.of(
            "SAMPLE-ORD-PAID-001",
            "SAMPLE-ORD-PAID-002",
            "SAMPLE-ORD-PAID-003"
    );

    private static final List<String> LEGACY_SAMPLE_ORDER_CODES = List.of(
            "SAMPLE-ORD-UNPAID",
            "SAMPLE-ORD-EXPIRED",
            "SAMPLE-ORD-PAID"
    );

    private static final int[] ORDER_TWO_QUANTITIES = {2, 4, 1, 3};

    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final OrderRepository orderRepository;
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
            log.warn("Skip sample order seed because member/operator account is missing.");
            return;
        }

        LocalDateTime seedBase = LocalDateTime.now();
        LotteryStationEntity station = ensureSeedStation(operator, seedBase);
        resetSampleOrders();
        List<LotteryTicketEntity> tickets = ensureSampleTickets(operator, station, seedBase);
        restoreSampleTicketInventory(tickets);

        seedPaidOrder(
                member,
                "SAMPLE-ORD-PAID-001",
                5_100_201L,
                "PAYOS-SAMPLE-PAID-001",
                seedBase,
                List.of(new PurchaseLine(tickets.get(0), 1))
        );
        seedPaidOrder(
                member,
                "SAMPLE-ORD-PAID-002",
                5_100_202L,
                "PAYOS-SAMPLE-PAID-002",
                seedBase.minusMinutes(5),
                List.of(
                        new PurchaseLine(tickets.get(1), ORDER_TWO_QUANTITIES[0]),
                        new PurchaseLine(tickets.get(2), ORDER_TWO_QUANTITIES[1]),
                        new PurchaseLine(tickets.get(3), ORDER_TWO_QUANTITIES[2]),
                        new PurchaseLine(tickets.get(4), ORDER_TWO_QUANTITIES[3])
                )
        );
        seedPaidOrder(
                member,
                "SAMPLE-ORD-PAID-003",
                5_100_203L,
                "PAYOS-SAMPLE-PAID-003",
                seedBase.minusMinutes(2),
                List.of(new PurchaseLine(tickets.get(5), 3))
        );

        log.info(
                "Sample order seed complete: {} ({} lottery tickets, grouped order details, inventory deducted).",
                String.join(", ", SAMPLE_ORDER_CODES),
                tickets.size()
        );
    }

    private void resetSampleOrders() {
        for (String orderCode : SAMPLE_ORDER_CODES) {
            orderRepository.findByOrderCode(orderCode).ifPresent(this::releaseAndDeleteSampleOrder);
        }
        for (String legacyCode : LEGACY_SAMPLE_ORDER_CODES) {
            orderRepository.findByOrderCode(legacyCode).ifPresent(this::releaseAndDeleteSampleOrder);
        }
    }

    private void releaseAndDeleteSampleOrder(OrderEntity order) {
        if (order.getOrderDetails() != null) {
            for (OrderDetailEntity detail : order.getOrderDetails()) {
                releaseAllocatedSerials(detail);
            }
        }
        orderRepository.delete(order);
    }

    private void releaseAllocatedSerials(OrderDetailEntity detail) {
        if (detail.getLotteryTicketSerial() != null && detail.getLotteryTicketSerial().getId() != null) {
            lotteryTicketServicePort.returnSoldTicketForOrder(detail.getLotteryTicketSerial().getId());
            return;
        }
        if (detail.getReplacedByTicketSerial() != null && detail.getReplacedByTicketSerial().getId() != null) {
            lotteryTicketServicePort.returnSoldTicketForOrder(detail.getReplacedByTicketSerial().getId());
        }
    }

    private void restoreSampleTicketInventory(List<LotteryTicketEntity> tickets) {
        for (LotteryTicketEntity ticket : tickets) {
            List<LotteryTicketSerialEntity> serials =
                    lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticket.getId());
            for (LotteryTicketSerialEntity serial : serials) {
                if (serial.getStatus() == LotteryTicketSerialStatus.SOLD
                        || serial.getStatus() == LotteryTicketSerialStatus.RESERVED) {
                    lotteryTicketServicePort.returnSoldTicketForOrder(serial.getId());
                }
            }
            lotteryTicketRepository.save(ticket);
        }
    }

    private List<LotteryTicketEntity> ensureSampleTickets(
            UserEntity operator,
            LotteryStationEntity station,
            LocalDateTime seedBase
    ) {
        LocalDate drawDate = seedBase.toLocalDate().plusDays(1);
        List<LotteryTicketEntity> tickets = new ArrayList<>();

        for (int index = 1; index <= TICKET_COUNT; index++) {
            String numbers = String.format("%06d", 100_000 + index);

            LotteryTicketEntity ticket = lotteryTicketRepository
                    .findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(station.getId(), numbers, drawDate)
                    .map(existing -> refreshSampleTicketTimestamps(existing, seedBase))
                    .orElseGet(() -> createSampleTicket(station, numbers, drawDate, seedBase));

            ensureSerialCount(ticket, operator, index, seedBase);
            tickets.add(lotteryTicketRepository.findById(ticket.getId()).orElse(ticket));
        }

        return tickets;
    }

    private LotteryTicketEntity refreshSampleTicketTimestamps(LotteryTicketEntity ticket, LocalDateTime seedBase) {
        ticket.setUpdatedAt(seedBase);
        return lotteryTicketRepository.save(ticket);
    }

    private LotteryTicketEntity createSampleTicket(
            LotteryStationEntity station,
            String numbers,
            LocalDate drawDate,
            LocalDateTime seedBase
    ) {
        LocalDateTime importedAt = seedBase.minusHours(1);
        return lotteryTicketRepository.save(
                LotteryTicketEntity.builder()
                        .station(station)
                        .ticketImg("https://picsum.photos/seed/sample-" + numbers + "/800/500")
                        .numbers(numbers)
                        .drawDate(drawDate)
                        .batchCode("SAMPLE-" + numbers + "-" + drawDate)

                        .priceSnapshot(station.getPrice())
                        .status(LotteryTicketStatus.IN_STOCK)
                        .createdAt(importedAt)
                        .updatedAt(seedBase)
                        .createdBy(SEED_ACTOR)
                        .lastModifiedBy(SEED_ACTOR)
                        .build()
        );
    }

    private void ensureSerialCount(
            LotteryTicketEntity ticket,
            UserEntity operator,
            int ticketIndex,
            LocalDateTime seedBase
    ) {
        List<LotteryTicketSerialEntity> existing =
                lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticket.getId());
        int nextSerial = existing.size() + 1;
        LocalDateTime importedAt = seedBase.minusHours(1);

        for (LotteryTicketSerialEntity serial : existing) {
            serial.setImportedAt(importedAt);
            serial.setVerifiedAt(importedAt);
            serial.setUpdatedAt(seedBase);
            lotteryTicketSerialRepository.save(serial);
        }

        while (existing.size() < SERIALS_PER_TICKET) {
            String serialNumber = TICKET_SERIAL_PREFIX + String.format("%03d-%03d", ticketIndex, nextSerial);
            if (lotteryTicketSerialRepository.findFirstBySerialNumberAndDeletedAtIsNull(serialNumber).isEmpty()) {
                lotteryTicketSerialRepository.save(
                        LotteryTicketSerialEntity.builder()
                                .ticket(ticket)
                                .stationId(ticket.getStation().getId())
                                .drawDate(ticket.getDrawDate())
                                .ticketImg(ticket.getTicketImg())
                                .serialNumber(serialNumber)
                                .status(LotteryTicketSerialStatus.IN_STOCK)
                                .inputSource(InputSource.MANUAL)
                                .importedBy(operator)
                                .importedAt(importedAt)
                                .verified(true)
                                .verifiedBy(operator)
                                .verifiedAt(importedAt)
                                .createdAt(importedAt)
                                .updatedAt(seedBase)
                                .createdBy(SEED_ACTOR)
                                .lastModifiedBy(SEED_ACTOR)
                                .build()
                );
                existing = lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticket.getId());
            }
            nextSerial++;
        }
    }

    private void seedPaidOrder(
            UserEntity member,
            String orderCode,
            Long gatewayOrderCode,
            String paymentRef,
            LocalDateTime paidAt,
            List<PurchaseLine> purchaseLines
    ) {
        OrderEntity order = OrderEntity.builder()
                .user(member)
                .name("Sample Customer")
                .phone("0901234567")
                .email("sample@example.com")
                .orderCode(orderCode)
                .orderType(OrderType.ONLINE)
                .receiveType(OrderReceiveType.COUNTER_PICKUP)
                .totalAmount(BigDecimal.ZERO)
                .status(OrderStatus.PAID)
                .expectedPickupAt(paidAt.plusHours(2))
                .createdAt(paidAt)
                .updatedAt(paidAt)
                .createdBy(SEED_ACTOR)
                .lastModifiedBy(SEED_ACTOR)
                .build();

        List<OrderDetailEntity> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PurchaseLine line : purchaseLines) {
            List<Long> ticketIds = IntStream.range(0, line.quantity())
                    .mapToObj(i -> line.ticket().getId())
                    .toList();
            List<OrderTicketSnapshot> snapshots = lotteryTicketServicePort.sellOfflineForOrder(ticketIds);

            if (snapshots.size() != line.quantity()) {
                throw new IllegalStateException(
                        "Expected " + line.quantity() + " serial allocations for ticket "
                                + line.ticket().getNumbers() + " but got " + snapshots.size()
                );
            }

            BigDecimal unitPrice = snapshots.getFirst().price();

            // One order-detail per reserved/sold serial (matches live purchase flow).
            for (OrderTicketSnapshot snapshot : snapshots) {
                OrderDetailEntity detail = OrderDetailEntity.builder()
                        .order(order)
                        .lotteryTicket(line.ticket())
                        .lotteryTicketSerial(
                                lotteryTicketSerialRepository.getReferenceById(snapshot.lotteryTicketSerialId()))
                        .quantity(1)
                        .price(unitPrice)
                        .status(OrderDetailStatus.PROXY_HOLDING)
                        .createdAt(paidAt)
                        .updatedAt(paidAt)
                        .createdBy(SEED_ACTOR)
                        .lastModifiedBy(SEED_ACTOR)
                        .build();
                details.add(detail);
                totalAmount = totalAmount.add(unitPrice);
            }
        }

        order.setTotalAmount(totalAmount);

        TransactionEntity transaction = TransactionEntity.builder()
                .order(order)
                .amount(totalAmount)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(gatewayOrderCode)
                .paymentRef(paymentRef)
                .status(TransactionStatus.COMPLETED)
                .paidAt(paidAt)
                .note("Sample paid order")
                .type(TransactionType.ONLINE)
                .createdAt(paidAt)
                .updatedAt(paidAt)
                .createdBy(SEED_ACTOR)
                .lastModifiedBy(SEED_ACTOR)
                .build();

        order.setOrderDetails(details);
        order.setTransactions(new ArrayList<>(List.of(transaction)));
        orderRepository.save(order);
    }

    private LotteryStationEntity ensureSeedStation(UserEntity operator, LocalDateTime seedBase) {
        LotteryRegionEntity mienNam = lotteryRegionRepository.findByCodeIgnoreCase("MIEN_NAM")
                .orElseThrow();
        return lotteryStationRepository.findAll().stream()
                .filter(station -> SEED_STATION_NAME.equalsIgnoreCase(station.getName())
                        || LEGACY_SEED_STATION_NAME.equalsIgnoreCase(station.getName()))
                .findFirst()
                .map(station -> refreshSeedStation(station, mienNam, operator, seedBase))
                .orElseGet(() -> lotteryStationRepository.save(
                        LotteryStationEntity.builder()
                                .name(SEED_STATION_NAME)
                                .province(SEED_STATION_PROVINCE)
                                .region(mienNam)
                                .price(SEED_STATION_PRICE)
                                .commissionRate(SEED_STATION_COMMISSION_RATE)
                                .inventoryCount(100)
                                .drawDays(SEED_STATION_DRAW_DAYS)
                                .drawTime(SEED_STATION_DRAW_TIME)
                                .nextDrawDate(DrawScheduleUtils.resolveNextDrawDate(
                                        SEED_STATION_DRAW_DAYS,
                                        SEED_STATION_DRAW_TIME
                                ))
                                .status(LotteryStationStatus.ACTIVE)
                                .isActive(true)
                                .approvedBy(operator)
                                .approvedAt(seedBase)
                                .description("Station for sample order seed (DongThapStationTest).")
                                .createdAt(seedBase)
                                .updatedAt(seedBase)
                                .createdBy(SEED_ACTOR)
                                .lastModifiedBy(SEED_ACTOR)
                                .build()
                ));
    }

    private LotteryStationEntity refreshSeedStation(
            LotteryStationEntity station,
            LotteryRegionEntity region,
            UserEntity operator,
            LocalDateTime seedBase
    ) {
        station.setName(SEED_STATION_NAME);
        station.setProvince(SEED_STATION_PROVINCE);
        station.setRegion(region);
        station.setPrice(SEED_STATION_PRICE);
        station.setCommissionRate(SEED_STATION_COMMISSION_RATE);
        station.setDrawDays(SEED_STATION_DRAW_DAYS);
        station.setDrawTime(SEED_STATION_DRAW_TIME);
        station.setNextDrawDate(DrawScheduleUtils.resolveNextDrawDate(
                SEED_STATION_DRAW_DAYS,
                SEED_STATION_DRAW_TIME
        ));
        station.setStatus(LotteryStationStatus.ACTIVE);
        station.setActive(true);
        station.setApprovedBy(operator);
        station.setApprovedAt(seedBase);
        station.setDescription("Station for sample order seed (DongThapStationTest).");
        station.setUpdatedAt(seedBase);
        station.setLastModifiedBy(SEED_ACTOR);
        return lotteryStationRepository.save(station);
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

    private record PurchaseLine(LotteryTicketEntity ticket, int quantity) {
    }
}

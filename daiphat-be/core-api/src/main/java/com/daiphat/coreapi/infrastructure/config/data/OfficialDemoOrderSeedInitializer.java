package com.daiphat.coreapi.infrastructure.config.data;

import org.springframework.beans.factory.annotation.Value;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Creates the non-winning order lifecycle from the same imported stock as the draw demo. */
@Component
@Order(110)
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoOrderSeedInitializer implements ApplicationRunner {

    @Value("${daiphat.lottery.seed.rebuild-demo:false}")
    private boolean rebuildDemo;

    private static final String ACTOR = "official-demo-seed";
    private static final String CODE_MARKER = "-DO";
    private static final BigDecimal TICKET_PRICE = BigDecimal.valueOf(10_000);

    private final SeedAccountResolver accountResolver;
    private final ImportBatchRepository importBatchRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!rebuildDemo) return;
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate tomorrow = now.toLocalDate().plusDays(1);
        clearPreviousOrders();

        // A payment complaint needs the real ten-minute payment timeout. Tomorrow's
        // intake cannot have opened before 08:00, so wait until 08:15 for the matrix.
        if (now.toLocalTime().isBefore(LocalTime.of(8, 15))) {
            log.info("Deferring official-demo order matrix until 08:15 intake workflow is possible.");
            return;
        }

        List<LotteryTicketSerialEntity> available = importBatchRepository
                .findByNoteStartingWithAndDeletedAtIsNull(SeedDocumentCodes.IMPORT_NOTE_PREFIX + "MAIN")
                .stream()
                .filter(batch -> tomorrow.equals(batch.getDrawDate()))
                .flatMap(batch -> serialRepository.findByImportBatch_Id(batch.getId()).stream())
                .filter(serial -> serial.getStatus() == LotteryTicketSerialStatus.IN_STOCK)
                .filter(serial -> serial.getTicketCondition() == TicketCondition.GOOD)
                .filter(serial -> serial.getReturnBatchLineId() == null)
                // Spread purchases over ticket numbers, leaving sellable stock on
                // every number rather than exhausting all ten serials of one row.
                .sorted(Comparator
                        .comparing((LotteryTicketSerialEntity serial) ->
                                serial.getSerialNumber().charAt(serial.getSerialNumber().length() - 1))
                        .thenComparing(serial -> serial.getTicket().getId()))
                .toList();
        if (available.size() < 168) {
            log.warn("Deferring official-demo orders: need 168 purchasable tomorrow serials, found {}.",
                    available.size());
            return;
        }

        // Validate the full prerequisite set before writing any lifecycle order.
        for (int memberIndex = 0; memberIndex < 3; memberIndex++) {
            UserEntity member = accountResolver.findOfficialDemoMember(memberIndex);
            if (member == null || accountResolver.findOfficialDemoStaff(2) == null) {
                throw new IllegalStateException("Missing official-demo customer or tomorrow staff");
            }
            long winningOrders = orderRepository.findAll().stream()
                    .filter(order -> order.getUser() != null && member.getId().equals(order.getUser().getId()))
                    .filter(order -> order.getOrderCode() != null
                            && order.getOrderCode().startsWith(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX))
                    .count();
            if (winningOrders != 2) {
                log.warn("Deferring order matrix: need two official-result winning orders for {}, found {}.",
                        member.getUsername(), winningOrders);
                return;
            }
        }

        int cursor = 0;
        for (int memberIndex = 0; memberIndex < 3; memberIndex++) {
            UserEntity member = accountResolver.findOfficialDemoMember(memberIndex);
            UserEntity staff = accountResolver.findOfficialDemoStaff(2);
            int memberOrder = 0;
            for (OrderStatus status : OrderStatus.values()) {
                for (int variant = 0; variant < 4; variant++) {
                    int quantity = 1 + ((status.ordinal() + variant) % 3);
                    List<LotteryTicketSerialEntity> selected = available.subList(cursor, cursor + quantity);
                    cursor += quantity;
                    memberOrder++;
                    createOrder(member, staff, status, selected,
                            memberIndex * 28 + memberOrder, now);
                }
            }
        }
        serialRepository.flush();
        orderRepository.flush();
        log.info("Seeded 84 official-demo lifecycle orders from {} tomorrow serials.", cursor);
    }

    void clearPreviousOrders() {
        List<OrderEntity> prior = orderRepository.findAll().stream()
                .filter(order -> order.getOrderCode() != null
                        && order.getOrderCode().matches("ORD-\\d{8}-DO\\d{6}"))
                .filter(order -> order.getUser() != null
                        && java.util.stream.IntStream.range(0, 3)
                                .mapToObj(accountResolver::findOfficialDemoMember)
                                .filter(java.util.Objects::nonNull)
                                .anyMatch(member -> member.getId().equals(order.getUser().getId())))
                .toList();
        if (prior.isEmpty()) {
            return;
        }
        // Refund requests are cleared by the downstream refund seeder before the
        // old order details are removed on the next import reset.
        transactionRepository.deleteByPaymentRefStartingWith("PAYOS-DEMO-");
        orderRepository.deleteAll(prior);
        orderRepository.flush();
    }

    private void createOrder(UserEntity member, UserEntity staff, OrderStatus status,
                             List<LotteryTicketSerialEntity> serials, int sequence,
                             LocalDateTime now) {
        LocalDateTime createdAt = now.minusMinutes(12);
        LocalDateTime paidAt = now.minusMinutes(9);
        LocalDateTime pickupAt = now.minusMinutes(2);
        BigDecimal total = TICKET_PRICE.multiply(BigDecimal.valueOf(serials.size()));
        String code = "ORD-" + SeedDocumentCodes.dateToken(now.toLocalDate())
                + CODE_MARKER + String.format("%06d", sequence);
        boolean unpaid = status == OrderStatus.PENDING_PAYMENT
                || status == OrderStatus.PAYMENT_COMPLAINT_PENDING;
        boolean released = status == OrderStatus.CANCELLED
                || status == OrderStatus.PAYMENT_COMPLAINT_PENDING;
        OrderDetailStatus detailStatus = switch (status) {
            case PENDING_PAYMENT, PENDING_PICKUP -> OrderDetailStatus.HANDOVER_IN_PROGRESS;
            case PAID, PREPARING -> OrderDetailStatus.PROXY_HOLDING;
            case COMPLETED -> OrderDetailStatus.HANDED_OVER;
            case CANCELLED -> OrderDetailStatus.REFUND_PENDING;
            case PAYMENT_COMPLAINT_PENDING -> OrderDetailStatus.CANCELLED;
        };

        OrderEntity order = OrderEntity.builder()
                .user(member)
                .name(member.getLastName() + " " + member.getFirstName())
                .phone(member.getPhone())
                .email(member.getEmail())
                .orderCode(code)
                .orderType(OrderType.ONLINE)
                .receiveType(OrderReceiveType.COUNTER_PICKUP)
                .totalAmount(total)
                .status(status)
                .expectedPickupAt(now.plusHours(2))
                .actualPickedUpAt(status == OrderStatus.COMPLETED ? pickupAt : null)
                .pickedUpBy(status == OrderStatus.COMPLETED ? staff : null)
                .cancelledAt(released ? now.minusMinutes(1) : null)
                .cancelType(status == OrderStatus.CANCELLED ? OrderCancelType.CUSTOMER_REQUEST
                        : status == OrderStatus.PAYMENT_COMPLAINT_PENDING
                                ? OrderCancelType.SYSTEM_PAYMENT_TIMEOUT : null)
                .cancelReason(released ? "Hủy đơn theo quy trình thanh toán." : null)
                .paymentComplaintEvidenceUrl(status == OrderStatus.PAYMENT_COMPLAINT_PENDING
                        ? "https://placehold.co/800x600/png?text=Bien+lai+thanh+toan" : null)
                .paymentComplaintSubmittedAt(status == OrderStatus.PAYMENT_COMPLAINT_PENDING ? now : null)
                .createdAt(createdAt)
                .updatedAt(now)
                .createdBy(ACTOR)
                .lastModifiedBy(ACTOR)
                .build();

        List<OrderDetailEntity> details = new ArrayList<>();
        for (LotteryTicketSerialEntity serial : serials) {
            details.add(OrderDetailEntity.builder()
                    .order(order)
                    .lotteryTicket(serial.getTicket())
                    .lotteryTicketSerial(serial)
                    .quantity(1)
                    .price(serial.getTicket().getPriceSnapshot() != null
                            ? serial.getTicket().getPriceSnapshot() : TICKET_PRICE)
                    .status(detailStatus)
                    .handedOverAt(status == OrderStatus.COMPLETED ? pickupAt : null)
                    .handedOverBy(status == OrderStatus.COMPLETED ? staff.getId() : null)
                    .createdAt(createdAt)
                    .updatedAt(now)
                    .createdBy(ACTOR)
                    .lastModifiedBy(ACTOR)
                    .build());
        }
        order.setOrderDetails(details);
        TransactionStatus paymentStatus = status == OrderStatus.PENDING_PAYMENT
                ? TransactionStatus.PENDING
                : status == OrderStatus.PAYMENT_COMPLAINT_PENDING
                        ? TransactionStatus.CANCELLED : TransactionStatus.COMPLETED;
        TransactionEntity payment = TransactionEntity.builder()
                .order(order)
                .businessDate(now.toLocalDate())
                .transactionType(TransactionBusinessType.ORDER_PAYMENT)
                .amount(total)
                .gateway(PaymentGateway.PAYOS)
                .paymentRef("PAYOS-DEMO-" + code)
                .status(paymentStatus)
                .type(TransactionType.ONLINE)
                .paidAt(paymentStatus == TransactionStatus.COMPLETED ? paidAt : null)
                .cancelledAt(paymentStatus == TransactionStatus.CANCELLED ? now.minusMinutes(1) : null)
                .createdAt(createdAt)
                .updatedAt(now)
                .createdBy(ACTOR)
                .lastModifiedBy(ACTOR)
                .build();
        order.setTransactions(new ArrayList<>(List.of(payment)));
        order = orderRepository.save(order);

        for (LotteryTicketSerialEntity serial : serials) {
            if (status == OrderStatus.PENDING_PAYMENT) {
                serial.setStatus(LotteryTicketSerialStatus.RESERVED);
                serial.setReservedByOrderId(order.getId());
                serial.setReservedAt(createdAt);
                serial.setReservationExpiresAt(now.plusMinutes(8));
            } else if (!released) {
                serial.setStatus(LotteryTicketSerialStatus.SOLD);
            }
            serial.setLastModifiedBy(ACTOR);
        }
        serialRepository.saveAll(serials);
    }
}

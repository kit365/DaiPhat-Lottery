package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.order.PaymentTimeoutConfigService;
import com.daiphat.coreapi.application.service.refund.RefundProcessingDeadlineService;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundCounterPayoutMethod;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderCancelReasonDefaults;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketCommentEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.TicketCategoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.auth.RoleEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.RoleRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.RefundRequestRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.UserBankAccountRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.SupportTicketCommentRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.SupportTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.TicketCategoryRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Seeds orders, refund requests and support tickets for one existing MEMBER account
 * (default {@code phu123}) so that every order / refund / support-ticket status has three rows.
 * Each row mirrors the state the real service flow leaves behind (serial, order-line and
 * transaction status, refund payout transaction, ticket comment thread).
 * <p>
 * Idempotent: every run removes only rows owned by this seeder (order code / serial / import-note
 * prefixes and the {@link #SEED_ACTOR} audit marker), then recreates them relative to "now".
 * Refund statuses {@code APPROVED} / {@code TRANSFERRED} are deprecated and no current flow writes
 * them, so they are intentionally not seeded.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.member-status.seed.enabled", havingValue = "true")
@Order(125)
public class MemberStatusCoverageSeedInitializer implements ApplicationRunner {

    @Value("${daiphat.lottery.seed.rebuild-demo:false}")
    private boolean rebuildDemo;

    private static final String SEED_ACTOR = "member-status-seed";
    private static final String ORDER_CODE_PREFIX = "ORD-PHU123-";
    private static final String SERIAL_PREFIX = "IBPHU123-";
    /** Must not start with {@link SeedDocumentCodes#IMPORT_NOTE_PREFIX}: other seeders adopt those batches. */
    private static final String IMPORT_NOTE_PREFIX = "PHU123-SEED-IMPORT-";
    private static final int IMPORT_SEQUENCE = 7_950;
    private static final String DEFAULT_PHONE = "0900000000";
    private static final BigDecimal DEFAULT_TICKET_PRICE = BigDecimal.valueOf(10_000);
    private static final String SEED_BANK_BIN = "970436";
    private static final String SEED_BANK_ACCOUNT_NO = "1029384756";
    private static final String IMAGE_BASE_URL = "https://picsum.photos/seed/";

    private final UserRepository userRepository;
    private final SeedAccountResolver seedAccountResolver;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final UserBankAccountRepository userBankAccountRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketCommentRepository supportTicketCommentRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final PaymentTimeoutConfigService paymentTimeoutConfigService;
    private final RefundProcessingDeadlineService refundProcessingDeadlineService;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Value("${daiphat.member-status.seed.username:phu123}")
    private String memberUsername;

    @Value("${daiphat.lottery.seed.daily-only:true}")
    private boolean dailyOnly;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (dailyOnly) return;
        if (!rebuildDemo) return;
        UserEntity member = userRepository.findByUsername(memberUsername).orElse(null);
        if (member == null) {
            RoleEntity roleMember = roleRepository.findByCode(RoleConstants.ROLE_MEMBER)
                    .orElseThrow(() -> new IllegalStateException("Missing seed role: " + RoleConstants.ROLE_MEMBER));
            member = userRepository.save(UserEntity.builder()
                    .role(roleMember)
                    .username(memberUsername)
                    .email(memberUsername + "@daiphat.test")
                    .phone("0909123123")
                    .firstName("Phu")
                    .lastName("Nguyen")
                    .status("ACTIVE")
                    .emailVerified(true)
                    .agreedToTerms(true)
                    .hasPassword(true)
                    .password(passwordEncoder.encode("Phu123A"))
                    .failedLoginAttempts(0)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdBy(SEED_ACTOR)
                    .lastModifiedBy(SEED_ACTOR)
                    .build());
            log.info("Auto-created seed member account '{}' with ROLE_MEMBER (password: Phu123A).", memberUsername);
        } else {
            boolean updated = false;
            if (member.getDeletedAt() != null) {
                member.setDeletedAt(null);
                member.setStatus("ACTIVE");
                updated = true;
            }
            if (member.getRole() == null || !RoleConstants.ROLE_MEMBER.equals(member.getRole().getCode())) {
                RoleEntity roleMember = roleRepository.findByCode(RoleConstants.ROLE_MEMBER)
                        .orElseThrow(() -> new IllegalStateException("Missing seed role: " + RoleConstants.ROLE_MEMBER));
                member.setRole(roleMember);
                updated = true;
            }
            if (updated) {
                member = userRepository.save(member);
                log.info("Updated account '{}' to active ROLE_MEMBER for status seed.", memberUsername);
            }
        }
        UserEntity operator = seedAccountResolver.findOperator();
        if (operator == null) {
            log.warn("Skip member status seed: no operator/admin account to act as staff.");
            return;
        }
        LotterySupplierEntity supplier = resolveSupplier();
        if (supplier == null) {
            log.warn("Skip member status seed: no active lottery supplier exists.");
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        LotteryStationEntity station = resolveStation(now.toLocalDate());
        if (station == null) {
            log.warn("Skip member status seed: no active lottery station with a draw schedule exists.");
            return;
        }

        UUID memberId = member.getId();
        UUID operatorId = operator.getId();
        Long supplierId = supplier.getId();
        Long stationId = station.getId();

        resetPreviousSeedData();
        entityManager.flush();
        entityManager.clear();

        SeedRun run = new SeedRun(
                now,
                userRepository.findById(memberId).orElseThrow(),
                userRepository.findById(operatorId).orElseThrow(),
                lotteryStationRepository.findById(stationId).orElseThrow(),
                paymentTimeoutConfigService.getTimeoutMinutes(),
                paymentTimeoutConfigService.getTimeoutCancelReason(),
                Math.max(1, readPositiveInt(SystemConfigEnum.MAX_REFUND_BANK_INFO_RETRY)),
                readPositiveInt(SystemConfigEnum.SUPPORT_TICKET_AUTO_CLOSE_HOURS));
        run.drawDate = nextDrawDate(run.station, now.toLocalDate());
        run.bankAccount = resolveBankAccount(run);
        createImportDocuments(run, lotterySupplierRepository.findById(supplierId).orElseThrow());

        seedOrders(run);
        seedRefunds(run);
        seedSupportTickets(run);

        finishImportDocuments(run);
        entityManager.flush();
        applyAuditStamps(run);
        entityManager.flush();
        entityManager.clear();
        lotteryStationServicePort.recalculateInventory(stationId);

        log.info("Member status seed complete for '{}': {} orders, {} refund requests, {} support tickets"
                        + " (station {}, draw date {}, refund deadline {} days).",
                memberUsername, run.orderCount, run.refundCount, run.ticketCount,
                run.station.getName(), run.drawDate, refundProcessingDeadlineService.getProcessingExpiryDays());
    }

    // ---------------------------------------------------------------------------------------------
    // Orders — three per OrderStatus (refund scenarios add more CANCELLED orders).
    // ---------------------------------------------------------------------------------------------

    private void seedOrders(SeedRun run) {
        seedPendingPaymentOrders(run);
        seedPaymentComplaintPendingOrders(run);
        seedPaidOrders(run);
        seedPreparingOrders(run);
        seedPendingPickupOrders(run);
        seedCompletedOrders(run);
        seedCancelledOrders(run);
    }

    /** Awaiting PayOS: serials reserved for the order. The payment-timeout job cancels them after the TTL. */
    private void seedPendingPaymentOrders(SeedRun run) {
        for (int i = 1; i <= 3; i++) {
            LocalDateTime createdAt = run.now.minusSeconds(20L * i);
            List<LotteryTicketSerialEntity> serials =
                    createSerials(run, i == 2 ? 2 : 1, LotteryTicketSerialStatus.RESERVED);
            OrderEntity order = newOrder(run, "PENDING-PAYMENT-0" + i, OrderStatus.PENDING_PAYMENT,
                    serials, OrderDetailStatus.HANDOVER_IN_PROGRESS, pickupSlot(run, i));
            addPayment(order, TransactionStatus.PENDING, null, null, null);
            persistOrder(run, order, createdAt, createdAt, createdAt);

            LocalDateTime expiresAt = createdAt.plusMinutes(run.paymentTimeoutMinutes);
            for (LotteryTicketSerialEntity serial : serials) {
                serial.setReservedByOrderId(order.getId());
                serial.setReservedAt(createdAt);
                serial.setReservationExpiresAt(expiresAt);
            }
            run.orders.put("PENDING_PAYMENT_" + i, order);
        }
    }

    /** Timed-out payments the customer disputed with a transfer receipt; staff has not reviewed yet. */
    private void seedPaymentComplaintPendingOrders(SeedRun run) {
        int[] createdHoursAgo = {5, 26, 50};
        int[] submittedMinutesAfterCancel = {20, 120, 300};
        for (int i = 1; i <= 3; i++) {
            LocalDateTime createdAt = run.hoursAgo(createdHoursAgo[i - 1]);
            LocalDateTime cancelledAt = createdAt.plusMinutes(run.paymentTimeoutMinutes);
            LocalDateTime submittedAt = cancelledAt.plusMinutes(submittedMinutesAfterCancel[i - 1]);
            OrderEntity order = newTimedOutOrder(run, "PAY-COMPLAINT-0" + i, OrderStatus.PAYMENT_COMPLAINT_PENDING,
                    i == 3 ? 2 : 1, cancelledAt, pickupSlot(run, i));
            order.setPaymentComplaintEvidenceUrl(image("payment-complaint-" + i, 800, 1400));
            order.setPaymentComplaintSubmittedAt(submittedAt);
            persistOrder(run, order, createdAt, submittedAt, cancelledAt);
            run.orders.put("PAYMENT_COMPLAINT_PENDING_" + i, order);
        }
    }

    private void seedPaidOrders(SeedRun run) {
        int[] paidMinutesAgo = {40, 120, 300};
        for (int i = 1; i <= 3; i++) {
            LocalDateTime paidAt = run.minutesAgo(paidMinutesAgo[i - 1]);
            OrderEntity order = newPaidOrder(run, "PAID-0" + i, OrderStatus.PAID, i == 3 ? 2 : 1,
                    OrderDetailStatus.PROXY_HOLDING, paidAt, pickupSlot(run, i + 1));
            persistOrder(run, order, paidAt.minusMinutes(3), paidAt, paidAt);
            run.orders.put("PAID_" + i, order);
        }
    }

    private void seedPreparingOrders(SeedRun run) {
        int[] paidMinutesAgo = {70, 190, 360};
        for (int i = 1; i <= 3; i++) {
            LocalDateTime paidAt = run.minutesAgo(paidMinutesAgo[i - 1]);
            LocalDateTime preparingAt = paidAt.plusMinutes(10);
            OrderEntity order = newPaidOrder(run, "PREPARING-0" + i, OrderStatus.PREPARING, i == 2 ? 2 : 1,
                    OrderDetailStatus.PROXY_HOLDING, paidAt, pickupSlot(run, i + 2));
            persistOrder(run, order, paidAt.minusMinutes(3), preparingAt, paidAt);
            run.orders.put("PREPARING_" + i, order);
        }
    }

    /** Ready at the counter: every line is open for handover. */
    private void seedPendingPickupOrders(SeedRun run) {
        int[] paidHoursAgo = {4, 8, 20};
        for (int i = 1; i <= 3; i++) {
            LocalDateTime paidAt = run.hoursAgo(paidHoursAgo[i - 1]);
            LocalDateTime readyAt = paidAt.plusHours(1);
            OrderEntity order = newPaidOrder(run, "PENDING-PICKUP-0" + i, OrderStatus.PENDING_PICKUP, i == 1 ? 2 : 1,
                    OrderDetailStatus.HANDOVER_IN_PROGRESS, paidAt, pickupSlot(run, i + 3));
            persistOrder(run, order, paidAt.minusMinutes(3), readyAt, readyAt);
            run.orders.put("PENDING_PICKUP_" + i, order);
        }
    }

    /** Picked up: each line is in a final handover state (the third order has one ticket refused). */
    private void seedCompletedOrders(SeedRun run) {
        int[] paidHoursAgo = {10, 30, 72};
        for (int i = 1; i <= 3; i++) {
            LocalDateTime paidAt = run.hoursAgo(paidHoursAgo[i - 1]);
            LocalDateTime pickedUpAt = paidAt.plusHours(4);
            OrderEntity order = newPaidOrder(run, "COMPLETED-0" + i, OrderStatus.COMPLETED, i == 3 ? 2 : 1,
                    OrderDetailStatus.HANDED_OVER, paidAt, pickedUpAt.plusMinutes(30));
            order.setActualPickedUpAt(pickedUpAt);
            order.setPickedUpBy(run.operator);
            order.setHandoverEvidenceUrl(image("handover-" + i, 1200, 900));
            for (OrderDetailEntity detail : order.getOrderDetails()) {
                detail.setHandedOverAt(pickedUpAt);
                detail.setHandedOverBy(run.operator.getId());
            }
            if (i == 3) {
                OrderDetailEntity refused = order.getOrderDetails().get(1);
                refused.setStatus(OrderDetailStatus.REJECTED_BY_CUSTOMER);
                refused.setHandedOverAt(null);
                refused.setHandedOverBy(null);
                refused.setRejectionReason("Vé bị rách góc, khách không đồng ý nhận tờ vé này.");
                refused.setRejectedBy(run.operator.getId());
                refused.setRejectedAt(pickedUpAt);
            }
            persistOrder(run, order, paidAt.minusMinutes(3), pickedUpAt, pickedUpAt);
            run.orders.put("COMPLETED_" + i, order);
        }
    }

    /** Cancelled without refund: payment timeout, timeout with a rejected complaint, staff cancel before payment. */
    private void seedCancelledOrders(SeedRun run) {
        LocalDateTime timeoutCreatedAt = run.hoursAgo(7);
        LocalDateTime timeoutCancelledAt = timeoutCreatedAt.plusMinutes(run.paymentTimeoutMinutes);
        OrderEntity timedOut = newTimedOutOrder(run, "CANCELLED-01", OrderStatus.CANCELLED, 1,
                timeoutCancelledAt, pickupSlot(run, 1));
        persistOrder(run, timedOut, timeoutCreatedAt, timeoutCancelledAt, timeoutCancelledAt);
        run.orders.put("CANCELLED_1", timedOut);

        LocalDateTime rejectedCreatedAt = run.hoursAgo(74);
        LocalDateTime rejectedCancelledAt = rejectedCreatedAt.plusMinutes(run.paymentTimeoutMinutes);
        LocalDateTime complaintSubmittedAt = rejectedCancelledAt.plusHours(1);
        LocalDateTime complaintResolvedAt = complaintSubmittedAt.plusHours(20);
        OrderEntity complaintRejected = newTimedOutOrder(run, "CANCELLED-02", OrderStatus.CANCELLED, 1,
                rejectedCancelledAt, pickupSlot(run, 2));
        complaintRejected.setPaymentComplaintEvidenceUrl(image("payment-complaint-rejected", 800, 1400));
        complaintRejected.setPaymentComplaintSubmittedAt(complaintSubmittedAt);
        complaintRejected.setPaymentComplaintResolvedAt(complaintResolvedAt);
        complaintRejected.setPaymentComplaintResolvedBy(run.operator);
        complaintRejected.setPaymentComplaintResolutionReason(
                "Chứng từ chuyển khoản không khớp số tiền và nội dung thanh toán của đơn hàng.");
        persistOrder(run, complaintRejected, rejectedCreatedAt, complaintResolvedAt, rejectedCancelledAt);
        run.orders.put("CANCELLED_2", complaintRejected);

        LocalDateTime adminCreatedAt = run.hoursAgo(49);
        LocalDateTime adminCancelledAt = adminCreatedAt.plusMinutes(1);
        String adminReason = "Đơn hàng bị hủy bởi quản trị viên.";
        OrderEntity adminCancelled = newOrder(run, "CANCELLED-03", OrderStatus.CANCELLED,
                createSerials(run, 1, LotteryTicketSerialStatus.IN_STOCK), OrderDetailStatus.CANCELLED,
                pickupSlot(run, 3));
        adminCancelled.setCancelledAt(adminCancelledAt);
        adminCancelled.setCancelReason(adminReason);
        addPayment(adminCancelled, TransactionStatus.CANCELLED, null, adminCancelledAt, adminReason);
        persistOrder(run, adminCancelled, adminCreatedAt, adminCancelledAt, adminCancelledAt);
        run.orders.put("CANCELLED_3", adminCancelled);
    }

    // ---------------------------------------------------------------------------------------------
    // Refund requests — three per active RefundRequestStatus, each on its own cancelled order.
    // ---------------------------------------------------------------------------------------------

    private void seedRefunds(SeedRun run) {
        int partialRetry = Math.max(1, Math.min(2, run.maxBankInfoRetry - 1));
        int firstRetry = Math.min(1, run.maxBankInfoRetry - 1);

        // WAITING_FOR_INFO: staff incident cancel (no bank yet) and customer refunds after failed transfers.
        seedRefund(run, new RefundSpec("REFUND-WAITING-01", RefundRequestStatus.WAITING_FOR_INFO,
                RefundRequestRole.STAFF, OrderCancelType.ADMIN_FORCE_CANCEL, OrderCancelReasonDefaults.ADMIN_FORCE_CANCEL,
                run.hoursAgo(20), run.hoursAgo(20), 0, null, false, 2));
        seedRefund(run, new RefundSpec("REFUND-WAITING-02", RefundRequestStatus.WAITING_FOR_INFO,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Tôi có việc đột xuất nên không thể đến quầy nhận vé.",
                run.hoursAgo(72), run.hoursAgo(60), firstRetry,
                "Chuyển khoản hoàn tiền thất bại: tên chủ tài khoản không khớp với số tài khoản. "
                        + "Vui lòng kiểm tra và cập nhật lại thông tin ngân hàng.",
                true, 1));
        seedRefund(run, new RefundSpec("REFUND-WAITING-03", RefundRequestStatus.WAITING_FOR_INFO,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Đặt nhầm dãy số, muốn hủy để mua lại vé khác.",
                run.hoursAgo(162), run.hoursAgo(100), partialRetry,
                "Ngân hàng báo số tài khoản không tồn tại. Vui lòng cập nhật lại tài khoản nhận hoàn tiền.",
                true, 1));

        // READY_TO_PAY: bank account present, waiting for staff transfer (on time / on time / overdue).
        seedRefund(run, new RefundSpec("REFUND-READY-01", RefundRequestStatus.READY_TO_PAY,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Đặt trùng đơn với người nhà, xin hoàn tiền một đơn.",
                run.minutesAgo(115), run.minutesAgo(115), 0, null, true, 1));
        seedRefund(run, new RefundSpec("REFUND-READY-02", RefundRequestStatus.READY_TO_PAY,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Không còn nhu cầu mua vé kỳ này.",
                run.hoursAgo(96), run.hoursAgo(96), 0, null, true, 2));
        seedRefund(run, new RefundSpec("REFUND-READY-03", RefundRequestStatus.READY_TO_PAY,
                RefundRequestRole.STAFF, OrderCancelType.ADMIN_FORCE_CANCEL, OrderCancelReasonDefaults.ADMIN_FORCE_CANCEL,
                run.hoursAgo(192), run.hoursAgo(170), 0, null, true, 1));

        // PAID: two bank transfers and one counter cash payout after manual resolution.
        RefundRequestEntity paidTransfer = seedRefund(run, new RefundSpec("REFUND-PAID-01", RefundRequestStatus.PAID,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Lịch công tác thay đổi, không thể nhận vé.",
                run.hoursAgo(120), run.hoursAgo(96), 0, null, true, 1));
        addRefundPayout(run, paidTransfer, run.hoursAgo(96), null);
        RefundRequestEntity paidTransferLate = seedRefund(run, new RefundSpec("REFUND-PAID-02", RefundRequestStatus.PAID,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Chọn nhầm đài, muốn hủy đơn.",
                run.hoursAgo(146), run.hoursAgo(130), 0, null, true, 2));
        addRefundPayout(run, paidTransferLate, run.hoursAgo(130), null);
        RefundRequestEntity paidAtCounter = seedRefund(run, new RefundSpec("REFUND-PAID-03", RefundRequestStatus.PAID,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Không thể đến nhận vé do đi công tác xa.",
                run.hoursAgo(180), run.hoursAgo(24), run.maxBankInfoRetry, null, true, 1));
        applyVerifiedCounterIdentity(run, paidAtCounter, run.hoursAgo(24).minusMinutes(10));
        paidAtCounter.setCounterPayoutMethod(RefundCounterPayoutMethod.CASH);
        addRefundPayout(run, paidAtCounter, run.hoursAgo(24), RefundCounterPayoutMethod.CASH);

        // MANUAL_RESOLUTION: bank-info retries exhausted; the second one has a failed counter CCCD check.
        seedRefund(run, new RefundSpec("REFUND-MANUAL-01", RefundRequestStatus.MANUAL_RESOLUTION,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Gia đình có việc gấp, xin hoàn tiền.",
                run.hoursAgo(126), run.hoursAgo(28), run.maxBankInfoRetry,
                RefundRequestModel.MANUAL_RESOLUTION_NOTE, true, 1));
        RefundRequestEntity failedIdentity = seedRefund(run, new RefundSpec("REFUND-MANUAL-02",
                RefundRequestStatus.MANUAL_RESOLUTION, RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Mua nhầm số lượng vé.",
                run.hoursAgo(150), run.hoursAgo(6), run.maxBankInfoRetry,
                RefundRequestModel.MANUAL_RESOLUTION_NOTE, true, 2));
        failedIdentity.setCccdFrontImageUrl(image("cccd-front-failed", 1000, 630));
        failedIdentity.setCccdBackImageUrl(image("cccd-back-failed", 1000, 630));
        failedIdentity.setEkycStatus(EkycStatus.FAILED);
        failedIdentity.setEkycFailureReason("Ảnh CCCD mặt sau bị lóa, không đọc được đầy đủ thông tin.");
        seedRefund(run, new RefundSpec("REFUND-MANUAL-03", RefundRequestStatus.MANUAL_RESOLUTION,
                RefundRequestRole.CUSTOMER, OrderCancelType.CUSTOMER_REQUEST,
                "Đổi ý, không muốn mua vé kỳ này nữa.",
                run.hoursAgo(108), run.hoursAgo(3), run.maxBankInfoRetry,
                RefundRequestModel.MANUAL_RESOLUTION_NOTE, true, 1));
    }

    /**
     * Refund + its cancelled order. The cancel released the sold serials back to stock; order lines
     * stay REFUND_PENDING until the refund is PAID. Customers refund within the grace window after paying.
     */
    private RefundRequestEntity seedRefund(SeedRun run, RefundSpec spec) {
        LocalDateTime cancelledAt = spec.createdAt();
        LocalDateTime paidAt = spec.role() == RefundRequestRole.CUSTOMER
                ? cancelledAt.minusMinutes(10)
                : cancelledAt.minusHours(2);
        List<LotteryTicketSerialEntity> serials = createSerials(run, spec.lines(), LotteryTicketSerialStatus.IN_STOCK);
        BigDecimal amount = run.price().multiply(BigDecimal.valueOf(serials.size()));

        RefundRequestEntity refund = RefundRequestEntity.builder()
                .refundType(RefundType.FULL_ORDER)
                .requestedBy(run.member)
                .requestRole(spec.role())
                .refundAmount(amount)
                .refundReason(spec.reason())
                .bankAccount(spec.withBankAccount() ? run.bankAccount : null)
                .status(spec.status())
                .fundSource(RefundFundSource.COMPANY_FUND)
                .reimburseStatus(ReimburseStatus.NONE)
                .attemptNumber(1)
                .retryCount(spec.retryCount())
                .operatorNote(spec.operatorNote())
                .build();
        refund = refundRequestRepository.save(refund);
        stamp(run, "refund_requests", refund.getId(), spec.createdAt(), spec.updatedAt());

        boolean paid = spec.status() == RefundRequestStatus.PAID;
        OrderEntity order = newOrder(run, spec.code(), OrderStatus.CANCELLED, serials,
                paid ? OrderDetailStatus.REFUNDED : OrderDetailStatus.REFUND_PENDING, paidAt.plusHours(3));
        order.setCancelledAt(cancelledAt);
        order.setCancelType(spec.cancelType());
        order.setCancelReason(spec.reason());
        for (OrderDetailEntity detail : order.getOrderDetails()) {
            detail.setRefundRequest(refund);
        }
        addPayment(order, TransactionStatus.COMPLETED, paidAt, null, null);
        persistOrder(run, order, paidAt.minusMinutes(3), cancelledAt, paid ? spec.updatedAt() : cancelledAt);

        run.refunds.computeIfAbsent(spec.status(), ignored -> new ArrayList<>()).add(refund);
        run.refundCount++;
        return refund;
    }

    /** Payout ledger row written by the staff transfer / counter-payout flows (not linked to the order). */
    private void addRefundPayout(SeedRun run, RefundRequestEntity refund, LocalDateTime paidAt,
                                 RefundCounterPayoutMethod counterMethod) {
        String staffName = fullNameOf(run.operator);
        String note = counterMethod == null
                ? "Yêu cầu hoàn tiền đã được xử lý chuyển khoản bởi nhân viên " + staffName + "."
                : "Yêu cầu hoàn tiền đã được xử lý tại quầy (" + counterMethod.getLabel().toLowerCase(Locale.ROOT)
                        + ") bởi nhân viên " + staffName + ".";
        String evidenceUrl = counterMethod == RefundCounterPayoutMethod.CASH
                ? null
                : image("refund-transfer-" + refund.getId(), 800, 1400);
        TransactionEntity payout = transactionRepository.save(TransactionEntity.builder()
                .refundRequest(refund)
                .amount(refund.getRefundAmount())
                .type(TransactionType.REFUND)
                .transactionType(TransactionBusinessType.ORDER_REFUND)
                .status(TransactionStatus.COMPLETED)
                .paidAt(paidAt)
                .paymentBy(run.operator)
                .paymentEvidenceUrl(evidenceUrl)
                .note(note)
                .build());
        stamp(run, "transactions", payout.getId(), paidAt, paidAt);
    }

    private void applyVerifiedCounterIdentity(SeedRun run, RefundRequestEntity refund, LocalDateTime verifiedAt) {
        refund.setCccdFrontImageUrl(image("cccd-front-" + refund.getId(), 1000, 630));
        refund.setCccdBackImageUrl(image("cccd-back-" + refund.getId(), 1000, 630));
        refund.setEkycStatus(EkycStatus.VERIFIED);
        refund.setEkycOcrName(stripAccents(fullNameOf(run.member)).toUpperCase(Locale.ROOT));
        refund.setEkycOcrIdNumber("079200012345");
        refund.setEkycOcrDob("01/01/2000");
        refund.setEkycOcrGender("Nam");
        refund.setEkycOcrNationality("Việt Nam");
        refund.setEkycOcrPlaceOfBirth("TP. Hồ Chí Minh");
        refund.setEkycOcrPlaceOfResidence("Phường Bến Thành, TP. Hồ Chí Minh");
        refund.setEkycOcrIssueDate("15/08/2021");
        refund.setEkycOcrExpiryDate("01/01/2040");
        refund.setEkycVerifiedAt(verifiedAt);
    }

    // ---------------------------------------------------------------------------------------------
    // Support tickets — three per TicketStatus, with comment threads matching the staff/customer flow.
    // ---------------------------------------------------------------------------------------------

    private void seedSupportTickets(SeedRun run) {
        seedOpenTickets(run);
        seedInProgressTickets(run);
        seedWaitingForCustomerTickets(run);
        seedResolvedTickets(run);
        seedRejectedTickets(run);
        seedClosedTickets(run);
    }

    private void seedOpenTickets(SeedRun run) {
        OrderEntity pickupOrder = run.orders.get("PENDING_PICKUP_1");
        TicketDraft pickup = openTicket(run, "ORDER_PICKUP_ISSUE", TicketRefType.ORDER, pickupOrder.getId().toString(),
                "Không nhận được vé khi đến quầy",
                "Tôi đến quầy nhận vé cho đơn " + pickupOrder.getOrderCode()
                        + " nhưng nhân viên báo chưa tìm thấy vé. Nhờ cửa hàng kiểm tra giúp.",
                null, run.hoursAgo(1));
        finishTicket(run, pickup);

        OrderEntity timedOut = run.orders.get("CANCELLED_1");
        TicketDraft paymentSync = openTicket(run, "PAYMENT_SYNC_ERROR", TicketRefType.ORDER, timedOut.getId().toString(),
                "Đã chuyển khoản nhưng đơn bị hủy",
                "Tôi đã chuyển khoản thành công cho đơn " + timedOut.getOrderCode()
                        + " nhưng hệ thống báo quá thời gian thanh toán và hủy đơn. Tôi gửi kèm biên lai chuyển khoản.",
                image("support-payment-sync", 800, 1400), run.hoursAgo(6));
        finishTicket(run, paymentSync);

        TicketDraft general = openTicket(run, "GENERAL", null, null,
                "Hỏi về giờ nhận vé tại quầy",
                "Cho tôi hỏi quầy mở cửa đến mấy giờ để tôi sắp xếp đến nhận vé?",
                null, run.minutesAgo(25));
        finishTicket(run, general);
    }

    private void seedInProgressTickets(SeedRun run) {
        OrderEntity preparing = run.orders.get("PREPARING_1");
        TicketDraft delay = openTicket(run, "ORDER_PREPARATION_DELAY", TicketRefType.ORDER, preparing.getId().toString(),
                "Đơn hàng chuẩn bị quá lâu",
                "Đơn " + preparing.getOrderCode() + " đã thanh toán hơn nửa tiếng nhưng vẫn đang chuẩn bị.",
                null, run.minutesAgo(40));
        assign(run, delay, run.minutesAgo(30));
        finishTicket(run, delay);

        RefundRequestEntity slowRefund = run.refunds.get(RefundRequestStatus.READY_TO_PAY).get(1);
        TicketDraft slow = openTicket(run, "REFUND_SLOW_PROCESSING", TicketRefType.REFUND_REQUEST,
                slowRefund.getId().toString(),
                "Yêu cầu hoàn tiền chưa được chuyển khoản",
                "Yêu cầu hoàn tiền #" + slowRefund.getId() + " đã chờ chuyển khoản nhiều ngày nhưng tôi chưa nhận được tiền.",
                null, run.hoursAgo(30));
        assign(run, slow, run.hoursAgo(28));
        operatorReply(run, slow, "Chúng tôi đang đối soát với bộ phận kế toán. Anh/chị vui lòng xác nhận lại "
                + "số tài khoản nhận tiền giúp chúng tôi.", run.hoursAgo(27));
        customerReply(run, slow, "Tôi xác nhận số tài khoản trong yêu cầu là chính xác.", run.hoursAgo(20));
        finishTicket(run, slow);

        TicketDraft general = openTicket(run, "GENERAL", null, null,
                "Cập nhật số điện thoại nhận thông báo",
                "Tôi muốn đổi số điện thoại nhận thông báo đơn hàng, cần làm những bước nào?",
                null, run.hoursAgo(5));
        assign(run, general, run.hoursAgo(4));
        finishTicket(run, general);
    }

    private void seedWaitingForCustomerTickets(SeedRun run) {
        OrderEntity pickupOrder = run.orders.get("PENDING_PICKUP_2");
        TicketDraft pickup = openTicket(run, "ORDER_PICKUP_ISSUE", TicketRefType.ORDER, pickupOrder.getId().toString(),
                "Quầy chưa giao vé cho tôi",
                "Tôi đã đến quầy nhưng chưa được giao vé của đơn " + pickupOrder.getOrderCode() + ".",
                null, run.hoursAgo(6));
        assign(run, pickup, run.hoursAgo(6).plusMinutes(10));
        operatorReply(run, pickup, "Anh/chị vui lòng cung cấp ảnh chụp mã đơn hàng và thời điểm đến quầy "
                + "để chúng tôi kiểm tra camera.", run.hoursAgo(5));
        finishTicket(run, pickup);

        RefundRequestEntity waitingRefund = run.refunds.get(RefundRequestStatus.WAITING_FOR_INFO).get(1);
        TicketDraft slow = openTicket(run, "REFUND_SLOW_PROCESSING", TicketRefType.REFUND_REQUEST,
                waitingRefund.getId().toString(),
                "Hoàn tiền bị treo nhiều ngày",
                "Yêu cầu hoàn tiền #" + waitingRefund.getId() + " của tôi chưa được xử lý xong.",
                null, run.hoursAgo(10));
        assign(run, slow, run.hoursAgo(9));
        operatorReply(run, slow, "Lần chuyển khoản trước thất bại do tên chủ tài khoản không khớp. "
                + "Anh/chị vui lòng cập nhật lại tài khoản ngân hàng trong yêu cầu hoàn tiền.", run.hoursAgo(8));
        finishTicket(run, slow);

        OrderEntity paid = run.orders.get("PAID_3");
        TicketDraft delay = openTicket(run, "ORDER_PREPARATION_DELAY", TicketRefType.ORDER, paid.getId().toString(),
                "Đơn đã thanh toán nhưng chưa được xử lý",
                "Đơn " + paid.getOrderCode() + " đã thanh toán từ sáng nhưng trạng thái chưa thay đổi.",
                null, run.minutesAgo(200));
        assign(run, delay, run.minutesAgo(190));
        operatorReply(run, delay, "Anh/chị muốn nhận vé vào khung giờ nào để cửa hàng ưu tiên chuẩn bị?",
                run.minutesAgo(180));
        finishTicket(run, delay);
    }

    private void seedResolvedTickets(SeedRun run) {
        OrderEntity completed = run.orders.get("COMPLETED_1");
        TicketDraft quality = openTicket(run, "ORDER_SERVICE_QUALITY", TicketRefType.ORDER, completed.getId().toString(),
                "Nhân viên quầy phục vụ chưa tốt",
                "Khi nhận vé cho đơn " + completed.getOrderCode() + " tôi phải chờ lâu và nhân viên thiếu niềm nở.",
                null, run.hoursAgo(5));
        assign(run, quality, run.hoursAgo(4));
        resolve(run, quality, "Đã ghi nhận góp ý, nhắc nhở nhân viên quầy và bổ sung người hỗ trợ giờ cao điểm.",
                run.hoursAgo(3));
        finishTicket(run, quality);

        RefundRequestEntity paidRefund = run.refunds.get(RefundRequestStatus.PAID).get(0);
        TicketDraft paidIssue = openTicket(run, "REFUND_PAID_ISSUE", TicketRefType.REFUND_REQUEST,
                paidRefund.getId().toString(),
                "Chưa nhận được tiền hoàn",
                "Yêu cầu hoàn tiền #" + paidRefund.getId() + " báo đã chuyển khoản nhưng tài khoản tôi chưa nhận được.",
                null, run.hoursAgo(70));
        assign(run, paidIssue, run.hoursAgo(69));
        operatorReply(run, paidIssue, "Anh/chị vui lòng gửi sao kê tài khoản trong ngày chuyển khoản để chúng tôi đối chiếu.",
                run.hoursAgo(68));
        customerReply(run, paidIssue, "Tôi đã kiểm tra lại, tiền về chậm do ngân hàng xử lý cuối tuần.", run.hoursAgo(40));
        resolve(run, paidIssue, "Ngân hàng đã ghi có khoản hoàn tiền; khách hàng xác nhận đã nhận đủ.", run.hoursAgo(20));
        finishTicket(run, paidIssue);

        TicketDraft general = openTicket(run, "GENERAL", null, null,
                "Không đăng nhập được trên điện thoại",
                "Ứng dụng báo phiên đăng nhập hết hạn liên tục trên điện thoại của tôi.",
                null, run.hoursAgo(30));
        assign(run, general, run.hoursAgo(29));
        resolve(run, general, "Đã hướng dẫn khách cập nhật ứng dụng và đăng nhập lại; lỗi không còn tái diễn.",
                run.hoursAgo(26));
        finishTicket(run, general);
    }

    private void seedRejectedTickets(SeedRun run) {
        OrderEntity preparing = run.orders.get("PREPARING_2");
        TicketDraft delay = openTicket(run, "ORDER_PREPARATION_DELAY", TicketRefType.ORDER, preparing.getId().toString(),
                "Đơn chuẩn bị chậm",
                "Đơn " + preparing.getOrderCode() + " đang chuẩn bị quá lâu so với dự kiến.",
                null, run.minutesAgo(150));
        assign(run, delay, run.minutesAgo(140));
        reject(run, delay, "Đơn hàng vẫn trong thời gian chuẩn bị đã cam kết và sẽ sẵn sàng trước giờ nhận vé anh/chị chọn.",
                run.minutesAgo(120));
        finishTicket(run, delay);

        RefundRequestEntity paidRefund = run.refunds.get(RefundRequestStatus.PAID).get(1);
        TicketDraft paidIssue = openTicket(run, "REFUND_PAID_ISSUE", TicketRefType.REFUND_REQUEST,
                paidRefund.getId().toString(),
                "Số tiền hoàn không đúng",
                "Tôi nghĩ số tiền hoàn cho yêu cầu #" + paidRefund.getId() + " bị thiếu.",
                null, run.hoursAgo(48));
        assign(run, paidIssue, run.hoursAgo(47));
        reject(run, paidIssue, "Số tiền đã hoàn đúng bằng tổng giá trị các vé trong đơn; sao kê ngân hàng xác nhận "
                + "giao dịch thành công.", run.hoursAgo(40));
        paidIssue.ticket.setCustomerLastViewedAt(run.hoursAgo(30));
        finishTicket(run, paidIssue);

        TicketDraft general = openTicket(run, "GENERAL", null, null,
                "Yêu cầu giữ vé qua ngày quay số",
                "Tôi muốn nhờ cửa hàng giữ vé giúp sau ngày quay số vì chưa sắp xếp được thời gian.",
                null, run.hoursAgo(80));
        assign(run, general, run.hoursAgo(79));
        reject(run, general, "Cửa hàng không hỗ trợ giữ vé sau thời điểm quay số theo quy định.", run.hoursAgo(76));
        general.ticket.setCustomerLastViewedAt(run.hoursAgo(70));
        finishTicket(run, general);
    }

    private void seedClosedTickets(SeedRun run) {
        OrderEntity completed = run.orders.get("COMPLETED_2");
        TicketDraft accepted = openTicket(run, "ORDER_SERVICE_QUALITY", TicketRefType.ORDER, completed.getId().toString(),
                "Quầy giao vé chậm",
                "Tôi phải chờ gần 30 phút mới nhận được vé của đơn " + completed.getOrderCode() + ".",
                null, run.hoursAgo(25));
        assign(run, accepted, run.hoursAgo(24));
        resolve(run, accepted, "Đã xin lỗi khách hàng và điều chỉnh quy trình soạn vé trước giờ hẹn nhận.",
                run.hoursAgo(22));
        accepted.ticket.setStatus(TicketStatus.CLOSED);
        systemComment(run, accepted, "Khách hàng hài lòng với phương án giải quyết. Ticket đã đóng.", run.hoursAgo(21));
        finishTicket(run, accepted);

        TicketDraft autoClosed = openTicket(run, "GENERAL", null, null,
                "Hướng dẫn xem kết quả xổ số",
                "Tôi muốn xem lại kết quả các kỳ trước trên ứng dụng thì vào mục nào?",
                null, run.hoursAgo(120));
        assign(run, autoClosed, run.hoursAgo(118));
        resolve(run, autoClosed, "Đã hướng dẫn khách xem kết quả tại mục Kết quả xổ số trên trang chủ.", run.hoursAgo(110));
        autoClosed.ticket.setStatus(TicketStatus.CLOSED);
        systemComment(run, autoClosed, "Ticket đã tự động đóng sau " + run.autoCloseHours
                + " giờ không có phản hồi từ khách hàng.", run.hoursAgo(110).plusHours(run.autoCloseHours));
        finishTicket(run, autoClosed);

        OrderEntity pickupOrder = run.orders.get("PENDING_PICKUP_3");
        TicketDraft cancelled = openTicket(run, "ORDER_PICKUP_ISSUE", TicketRefType.ORDER, pickupOrder.getId().toString(),
                "Chưa nhận được vé",
                "Tôi chưa nhận được vé của đơn " + pickupOrder.getOrderCode() + ".",
                null, run.hoursAgo(18));
        LocalDateTime closedAt = run.hoursAgo(17);
        cancelled.ticket.setStatus(TicketStatus.CLOSED);
        cancelled.ticket.setResolvedAt(closedAt);
        systemComment(run, cancelled, "Khách hàng đã huỷ khiếu nại", closedAt);
        finishTicket(run, cancelled);
    }

    private TicketDraft openTicket(SeedRun run, String categoryCode, TicketRefType refType, String refId,
                                   String title, String description, String attachmentUrl, LocalDateTime createdAt) {
        TicketCategoryEntity category = ticketCategoryRepository.findByCode(categoryCode)
                .orElseThrow(() -> new IllegalStateException("Missing ticket category " + categoryCode));
        SupportTicketEntity ticket = supportTicketRepository.save(SupportTicketEntity.builder()
                .ticketCategory(category)
                .customer(run.member)
                .title(title)
                .description(description)
                .attachmentUrl(attachmentUrl)
                .refId(refId)
                .refType(refType)
                .status(TicketStatus.OPEN)
                .dueAt(createdAt.plusHours(Math.max(category.getPriority(), 1) * 24L))
                .build());
        TicketDraft draft = new TicketDraft(ticket, category, createdAt);
        saveComment(run, draft, TicketCommentSenderRole.CUSTOMER, run.member, description, attachmentUrl, createdAt);
        return draft;
    }

    private void assign(SeedRun run, TicketDraft draft, LocalDateTime at) {
        draft.ticket.setStatus(TicketStatus.IN_PROGRESS);
        draft.ticket.setAssignedTo(run.operator);
        systemComment(run, draft, fullNameOf(run.operator) + " đã tiếp nhận yêu cầu "
                + draft.category.getName().trim().toLowerCase(Locale.ROOT), at);
    }

    private void operatorReply(SeedRun run, TicketDraft draft, String content, LocalDateTime at) {
        saveComment(run, draft, TicketCommentSenderRole.OPERATOR, run.operator, content, null, at);
        draft.ticket.setStatus(TicketStatus.WAITING_FOR_CUSTOMER);
    }

    private void customerReply(SeedRun run, TicketDraft draft, String content, LocalDateTime at) {
        saveComment(run, draft, TicketCommentSenderRole.CUSTOMER, run.member, content, null, at);
        if (draft.ticket.getStatus() == TicketStatus.WAITING_FOR_CUSTOMER) {
            draft.ticket.setStatus(TicketStatus.IN_PROGRESS);
        }
    }

    /** The resolution note is an internal SYSTEM comment referenced by {@code resolved_reason_id}. */
    private void resolve(SeedRun run, TicketDraft draft, String resolution, LocalDateTime at) {
        SupportTicketCommentEntity reason =
                saveComment(run, draft, TicketCommentSenderRole.SYSTEM, null, resolution, null, at);
        draft.ticket.setResponse(resolution);
        draft.ticket.setResolvedReasonId(reason.getId());
        draft.ticket.setRejectedReasonId(null);
        draft.ticket.setResolvedAt(at);
        draft.ticket.setStatus(TicketStatus.RESOLVED);
        systemComment(run, draft,
                "Khiếu nại đã được đánh dấu giải quyết. Vui lòng xác nhận bạn có hài lòng với phương án này.",
                at.plusSeconds(1));
    }

    /** The rejection reason is an OPERATOR comment referenced by {@code rejected_reason_id}. */
    private void reject(SeedRun run, TicketDraft draft, String rejectionReason, LocalDateTime at) {
        SupportTicketCommentEntity reason =
                saveComment(run, draft, TicketCommentSenderRole.OPERATOR, run.operator, rejectionReason, null, at);
        draft.ticket.setResponse(rejectionReason);
        draft.ticket.setRejectedReasonId(reason.getId());
        draft.ticket.setResolvedReasonId(null);
        draft.ticket.setResolvedAt(at);
        draft.ticket.setStatus(TicketStatus.REJECTED);
        systemComment(run, draft, "Ticket đã bị từ chối vì không hợp lệ hoặc không đủ điều kiện.", at.plusSeconds(1));
    }

    private void systemComment(SeedRun run, TicketDraft draft, String content, LocalDateTime at) {
        saveComment(run, draft, TicketCommentSenderRole.SYSTEM, null, content, null, at);
    }

    private SupportTicketCommentEntity saveComment(SeedRun run, TicketDraft draft, TicketCommentSenderRole role,
                                                   UserEntity sender, String content, String attachmentUrl,
                                                   LocalDateTime at) {
        SupportTicketCommentEntity comment = supportTicketCommentRepository.save(SupportTicketCommentEntity.builder()
                .supportTicket(draft.ticket)
                .sender(sender)
                .senderRole(role)
                .content(content)
                .attachmentUrl(attachmentUrl)
                .build());
        stamp(run, "support_ticket_comments", comment.getId(), at, at);
        draft.lastActivityAt = at;
        return comment;
    }

    private void finishTicket(SeedRun run, TicketDraft draft) {
        stamp(run, "support_tickets", draft.ticket.getId(), draft.createdAt, draft.lastActivityAt);
        run.ticketCount++;
    }

    // ---------------------------------------------------------------------------------------------
    // Order / ticket building blocks.
    // ---------------------------------------------------------------------------------------------

    /** Payment-timeout cancel: reservation released to stock, lines closed, gateway transaction cancelled. */
    private OrderEntity newTimedOutOrder(SeedRun run, String codeSuffix, OrderStatus status, int lines,
                                         LocalDateTime cancelledAt, LocalDateTime expectedPickupAt) {
        OrderEntity order = newOrder(run, codeSuffix, status,
                createSerials(run, lines, LotteryTicketSerialStatus.IN_STOCK), OrderDetailStatus.CANCELLED,
                expectedPickupAt);
        order.setCancelledAt(cancelledAt);
        order.setCancelType(OrderCancelType.SYSTEM_PAYMENT_TIMEOUT);
        order.setCancelReason(run.timeoutCancelReason);
        addPayment(order, TransactionStatus.CANCELLED, null, cancelledAt, run.timeoutCancelReason);
        return order;
    }

    /** Paid online order: serials consumed (SOLD), PayOS transaction completed. */
    private OrderEntity newPaidOrder(SeedRun run, String codeSuffix, OrderStatus status, int lines,
                                     OrderDetailStatus detailStatus, LocalDateTime paidAt,
                                     LocalDateTime expectedPickupAt) {
        OrderEntity order = newOrder(run, codeSuffix, status,
                createSerials(run, lines, LotteryTicketSerialStatus.SOLD), detailStatus, expectedPickupAt);
        addPayment(order, TransactionStatus.COMPLETED, paidAt, null, null);
        return order;
    }

    private OrderEntity newOrder(SeedRun run, String codeSuffix, OrderStatus status,
                                 List<LotteryTicketSerialEntity> serials, OrderDetailStatus detailStatus,
                                 LocalDateTime expectedPickupAt) {
        BigDecimal price = run.price();
        OrderEntity order = OrderEntity.builder()
                .user(run.member)
                .name(fullNameOf(run.member))
                .phone(phoneOf(run.member))
                .email(run.member.getEmail())
                .orderCode(ORDER_CODE_PREFIX + codeSuffix)
                .orderType(OrderType.ONLINE)
                .receiveType(OrderReceiveType.COUNTER_PICKUP)
                .totalAmount(price.multiply(BigDecimal.valueOf(serials.size())))
                .status(status)
                .expectedPickupAt(expectedPickupAt)
                .transactions(new ArrayList<>())
                .build();
        List<OrderDetailEntity> details = new ArrayList<>(serials.size());
        for (LotteryTicketSerialEntity serial : serials) {
            details.add(OrderDetailEntity.builder()
                    .order(order)
                    .lotteryTicket(serial.getTicket())
                    .lotteryTicketSerial(serial)
                    .quantity(1)
                    .price(price)
                    .status(detailStatus)
                    .build());
        }
        order.setOrderDetails(details);
        return order;
    }

    private void addPayment(OrderEntity order, TransactionStatus status, LocalDateTime paidAt,
                            LocalDateTime cancelledAt, String note) {
        order.getTransactions().add(TransactionEntity.builder()
                .order(order)
                .amount(order.getTotalAmount())
                .type(TransactionType.ONLINE)
                .transactionType(TransactionBusinessType.ORDER_PAYMENT)
                .gateway(PaymentGateway.PAYOS)
                .paymentRef(status == TransactionStatus.COMPLETED ? "PAYOS-" + order.getOrderCode() : null)
                .status(status)
                .paidAt(paidAt)
                .cancelledAt(cancelledAt)
                .note(note)
                .build());
    }

    private void persistOrder(SeedRun run, OrderEntity order, LocalDateTime createdAt, LocalDateTime updatedAt,
                              LocalDateTime detailUpdatedAt) {
        orderRepository.save(order);
        stamp(run, "orders", order.getId(), createdAt, updatedAt);
        for (OrderDetailEntity detail : order.getOrderDetails()) {
            stamp(run, "order_details", detail.getId(), createdAt, detailUpdatedAt);
        }
        for (TransactionEntity transaction : order.getTransactions()) {
            LocalDateTime settledAt = transaction.getPaidAt() != null ? transaction.getPaidAt() : transaction.getCancelledAt();
            stamp(run, "transactions", transaction.getId(), createdAt, settledAt != null ? settledAt : createdAt);
        }
        run.orderCount++;
    }

    private List<LotteryTicketSerialEntity> createSerials(SeedRun run, int count, LotteryTicketSerialStatus status) {
        List<LotteryTicketSerialEntity> serials = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            serials.add(createSerial(run, status));
        }
        return serials;
    }

    /** One lottery number per serial, so the ticket aggregate status follows that serial directly. */
    private LotteryTicketSerialEntity createSerial(SeedRun run, LotteryTicketSerialStatus status) {
        run.serialSeq++;
        String serialNumber = SERIAL_PREFIX + String.format("%03d", run.serialSeq);
        String ticketImg = image(serialNumber, 800, 500);
        LotteryTicketEntity ticket = lotteryTicketRepository.save(LotteryTicketEntity.builder()
                .station(run.station)
                .ticketImg(ticketImg)
                .numbers(nextFreeNumbers(run))
                .drawDate(run.drawDate)
                .batchCode(run.importLine.getBatchCode())
                .quantity(1)
                .priceSnapshot(run.price())
                .status(status == LotteryTicketSerialStatus.SOLD ? LotteryTicketStatus.SOLD_OUT : LotteryTicketStatus.IN_STOCK)
                .importedBy(run.operator)
                .importedAt(run.importedAt())
                .verified(true)
                .verifiedBy(run.operator)
                .verifiedAt(run.importedAt().plusMinutes(20))
                .createdBy(SEED_ACTOR)
                .lastModifiedBy(SEED_ACTOR)
                .build());
        return lotteryTicketSerialRepository.save(LotteryTicketSerialEntity.builder()
                .ticket(ticket)
                .stationId(run.station.getId())
                .drawDate(run.drawDate)
                .ticketImg(ticketImg)
                .serialNumber(serialNumber)
                .status(status)
                .ticketCondition(TicketCondition.GOOD)
                .inputSource(InputSource.MANUAL)
                .importBatch(run.importBatch)
                .importBatchLine(run.importLine)
                .importedBy(run.operator)
                .importedAt(run.importedAt())
                .verified(true)
                .verifiedBy(run.operator)
                .verifiedAt(run.importedAt().plusMinutes(20))
                .createdBy(SEED_ACTOR)
                .lastModifiedBy(SEED_ACTOR)
                .build());
    }

    private String nextFreeNumbers(SeedRun run) {
        while (true) {
            run.numberSeq++;
            String numbers = String.format("%06d", Math.floorMod(318_000 + run.numberSeq * 7_919, 1_000_000));
            if (lotteryTicketRepository.findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
                    run.station.getId(), numbers, run.drawDate).isEmpty()) {
                return numbers;
            }
        }
    }

    private void createImportDocuments(SeedRun run, LotterySupplierEntity supplier) {
        LocalDateTime importedAt = run.importedAt();
        run.importBatch = importBatchRepository.save(ImportBatchEntity.builder()
                .batchCode(SeedDocumentCodes.importHeader(run.drawDate, IMPORT_SEQUENCE))
                .drawDate(run.drawDate)
                .supplier(supplier)
                .importMode(ImportBatchImportMode.IN_DAY)
                .importedBy(run.operator)
                .importedAt(importedAt)
                .completedAt(importedAt)
                .status(ImportBatchStatus.IMPORTED)
                .lineCount(1)
                .note(IMPORT_NOTE_PREFIX + run.drawDate)
                .createdBy(SEED_ACTOR)
                .lastModifiedBy(SEED_ACTOR)
                .build());
        run.importLine = importBatchLineRepository.save(ImportBatchLineEntity.builder()
                .importBatch(run.importBatch)
                .lotteryStation(run.station)
                .batchType(ImportBatchType.NEW)
                .batchCode(SeedDocumentCodes.importLine(run.drawDate, run.station.getName(), ImportBatchType.NEW,
                        IMPORT_SEQUENCE))
                .declareQuantity(0)
                .totalQuantity(0)
                .importCost(run.price())
                .status(ImportBatchLineStatus.IMPORTED)
                .importedAt(importedAt)
                .createdBy(SEED_ACTOR)
                .lastModifiedBy(SEED_ACTOR)
                .build());
    }

    private void finishImportDocuments(SeedRun run) {
        int quantity = run.serialSeq;
        BigDecimal costValue = run.price().multiply(BigDecimal.valueOf(quantity));
        run.importLine.setDeclareQuantity(quantity);
        run.importLine.setTotalQuantity(quantity);
        run.importLine.setDeclaredCostValue(costValue);
        run.importLine.setTotalCostValue(costValue);
        run.importBatch.setTotalDeclareQuantity(quantity);
        run.importBatch.setTotalDeclaredCostValue(costValue);
        run.importBatch.setTotalImportedQuantity(quantity);
        run.importBatch.setTotalImportedCostValue(costValue);
    }

    private UserBankAccountEntity resolveBankAccount(SeedRun run) {
        List<UserBankAccountEntity> accounts =
                userBankAccountRepository.findByUser_IdOrderByIsDefaultDescCreatedAtAsc(run.member.getId());
        if (!accounts.isEmpty()) {
            return accounts.get(0);
        }
        return userBankAccountRepository.save(UserBankAccountEntity.builder()
                .user(run.member)
                .bankName("Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)")
                .bankBin(SEED_BANK_BIN)
                .bankAccountNo(SEED_BANK_ACCOUNT_NO)
                .bankAccountName(stripAccents(fullNameOf(run.member)).toUpperCase(Locale.ROOT))
                .isDefault(true)
                .build());
    }

    // ---------------------------------------------------------------------------------------------
    // Cleanup, audit stamping and lookups.
    // ---------------------------------------------------------------------------------------------

    /** Removes only seeder-owned rows, children before parents (FKs are not ON DELETE CASCADE). */
    private void resetPreviousSeedData() {
        List<UUID> orderIds = queryUuids("SELECT id FROM orders WHERE order_code LIKE :prefix",
                ORDER_CODE_PREFIX + "%");
        List<Long> refundIds = orderIds.isEmpty() ? List.of() : refundRequestRepository.findIdsLinkedToOrderIdIn(orderIds);
        List<Long> ticketIds = queryLongs("SELECT id FROM support_tickets WHERE created_by = :prefix", SEED_ACTOR);
        List<Long> serialIds = queryLongs("SELECT id FROM lottery_ticket_serials WHERE serial_number LIKE :prefix",
                SERIAL_PREFIX + "%");
        List<Long> lotteryTicketIds = queryLongs(
                "SELECT DISTINCT ticket_id FROM lottery_ticket_serials WHERE serial_number LIKE :prefix",
                SERIAL_PREFIX + "%");
        List<Long> importBatchIds = queryLongs("SELECT id FROM import_batches WHERE note LIKE :prefix",
                IMPORT_NOTE_PREFIX + "%");

        execute("UPDATE support_tickets SET resolved_reason_id = NULL, rejected_reason_id = NULL WHERE id IN (:ids)",
                ticketIds);
        execute("DELETE FROM support_ticket_comments WHERE support_ticket_id IN (:ids)", ticketIds);
        execute("DELETE FROM support_tickets WHERE id IN (:ids)", ticketIds);

        if (!orderIds.isEmpty()) {
            lotterySerialSeedCleanup.clearPayoutDependentsForOrderCodePrefix(ORDER_CODE_PREFIX);
        }
        if (!serialIds.isEmpty()) {
            lotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(serialIds);
        }
        execute("UPDATE daily_sales_report_details SET order_detail_id = NULL WHERE order_detail_id IN "
                + "(SELECT id FROM order_details WHERE order_id IN (:ids))", orderIds);
        execute("DELETE FROM transactions WHERE order_id IN (:ids)", orderIds);
        execute("DELETE FROM transactions WHERE refund_request_id IN (:ids)", refundIds);
        execute("DELETE FROM order_details WHERE order_id IN (:ids)", orderIds);
        execute("UPDATE order_details SET refund_request_id = NULL WHERE refund_request_id IN (:ids)", refundIds);
        execute("DELETE FROM refund_requests WHERE id IN (:ids)", refundIds);
        execute("DELETE FROM orders WHERE id IN (:ids)", orderIds);
        execute("DELETE FROM lottery_ticket_serials WHERE id IN (:ids)", serialIds);
        execute("""
                DELETE FROM lottery_tickets t
                 WHERE t.id IN (:ids)
                   AND NOT EXISTS (SELECT 1 FROM lottery_ticket_serials s WHERE s.ticket_id = t.id)
                   AND NOT EXISTS (SELECT 1 FROM order_details od WHERE od.lottery_ticket_id = t.id)
                   AND NOT EXISTS (SELECT 1 FROM agent_ticket_stocks a WHERE a.lottery_ticket_id = t.id)
                """, lotteryTicketIds);
        execute("""
                DELETE FROM import_batch_lines l
                 WHERE l.import_batch_id IN (:ids)
                   AND NOT EXISTS (SELECT 1 FROM lottery_ticket_serials s WHERE s.import_batch_line_id = l.id)
                """, importBatchIds);
        execute("""
                DELETE FROM import_batches b
                 WHERE b.id IN (:ids)
                   AND NOT EXISTS (SELECT 1 FROM import_batch_lines l WHERE l.import_batch_id = b.id)
                   AND NOT EXISTS (SELECT 1 FROM lottery_ticket_serials s WHERE s.import_batch_id = b.id)
                """, importBatchIds);

        if (!orderIds.isEmpty() || !ticketIds.isEmpty()) {
            log.info("Removed previous member status seed: {} orders, {} refund requests, {} support tickets.",
                    orderIds.size(), refundIds.size(), ticketIds.size());
        }
    }

    /**
     * JPA auditing overwrites created/updated timestamps on insert, so the scenario timeline is
     * written afterwards. {@code created_by} doubles as the ownership marker used by the cleanup.
     */
    private void applyAuditStamps(SeedRun run) {
        for (AuditStamp stamp : run.stamps) {
            entityManager.createNativeQuery("UPDATE " + stamp.table()
                            + " SET created_at = :createdAt, updated_at = :updatedAt,"
                            + " created_by = :actor, last_modified_by = :actor WHERE id = :id")
                    .setParameter("createdAt", stamp.createdAt())
                    .setParameter("updatedAt", stamp.updatedAt())
                    .setParameter("actor", SEED_ACTOR)
                    .setParameter("id", stamp.id())
                    .executeUpdate();
        }
    }

    private void stamp(SeedRun run, String table, Object id, LocalDateTime createdAt, LocalDateTime updatedAt) {
        run.stamps.add(new AuditStamp(table, id, createdAt, updatedAt));
    }

    private int execute(String sql, Collection<?> ids) {
        if (ids.isEmpty()) {
            return 0;
        }
        return entityManager.createNativeQuery(sql).setParameter("ids", ids).executeUpdate();
    }

    @SuppressWarnings("unchecked")
    private List<Long> queryLongs(String sql, String prefix) {
        List<Object> rows = entityManager.createNativeQuery(sql).setParameter("prefix", prefix).getResultList();
        return rows.stream().filter(Objects::nonNull).map(row -> ((Number) row).longValue()).toList();
    }

    @SuppressWarnings("unchecked")
    private List<UUID> queryUuids(String sql, String prefix) {
        List<Object> rows = entityManager.createNativeQuery(sql).setParameter("prefix", prefix).getResultList();
        return rows.stream()
                .filter(Objects::nonNull)
                .map(row -> row instanceof UUID uuid ? uuid : UUID.fromString(row.toString()))
                .toList();
    }

    private LotterySupplierEntity resolveSupplier() {
        return lotterySupplierRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(SharedSeedConstants.SUPPLIER_MINH_CHINH_CODE)
                .or(() -> lotterySupplierRepository.findByIsActiveTrueAndDeletedAtIsNull().stream().findFirst())
                .orElse(null);
    }

    /** Prefers a canonical southern station drawing tomorrow, so seeded tickets are not expired. */
    private LotteryStationEntity resolveStation(LocalDate today) {
        List<LotteryStationEntity> candidates = lotteryStationRepository.findAll().stream()
                .filter(station -> station.getDeletedAt() == null)
                .filter(LotteryStationEntity::isActive)
                .filter(station -> station.getDrawDays() != null && !station.getDrawDays().isEmpty())
                .sorted(Comparator
                        .comparing((LotteryStationEntity station) -> !SouthernStationSeedSupport.isCanonicalSouthern(station))
                        .thenComparing(station -> nextDrawDate(station, today))
                        .thenComparing(station -> station.getName() != null ? station.getName() : "",
                                String.CASE_INSENSITIVE_ORDER))
                .toList();
        return candidates.isEmpty() ? null : candidates.get(0);
    }

    private static LocalDate nextDrawDate(LotteryStationEntity station, LocalDate today) {
        for (int offset = 1; offset <= 7; offset++) {
            LocalDate candidate = today.plusDays(offset);
            if (station.getDrawDays().contains(candidate.getDayOfWeek())) {
                return candidate;
            }
        }
        return today.plusDays(7);
    }

    private int readPositiveInt(SystemConfigEnum configEnum) {
        int fallback = Integer.parseInt(configEnum.getDefaultValue());
        return systemConfigRepositoryPort.findActiveByConfigKey(configEnum.name())
                .map(SystemConfigModel::getConfigValue)
                .map(raw -> {
                    try {
                        int value = Integer.parseInt(raw.trim());
                        return value > 0 ? value : fallback;
                    } catch (NumberFormatException ex) {
                        return fallback;
                    }
                })
                .orElse(fallback);
    }

    private static LocalDateTime pickupSlot(SeedRun run, int slot) {
        LocalDateTime pickup = run.drawDate.atTime(9, 0).plusMinutes(30L * slot);
        LocalTime drawTime = run.station.getDrawTime();
        LocalDateTime latest = drawTime != null ? run.drawDate.atTime(drawTime).minusMinutes(30) : null;
        return latest != null && pickup.isAfter(latest) ? latest : pickup;
    }

    private static String image(String key, int width, int height) {
        return IMAGE_BASE_URL + "phu123-" + key + "/" + width + "/" + height;
    }

    private static String fullNameOf(UserEntity user) {
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";
        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String fullName = (lastName + " " + firstName).trim();
        return fullName.isBlank() ? user.getUsername() : fullName;
    }

    private static String phoneOf(UserEntity user) {
        String phone = user.getPhone() != null ? user.getPhone().trim() : "";
        return phone.isBlank() ? DEFAULT_PHONE : phone;
    }

    private static String stripAccents(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
    }

    private record RefundSpec(
            String code,
            RefundRequestStatus status,
            RefundRequestRole role,
            OrderCancelType cancelType,
            String reason,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int retryCount,
            String operatorNote,
            boolean withBankAccount,
            int lines
    ) {
    }

    private record AuditStamp(String table, Object id, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    private static final class TicketDraft {
        private final SupportTicketEntity ticket;
        private final TicketCategoryEntity category;
        private final LocalDateTime createdAt;
        private LocalDateTime lastActivityAt;

        private TicketDraft(SupportTicketEntity ticket, TicketCategoryEntity category, LocalDateTime createdAt) {
            this.ticket = ticket;
            this.category = category;
            this.createdAt = createdAt;
            this.lastActivityAt = createdAt;
        }
    }

    private static final class SeedRun {
        private final LocalDateTime now;
        private final UserEntity member;
        private final UserEntity operator;
        private final LotteryStationEntity station;
        private final int paymentTimeoutMinutes;
        private final String timeoutCancelReason;
        private final int maxBankInfoRetry;
        private final int autoCloseHours;
        private final List<AuditStamp> stamps = new ArrayList<>();
        private final Map<String, OrderEntity> orders = new java.util.HashMap<>();
        private final Map<RefundRequestStatus, List<RefundRequestEntity>> refunds =
                new EnumMap<>(RefundRequestStatus.class);
        private LocalDate drawDate;
        private UserBankAccountEntity bankAccount;
        private ImportBatchEntity importBatch;
        private ImportBatchLineEntity importLine;
        private int serialSeq;
        private int numberSeq;
        private int orderCount;
        private int refundCount;
        private int ticketCount;

        private SeedRun(LocalDateTime now, UserEntity member, UserEntity operator, LotteryStationEntity station,
                        int paymentTimeoutMinutes, String timeoutCancelReason, int maxBankInfoRetry,
                        int autoCloseHours) {
            this.now = now;
            this.member = member;
            this.operator = operator;
            this.station = station;
            this.paymentTimeoutMinutes = paymentTimeoutMinutes;
            this.timeoutCancelReason = timeoutCancelReason;
            this.maxBankInfoRetry = maxBankInfoRetry;
            this.autoCloseHours = autoCloseHours;
        }

        private BigDecimal price() {
            return station.getPrice() != null ? station.getPrice() : DEFAULT_TICKET_PRICE;
        }

        /** Stock arrives before the oldest seeded order (about 8 days back). */
        private LocalDateTime importedAt() {
            return now.minusHours(204);
        }

        private LocalDateTime minutesAgo(long minutes) {
            return now.minusMinutes(minutes);
        }

        private LocalDateTime hoursAgo(long hours) {
            return now.minusHours(hours);
        }
    }
}

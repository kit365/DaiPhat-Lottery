package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.TicketCategoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.RefundRequestRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.UserBankAccountRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.SupportTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.TicketCategoryRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/** Completes active refund and support status coverage using actual demo orders. */
@Component
@Order(126)
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoAfterSalesSeedInitializer implements ApplicationRunner {

    private static final String ACTOR = "official-demo-seed";
    private static final String REFUND_REASON = "Khách hàng yêu cầu hủy đơn trước ngày quay và hoàn tiền.";
    private static final List<RefundRequestStatus> REFUND_STATUSES = List.of(
            RefundRequestStatus.WAITING_FOR_INFO,
            RefundRequestStatus.READY_TO_PAY,
            RefundRequestStatus.PAID,
            RefundRequestStatus.MANUAL_RESOLUTION
    );

    private final SeedAccountResolver accountResolver;
    private final OrderRepository orderRepository;
    private final RefundRequestRepository refundRepository;
    private final UserBankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final TicketCategoryRepository categoryRepository;
    private final EntityManager entityManager;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        clearPreviousAfterSales();
        LocalDateTime now = LocalDateTime.now(clock);
        TicketCategoryEntity category = categoryRepository.findByCode("ORDER_ISSUE")
                .orElseThrow(() -> new IllegalStateException("Missing ORDER_ISSUE support category"));
        for (int memberIndex = 0; memberIndex < 3; memberIndex++) {
            UserEntity member = accountResolver.findOfficialDemoMember(memberIndex);
            UserEntity staff = accountResolver.findOfficialDemoStaff(2);
            if (member == null || staff == null) {
                throw new IllegalStateException("Missing official-demo member or staff");
            }
            List<OrderEntity> memberOrders = orderRepository.findAll().stream()
                    .filter(order -> order.getUser() != null && member.getId().equals(order.getUser().getId()))
                    .filter(order -> order.getOrderCode() != null
                            && order.getOrderCode().matches("ORD-\\d{8}-DO\\d{6}"))
                    .sorted(Comparator.comparing(OrderEntity::getOrderCode))
                    .toList();
            if (memberOrders.size() != 28) {
                log.info("Deferring after-sales matrix for {}: {} of 28 lifecycle orders available.",
                        member.getUsername(), memberOrders.size());
                continue;
            }
            List<OrderEntity> cancelled = memberOrders.stream()
                    .filter(order -> order.getStatus() == OrderStatus.CANCELLED)
                    .toList();
            if (cancelled.size() != REFUND_STATUSES.size()) {
                throw new IllegalStateException("Expected four cancelled orders for " + member.getUsername());
            }
            UserBankAccountEntity bank = bankAccountRepository
                    .findByUser_IdOrderByIsDefaultDescCreatedAtAsc(member.getId()).stream()
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Missing member bank account"));
            for (int i = 0; i < REFUND_STATUSES.size(); i++) {
                seedRefund(member, staff, cancelled.get(i), bank, REFUND_STATUSES.get(i), now);
            }
            seedSupportTickets(member, staff, category, memberOrders, now);
        }
        log.info("Official-demo after-sales seed finished.");
    }

    void clearPreviousAfterSales() {
        List<SupportTicketEntity> oldTickets = supportTicketRepository.findAll().stream()
                .filter(ticket -> ticket.getTitle() != null
                        && ticket.getTitle().startsWith("Hỗ trợ đơn ORD-"))
                .filter(ticket -> isDemoCustomer(ticket.getCustomer()))
                .toList();
        supportTicketRepository.deleteAll(oldTickets);

        List<RefundRequestEntity> oldRefunds = refundRepository.findAll().stream()
                .filter(refund -> REFUND_REASON.equals(refund.getRefundReason()))
                .filter(refund -> isDemoCustomer(refund.getRequestedBy()))
                .toList();
        if (oldRefunds.isEmpty()) {
            return;
        }
        List<Long> refundIds = oldRefunds.stream().map(RefundRequestEntity::getId).toList();
        transactionRepository.deleteAll(transactionRepository.findAll().stream()
                .filter(transaction -> transaction.getRefundRequest() != null
                        && refundIds.contains(transaction.getRefundRequest().getId()))
                .toList());
        entityManager.createNativeQuery("""
                UPDATE order_details SET refund_request_id = NULL
                WHERE refund_request_id IN (:refundIds)
                """).setParameter("refundIds", refundIds).executeUpdate();
        entityManager.flush();
        refundRepository.deleteAll(oldRefunds);
        refundRepository.flush();
    }

    private boolean isDemoCustomer(UserEntity user) {
        return user != null && java.util.stream.IntStream.range(0, 3)
                .mapToObj(accountResolver::findOfficialDemoMember)
                .filter(java.util.Objects::nonNull)
                .anyMatch(member -> member.getId().equals(user.getId()));
    }

    private void seedRefund(UserEntity member, UserEntity staff, OrderEntity order,
                            UserBankAccountEntity bank, RefundRequestStatus status,
                            LocalDateTime now) {
        boolean paid = status == RefundRequestStatus.PAID;
        boolean waitingForInfo = status == RefundRequestStatus.WAITING_FOR_INFO;
        RefundRequestEntity refund = refundRepository.save(RefundRequestEntity.builder()
                .refundType(RefundType.FULL_ORDER)
                .requestedBy(member)
                .requestRole(RefundRequestRole.CUSTOMER)
                .refundAmount(order.getTotalAmount())
                .refundReason(REFUND_REASON)
                .bankAccount(waitingForInfo ? null : bank)
                .status(status)
                .fundSource(RefundFundSource.COMPANY_FUND)
                .reimburseStatus(ReimburseStatus.NONE)
                .attemptNumber(1)
                .retryCount(status == RefundRequestStatus.MANUAL_RESOLUTION ? 3 : 0)
                .operatorNote(status == RefundRequestStatus.MANUAL_RESOLUTION
                        ? "Cần nhân viên kiểm tra sau nhiều lần chuyển khoản không thành công." : null)
                .reviewedBy(waitingForInfo ? null : staff)
                .reviewedAt(waitingForInfo ? null : now)
                .createdAt(now.minusMinutes(1))
                .updatedAt(now)
                .createdBy(ACTOR)
                .lastModifiedBy(ACTOR)
                .build());
        for (OrderDetailEntity detail : order.getOrderDetails()) {
            detail.setRefundRequest(refund);
            detail.setStatus(paid ? OrderDetailStatus.REFUNDED : OrderDetailStatus.REFUND_PENDING);
            detail.setLastModifiedBy(ACTOR);
        }
        orderRepository.save(order);
        if (paid) {
            transactionRepository.save(TransactionEntity.builder()
                    .refundRequest(refund)
                    .businessDate(now.toLocalDate())
                    .transactionType(TransactionBusinessType.ORDER_REFUND)
                    .amount(refund.getRefundAmount())
                    .type(TransactionType.REFUND)
                    .status(TransactionStatus.COMPLETED)
                    .paidAt(now)
                    .paymentBy(staff)
                    .paymentEvidenceUrl("https://placehold.co/800x600/png?text=Bien+lai+hoan+tien")
                    .note("Đã hoàn tiền vào tài khoản đã xác minh của khách hàng.")
                    .createdAt(now)
                    .updatedAt(now)
                    .createdBy(ACTOR)
                    .lastModifiedBy(ACTOR)
                    .build());
        }
    }

    private void seedSupportTickets(UserEntity member, UserEntity staff,
                                    TicketCategoryEntity category, List<OrderEntity> orders,
                                    LocalDateTime now) {
        for (TicketStatus status : TicketStatus.values()) {
            OrderEntity order = orders.stream()
                    .filter(candidate -> switch (status) {
                        case OPEN -> candidate.getStatus() == OrderStatus.PENDING_PICKUP;
                        case IN_PROGRESS, WAITING_FOR_CUSTOMER -> candidate.getStatus() == OrderStatus.PREPARING;
                        case RESOLVED, REJECTED, CLOSED -> candidate.getStatus() == OrderStatus.COMPLETED;
                    })
                    .findFirst()
                    .orElseThrow();
            boolean assigned = status != TicketStatus.OPEN;
            boolean resolved = status == TicketStatus.RESOLVED
                    || status == TicketStatus.REJECTED || status == TicketStatus.CLOSED;
            supportTicketRepository.save(SupportTicketEntity.builder()
                    .ticketCategory(category)
                    .customer(member)
                    .assignedTo(assigned ? staff : null)
                    .title("Hỗ trợ đơn " + order.getOrderCode() + " — " + status.getLabel())
                    .description("Khách hàng cần hỗ trợ về tiến độ xử lý và bàn giao vé của đơn "
                            + order.getOrderCode() + ".")
                    .refId(order.getId().toString())
                    .refType(TicketRefType.ORDER)
                    .status(status)
                    .response(assigned
                            ? "Nhân viên đã kiểm tra đơn và phản hồi cho khách hàng qua hệ thống." : null)
                    .resolvedAt(resolved ? now.minusMinutes(1) : null)
                    .dueAt(now.plusDays(1))
                    .createdAt(now.minusMinutes(5))
                    .updatedAt(now)
                    .createdBy(ACTOR)
                    .lastModifiedBy(ACTOR)
                    .build());
        }
    }
}

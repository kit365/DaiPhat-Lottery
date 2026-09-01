package com.daiphat.coreapi.application.service.admin;

import com.daiphat.coreapi.application.dto.response.admin.AdminDashboardBadgeResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.port.in.admin.AdminDashboardBadgeServicePort;
import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionLineRepository;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardBadgeService implements AdminDashboardBadgeServicePort {

    private static final List<TicketStatus> OPEN_SUPPORT_STATUSES = List.of(
            TicketStatus.OPEN,
            TicketStatus.IN_PROGRESS,
            TicketStatus.WAITING_FOR_CUSTOMER
    );

    private static final List<ReturnBatchStatus> ACTIVE_RETURN_BATCH_STATUSES = List.of(
            ReturnBatchStatus.PENDING_INSPECTION,
            ReturnBatchStatus.INSPECTING,
            ReturnBatchStatus.PENDING_HANDOVER
    );

    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final SupportTicketRepositoryPort supportTicketRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final ConversationServicePort conversationServicePort;
    private final NotificationRepositoryPort notificationRepositoryPort;
    private final PrizeClaimSubmissionLineRepository prizeClaimSubmissionLineRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardBadgeResponse getBadgeCounts(UUID userId) {
        return AdminDashboardBadgeResponse.builder()
                .refundPending(canViewRefund() ? countPendingRefunds() : null)
                .prizePayoutPending(canViewPrizePayout() ? countPrizePayoutPending() : null)
                .supportTicketOpen(canViewSupportTicket() ? countOpenSupportTickets() : null)
                .returnBatchPending(canViewReturnBatch() ? countActiveReturnBatches() : null)
                .ordersPreparing(canViewOrders() ? countPreparingOrders() : null)
                .chatAttention(canViewChat() ? countChatAttention(userId) : null)
                .notificationUnread(countNotificationUnread(userId))
                .prizeClaimOutcomePending(canViewPrizePayout() ? countPrizeClaimOutcomePending() : null)
                .build();
    }

    private long countPendingRefunds() {
        long all = refundRequestRepositoryPort.countAll(null, null, null, null, null);
        long paid = refundRequestRepositoryPort.countByStatus(RefundRequestStatus.PAID, null, null, null);
        long transferred = refundRequestRepositoryPort.countByStatus(RefundRequestStatus.TRANSFERRED, null, null, null);
        return Math.max(0L, all - paid - transferred);
    }

    private long countPrizePayoutPending() {
        return prizePayoutRequestRepositoryPort.countByStatus(
                PrizePayoutRequestStatus.PENDING,
                null,
                null
        );
    }

    private long countOpenSupportTickets() {
        return supportTicketRepositoryPort.findAllForStaff(
                PageRequest.of(0, 1),
                OPEN_SUPPORT_STATUSES,
                null,
                null,
                null,
                null,
                null
        ).getTotalElements();
    }

    private long countActiveReturnBatches() {
        return returnBatchRepositoryPort.findByStatuses(ACTIVE_RETURN_BATCH_STATUSES).size();
    }

    private long countPreparingOrders() {
        return orderRepositoryPort.countOrdersByStatus(
                OrderStatus.PREPARING,
                null,
                null,
                null,
                null,
                null
        );
    }

    private long countChatAttention(UUID userId) {
        List<ConversationResponse> conversations = conversationServicePort.getManagementConversations(userId);
        return conversations.stream()
                .filter(conversation ->
                        conversation.status() == ConversationStatus.WAITING_FOR_OPERATOR
                                || (conversation.unreadCount() != null && conversation.unreadCount() > 0))
                .count();
    }

    private long countNotificationUnread(UUID userId) {
        return notificationRepositoryPort.countUnreadByUserId(userId);
    }

    private long countPrizeClaimOutcomePending() {
        return prizeClaimSubmissionLineRepository.countSubmissionsWithPendingOutcome();
    }

    private boolean canViewRefund() {
        return hasAnyAuthority("refund:view");
    }

    private boolean canViewPrizePayout() {
        return hasAnyAuthority("prizePayout:view");
    }

    private boolean canViewSupportTicket() {
        return hasAnyAuthority("supportTicket:view", "admin:view");
    }

    private boolean canViewReturnBatch() {
        return hasAnyAuthority("importBatch:view", "supplier:view");
    }

    private boolean canViewOrders() {
        return hasAnyAuthority("order:view");
    }

    private boolean canViewChat() {
        return hasAnyAuthority("chat:view", "ROLE_ADMIN");
    }

    private boolean hasAnyAuthority(String... requiredAuthorities) {
        Set<String> granted = currentAuthorities();
        if (granted.contains(RoleConstants.ADMIN)) {
            return true;
        }
        return Arrays.stream(requiredAuthorities).anyMatch(granted::contains);
    }

    private Set<String> currentAuthorities() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return Set.of();
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }
}

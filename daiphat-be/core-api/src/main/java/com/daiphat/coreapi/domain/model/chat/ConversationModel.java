package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.LastMessageFrom;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import lombok.*;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationModel {

    public static final List<ConversationStatus> CUSTOMER_SILENCE_STATUSES = List.of(
            ConversationStatus.WAITING_FOR_CUSTOMER,
            ConversationStatus.ACTIVE
    );

    public static final List<LastMessageFrom> STAFF_OR_BOT_LAST_SENDERS = List.of(
            LastMessageFrom.STAFF,
            LastMessageFrom.BOT
    );

    public static final List<ConversationStatus> STAFF_RESPONSE_SLA_STATUSES = List.of(
            ConversationStatus.ACTIVE,
            ConversationStatus.WAITING_FOR_OPERATOR
    );

    private Long id;
    private String title;

    @Builder.Default
    private ConversationStatus status = ConversationStatus.OPEN;

    private UUID customerId;
    private UUID assignedOperatorId;
    private LocalDateTime customerLastReadAt;
    private LocalDateTime operatorLastReadAt;
    private LastMessageFrom lastMessageFrom;
    private LocalDateTime lastMessageAt;
    private UUID closedBy;
    private ConversationCloseReason closeReason;
    private LocalDateTime autoCloseWarningSentAt;
    private UUID lastAssignedOperatorId;
    private EscalationReason escalationReason;
    private LocalDateTime escalatedAt;
    private String handoffSummary;

    @Builder.Default
    private List<PendingFlowState> activeFlows = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void initializeForCreate() {
        if (status == null) {
            status = ConversationStatus.OPEN;
        }
        normalizeTitle();
    }

    public void activate() {
        status = ConversationStatus.ACTIVE;
    }

    public void waitForOperator() {
        clearPendingFlow();
        status = ConversationStatus.WAITING_FOR_OPERATOR;
        if (escalatedAt == null) {
            escalatedAt = LocalDateTime.now();
        }
    }

    public void recordHandoffContext(EscalationReason reason, String summary) {
        if (reason != null) {
            escalationReason = reason;
        }
        if (summary != null && !summary.isBlank()) {
            handoffSummary = summary.trim();
        }
        if (escalatedAt == null) {
            escalatedAt = LocalDateTime.now();
        }
    }

    public void clearHandoffContext() {
        escalationReason = null;
        escalatedAt = null;
        handoffSummary = null;
    }

    /**
     * Customer cancels the waiting-for-staff queue and returns to bot support.
     * Only allowed while still unassigned in {@link ConversationStatus#WAITING_FOR_OPERATOR}.
     */
    public void cancelStaffRequest() {
        if (assignedOperatorId != null || status != ConversationStatus.WAITING_FOR_OPERATOR) {
            throw new DomainException(ErrorCode.CONVERSATION_CANNOT_CANCEL_STAFF_REQUEST);
        }
        status = ConversationStatus.OPEN;
        clearHandoffContext();
    }

    public static String cancelStaffRequestCopy() {
        return "Quý khách đã huỷ yêu cầu gặp nhân viên. Đại Phát sẽ tiếp tục hỗ trợ quý khách.";
    }

    public void disconnectStaff() {
        if (assignedOperatorId == null
                || (status != ConversationStatus.ACTIVE
                && status != ConversationStatus.WAITING_FOR_CUSTOMER)) {
            throw new DomainException(ErrorCode.CONVERSATION_CANNOT_CANCEL_STAFF_REQUEST);
        }
        assignedOperatorId = null;
        status = ConversationStatus.OPEN;
    }

    public static String disconnectStaffCopy() {
        return "Quý khách đã ngắt kết nối với nhân viên hỗ trợ.";
    }

    public void waitForCustomer() {
        status = ConversationStatus.WAITING_FOR_CUSTOMER;
    }

    public void close() {
        closeSession();
    }

    public Optional<UUID> closeSession() {
        ensureNotClosed();
        clearPendingFlow();
        UUID formerAssignee = assignedOperatorId;
        lastAssignedOperatorId = formerAssignee;
        assignedOperatorId = null;
        status = ConversationStatus.CLOSED;
        return Optional.ofNullable(formerAssignee);
    }

    public void closeManually(UUID operatorId, ConversationCloseReason reason) {
        closedBy = operatorId;
        closeReason = reason != null ? reason : ConversationCloseReason.OTHER;
        closeSession();
    }

    public void closeAutomatically() {
        closeReason = ConversationCloseReason.AUTO_INACTIVITY;
        closeSession();
    }

    public void recordLastMessage(MessageSenderType senderType, LocalDateTime at) {
        if (senderType == null) {
            return;
        }
        lastMessageFrom = fromSenderType(senderType);
        lastMessageAt = at != null ? at : LocalDateTime.now();
        autoCloseWarningSentAt = null;
    }

    public void markAutoCloseWarningSent(LocalDateTime at) {
        autoCloseWarningSentAt = at != null ? at : LocalDateTime.now();
    }

    public static LastMessageFrom fromSenderType(MessageSenderType senderType) {
        if (senderType == MessageSenderType.CUSTOMER) {
            return LastMessageFrom.CUSTOMER;
        }
        if (senderType == MessageSenderType.OPERATOR) {
            return LastMessageFrom.STAFF;
        }
        if (senderType == MessageSenderType.AI_SYSTEM) {
            return LastMessageFrom.BOT;
        }
        throw new IllegalArgumentException("Unsupported sender type: " + senderType);
    }

    public static String manualCloseCustomerCopy() {
        return "Cuộc trò chuyện đã được đóng. Nếu cần hỗ trợ thêm, bạn cứ nhắn lại nhé.";
    }

    public static String autoCloseWarningCopy() {
        return "Cuộc trò chuyện sẽ tự đóng sau 5 phút nếu không có phản hồi.";
    }

    public boolean isAwaitingCustomerResponse() {
        return lastMessageFrom == LastMessageFrom.STAFF || lastMessageFrom == LastMessageFrom.BOT;
    }

    public boolean isAwaitingStaffResponse() {
        return lastMessageFrom == LastMessageFrom.CUSTOMER;
    }

    public boolean tracksCustomerSilence() {
        return CUSTOMER_SILENCE_STATUSES.contains(status) && !isDeleted();
    }

    public boolean tracksStaffResponseSla() {
        return STAFF_RESPONSE_SLA_STATUSES.contains(status) && !isDeleted();
    }

    public boolean isCustomerSilentSince(LocalDateTime threshold) {
        return tracksCustomerSilence()
                && isAwaitingCustomerResponse()
                && lastMessageAt != null
                && lastMessageAt.isBefore(threshold);
    }

    public boolean shouldSendAutoCloseWarning(LocalDateTime warningThreshold, LocalDateTime closeThreshold) {
        return tracksCustomerSilence()
                && isAwaitingCustomerResponse()
                && autoCloseWarningSentAt == null
                && lastMessageAt != null
                && lastMessageAt.isBefore(warningThreshold)
                && !lastMessageAt.isBefore(closeThreshold);
    }

    public boolean isStaffResponseOverdueSince(LocalDateTime threshold) {
        return tracksStaffResponseSla()
                && isAwaitingStaffResponse()
                && lastMessageAt != null
                && lastMessageAt.isBefore(threshold);
    }

    public boolean isWaitingOperatorTimedOut(LocalDateTime updatedBefore) {
        return status == ConversationStatus.WAITING_FOR_OPERATOR
                && !isDeleted()
                && updatedAt != null
                && updatedAt.isBefore(updatedBefore);
    }

    public static LocalDateTime customerSilenceThreshold(LocalDateTime now, long silenceMinutes) {
        return now.minusMinutes(silenceMinutes);
    }

    public static AutoCloseWarningWindow autoCloseWarningWindow(
            LocalDateTime now,
            long silenceMinutes,
            long leadMinutes
    ) {
        return new AutoCloseWarningWindow(
                now.minusMinutes(silenceMinutes - leadMinutes),
                now.minusMinutes(silenceMinutes)
        );
    }

    public static LocalDateTime staffResponseSlaThreshold(LocalDateTime now, long slaMinutes) {
        return now.minusMinutes(slaMinutes);
    }

    public record AutoCloseWarningWindow(LocalDateTime warningThreshold, LocalDateTime closeThreshold) {
    }

    public static String formatSessionGap(LocalDateTime previousEndedAt, LocalDateTime nextStartedAt) {
        if (previousEndedAt == null || nextStartedAt == null) {
            return null;
        }
        Duration duration = Duration.between(previousEndedAt, nextStartedAt);
        long days = duration.toDays();
        if (days >= 1) {
            return "— " + days + " ngày sau —";
        }
        long hours = duration.toHours();
        if (hours >= 1) {
            return "— " + hours + " giờ sau —";
        }
        long minutes = duration.toMinutes();
        if (minutes >= 1) {
            return "— " + minutes + " phút sau —";
        }
        return "— vài phút sau —";
    }

    public static SessionBoundary buildSessionBoundary(
            ConversationModel previousSession,
            ConversationModel currentSession
    ) {
        if (currentSession == null) {
            return null;
        }
        LocalDateTime sessionStartedAt = currentSession.getCreatedAt();
        if (previousSession == null) {
            return SessionBoundary.builder()
                    .conversationId(currentSession.getId())
                    .sessionStartedAt(sessionStartedAt)
                    .build();
        }
        LocalDateTime previousEndedAt = previousSession.getStatus() == ConversationStatus.CLOSED
                ? previousSession.getUpdatedAt()
                : null;
        return SessionBoundary.builder()
                .conversationId(currentSession.getId())
                .sessionStartedAt(sessionStartedAt)
                .previousCloseReason(previousSession.getCloseReason())
                .previousOperatorId(resolvePreviousOperatorId(previousSession))
                .previousSessionEndedAt(previousEndedAt)
                .build();
    }

    public static boolean canViewCustomerTimeline(
            UUID staffId,
            boolean isAdmin,
            List<ConversationModel> customerConversations,
            boolean operatorParticipated
    ) {
        if (isAdmin) {
            return true;
        }
        if (staffId == null) {
            return false;
        }
        if (operatorParticipated) {
            return true;
        }
        for (ConversationModel conversation : customerConversations) {
            if (conversation.isVisibleInOperatorQueue(staffId)) {
                return true;
            }
            if (staffId.equals(conversation.getAssignedOperatorId())) {
                return true;
            }
            if (staffId.equals(conversation.getClosedBy())) {
                return true;
            }
            if (staffId.equals(conversation.getLastAssignedOperatorId())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Staff timeline only includes conversations they are handling, handled, or participated in.
     * Admin passes {@code null} to load the full customer history.
     */
    public static Set<Long> resolveStaffVisibleConversationIds(
            UUID staffId,
            List<ConversationModel> customerConversations,
            Collection<Long> participatedConversationIds
    ) {
        Set<Long> visible = new HashSet<>();
        if (staffId == null || customerConversations == null) {
            return visible;
        }

        for (ConversationModel conversation : customerConversations) {
            if (conversation.getId() == null) {
                continue;
            }
            if (staffId.equals(conversation.getAssignedOperatorId())) {
                visible.add(conversation.getId());
                continue;
            }
            if (staffId.equals(conversation.getLastAssignedOperatorId())) {
                visible.add(conversation.getId());
                continue;
            }
            if (staffId.equals(conversation.getClosedBy())) {
                visible.add(conversation.getId());
                continue;
            }
            if (conversation.isVisibleInOperatorQueue(staffId)) {
                visible.add(conversation.getId());
                continue;
            }
            if (participatedConversationIds != null && participatedConversationIds.contains(conversation.getId())) {
                visible.add(conversation.getId());
            }
        }
        return visible;
    }

    public static UUID resolvePreviousOperatorId(ConversationModel previousSession) {
        if (previousSession == null) {
            return null;
        }
        if (previousSession.getLastAssignedOperatorId() != null) {
            return previousSession.getLastAssignedOperatorId();
        }
        return previousSession.getClosedBy();
    }

    public static String resolvePreviousOperatorName(
            ConversationModel previousSession,
            Map<UUID, String> operatorNames
    ) {
        UUID operatorId = resolvePreviousOperatorId(previousSession);
        if (operatorId != null && operatorNames != null) {
            String name = operatorNames.get(operatorId);
            if (name != null && !name.isBlank()) {
                return name;
            }
        }
        if (previousSession != null && previousSession.getStatus() == ConversationStatus.CLOSED
                && previousSession.getLastAssignedOperatorId() == null
                && previousSession.getClosedBy() == null) {
            return "Trợ lý AI";
        }
        return null;
    }

    /** @deprecated Closed conversations are not reopened — customer gets a new thread. */
    @Deprecated
    public void reopen() {
        ensureStatus(ConversationStatus.CLOSED);
        assignedOperatorId = null;
        closedBy = null;
        closeReason = null;
        status = ConversationStatus.OPEN;
    }

    public boolean canReceiveInitContent() {
        return status != ConversationStatus.CLOSED && !isDeleted();
    }

    /**
     * Staff only see conversations that requested human support (WAITING_FOR_OPERATOR)
     * or are already assigned to them. OPEN bot-only chats stay off the queue.
     */
    public boolean isVisibleInOperatorQueue(UUID operatorId) {
        if (status == ConversationStatus.CLOSED || status == ConversationStatus.OPEN || isDeleted()) {
            return false;
        }
        if (assignedOperatorId == null) {
            return status == ConversationStatus.WAITING_FOR_OPERATOR;
        }
        return assignedOperatorId.equals(operatorId);
    }

    /** Bot-only thread: customer has not asked for a human yet. */
    public boolean isBotOnlyOpen() {
        return status == ConversationStatus.OPEN && assignedOperatorId == null && !isDeleted();
    }

    public static String sessionReopenDividerCopy() {
        return "Phiên hỗ trợ mới bắt đầu.";
    }

    public static String sessionCloseCopy(String staffName) {
        if (staffName != null && !staffName.isBlank()) {
            return "Phiên hỗ trợ với " + staffName.trim()
                    + " đã kết thúc. Lần sau bạn có thể được hỗ trợ bởi nhân viên khác.";
        }
        return "Phiên hỗ trợ đã kết thúc.";
    }

    public static String operatorAcceptanceCopy(String operatorName) {
        if (operatorName != null && !operatorName.isBlank()) {
            return operatorName.trim() + " đã tiếp nhận và sẽ hỗ trợ bạn ngay.";
        }
        return "Nhân viên đã tiếp nhận và sẽ hỗ trợ bạn ngay.";
    }

    public static boolean isOperatorAcceptanceMessage(String content) {
        if (content == null || content.isBlank()) {
            return false;
        }
        return content.endsWith("đã tiếp nhận và sẽ hỗ trợ bạn ngay.");
    }

    /**
     * Staff/admin may only read messages from operator acceptance onward.
     * Pre-acceptance chatbot history is hidden to protect customer privacy.
     */
    public static Optional<LocalDateTime> resolveStaffMessageVisibilityCutoff(
            ConversationModel conversation,
            List<MessageModel> messages
    ) {
        if (conversation == null || messages == null || messages.isEmpty()) {
            return Optional.empty();
        }

        Optional<LocalDateTime> acceptanceCutoff = messages.stream()
                .filter(message -> message.getType() == MessageType.SYSTEM)
                .filter(message -> isOperatorAcceptanceMessage(message.getContent()))
                .map(MessageModel::getCreatedAt)
                .max(LocalDateTime::compareTo);

        if (conversation.getAssignedOperatorId() != null
                || conversation.getLastAssignedOperatorId() != null
                || conversation.getStatus() == ConversationStatus.CLOSED) {
            return acceptanceCutoff;
        }

        return Optional.empty();
    }

    public static List<MessageModel> filterMessagesVisibleToStaff(
            ConversationModel conversation,
            List<MessageModel> messages
    ) {
        Optional<LocalDateTime> cutoff = resolveStaffMessageVisibilityCutoff(conversation, messages);
        if (cutoff.isEmpty()) {
            return List.of();
        }
        LocalDateTime boundary = cutoff.get();
        return messages.stream()
                .filter(message -> message.getCreatedAt() != null && !message.getCreatedAt().isBefore(boundary))
                .toList();
    }

    public void assignToOperator(UUID operatorId) {
        assignedOperatorId = operatorId;
        status = ConversationStatus.ACTIVE;
    }

    public void unassignOperator() {
        assignedOperatorId = null;
        status = ConversationStatus.WAITING_FOR_OPERATOR;
    }

    public boolean isAssignable() {
        return assignedOperatorId == null
                && status == ConversationStatus.WAITING_FOR_OPERATOR
                && !isDeleted();
    }

    public boolean canEscalate() {
        return assignedOperatorId == null
                && status != ConversationStatus.CLOSED
                && status != ConversationStatus.WAITING_FOR_OPERATOR;
    }

    public void validate() {
        normalizeTitle();
        if (title == null || title.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Tiêu đề cuộc trò chuyện không được để trống.");
        }
        if (customerId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu khách hàng cho cuộc trò chuyện.");
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete() {
        deletedAt = LocalDateTime.now();
    }

    public boolean hasPendingScheduleFlow() {
        return findActiveFlow(ChatIntent.WEB_SCHEDULE.name())
                .map(flow -> flow.pendingSlot() != null && !flow.pendingSlot().isBlank())
                .orElse(false);
    }

    public boolean hasPendingFlow(String intent) {
        return findActiveFlow(intent)
                .map(flow -> flow.pendingSlot() != null && !flow.pendingSlot().isBlank())
                .orElse(false);
    }

    public Optional<PendingFlowState> findActiveFlow(String intent) {
        if (intent == null || activeFlows == null || activeFlows.isEmpty()) {
            return Optional.empty();
        }
        return activeFlows.stream()
                .filter(flow -> intent.equals(flow.intent()))
                .reduce((first, second) -> second);
    }

    public Optional<PendingFlowState> latestFlow() {
        if (activeFlows == null || activeFlows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(activeFlows.getLast());
    }

    public void upsertFlow(PendingFlowState flow) {
        if (flow == null) {
            return;
        }
        if (activeFlows == null) {
            activeFlows = new ArrayList<>();
        }
        for (int index = 0; index < activeFlows.size(); index++) {
            if (activeFlows.get(index).flowId().equals(flow.flowId())) {
                activeFlows.set(index, flow);
                return;
            }
        }
        activeFlows.add(flow);
    }

    public void removeFlow(String flowId) {
        if (flowId == null || activeFlows == null) {
            return;
        }
        activeFlows.removeIf(flow -> flowId.equals(flow.flowId()));
    }

    public void expireFlows(Duration ttl) {
        if (activeFlows == null || activeFlows.isEmpty() || ttl == null) {
            return;
        }
        Instant cutoff = Instant.now().minus(ttl);
        activeFlows.removeIf(flow -> flow.lastTouchedAt() != null && flow.lastTouchedAt().isBefore(cutoff));
    }

    public String getPendingIntent() {
        return latestFlow().map(PendingFlowState::intent).orElse(null);
    }

    public void setPendingIntent(String pendingIntent) {
        if (pendingIntent == null || pendingIntent.isBlank()) {
            clearPendingFlow();
            return;
        }
        PendingFlowState flow = findActiveFlow(pendingIntent)
                .orElseGet(() -> PendingFlowState.create(pendingIntent));
        upsertFlow(flow);
    }

    public ChatSchedulePendingSlot getPendingSlot() {
        return scheduleFlow()
                .map(PendingFlowState::pendingSlot)
                .filter(slot -> slot != null && !slot.isBlank())
                .map(ChatSchedulePendingSlot::valueOf)
                .orElse(null);
    }

    public void setPendingSlot(ChatSchedulePendingSlot pendingSlot) {
        PendingFlowState current = ensureLatestFlow(ChatIntent.WEB_SCHEDULE.name());
        upsertFlow(current.withPendingSlot(pendingSlot != null ? pendingSlot.name() : null));
    }

    public void clearPendingFlow() {
        if (activeFlows != null) {
            activeFlows.clear();
        }
    }

    public void clearPendingFlow(String intent) {
        if (intent == null || activeFlows == null) {
            return;
        }
        activeFlows.removeIf(flow -> intent.equals(flow.intent()));
    }

    public Map<String, String> mutableCollectedSlots() {
        PendingFlowState current = ensureLatestFlow(ChatIntent.WEB_SCHEDULE.name());
        Map<String, String> slots = current.mutableCollectedSlots();
        upsertFlow(current.withCollectedSlots(slots));
        return slots;
    }

    public String collectedSlot(String key) {
        return scheduleFlow()
                .map(PendingFlowState::collectedSlots)
                .map(slots -> slots.get(key))
                .orElse(null);
    }

    public void putCollectedSlot(String key, String value) {
        if (key == null || value == null || value.isBlank()) {
            return;
        }
        PendingFlowState current = ensureLatestFlow(ChatIntent.WEB_SCHEDULE.name());
        Map<String, String> slots = new HashMap<>(current.mutableCollectedSlots());
        slots.put(key, value.trim());
        upsertFlow(current.withCollectedSlots(slots));
    }

    public void removeCollectedSlot(String key) {
        PendingFlowState current = scheduleFlow().orElse(null);
        if (current == null || key == null) {
            return;
        }
        Map<String, String> slots = new HashMap<>(current.mutableCollectedSlots());
        slots.remove(key);
        upsertFlow(current.withCollectedSlots(slots));
    }

    private PendingFlowState ensureLatestFlow(String intent) {
        return findActiveFlow(intent).orElseGet(() -> {
            PendingFlowState created = PendingFlowState.create(intent);
            upsertFlow(created);
            return created;
        });
    }

    private Optional<PendingFlowState> scheduleFlow() {
        return findActiveFlow(ChatIntent.WEB_SCHEDULE.name());
    }

    public boolean isBotOwned() {
        return assignedOperatorId == null
                && status != ConversationStatus.CLOSED
                && status != ConversationStatus.WAITING_FOR_OPERATOR;
    }

    public boolean isParticipant(UUID userId) {
        if (userId == null) {
            return false;
        }
        return userId.equals(customerId) || userId.equals(assignedOperatorId);
    }

    public void markCustomerRead(LocalDateTime readAt) {
        customerLastReadAt = readAt;
    }

    public void markOperatorRead(LocalDateTime readAt) {
        operatorLastReadAt = readAt;
    }

    public LocalDateTime resolveLastReadAtForUser(UUID userId) {
        if (userId == null) {
            return null;
        }
        if (userId.equals(customerId)) {
            return customerLastReadAt;
        }
        if (userId.equals(assignedOperatorId)) {
            return operatorLastReadAt;
        }
        return null;
    }

    private void ensureNotClosed() {
        if (status == ConversationStatus.CLOSED) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cuộc trò chuyện đã đóng.");
        }
    }

    private void ensureStatus(ConversationStatus expectedStatus) {
        if (status != expectedStatus) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Trạng thái cuộc trò chuyện không hợp lệ.");
        }
    }

    private void normalizeTitle() {
        if (title != null) {
            title = title.trim();
        }
    }
}

package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.application.dto.response.chat.PreviousStaffSessionBrief;
import com.daiphat.coreapi.application.dto.response.chat.StaffConversationContextResponse;
import com.daiphat.coreapi.application.dto.response.chat.StaffOpenWorkItem;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.chat.ChatStaffContextPort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatPreviousSessionViewPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.service.chat.HandoffSummaryBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatStaffContextService implements ChatStaffContextPort {

    private static final List<RefundRequestStatus> OPEN_REFUND_STATUSES = List.of(
            RefundRequestStatus.WAITING_FOR_INFO,
            RefundRequestStatus.READY_TO_PAY,
            RefundRequestStatus.APPROVED,
            RefundRequestStatus.MANUAL_RESOLUTION
    );

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final UserLookupServicePort userLookupServicePort;
    private final ChatApplicationMapper chatApplicationMapper;
    private final ChatPreviousSessionViewPort chatPreviousSessionViewPort;
    private final SupportTicketRepositoryPort supportTicketRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;

    @Override
    @Transactional(readOnly = true)
    public StaffConversationContextResponse build(ConversationModel conversation) {
        if (conversation == null || conversation.getCustomerId() == null) {
            return StaffConversationContextResponse.builder()
                    .openWork(List.of())
                    .build();
        }

        PreviousStaffSessionBrief previousSession = null;
        if (conversation.getCreatedAt() != null) {
            previousSession = conversationRepositoryPort
                    .findPreviousConversation(conversation.getCustomerId(), conversation.getCreatedAt())
                    .filter(previous -> previous.getStatus() == ConversationStatus.CLOSED)
                    .map(this::toPreviousSessionBrief)
                    .orElse(null);
        }

        return StaffConversationContextResponse.builder()
                .previousSession(previousSession)
                .handoffSummary(blankToNull(conversation.getHandoffSummary()))
                .openWork(buildOpenWork(conversation.getCustomerId()))
                .build();
    }

    @Override
    @Transactional
    public List<MessageResponse> getPreviousSessionMessages(UUID viewerId, Long conversationId) {
        UserModel viewer = userLookupServicePort.findActiveByIdOrThrow(viewerId);
        ConversationModel current = conversationRepositoryPort.findById(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        assertCanViewPreviousTranscript(viewer, current);

        if (current.getCreatedAt() == null) {
            return List.of();
        }

        Optional<ConversationModel> previous = conversationRepositoryPort
                .findPreviousConversation(current.getCustomerId(), current.getCreatedAt())
                .filter(item -> item.getStatus() == ConversationStatus.CLOSED);
        if (previous.isEmpty()) {
            return List.of();
        }

        ConversationModel previousSession = previous.get();
        chatPreviousSessionViewPort.record(
                viewerId,
                current.getId(),
                previousSession.getId(),
                LocalDateTime.now()
        );
        log.info(
                "Staff {} viewed previous chat session {} while handling conversation {}",
                viewerId,
                previousSession.getId(),
                current.getId()
        );

        List<MessageModel> messages = messageRepositoryPort.findByConversationId(previousSession.getId());
        List<MessageModel> visible = ConversationModel.filterMessagesVisibleToStaff(previousSession, messages);
        if (visible.isEmpty()) {
            visible = messages.stream()
                    .filter(message -> message.getCreatedAt() != null)
                    .toList();
        }
        return visible.stream()
                .map(message -> toReadableMessage(chatApplicationMapper.toMessageResponse(message), message))
                .toList();
    }

    private void assertCanViewPreviousTranscript(UserModel viewer, ConversationModel current) {
        boolean admin = viewer.getRole() != null && RoleConstants.ADMIN.equals(viewer.getRole().getCode());
        if (admin) {
            return;
        }
        UUID viewerId = viewer.getId();
        if (viewerId != null && current.isVisibleInOperatorQueue(viewerId)) {
            return;
        }
        throw new DomainException(ErrorCode.CONVERSATION_VIEW_DENIED);
    }

    private PreviousStaffSessionBrief toPreviousSessionBrief(ConversationModel previous) {
        UUID operatorId = ConversationModel.resolvePreviousOperatorId(previous);
        String operatorName = null;
        if (operatorId != null) {
            operatorName = userLookupServicePort.findById(operatorId)
                    .map(UserModel::getFullName)
                    .orElse(null);
        }
        ConversationCloseReason reason = previous.getCloseReason();
        return PreviousStaffSessionBrief.builder()
                .conversationId(previous.getId())
                .closedAt(previous.getClosedAt() != null ? previous.getClosedAt() : previous.getUpdatedAt())
                .closeReason(reason)
                .closeReasonLabel(reason != null ? reason.getLabel() : null)
                .operatorId(operatorId)
                .operatorName(operatorName)
                .build();
    }

    private List<StaffOpenWorkItem> buildOpenWork(UUID customerId) {
        List<StaffOpenWorkItem> items = new ArrayList<>();
        long tickets = supportTicketRepositoryPort.countActiveTickets(customerId);
        if (tickets > 0) {
            items.add(StaffOpenWorkItem.builder()
                    .type("TICKET")
                    .count(tickets)
                    .label(tickets + " khiếu nại đang mở")
                    .build());
        }
        long refunds = refundRequestRepositoryPort.countAll(customerId, null, OPEN_REFUND_STATUSES, null, null);
        if (refunds > 0) {
            items.add(StaffOpenWorkItem.builder()
                    .type("REFUND")
                    .count(refunds)
                    .label(refunds + " yêu cầu hoàn tiền đang xử lý")
                    .build());
        }
        long payouts = prizePayoutRequestRepositoryPort.countPendingByCustomerId(customerId);
        if (payouts > 0) {
            items.add(StaffOpenWorkItem.builder()
                    .type("PAYOUT")
                    .count(payouts)
                    .label(payouts + " yêu cầu trả thưởng đang chờ")
                    .build());
        }
        return items;
    }

    private MessageResponse toReadableMessage(MessageResponse response, MessageModel message) {
        String readable = HandoffSummaryBuilder.toStaffReadableContent(message.getContent());
        if (readable == null || response == null) {
            return response;
        }
        return MessageResponse.builder()
                .id(response.id())
                .conversationId(response.conversationId())
                .parentId(response.parentId())
                .senderId(response.senderId())
                .senderType(response.senderType())
                .content(readable)
                .intent(response.intent())
                .confidence(response.confidence())
                .type(response.type())
                .fileUrl(response.fileUrl())
                .fileName(response.fileName())
                .isEdited(response.isEdited())
                .editedAt(response.editedAt())
                .isRead(response.isRead())
                .readerCount(response.readerCount())
                .isDeleted(response.isDeleted())
                .deletedAt(response.deletedAt())
                .createdAt(response.createdAt())
                .updatedAt(response.updatedAt())
                .build();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

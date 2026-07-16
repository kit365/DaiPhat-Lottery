package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.LastMessageFrom;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.SLOT_DRAW_DATE;

@DisplayName("ConversationModel assignment rules")
class ConversationModelTest {

    private static final UUID OPERATOR_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTHER_OPERATOR_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    void closeSession_clearsPendingScheduleFlow() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.OPEN)
                .build();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        conversation.putCollectedSlot(SLOT_DRAW_DATE, "2026-07-04");

        conversation.closeSession();

        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.CLOSED);
    }

    @Test
    void waitForOperator_clearsPendingScheduleFlow() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.OPEN)
                .build();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);

        conversation.waitForOperator();

        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
    }

    @Test
    void cancelStaffRequest_returnsToOpenWhenWaiting() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();

        conversation.cancelStaffRequest();

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.OPEN);
        assertThat(conversation.getAssignedOperatorId()).isNull();
    }

    @Test
    void cancelStaffRequest_rejectsWhenAlreadyAssigned() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        assertThatThrownBy(conversation::cancelStaffRequest)
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Không thể huỷ yêu cầu gặp nhân viên");
    }

    @Test
    void cancelStaffRequest_rejectsWhenNotWaiting() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.OPEN)
                .build();

        assertThatThrownBy(conversation::cancelStaffRequest)
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Không thể huỷ yêu cầu gặp nhân viên");
    }

    @Test
    void operatorAcceptanceCopy_usesOperatorNameWhenPresent() {
        assertThat(ConversationModel.operatorAcceptanceCopy("Kiệt Ngô"))
                .isEqualTo("Kiệt Ngô đã tiếp nhận và sẽ hỗ trợ bạn ngay.");
        assertThat(ConversationModel.operatorAcceptanceCopy(null))
                .isEqualTo("Nhân viên đã tiếp nhận và sẽ hỗ trợ bạn ngay.");
    }

    @Test
    void assignToOperator_setsActiveAndAssignee() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();

        conversation.assignToOperator(OPERATOR_ID);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.ACTIVE);
        assertThat(conversation.getAssignedOperatorId()).isEqualTo(OPERATOR_ID);
    }

    @Test
    void unassignOperator_returnsToWaitingPool() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        conversation.unassignOperator();

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
        assertThat(conversation.getAssignedOperatorId()).isNull();
    }

    @Test
    void isAssignable_onlyWaitingWithoutAssignee() {
        ConversationModel open = ConversationModel.builder().status(ConversationStatus.OPEN).build();
        ConversationModel waiting = ConversationModel.builder().status(ConversationStatus.WAITING_FOR_OPERATOR).build();
        ConversationModel active = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        assertThat(open.isAssignable()).isFalse();
        assertThat(waiting.isAssignable()).isTrue();
        assertThat(active.isAssignable()).isFalse();
    }

    @Test
    void canEscalate_onlyWhenUnassignedAndNotWaiting() {
        ConversationModel open = ConversationModel.builder().status(ConversationStatus.OPEN).build();
        ConversationModel waiting = ConversationModel.builder().status(ConversationStatus.WAITING_FOR_OPERATOR).build();
        ConversationModel active = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        assertThat(open.canEscalate()).isTrue();
        assertThat(waiting.canEscalate()).isFalse();
        assertThat(active.canEscalate()).isFalse();
    }

    @Test
    void closeSession_clearsAssignee_andReturnsFormerId() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        assertThat(conversation.closeSession()).contains(OPERATOR_ID);
        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.CLOSED);
        assertThat(conversation.getAssignedOperatorId()).isNull();
    }

    @Test
    void reopen_onlyFromClosed() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.CLOSED)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        conversation.reopen();

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.OPEN);
        assertThat(conversation.getAssignedOperatorId()).isNull();
    }

    @Test
    void reopen_fromOpen_throws() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.OPEN)
                .build();

        assertThatThrownBy(conversation::reopen).isInstanceOf(DomainException.class);
    }

    @Test
    void isVisibleInOperatorQueue_closedIsFalse() {
        ConversationModel closed = ConversationModel.builder()
                .status(ConversationStatus.CLOSED)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        assertThat(closed.isVisibleInOperatorQueue(OPERATOR_ID)).isFalse();
    }

    @Test
    void isVisibleInOperatorQueue_openBotOnlyIsHidden() {
        ConversationModel open = ConversationModel.builder()
                .status(ConversationStatus.OPEN)
                .build();

        assertThat(open.isVisibleInOperatorQueue(OPERATOR_ID)).isFalse();
        assertThat(open.isBotOnlyOpen()).isTrue();
    }

    @Test
    void isVisibleInOperatorQueue_poolVisibleToAnyOperator() {
        ConversationModel waiting = ConversationModel.builder()
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();

        assertThat(waiting.isVisibleInOperatorQueue(OPERATOR_ID)).isTrue();
        assertThat(waiting.isVisibleInOperatorQueue(OTHER_OPERATOR_ID)).isTrue();
        assertThat(waiting.isBotOnlyOpen()).isFalse();
    }

    @Test
    void isVisibleInOperatorQueue_assignedOnlyToAssignee() {
        ConversationModel active = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        assertThat(active.isVisibleInOperatorQueue(OPERATOR_ID)).isTrue();
        assertThat(active.isVisibleInOperatorQueue(OTHER_OPERATOR_ID)).isFalse();
    }

    @Test
    void sessionCloseCopy_includesStaffNameWhenPresent() {
        assertThat(ConversationModel.sessionCloseCopy("Nguyen Van A"))
                .contains("Nguyen Van A");
        assertThat(ConversationModel.sessionCloseCopy(null))
                .isEqualTo("Phiên hỗ trợ đã kết thúc.");
    }

    @Test
    void isCustomerSilentSince_onlyWhenStaffOrBotRepliedLast() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 3, 12, 0);
        LocalDateTime threshold = ConversationModel.customerSilenceThreshold(now, 30);

        ConversationModel eligible = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .lastMessageFrom(LastMessageFrom.STAFF)
                .lastMessageAt(now.minusMinutes(31))
                .build();
        ConversationModel customerLast = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .lastMessageFrom(LastMessageFrom.CUSTOMER)
                .lastMessageAt(now.minusMinutes(31))
                .build();

        assertThat(eligible.isCustomerSilentSince(threshold)).isTrue();
        assertThat(customerLast.isCustomerSilentSince(threshold)).isFalse();
    }

    @Test
    void shouldSendAutoCloseWarning_onlyInWarningWindow() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 3, 12, 0);
        ConversationModel.AutoCloseWarningWindow window = ConversationModel.autoCloseWarningWindow(now, 30, 5);

        ConversationModel inWindow = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .lastMessageFrom(LastMessageFrom.BOT)
                .lastMessageAt(now.minusMinutes(27))
                .build();
        ConversationModel tooOld = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .lastMessageFrom(LastMessageFrom.BOT)
                .lastMessageAt(now.minusMinutes(35))
                .build();

        assertThat(inWindow.shouldSendAutoCloseWarning(window.warningThreshold(), window.closeThreshold())).isTrue();
        assertThat(tooOld.shouldSendAutoCloseWarning(window.warningThreshold(), window.closeThreshold())).isFalse();
    }

    @Test
    void isStaffResponseOverdueSince_neverWhenBotOrStaffRepliedLast() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 3, 12, 0);
        LocalDateTime threshold = ConversationModel.staffResponseSlaThreshold(now, 15);

        ConversationModel overdue = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .lastMessageFrom(LastMessageFrom.CUSTOMER)
                .lastMessageAt(now.minusMinutes(20))
                .build();
        ConversationModel waitingStaff = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .lastMessageFrom(LastMessageFrom.STAFF)
                .lastMessageAt(now.minusMinutes(20))
                .build();

        assertThat(overdue.isStaffResponseOverdueSince(threshold)).isTrue();
        assertThat(waitingStaff.isStaffResponseOverdueSince(threshold)).isFalse();
    }

    @Test
    void formatSessionGap_formatsDaysHoursMinutes() {
        LocalDateTime ended = LocalDateTime.of(2026, 7, 1, 10, 0);
        assertThat(ConversationModel.formatSessionGap(ended, ended.plusDays(3)))
                .isEqualTo("— 3 ngày sau —");
        assertThat(ConversationModel.formatSessionGap(ended, ended.plusHours(2)))
                .isEqualTo("— 2 giờ sau —");
        assertThat(ConversationModel.formatSessionGap(ended, ended.plusMinutes(15)))
                .isEqualTo("— 15 phút sau —");
    }

    @Test
    void closeSession_preservesLastAssignedOperatorId() {
        ConversationModel conversation = ConversationModel.builder()
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        conversation.closeSession();

        assertThat(conversation.getLastAssignedOperatorId()).isEqualTo(OPERATOR_ID);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.CLOSED);
    }

    @Test
    void buildSessionBoundary_includesPreviousSessionMetadata() {
        ConversationModel previous = ConversationModel.builder()
                .id(1L)
                .status(ConversationStatus.CLOSED)
                .closeReason(com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason.RESOLVED)
                .lastAssignedOperatorId(OPERATOR_ID)
                .updatedAt(LocalDateTime.of(2026, 7, 1, 10, 0))
                .build();
        ConversationModel current = ConversationModel.builder()
                .id(2L)
                .createdAt(LocalDateTime.of(2026, 7, 4, 10, 0))
                .build();

        var boundary = ConversationModel.buildSessionBoundary(previous, current);

        assertThat(boundary.gapLabel()).isNull();
        assertThat(boundary.previousCloseReason()).isEqualTo(
                com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason.RESOLVED
        );
        assertThat(boundary.previousOperatorId()).isEqualTo(OPERATOR_ID);
    }

    @Test
    void resolveStaffVisibleConversationIds_includesAssignedConversationForPreAssignHistory() {
        ConversationModel assigned = ConversationModel.builder()
                .id(2L)
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();

        Set<Long> visible = ConversationModel.resolveStaffVisibleConversationIds(
                OPERATOR_ID,
                List.of(assigned),
                List.of()
        );

        assertThat(visible).containsExactly(2L);
    }

    @Test
    void resolveStaffVisibleConversationIds_includesAssignedAndParticipatedSessionsOnly() {
        ConversationModel otherSession = ConversationModel.builder()
                .id(1L)
                .status(ConversationStatus.CLOSED)
                .lastAssignedOperatorId(OTHER_OPERATOR_ID)
                .build();
        ConversationModel mine = ConversationModel.builder()
                .id(2L)
                .status(ConversationStatus.ACTIVE)
                .assignedOperatorId(OPERATOR_ID)
                .build();
        ConversationModel waitingPool = ConversationModel.builder()
                .id(3L)
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();

        Set<Long> visible = ConversationModel.resolveStaffVisibleConversationIds(
                OPERATOR_ID,
                List.of(otherSession, mine, waitingPool),
                List.of()
        );

        assertThat(visible).containsExactlyInAnyOrder(2L, 3L);
    }

    @Test
    void canViewCustomerTimeline_staffEngagedViaQueueOrParticipation() {
        ConversationModel waiting = ConversationModel.builder()
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();
        assertThat(ConversationModel.canViewCustomerTimeline(OPERATOR_ID, false, List.of(waiting), false))
                .isTrue();

        ConversationModel closed = ConversationModel.builder()
                .status(ConversationStatus.CLOSED)
                .build();
        assertThat(ConversationModel.canViewCustomerTimeline(OPERATOR_ID, false, List.of(closed), true))
                .isTrue();
        assertThat(ConversationModel.canViewCustomerTimeline(OPERATOR_ID, false, List.of(closed), false))
                .isFalse();
        assertThat(ConversationModel.canViewCustomerTimeline(OPERATOR_ID, true, List.of(closed), false))
                .isTrue();
    }
}

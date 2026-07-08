package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.SLOT_REGION;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.SLOT_SCOPE;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.SCOPE_REGION_ALL;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_ASK_DATE_MODE;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_REGION_CHOICE_PREFIX;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatScheduleFlowRecovery")
class ChatScheduleFlowRecoveryTest {

    private static final Long CONVERSATION_ID = 42L;

    @Mock
    private ChatScheduleFlowRecoveryReader recoveryReader;

    private ChatScheduleFlowRecovery flowRecovery;

    @BeforeEach
    void setUp() {
        flowRecovery = new ChatScheduleFlowRecovery(recoveryReader);
    }

    @Test
    void restoreIfNeeded_recoversRegionChoiceFromBotToken() {
        ConversationModel conversation = openConversation();
        when(recoveryReader.fetchRecentBotTokens(CONVERSATION_ID)).thenReturn(List.of(
                botMessage(TOKEN_REGION_CHOICE_PREFIX + LotteryRegionCode.MIEN_NAM.code())
        ));

        Optional<PendingFlowState> restored = flowRecovery.restoreIfNeeded(conversation, null);

        assertThat(restored).isPresent();
        assertThat(restored.get().pendingSlot()).isEqualTo(ChatSchedulePendingSlot.LOCATION_CHOICE.name());
        assertThat(restored.get().collectedSlots().get(SLOT_REGION)).isEqualTo(LotteryRegionCode.MIEN_NAM.code());
    }

    @Test
    void restoreIfNeeded_keepsCompleteFlow() {
        ConversationModel conversation = openConversation();
        PendingFlowState existing = PendingFlowState.create(ChatIntent.WEB_SCHEDULE.name())
                .withPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE.name())
                .withCollectedSlots(java.util.Map.of(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code()));
        conversation.upsertFlow(existing);

        Optional<PendingFlowState> restored = flowRecovery.restoreIfNeeded(conversation, existing);

        assertThat(restored).contains(existing);
    }

    @Test
    void restoreIfNeeded_repairsMissingRegionOnLocationChoice() {
        ConversationModel conversation = openConversation();
        PendingFlowState incomplete = PendingFlowState.create(ChatIntent.WEB_SCHEDULE.name())
                .withPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE.name());
        when(recoveryReader.fetchRecentBotTokens(CONVERSATION_ID)).thenReturn(List.of(
                botMessage(TOKEN_ASK_DATE_MODE),
                botMessage(TOKEN_REGION_CHOICE_PREFIX + LotteryRegionCode.MIEN_NAM.code())
        ));

        Optional<PendingFlowState> restored = flowRecovery.restoreIfNeeded(conversation, incomplete);

        assertThat(restored).isPresent();
        assertThat(restored.get().collectedSlots().get(SLOT_REGION)).isEqualTo(LotteryRegionCode.MIEN_NAM.code());
        assertThat(restored.get().pendingSlot()).isEqualTo(ChatSchedulePendingSlot.DATE_MODE.name());
    }

    @Test
    void restoreIfNeeded_rebuildsDateModeWithRegionAndScopeFromHistory() {
        ConversationModel conversation = openConversation();
        when(recoveryReader.fetchRecentBotTokens(CONVERSATION_ID)).thenReturn(List.of(
                botMessage(TOKEN_ASK_DATE_MODE),
                botMessage(TOKEN_REGION_CHOICE_PREFIX + LotteryRegionCode.MIEN_NAM.code())
        ));

        Optional<PendingFlowState> restored = flowRecovery.restoreIfNeeded(conversation, null);

        assertThat(restored).isPresent();
        assertThat(restored.get().pendingSlot()).isEqualTo(ChatSchedulePendingSlot.DATE_MODE.name());
        assertThat(restored.get().collectedSlots().get(SLOT_REGION)).isEqualTo(LotteryRegionCode.MIEN_NAM.code());
        assertThat(restored.get().collectedSlots().get(SLOT_SCOPE)).isEqualTo(SCOPE_REGION_ALL);
    }

    @Test
    void restoreIfNeeded_doesNotAcceptDateModeWithoutLocationContext() {
        ConversationModel conversation = openConversation();
        PendingFlowState incomplete = PendingFlowState.create(ChatIntent.WEB_SCHEDULE.name())
                .withPendingSlot(ChatSchedulePendingSlot.DATE_MODE.name());
        when(recoveryReader.fetchRecentBotTokens(CONVERSATION_ID)).thenReturn(List.of(
                botMessage(TOKEN_ASK_DATE_MODE)
        ));

        Optional<PendingFlowState> restored = flowRecovery.restoreIfNeeded(conversation, incomplete);

        assertThat(restored).contains(incomplete);
    }

    private static ConversationModel openConversation() {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support")
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();
    }

    private static MessageModel botMessage(String content) {
        return MessageModel.builder()
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.AI_SYSTEM)
                .content(content)
                .build();
    }
}

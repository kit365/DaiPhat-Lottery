package com.daiphat.coreapi.application.service.chat.bot;

import com.daiphat.coreapi.application.config.ChatFlowProperties;
import com.daiphat.coreapi.application.port.out.chat.ChatFlowCachePort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatFlowSessionService")
class ChatFlowSessionServiceTest {

    private static final Long CONVERSATION_ID = 99L;

    @Mock
    private ChatFlowCachePort chatFlowCachePort;

    private ChatFlowSessionService chatFlowSessionService;

    @BeforeEach
    void setUp() {
        ChatFlowProperties properties = new ChatFlowProperties();
        properties.setTtlMinutes(10);
        chatFlowSessionService = new ChatFlowSessionService(chatFlowCachePort, properties);
    }

    @Test
    void hydrate_loadsFlowsIntoConversation() {
        PendingFlowState flow = PendingFlowState.create("WEB_SCHEDULE");
        when(chatFlowCachePort.loadFlows(CONVERSATION_ID)).thenReturn(List.of(flow));

        ConversationModel conversation = conversation();
        chatFlowSessionService.hydrate(conversation);

        assertThat(conversation.getActiveFlows()).containsExactly(flow);
    }

    @Test
    void persist_whenFlowsPresent_savesWithConfiguredTtl() {
        ConversationModel conversation = conversation();
        conversation.setActiveFlows(new ArrayList<>(List.of(PendingFlowState.create("WEB_SCHEDULE"))));

        chatFlowSessionService.persist(conversation);

        verify(chatFlowCachePort).saveFlows(
                CONVERSATION_ID,
                conversation.getActiveFlows(),
                Duration.ofMinutes(10)
        );
    }

    @Test
    void persist_whenFlowsEmpty_deletesCache() {
        ConversationModel conversation = conversation();
        conversation.setActiveFlows(new ArrayList<>());

        chatFlowSessionService.persist(conversation);

        verify(chatFlowCachePort).deleteFlows(CONVERSATION_ID);
    }

    private ConversationModel conversation() {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support")
                .customerId(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .status(ConversationStatus.OPEN)
                .build();
    }
}

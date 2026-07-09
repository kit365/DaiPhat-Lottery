package com.daiphat.coreapi.application.service.chat.flow;

import com.daiphat.coreapi.application.config.ChatFlowProperties;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowSessionPort;
import com.daiphat.coreapi.application.port.out.chat.ChatFlowCachePort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatFlowSessionService implements ChatFlowSessionPort {

    private final ChatFlowCachePort chatFlowCachePort;
    private final ChatFlowProperties chatFlowProperties;

    @Override
    public void hydrate(ConversationModel conversation) {
        if (conversation == null || conversation.getId() == null) {
            return;
        }
        List<PendingFlowState> flows = chatFlowCachePort.loadFlows(conversation.getId());
        conversation.setActiveFlows(new ArrayList<>(flows));
    }

    @Override
    public void persist(ConversationModel conversation) {
        if (conversation == null || conversation.getId() == null) {
            return;
        }
        List<PendingFlowState> flows = conversation.getActiveFlows();
        if (flows == null || flows.isEmpty()) {
            chatFlowCachePort.deleteFlows(conversation.getId());
            return;
        }
        chatFlowCachePort.saveFlows(conversation.getId(), flows, chatFlowProperties.flowTtl());
    }
}

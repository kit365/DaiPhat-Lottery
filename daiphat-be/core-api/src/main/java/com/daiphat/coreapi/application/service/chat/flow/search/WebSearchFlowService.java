package com.daiphat.coreapi.application.service.chat.flow.search;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowService;
import com.daiphat.coreapi.application.strategy.chat.intent.WebSearchIntentStrategy;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Multi-step WEB_SEARCH: hỏi đuôi/đầu số trước khi lọc kho khi user chưa nhập digits.
 */
@Service
@RequiredArgsConstructor
public class WebSearchFlowService implements ChatFlowService {

    private final WebSearchIntentStrategy webSearchIntentStrategy;

    @Override
    public String flowIntent() {
        return ChatIntent.WEB_SEARCH.name();
    }

    @Override
    public ChatIntentOutcome startFlow(
            ConversationModel conversation,
            MessageModel message,
            ChatClassifyResponse classification
    ) {
        return webSearchIntentStrategy.resolve(context(conversation, message, classification));
    }

    @Override
    public Optional<ChatIntentOutcome> tryResumeSlotAnswer(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel message,
            ChatClassifyResponse classification
    ) {
        PendingFlowState active = resolveActiveFlow(conversation, flow);
        if (!WebSearchIntentStrategy.isTicketFragmentPending(active)) {
            return Optional.empty();
        }
        if (WebSearchIntentStrategy.extractFragmentFromText(message.getContent()) == null) {
            return Optional.empty();
        }
        return tryContinue(conversation, active, message, classification);
    }

    @Override
    public Optional<ChatIntentOutcome> tryContinue(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel message,
            ChatClassifyResponse classification
    ) {
        PendingFlowState active = resolveActiveFlow(conversation, flow);
        if (!WebSearchIntentStrategy.isTicketFragmentPending(active)) {
            return Optional.empty();
        }

        String fragment = WebSearchIntentStrategy.extractFragmentFromText(message.getContent());
        if (fragment == null) {
            return Optional.of(WebSearchIntentStrategy.remindFragmentReply());
        }

        String matchMode = WebSearchIntentStrategy.matchModeFromFlow(active);
        conversation.clearPendingFlow(ChatIntent.WEB_SEARCH.name());
        return Optional.of(webSearchIntentStrategy.searchTickets(fragment, matchMode, null));
    }

    private static PendingFlowState resolveActiveFlow(ConversationModel conversation, PendingFlowState flow) {
        if (WebSearchIntentStrategy.isTicketFragmentPending(flow)) {
            return flow;
        }
        return conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name()).orElse(flow);
    }

    private static ChatIntentContext context(
            ConversationModel conversation,
            MessageModel message,
            ChatClassifyResponse classification
    ) {
        return ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(message)
                .classification(classification)
                .build();
    }
}

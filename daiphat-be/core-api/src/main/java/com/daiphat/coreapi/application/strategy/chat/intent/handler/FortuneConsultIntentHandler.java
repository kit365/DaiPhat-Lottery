package com.daiphat.coreapi.application.strategy.chat.intent.handler;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandler;

import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.application.strategy.chat.ChatAiMessages;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component("OTHER_KNOWLEDGE")
@RequiredArgsConstructor
public class FortuneConsultIntentHandler implements ChatIntentHandler {

    private final ChatAiPort chatAiPort;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.OTHER_KNOWLEDGE;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        String reply = chatAiPort.generateFortuneReply(
                ctx.getCustomerMessage().getContent(),
                ctx.getConversation().getId()
        );

        if (reply == null || reply.isBlank()) {
            log.info("Fortune reply unavailable for conversation {}", ctx.getConversation().getId());
            return new ChatIntentOutcome.BotReply(
                    ChatAiMessages.NOT_UNDERSTOOD,
                    ChatIntent.OTHER_KNOWLEDGE.name()
            );
        }

        return new ChatIntentOutcome.BotReply(reply, ChatIntent.OTHER_KNOWLEDGE.name());
    }
}

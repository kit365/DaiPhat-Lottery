package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component("OTHER_KNOWLEDGE")
@RequiredArgsConstructor
public class FortuneConsultIntentStrategy implements ChatIntentHandlerStrategy {

    private final ChatAiPort chatAiPort;
    private final ChatMessageProperties chatMessageProperties;

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
                    chatMessageProperties.getNotUnderstood(),
                    ChatIntent.OTHER_KNOWLEDGE.name()
            );
        }

        return new ChatIntentOutcome.BotReply(reply, ChatIntent.OTHER_KNOWLEDGE.name());
    }
}

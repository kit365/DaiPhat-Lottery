package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;

import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import org.springframework.stereotype.Component;

@Component("TRASH_TALK")
public class TrashTalkIntentStrategy implements ChatIntentHandlerStrategy {

    private static final String GREETING_REPLY =
            "Xin chào! 👋 Bạn cần Đại Phát hỗ trợ điều gì? Hãy hỏi về lịch quay, kết quả xổ số, đơn hàng hoặc nhắn \"gặp nhân viên\" nhé.";

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.TRASH_TALK;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        return new ChatIntentOutcome.BotReply(GREETING_REPLY, ChatIntent.TRASH_TALK.name());
    }
}

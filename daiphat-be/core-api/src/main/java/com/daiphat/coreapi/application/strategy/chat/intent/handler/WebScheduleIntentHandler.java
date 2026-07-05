package com.daiphat.coreapi.application.strategy.chat.intent.handler;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandler;

import com.daiphat.coreapi.application.service.chat.schedule.DrawScheduleFlowService;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("WEB_SCHEDULE")
@RequiredArgsConstructor
public class WebScheduleIntentHandler implements ChatIntentHandler {

    private final DrawScheduleFlowService drawScheduleFlowService;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_SCHEDULE;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        return drawScheduleFlowService.startFlow(
                ctx.getConversation(),
                ctx.getCustomerMessage(),
                ctx.getClassification()
        );
    }
}

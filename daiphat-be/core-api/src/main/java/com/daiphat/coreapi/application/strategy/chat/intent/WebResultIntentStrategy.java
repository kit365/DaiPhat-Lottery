package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.service.chat.flow.schedule.DrawScheduleFlowService;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.GOAL_RESULT;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.SLOT_GOAL;

@Component("WEB_RESULT")
@RequiredArgsConstructor
public class WebResultIntentStrategy implements ChatIntentHandlerStrategy {

    private final DrawScheduleFlowService drawScheduleFlowService;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_RESULT;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        ctx.getConversation().putCollectedSlot(SLOT_GOAL, GOAL_RESULT);
        return drawScheduleFlowService.startFlow(
                ctx.getConversation(),
                ctx.getCustomerMessage(),
                ctx.getClassification()
        );
    }
}

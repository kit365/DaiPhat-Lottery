package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatFlowProperties;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowService;
import com.daiphat.coreapi.application.service.chat.intent.ChatIntentClassifier;
import com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandler;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class ChatFlowOrchestrator {

    private final ChatIntentClassifier classifier;
    private final Map<String, ChatFlowService> flowServicesByIntent;
    private final Map<ChatIntent, ChatIntentHandler> handlers;
    private final ChatIntentHandler unknownIntentHandler;
    private final ChatFlowProperties chatFlowProperties;

    public ChatFlowOrchestrator(
            ChatIntentClassifier classifier,
            List<ChatFlowService> flowServices,
            List<ChatIntentHandler> handlers,
            ChatFlowProperties chatFlowProperties
    ) {
        this.classifier = classifier;
        this.chatFlowProperties = chatFlowProperties;
        this.flowServicesByIntent = new HashMap<>();
        for (ChatFlowService flowService : flowServices) {
            this.flowServicesByIntent.put(flowService.flowIntent(), flowService);
        }
        this.handlers = new EnumMap<>(ChatIntent.class);
        ChatIntentHandler unknown = null;
        for (ChatIntentHandler handler : handlers) {
            this.handlers.put(handler.supportedIntent(), handler);
            if (handler.supportedIntent() == ChatIntent.UNKNOWN) {
                unknown = handler;
            }
        }
        this.unknownIntentHandler = unknown != null
                ? unknown
                : handlers.stream().findFirst().orElseThrow();
    }

    public ChatFlowHandleResult handle(ConversationModel conversation, MessageModel message) {
        conversation.expireFlows(chatFlowProperties.flowTtl());

        if (isScheduleRestartToken(message.getContent()) && conversation.isBotOwned()) {
            ChatFlowService scheduleFlow = flowServicesByIntent.get(ChatIntent.WEB_SCHEDULE.name());
            if (scheduleFlow != null) {
                ChatClassifyResponseDto synthetic = syntheticScheduleClassification();
                ChatIntentOutcome outcome = scheduleFlow.startFlow(conversation, message, synthetic);
                return new ChatFlowHandleResult(synthetic, outcome);
            }
        }

        ChatClassifyResponseDto classification = classifier.classify(
                message.getContent(),
                conversation.getId()
        );

        if (classification != null && shouldSwitchToNewIntent(classification, conversation)) {
            log.info("High-confidence intent switch to {}", classification.getIntent());
            conversation.clearPendingFlow();
            return new ChatFlowHandleResult(
                    classification,
                    dispatchNewIntent(conversation, message, classification)
            );
        }

        List<PendingFlowState> activeFlows = conversation.getActiveFlows();
        if (activeFlows != null) {
            for (int index = activeFlows.size() - 1; index >= 0; index--) {
                PendingFlowState flow = activeFlows.get(index);
                ChatFlowService flowService = flowServicesByIntent.get(flow.intent());
                if (flowService == null) {
                    continue;
                }
                Optional<ChatIntentOutcome> continued = flowService.tryContinue(
                        conversation,
                        flow,
                        message,
                        classification
                );
                if (continued.isEmpty()) {
                    continued = flowService.tryResumeSlotAnswer(conversation, flow, message, classification);
                }
                if (continued.isPresent()) {
                    return new ChatFlowHandleResult(classification, continued.get());
                }
            }
        }

        if (classification == null) {
            return new ChatFlowHandleResult(null, null);
        }
        return new ChatFlowHandleResult(
                classification,
                dispatchNewIntent(conversation, message, classification)
        );
    }

    private boolean shouldSwitchToNewIntent(
            ChatClassifyResponseDto classification,
            ConversationModel conversation
    ) {
        if (conversation.getActiveFlows() == null || conversation.getActiveFlows().isEmpty()) {
            return false;
        }
        double confidence = classification.getConfidence() != null ? classification.getConfidence() : 0.0;
        if (confidence < chatFlowProperties.getSwitchIntentThreshold()) {
            return false;
        }
        ChatIntent intent = ChatIntent.fromValue(classification.getIntent()).orElse(ChatIntent.UNKNOWN);
        if (intent == ChatIntent.UNKNOWN) {
            return false;
        }
        PendingFlowState latest = conversation.latestFlow().orElse(null);
        if (latest == null) {
            return false;
        }
        return !latest.intent().equals(intent.name());
    }

    private ChatIntentOutcome dispatchNewIntent(
            ConversationModel conversation,
            MessageModel message,
            ChatClassifyResponseDto classification
    ) {
        ChatIntent intent = ChatIntent.fromValue(classification.getIntent()).orElse(ChatIntent.UNKNOWN);
        Optional<ChatFlowService> flowService = Optional.ofNullable(flowServicesByIntent.get(intent.name()));
        if (flowService.isPresent() && conversation.isBotOwned()) {
            Optional<ChatIntentOutcome> resumed = flowService.get().tryResumeSlotAnswer(
                    conversation,
                    null,
                    message,
                    classification
            );
            return resumed.orElseGet(() -> flowService.get().startFlow(conversation, message, classification));
        }

        ChatIntentContext context = ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(message)
                .classification(classification)
                .build();
        return handlerFor(intent).resolve(context);
    }

    private ChatIntentHandler handlerFor(ChatIntent intent) {
        if (intent == null) {
            return unknownIntentHandler;
        }
        return handlers.getOrDefault(intent, unknownIntentHandler);
    }

    private static boolean isScheduleRestartToken(String content) {
        return content != null && ChatScheduleConstants.TOKEN_RESTART.equals(content.trim());
    }

    private static ChatClassifyResponseDto syntheticScheduleClassification() {
        return ChatClassifyResponseDto.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(1.0)
                .entities(new HashMap<>())
                .build();
    }
}

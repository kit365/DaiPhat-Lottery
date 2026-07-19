package com.daiphat.coreapi.application.service.chat.flow;

import com.daiphat.coreapi.application.config.ChatFlowProperties;
import com.daiphat.coreapi.application.dto.chat.flow.ChatFlowHandleResult;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowService;
import com.daiphat.coreapi.application.service.chat.intent.classifier.ChatIntentClassifier;
import com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandlerStrategy;
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
    private final Map<ChatIntent, ChatIntentHandlerStrategy> handlers;
    private final ChatIntentHandlerStrategy unknownIntentHandler;
    private final ChatFlowProperties chatFlowProperties;
    private final AiServiceConfigPort aiServiceConfigPort;

    public ChatFlowOrchestrator(
            ChatIntentClassifier classifier,
            List<ChatFlowService> flowServices,
            List<ChatIntentHandlerStrategy> handlers,
            ChatFlowProperties chatFlowProperties,
            AiServiceConfigPort aiServiceConfigPort
    ) {
        this.classifier = classifier;
        this.chatFlowProperties = chatFlowProperties;
        this.aiServiceConfigPort = aiServiceConfigPort;
        this.flowServicesByIntent = new HashMap<>();
        for (ChatFlowService flowService : flowServices) {
            this.flowServicesByIntent.put(flowService.flowIntent(), flowService);
        }
        this.handlers = new EnumMap<>(ChatIntent.class);
        ChatIntentHandlerStrategy unknown = null;
        for (ChatIntentHandlerStrategy handler : handlers) {
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

        Optional<ChatFlowHandleResult> restartResult = handleScheduleRestart(conversation, message);
        if (restartResult.isPresent()) {
            return restartResult.get();
        }

        // Resume "hỏi đuôi → user trả số" before classify/switch so bare digits never fall to UNKNOWN.
        Optional<ChatFlowHandleResult> pendingTicketSearch = continuePendingTicketFragment(conversation, message);
        if (pendingTicketSearch.isPresent()) {
            return pendingTicketSearch.get();
        }

        ChatClassifyResponse classification = classify(message, conversation);

        if (classification != null && shouldSwitchToNewIntent(classification, conversation)) {
            log.info("High-confidence intent switch to {}", classification.getIntent());
            conversation.clearPendingFlow();
            return buildHandleResult(conversation, message, classification);
        }

        Optional<ChatFlowHandleResult> continuedFlow = continueActiveFlows(conversation, message, classification);
        if (continuedFlow.isPresent()) {
            return continuedFlow.get();
        }

        if (classification == null) {
            return new ChatFlowHandleResult(null, null);
        }
        return buildHandleResult(conversation, message, classification);
    }

    /**
     * When WEB_SEARCH is waiting for đuôi/đầu digits, consume a digit reply immediately
     * (before classify/switch). Non-digit messages fall through so the user can change topic.
     */
    private Optional<ChatFlowHandleResult> continuePendingTicketFragment(
            ConversationModel conversation,
            MessageModel message
    ) {
        ChatFlowService searchFlow = flowServicesByIntent.get(ChatIntent.WEB_SEARCH.name());
        if (searchFlow == null || !conversation.isBotOwned()) {
            return Optional.empty();
        }
        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name()).orElse(null);
        if (flow == null) {
            return Optional.empty();
        }
        Optional<ChatIntentOutcome> outcome = searchFlow.tryResumeSlotAnswer(conversation, flow, message, null);
        return outcome.map(value -> new ChatFlowHandleResult(null, value));
    }

    private Optional<ChatFlowHandleResult> handleScheduleRestart(
            ConversationModel conversation,
            MessageModel message
    ) {
        if (!conversation.isBotOwned() || !isScheduleRestartToken(message.getContent())) {
            return Optional.empty();
        }
        ChatFlowService scheduleFlow = flowServicesByIntent.get(ChatIntent.WEB_SCHEDULE.name());
        if (scheduleFlow == null) {
            return Optional.empty();
        }
        ChatClassifyResponse synthetic = syntheticScheduleClassification();
        ChatIntentOutcome outcome = scheduleFlow.startFlow(conversation, message, synthetic);
        return Optional.of(new ChatFlowHandleResult(synthetic, outcome));
    }

    private ChatClassifyResponse classify(MessageModel message, ConversationModel conversation) {
        return classifier.classify(
                message.getContent(),
                conversation.getId()
        );
    }

    private Optional<ChatFlowHandleResult> continueActiveFlows(
            ConversationModel conversation,
            MessageModel message,
            ChatClassifyResponse classification
    ) {
        List<PendingFlowState> activeFlows = conversation.getActiveFlows();
        if (activeFlows == null) {
            return Optional.empty();
        }
        for (int index = activeFlows.size() - 1; index >= 0; index--) {
            PendingFlowState flow = activeFlows.get(index);
            ChatFlowService flowService = flowServicesByIntent.get(flow.intent());
            if (flowService == null) {
                continue;
            }
            Optional<ChatIntentOutcome> outcome = flowService.tryContinue(
                    conversation,
                    flow,
                    message,
                    classification
            );
            if (outcome.isEmpty()) {
                outcome = flowService.tryResumeSlotAnswer(conversation, flow, message, classification);
            }
            if (outcome.isPresent()) {
                return Optional.of(new ChatFlowHandleResult(classification, outcome.get()));
            }
        }
        return Optional.empty();
    }

    private ChatFlowHandleResult buildHandleResult(
            ConversationModel conversation,
            MessageModel message,
            ChatClassifyResponse classification
    ) {
        return new ChatFlowHandleResult(
                classification,
                dispatchNewIntent(conversation, message, classification)
        );
    }

    private boolean shouldSwitchToNewIntent(
            ChatClassifyResponse classification,
            ConversationModel conversation
    ) {
        if (conversation.getActiveFlows() == null || conversation.getActiveFlows().isEmpty()) {
            return false;
        }
        double confidence = classification.getConfidence() != null ? classification.getConfidence() : 0.0;
        if (confidence < aiServiceConfigPort.switchIntentThreshold()) {
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
            ChatClassifyResponse classification
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

    private ChatIntentHandlerStrategy handlerFor(ChatIntent intent) {
        if (intent == null) {
            return unknownIntentHandler;
        }
        return handlers.getOrDefault(intent, unknownIntentHandler);
    }

    private static boolean isScheduleRestartToken(String content) {
        return content != null && ChatScheduleConstants.TOKEN_RESTART.equals(content.trim());
    }

    private static ChatClassifyResponse syntheticScheduleClassification() {
        return ChatClassifyResponse.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(1.0)
                .entities(new HashMap<>())
                .build();
    }
}

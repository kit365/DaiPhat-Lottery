package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.*;

@Component
@RequiredArgsConstructor
public class ChatScheduleFlowRecovery {

    private final ChatScheduleFlowRecoveryReader recoveryReader;

    public Optional<PendingFlowState> restoreIfNeeded(ConversationModel conversation, PendingFlowState currentFlow) {
        if (conversation == null || conversation.getId() == null) {
            return Optional.ofNullable(currentFlow);
        }

        PendingFlowState latest = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElse(currentFlow);
        if (isFullyRecoverable(latest)) {
            return Optional.of(latest);
        }

        List<MessageModel> botMessages = recoveryReader.fetchRecentBotTokens(conversation.getId());
        if (!isRecoverableFromHistory(botMessages)) {
            return Optional.ofNullable(latest);
        }
        Optional<PendingFlowState> rebuilt = rebuildFromBotTokens(latest, botMessages);
        if (rebuilt.isPresent()) {
            conversation.upsertFlow(rebuilt.get());
            return rebuilt;
        }
        return Optional.ofNullable(latest);
    }

    private boolean isRecoverableFromHistory(List<MessageModel> botMessages) {
        if (botMessages == null || botMessages.isEmpty()) {
            return false;
        }
        for (MessageModel botMessage : botMessages) {
            String token = botMessage.getContent();
            if (token == null || token.isBlank()) {
                continue;
            }
            String trimmed = token.trim();
            if (trimmed.startsWith(TOKEN_RESULT_PREFIX) || TOKEN_RESTART.equals(trimmed)) {
                return false;
            }
            if (pendingSlotFromToken(trimmed).isPresent()) {
                return true;
            }
        }
        return false;
    }

    private Optional<PendingFlowState> rebuildFromBotTokens(PendingFlowState currentFlow, List<MessageModel> botMessages) {
        if (botMessages == null || botMessages.isEmpty()) {
            return Optional.empty();
        }

        PendingFlowState base = currentFlow != null && ChatIntent.WEB_SCHEDULE.name().equals(currentFlow.intent())
                ? currentFlow
                : PendingFlowState.create(ChatIntent.WEB_SCHEDULE.name());

        Map<String, String> mergedSlots = new HashMap<>(base.mutableCollectedSlots());
        mergeSlotContextFromHistory(botMessages, mergedSlots);

        String pendingSlot = resolveNewestPendingSlot(botMessages);
        if (pendingSlot == null || pendingSlot.isBlank()) {
            pendingSlot = base.pendingSlot();
        }
        if (pendingSlot == null || pendingSlot.isBlank()) {
            return Optional.empty();
        }

        inferScopeFromHistory(botMessages, mergedSlots, pendingSlot);

        PendingFlowState restored = base.withPendingSlot(pendingSlot).withCollectedSlots(mergedSlots);
        if (!isFullyRecoverable(restored)) {
            return Optional.empty();
        }
        return Optional.of(restored);
    }

    private void mergeSlotContextFromHistory(List<MessageModel> botMessages, Map<String, String> mergedSlots) {
        List<MessageModel> chronological = chronological(botMessages);
        for (MessageModel botMessage : chronological) {
            mergeTokenContext(botMessage.getContent(), mergedSlots);
        }
    }

    private static String resolveNewestPendingSlot(List<MessageModel> botMessages) {
        for (MessageModel botMessage : botMessages) {
            Optional<String> pendingSlot = pendingSlotFromToken(botMessage.getContent());
            if (pendingSlot.isPresent()) {
                return pendingSlot.get();
            }
        }
        return null;
    }

    private static void inferScopeFromHistory(
            List<MessageModel> botMessages,
            Map<String, String> mergedSlots,
            String pendingSlot
    ) {
        if (mergedSlots.get(SLOT_SCOPE) != null && !mergedSlots.get(SLOT_SCOPE).isBlank()) {
            return;
        }
        if (mergedSlots.get(SLOT_REGION) == null || mergedSlots.get(SLOT_REGION).isBlank()) {
            return;
        }
        if (!ChatSchedulePendingSlot.DATE_MODE.name().equals(pendingSlot)
                && !ChatSchedulePendingSlot.DATE.name().equals(pendingSlot)) {
            return;
        }

        boolean sawRegionChoice = false;
        boolean sawAskStation = false;
        for (MessageModel botMessage : chronological(botMessages)) {
            String token = botMessage.getContent();
            if (token == null || token.isBlank()) {
                continue;
            }
            if (token.startsWith(TOKEN_REGION_CHOICE_PREFIX)) {
                sawRegionChoice = true;
            }
            if (token.startsWith(TOKEN_ASK_STATION_PREFIX)) {
                sawAskStation = true;
            }
        }

        if (sawAskStation) {
            mergedSlots.put(SLOT_SCOPE, SCOPE_PICK_STATION);
        } else if (sawRegionChoice) {
            mergedSlots.put(SLOT_SCOPE, SCOPE_REGION_ALL);
        }
    }

    private static List<MessageModel> chronological(List<MessageModel> botMessages) {
        List<MessageModel> chronological = new ArrayList<>(botMessages);
        Collections.reverse(chronological);
        return chronological;
    }

    private static void mergeTokenContext(String token, Map<String, String> mergedSlots) {
        if (token == null || token.isBlank()) {
            return;
        }
        String trimmed = token.trim();

        if (trimmed.startsWith(TOKEN_REGION_CHOICE_PREFIX)) {
            String region = trimmed.substring(TOKEN_REGION_CHOICE_PREFIX.length()).trim();
            if (!region.isBlank()) {
                mergedSlots.put(SLOT_REGION, region);
            }
            return;
        }
        if (trimmed.startsWith(TOKEN_ASK_STATION_PREFIX)) {
            String region = trimmed.substring(TOKEN_ASK_STATION_PREFIX.length()).trim();
            if (!region.isBlank()) {
                mergedSlots.put(SLOT_REGION, region);
                mergedSlots.put(SLOT_SCOPE, SCOPE_PICK_STATION);
            }
            return;
        }
        if (trimmed.startsWith(TOKEN_CONFIRM_STATION_PREFIX)) {
            String confirmIds = parseConfirmStationIds(trimmed.substring(TOKEN_CONFIRM_STATION_PREFIX.length()).trim());
            if (!confirmIds.isBlank()) {
                mergedSlots.put(SLOT_CONFIRM_STATION_IDS, confirmIds);
            }
            return;
        }
        if (trimmed.startsWith(TOKEN_ASK_DATE_MODE + ":")) {
            mergeAskDateContext(trimmed.substring((TOKEN_ASK_DATE_MODE + ":").length()).trim(), mergedSlots);
            return;
        }
        if (trimmed.startsWith(TOKEN_ASK_DATE + ":")) {
            mergeAskDateContext(trimmed.substring((TOKEN_ASK_DATE + ":").length()).trim(), mergedSlots);
        }
    }

    private static Optional<String> pendingSlotFromToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String trimmed = token.trim();
        if (trimmed.startsWith(TOKEN_REGION_CHOICE_PREFIX)) {
            return Optional.of(ChatSchedulePendingSlot.LOCATION_CHOICE.name());
        }
        if (trimmed.startsWith(TOKEN_ASK_STATION_PREFIX)) {
            return Optional.of(ChatSchedulePendingSlot.LOCATION.name());
        }
        if (trimmed.startsWith(TOKEN_CONFIRM_STATION_PREFIX)) {
            return Optional.of(ChatSchedulePendingSlot.CONFIRM_STATION.name());
        }
        if (trimmed.startsWith(TOKEN_ASK_DATE_MODE + ":")) {
            return Optional.of(ChatSchedulePendingSlot.DATE_MODE.name());
        }
        if (trimmed.startsWith(TOKEN_ASK_DATE + ":")) {
            return Optional.of(ChatSchedulePendingSlot.DATE.name());
        }
        return switch (trimmed) {
            case TOKEN_ASK_DATE_MODE -> Optional.of(ChatSchedulePendingSlot.DATE_MODE.name());
            case TOKEN_ASK_DATE -> Optional.of(ChatSchedulePendingSlot.DATE.name());
            case TOKEN_ASK_LOCATION -> Optional.of(ChatSchedulePendingSlot.LOCATION.name());
            default -> Optional.empty();
        };
    }

    private static void mergeAskDateContext(String payload, Map<String, String> mergedSlots) {
        if (payload == null || payload.isBlank()) {
            return;
        }
        for (String part : payload.split(":")) {
            String trimmed = part.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            int separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0 || separatorIndex >= trimmed.length() - 1) {
                continue;
            }
            String key = trimmed.substring(0, separatorIndex).trim();
            String value = trimmed.substring(separatorIndex + 1).trim();
            if (key.isBlank() || value.isBlank()) {
                continue;
            }
            switch (key) {
                case RESULT_PARAM_REGION -> mergedSlots.put(SLOT_REGION, value);
                case RESULT_PARAM_STATION -> mergedSlots.put(SLOT_STATION_ID, value);
                case RESULT_PARAM_STATIONS -> mergedSlots.put(SLOT_STATION_IDS, value);
                case "scope" -> mergedSlots.put(SLOT_SCOPE, value);
                default -> {
                }
            }
        }
    }

    private boolean isFullyRecoverable(PendingFlowState flow) {
        if (flow == null || !ChatIntent.WEB_SCHEDULE.name().equals(flow.intent())) {
            return false;
        }
        if (flow.pendingSlot() == null || flow.pendingSlot().isBlank()) {
            return false;
        }
        ChatSchedulePendingSlot pendingSlot = ChatSchedulePendingSlot.valueOf(flow.pendingSlot());
        Map<String, String> slots = flow.collectedSlots() != null ? flow.collectedSlots() : Map.of();
        return switch (pendingSlot) {
            case LOCATION -> true;
            case LOCATION_CHOICE -> hasText(slots.get(SLOT_REGION));
            case CONFIRM_STATION -> hasText(slots.get(SLOT_CONFIRM_STATION_IDS));
            case DATE, DATE_MODE -> hasLocation(slots);
        };
    }

    private static boolean hasLocation(Map<String, String> slots) {
        return hasText(slots.get(SLOT_REGION))
                || hasText(slots.get(SLOT_STATION_ID))
                || hasText(slots.get(SLOT_STATION_IDS))
                || SCOPE_NATION_ALL.equals(slots.get(SLOT_SCOPE));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String parseConfirmStationIds(String payload) {
        if (payload == null || payload.isBlank()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (String part : payload.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            int colonIndex = trimmed.indexOf(':');
            String idPart = colonIndex >= 0 ? trimmed.substring(0, colonIndex).trim() : trimmed;
            if (idPart.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(',');
            }
            builder.append(idPart);
        }
        return builder.toString();
    }
}

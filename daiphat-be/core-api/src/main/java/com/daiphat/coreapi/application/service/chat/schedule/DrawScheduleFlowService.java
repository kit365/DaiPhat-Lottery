package com.daiphat.coreapi.application.service.chat.schedule;

import com.daiphat.coreapi.application.dto.chat.ScheduleSlots;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleDateExtraction;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleFuzzyCandidate;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationMatchResult;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowService;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.*;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleMessages.*;

@Service
@RequiredArgsConstructor
public class DrawScheduleFlowService implements ChatFlowService {

    private final ChatScheduleParser parser;
    private final ChatScheduleStationResolver stations;
    private final ChatScheduleFlowRecovery flowRecovery;

    @Override
    public String flowIntent() {
        return ChatIntent.WEB_SCHEDULE.name();
    }

    @Override
    public ChatIntentOutcome startFlow(
            ConversationModel conversation,
            MessageModel customerMessage,
            ChatClassifyResponseDto classification
    ) {
        conversation.clearPendingFlow(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        Optional<ChatIntentOutcome> earlyOutcome = mergeSlots(conversation, customerMessage.getContent(), classification);
        return earlyOutcome.orElseGet(() -> advanceFlow(conversation));
    }

    @Override
    public Optional<ChatIntentOutcome> tryResumeSlotAnswer(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel customerMessage,
            ChatClassifyResponseDto classification
    ) {
        if (!conversation.isBotOwned() || !parser.matchesSlotAnswer(customerMessage.getContent())) {
            return Optional.empty();
        }
        PendingFlowState activeFlow = flowRecovery.restoreIfNeeded(conversation, flow).orElse(null);
        if (activeFlow == null || activeFlow.pendingSlot() == null || activeFlow.pendingSlot().isBlank()) {
            return Optional.empty();
        }
        return tryContinue(conversation, activeFlow, customerMessage, classification);
    }

    @Override
    public Optional<ChatIntentOutcome> tryContinue(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel customerMessage,
            ChatClassifyResponseDto classification
    ) {
        if (!conversation.isBotOwned()) {
            return Optional.empty();
        }
        PendingFlowState activeFlow = flowRecovery.restoreIfNeeded(conversation, flow).orElse(null);
        if (activeFlow == null || activeFlow.pendingSlot() == null || activeFlow.pendingSlot().isBlank()) {
            return Optional.empty();
        }
        if (isScheduleRestartMessage(customerMessage.getContent())
                || isScheduleRestartQuery(customerMessage.getContent())) {
            conversation.clearPendingFlow(ChatIntent.WEB_SCHEDULE.name());
            return Optional.of(startFlow(conversation, customerMessage, classification));
        }
        mergeSlots(conversation, customerMessage.getContent(), classification);
        ChatIntentOutcome outcome = dispatchPendingSlot(conversation, customerMessage.getContent());
        return Optional.ofNullable(outcome);
    }

    private ChatIntentOutcome dispatchPendingSlot(ConversationModel conversation, String message) {
        ChatSchedulePendingSlot pendingSlot = conversation.getPendingSlot();
        if (pendingSlot == null) {
            return advanceFlow(conversation);
        }
        return switch (pendingSlot) {
            case LOCATION -> handleLocationSlot(conversation, message);
            case LOCATION_CHOICE -> handleLocationChoiceSlot(conversation, message);
            case DATE -> handleDateSlot(conversation, message);
            case DATE_MODE -> handleDateModeSlot(conversation, message);
            case CONFIRM_STATION -> handleConfirmStationSlot(conversation, message);
        };
    }

    private ChatIntentOutcome handleLocationSlot(ConversationModel conversation, String message) {
        String normalized = parser.normalize(message);

        if (mentionsNationAll(normalized)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_NATION_ALL);
            conversation.removeCollectedSlot(SLOT_REGION);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
            return advanceFlow(conversation);
        }

        if (mentionsSpecificStationChoice(normalized) && conversation.collectedSlot(SLOT_REGION) != null) {
            return promptPickStationInRegion(conversation);
        }

        ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(
                List<ChatScheduleFuzzyCandidate> candidates
        )) {
            return promptConfirmStations(conversation, candidates);
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single
                || resolveResult instanceof ChatScheduleStationResolveResult.Multiple) {
            return advanceFlow(conversation);
        }

        if (resolveRegion(conversation, message)) {
            return advanceFlow(conversation);
        }

        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);

        if (isPickingStationInRegion(conversation)) {
            if (!normalized.isBlank()) {
                return userFacingReply(STATION_NOT_FOUND);
            }
            return promptPickStationInRegion(conversation);
        }

        if (stations.hasYamlAliasHit(message)) {
            return userFacingReply(STATION_NOT_FOUND);
        }
        if (!normalized.isBlank()) {
            return userFacingReply(REGION_NOT_FOUND);
        }
        return botReply(ASK_LOCATION, TOKEN_ASK_LOCATION);
    }

    private boolean hasCollectedDate(ConversationModel conversation) {
        return ScheduleSlots.from(conversation).hasDate();
    }

    private boolean mentionsExplicitDateChoice(String message) {
        return parser.mentionsExplicitDateChoice(message);
    }

    private ChatIntentOutcome handleLocationChoiceSlot(ConversationModel conversation, String message) {
        String normalized = parser.normalize(message);
        if (mentionsAllDays(normalized) || parser.mentionsAllDaysFromMessage(message)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
            return handleDateModeSlot(conversation, message);
        }
        if (mentionsAllStations(normalized)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
            return advanceFlow(conversation);
        }
        if (mentionsSpecificStationChoice(normalized)) {
            return promptPickStationInRegion(conversation);
        }

        ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(var candidates)) {
            return promptConfirmStations(conversation, candidates);
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single
                || resolveResult instanceof ChatScheduleStationResolveResult.Multiple) {
            return advanceFlow(conversation);
        }

        if (resolveRegion(conversation, message)) {
            return advanceFlow(conversation);
        }

        String region = conversation.collectedSlot(SLOT_REGION);
        return botReply(formatRegionChoicePrompt(region), TOKEN_REGION_CHOICE_PREFIX + region);
    }

    private ChatIntentOutcome handleDateModeSlot(ConversationModel conversation, String message) {
        if (isScheduleRestartMessage(message)) {
            conversation.clearPendingFlow(ChatIntent.WEB_SCHEDULE.name());
            conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
            conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
            return botReply(ASK_LOCATION, TOKEN_ASK_LOCATION);
        }
        if (parser.mentionsScheduleIntent(message) && !mentionsExplicitDateChoice(message)) {
            if (!ScheduleSlots.from(conversation).hasLocation()) {
                conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
                return botReply(ASK_LOCATION, TOKEN_ASK_LOCATION);
            }
        }

        String normalized = parser.normalize(message);
        if (mentionsAllDays(normalized) || parser.mentionsAllDaysFromMessage(message)) {
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
            conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            return advanceFlow(conversation);
        }
        if (parser.mentionsRelativeToday(message)) {
            applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
            return advanceFlow(conversation);
        }
        if (parser.mentionsRelativeTomorrow(message)) {
            applyDateExtraction(conversation, ChatScheduleDateExtraction.tomorrow());
            return advanceFlow(conversation);
        }
        if (parser.mentionsDateModePick(message)) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
            return botReply(ASK_DATE, TOKEN_ASK_DATE);
        }

        ChatScheduleDateExtraction extraction = parser.extractExtraction(message);
        if (extraction.invalidDateAttempt()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
            return userFacingReply(DATE_NOT_FOUND);
        }
        if (extraction.mode() != null) {
            applyDateExtraction(conversation, extraction);
            return advanceFlow(conversation);
        }

        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        return botReply(ASK_DATE_MODE, TOKEN_ASK_DATE_MODE);
    }

    private ChatIntentOutcome handleDateSlot(ConversationModel conversation, String message) {
        ChatScheduleDateExtraction extraction = parser.extractExtraction(message);
        if (extraction.invalidDateAttempt()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
            return userFacingReply(DATE_NOT_FOUND);
        }
        if (extraction.mode() != null) {
            applyDateExtraction(conversation, extraction);
            return advanceFlow(conversation);
        }
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
        return botReply(ASK_DATE, TOKEN_ASK_DATE);
    }

    private ChatIntentOutcome handleConfirmStationSlot(ConversationModel conversation, String message) {
        List<Long> candidateIds = readConfirmStationIds(conversation);
        ChatScheduleStationResolveResult resolveResult = stations.resolve(message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)) {
            if (candidateIds.isEmpty() || candidateIds.contains(match.station().getId())) {
                applyStation(conversation, match.station());
                conversation.removeCollectedSlot(SLOT_CONFIRM_STATION_IDS);
                return advanceFlow(conversation);
            }
        }

        for (Long candidateId : candidateIds) {
            Optional<LotteryStationModel> station = stations.findActiveById(candidateId);
            if (station.isEmpty()) {
                continue;
            }
            String normalizedName = parser.normalize(station.get().getName());
            String normalizedMessage = parser.normalize(message);
            if (normalizedMessage.contains(normalizedName) || normalizedMessage.equals(String.valueOf(candidateId))) {
                applyStation(conversation, station.get());
                conversation.removeCollectedSlot(SLOT_CONFIRM_STATION_IDS);
                return advanceFlow(conversation);
            }
        }

        conversation.setPendingSlot(ChatSchedulePendingSlot.CONFIRM_STATION);
        return botReply(
                askConfirmStation(readConfirmStationNames(candidateIds)),
                buildConfirmStationToken(candidateIds, readConfirmStationNames(candidateIds))
        );
    }

    private ChatIntentOutcome advanceFlow(ConversationModel conversation) {
        Optional<ChatIntentOutcome> missingSlot = nextMissingSlot(conversation);
        return missingSlot.orElseGet(() -> executeAndClear(conversation));
    }

    private Optional<ChatIntentOutcome> nextMissingSlot(ConversationModel conversation) {
        ScheduleSlots slots = ScheduleSlots.from(conversation);

        if (!slots.hasLocation()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
            return Optional.of(botReply(ASK_LOCATION, TOKEN_ASK_LOCATION));
        }

        if (!slots.hasStation() && slots.region() != null && SCOPE_PICK_STATION.equals(slots.scope())) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
            return Optional.of(promptPickStationInRegion(conversation));
        }

        if (!slots.hasStation() && slots.region() != null && slots.scope() == null && !shouldAutoRegionAll(conversation)) {
            if (conversation.getPendingSlot() == ChatSchedulePendingSlot.DATE_MODE
                    || conversation.getPendingSlot() == ChatSchedulePendingSlot.DATE) {
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            } else {
                conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
                return Optional.of(botReply(
                        formatRegionChoicePrompt(slots.region()),
                        TOKEN_REGION_CHOICE_PREFIX + slots.region()
                ));
            }
        }

        if (!slots.hasStation() && slots.region() != null && slots.scope() == null && shouldAutoRegionAll(conversation)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
        }

        if (!slots.hasDate()) {
            if (slots.hasStation()) {
                conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
                conversation.removeCollectedSlot(SLOT_DRAW_DATE);
                return Optional.empty();
            }
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
            return Optional.of(botReply(ASK_DATE_MODE, TOKEN_ASK_DATE_MODE));
        }

        if (slots.stationId() != null && slots.stationIds() == null) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
        } else if (slots.stationIds() != null && !slots.stationIds().isBlank()) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATIONS);
        } else if (SCOPE_REGION_ALL.equals(slots.scope()) || (slots.region() != null && slots.scope() == null)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
        }

        return Optional.empty();
    }

    private boolean shouldAutoRegionAll(ConversationModel conversation) {
        if (Boolean.parseBoolean(conversation.collectedSlot("regionAllIntent"))) {
            return true;
        }
        // Đã chọn ngày rồi mà chọn miền → xem tất cả đài miền đó trong ngày đó.
        return hasCollectedDate(conversation);
    }

    private ChatIntentOutcome executeAndClear(ConversationModel conversation) {
        ScheduleSlots slots = ScheduleSlots.from(conversation);

        boolean allDays = ChatScheduleDateMode.ALL_DAYS.name().equals(slots.dateMode());
        StringBuilder tokenBuilder = new StringBuilder(TOKEN_RESULT_PREFIX);

        if (SCOPE_STATIONS.equals(slots.scope()) && slots.stationIds() != null && !slots.stationIds().isBlank()) {
            tokenBuilder.append(RESULT_PARAM_STATIONS).append("=").append(slots.stationIds());
        } else if (SCOPE_STATION.equals(slots.scope()) && slots.stationId() != null) {
            tokenBuilder.append(RESULT_PARAM_STATION).append("=").append(slots.stationId());
        } else if (SCOPE_NATION_ALL.equals(slots.scope())) {
            tokenBuilder.append("scope=nation");
        } else if (slots.region() != null) {
            tokenBuilder.append(RESULT_PARAM_REGION).append("=").append(slots.region())
                    .append(":").append(RESULT_PARAM_SCOPE_ALL);
        } else if (slots.stationId() != null) {
            tokenBuilder.append(RESULT_PARAM_STATION).append("=").append(slots.stationId());
        } else {
            conversation.clearPendingFlow(ChatIntent.WEB_SCHEDULE.name());
            return botReply(ASK_LOCATION, TOKEN_ASK_LOCATION);
        }

        if (!allDays && slots.drawDate() != null && !slots.drawDate().isBlank()) {
            tokenBuilder.append(":").append(RESULT_PARAM_DATE).append("=").append(slots.drawDate());
        }

        String token = tokenBuilder.toString();
        conversation.clearPendingFlow(ChatIntent.WEB_SCHEDULE.name());
        return botReply(token, token);
    }

    private ChatIntentOutcome promptPickStationInRegion(ConversationModel conversation) {
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_PICK_STATION);
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        String region = conversation.collectedSlot(SLOT_REGION);
        if (region == null) {
            return botReply(ASK_LOCATION, TOKEN_ASK_LOCATION);
        }
        return botReply(
                formatAskStationInRegion(region),
                TOKEN_ASK_STATION_PREFIX + region
        );
    }

    private ChatIntentOutcome promptConfirmStations(
            ConversationModel conversation,
            List<ChatScheduleFuzzyCandidate> candidates
    ) {
        List<Long> ids = candidates.stream()
                .map(candidate -> candidate.station().getId())
                .toList();
        conversation.putCollectedSlot(SLOT_CONFIRM_STATION_IDS, joinIds(ids));
        conversation.setPendingSlot(ChatSchedulePendingSlot.CONFIRM_STATION);
        List<String> names = candidates.stream()
                .map(candidate -> candidate.station().getName())
                .toList();
        return botReply(
                askConfirmStation(names),
                buildConfirmStationToken(ids, names)
        );
    }

    private Optional<ChatIntentOutcome> mergeSlots(
            ConversationModel conversation,
            String message,
            ChatClassifyResponseDto classification
    ) {
        Optional<ChatIntentOutcome> earlyOutcome = mergeFromMessage(conversation, message);
        if (earlyOutcome.isPresent()) {
            return earlyOutcome;
        }
        if (isScheduleRestartMessage(message) || isScheduleRestartQuery(message)) {
            return Optional.empty();
        }
        if (classification == null || classification.getEntities() == null) {
            return Optional.empty();
        }
        Map<String, String> entities = classification.getEntities();
        if (entities.get(ENTITY_REGION) != null) {
            conversation.putCollectedSlot(SLOT_REGION, entities.get(ENTITY_REGION));
        }
        if (entities.get(ENTITY_STATION_ID) != null) {
            conversation.putCollectedSlot(SLOT_STATION_ID, entities.get(ENTITY_STATION_ID));
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
        }
        if (entities.get(ENTITY_STATION_CANONICAL) != null && conversation.collectedSlot(SLOT_STATION_ID) == null) {
            stations.findActiveByCanonicalName(entities.get(ENTITY_STATION_CANONICAL))
                    .ifPresent(station -> applyStation(conversation, station));
        }
        if (entities.get(ENTITY_DRAW_DATE) != null && !mentionsAllDays(parser.normalize(message))
                && !parser.mentionsAllDaysFromMessage(message)) {
            conversation.putCollectedSlot(SLOT_DRAW_DATE, entities.get(ENTITY_DRAW_DATE));
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());
        }
        return Optional.empty();
    }

    private Optional<ChatIntentOutcome> mergeFromMessage(ConversationModel conversation, String message) {
        applyDateExtraction(conversation, parser.extractExtraction(message));

        if (parser.mentionsNationAll(message)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_NATION_ALL);
            conversation.removeCollectedSlot(SLOT_REGION);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
        }

        if (!isPickingStationInRegion(conversation)) {
            String region = parser.findRegionCode(message);
            if (region != null) {
                conversation.putCollectedSlot(SLOT_REGION, region);
                if (parser.mentionsRegionAllListIntent(message)) {
                    conversation.putCollectedSlot("regionAllIntent", "true");
                    conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
                    conversation.removeCollectedSlot(SLOT_STATION_ID);
                    conversation.removeCollectedSlot(SLOT_STATION_IDS);
                    return Optional.empty();
                }
            }
        }

        if (shouldSkipStationResolve(conversation, message)) {
            return Optional.empty();
        }

        ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(var candidates)) {
            return Optional.of(promptConfirmStations(conversation, candidates));
        }
        return Optional.empty();
    }

    private boolean shouldSkipStationResolve(ConversationModel conversation, String message) {
        if (SCOPE_NATION_ALL.equals(conversation.collectedSlot(SLOT_SCOPE))) {
            return true;
        }
        if (SCOPE_REGION_ALL.equals(conversation.collectedSlot(SLOT_SCOPE))) {
            return true;
        }
        if (isBareScheduleQuery(message)) {
            return true;
        }
        if (hasCollectedDate(conversation) && !ScheduleSlots.from(conversation).hasLocation()) {
            if (parser.findRegionCode(message) == null && hasNoExplicitStationCue(message)) {
                return true;
            }
        }
        if (shouldAutoRegionAll(conversation)) {
            return parser.findRegionCode(message) != null
                    || parser.mentionsRegionAllListIntent(message);
        }
        return parser.mentionsRegionAllListIntent(message);
    }

    private boolean hasNoExplicitStationCue(String message) {
        if (stations.hasYamlAliasHit(message)) {
            return false;
        }
        ChatScheduleStationResolveResult resolveResult = stations.resolve(message);
        return !(resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)
                && match.source() != ChatScheduleStationMatchSource.FUZZY
                || resolveResult instanceof ChatScheduleStationResolveResult.Multiple);
    }

    private boolean isBareScheduleQuery(String message) {
        if (!isScheduleRestartQuery(message)) {
            return false;
        }
        ChatScheduleDateExtraction extraction = parser.extractExtraction(message);
        return !extraction.isPresent() && !extraction.invalidDateAttempt();
    }

    private boolean isScheduleRestartMessage(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        if (TOKEN_RESTART.equals(message.trim())) {
            return true;
        }
        return parser.isRestartMessage(message);
    }

    private boolean isScheduleRestartQuery(String message) {
        if (parser.matchesSlotAnswer(message) && !isScheduleRestartMessage(message)) {
            return false;
        }
        if (!parser.mentionsScheduleIntent(message)) {
            return false;
        }
        if (parser.findRegionCode(message) != null) {
            return false;
        }
        return hasNoExplicitStationCue(message);
    }

    private ChatScheduleStationResolveResult applyStationResolve(ConversationModel conversation, String message) {
        if (shouldSkipStationResolve(conversation, message)) {
            return ChatScheduleStationResolveResult.None.INSTANCE;
        }
        ChatScheduleStationResolveResult resolveResult = stations.resolve(message);

        if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous) {
            return resolveResult;
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)) {
            if (!stationMatchesRegionContext(conversation, match.station())) {
                return ChatScheduleStationResolveResult.None.INSTANCE;
            }
            applyStation(conversation, match.station());
            return resolveResult;
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Multiple(var matches)) {
            List<LotteryStationModel> stations = matches.stream()
                    .map(ChatScheduleStationMatchResult::station)
                    .filter(station -> stationMatchesRegionContext(conversation, station))
                    .toList();
            if (stations.isEmpty()) {
                return ChatScheduleStationResolveResult.None.INSTANCE;
            }
            applyStations(conversation, stations);
        }
        return resolveResult;
    }

    private boolean resolveRegion(ConversationModel conversation, String message) {
        if (isPickingStationInRegion(conversation)) {
            return false;
        }
        String region = parser.findRegionCode(message);
        if (region != null) {
            conversation.putCollectedSlot(SLOT_REGION, region);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
            if (parser.mentionsRegionAllListIntent(message)) {
                conversation.putCollectedSlot("regionAllIntent", "true");
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            } else {
                conversation.removeCollectedSlot(SLOT_SCOPE);
            }
            return true;
        }
        return false;
    }

    private void applyDateExtraction(ConversationModel conversation, ChatScheduleDateExtraction extraction) {
        if (extraction == null || extraction.invalidDateAttempt()) {
            return;
        }
        if (!extraction.isPresent()) {
            return;
        }
        if (extraction.mode() == ChatScheduleDateMode.ALL_DAYS) {
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
            conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            return;
        }
        extraction.resolvedDate().ifPresent(date -> {
            conversation.putCollectedSlot(SLOT_DRAW_DATE, date.toString());
            conversation.putCollectedSlot(
                    SLOT_DATE_MODE,
                    extraction.mode() != null ? extraction.mode().name() : ChatScheduleDateMode.SPECIFIC_DATE.name()
            );
        });
    }

    private boolean stationMatchesRegionContext(ConversationModel conversation, LotteryStationModel station) {
        if (!isPickingStationInRegion(conversation)) {
            return true;
        }
        String expectedRegion = conversation.collectedSlot(SLOT_REGION);
        if (expectedRegion == null || station.getRegion() == null || station.getRegion().region() == null) {
            return true;
        }
        return expectedRegion.equalsIgnoreCase(station.getRegion().region());
    }

    private boolean isPickingStationInRegion(ConversationModel conversation) {
        return SCOPE_PICK_STATION.equals(conversation.collectedSlot(SLOT_SCOPE));
    }

    private void applyStation(ConversationModel conversation, LotteryStationModel station) {
        conversation.putCollectedSlot(SLOT_STATION_ID, String.valueOf(station.getId()));
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
        if (station.getRegion() != null && station.getRegion().region() != null) {
            conversation.putCollectedSlot(SLOT_REGION, station.getRegion().region());
        }
    }

    private void applyStations(ConversationModel conversation, List<LotteryStationModel> stations) {
        if (stations.size() == 1) {
            applyStation(conversation, stations.getFirst());
            return;
        }
        Set<Long> ids = stations.stream()
                .map(LotteryStationModel::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.putCollectedSlot(SLOT_STATION_IDS, joinIds(new ArrayList<>(ids)));
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATIONS);
        LotteryStationModel first = stations.getFirst();
        if (first.getRegion() != null && first.getRegion().region() != null) {
            conversation.putCollectedSlot(SLOT_REGION, first.getRegion().region());
        }
    }

    private boolean mentionsAllStations(String normalized) {
        return parser.mentionsAllStations(normalized);
    }

    private boolean mentionsAllDays(String normalized) {
        return parser.mentionsAllDays(normalized);
    }

    private boolean mentionsNationAll(String normalized) {
        return parser.mentionsNationAll(normalized);
    }

    private boolean mentionsSpecificStationChoice(String normalized) {
        return parser.mentionsSpecificStationChoice(normalized);
    }

    private String formatRegionChoicePrompt(String regionCode) {
        return askRegionChoice(formatRegionLabel(regionCode));
    }

    private String formatAskStationInRegion(String regionCode) {
        return askStationInRegion(formatRegionLabel(regionCode));
    }

    private String formatRegionLabel(String regionCode) {
        return LotteryRegionCode.fromCode(regionCode)
                .map(LotteryRegionCode::shortDisplayName)
                .orElse(regionCode != null ? regionCode : "");
    }

    private String buildConfirmStationToken(List<Long> stationIds, List<String> names) {
        StringBuilder builder = new StringBuilder(TOKEN_CONFIRM_STATION_PREFIX);
        for (int index = 0; index < stationIds.size(); index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(stationIds.get(index));
            if (names != null && index < names.size() && names.get(index) != null) {
                builder.append(':').append(names.get(index));
            }
        }
        return builder.toString();
    }



    private List<Long> readConfirmStationIds(ConversationModel conversation) {
        String raw = conversation.collectedSlot(SLOT_CONFIRM_STATION_IDS);
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<Long> ids = new ArrayList<>();
        for (String part : raw.split(",")) {
            try {
                ids.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException ignored) {
                // skip invalid
            }
        }
        return ids;
    }

    private List<String> readConfirmStationNames(List<Long> stationIds) {
        return stationIds.stream()
                .map(stations::findActiveById)
                .flatMap(Optional::stream)
                .map(LotteryStationModel::getName)
                .toList();
    }

    private String joinIds(List<Long> ids) {
        return ids.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private ChatIntentOutcome botReply(String text, String token) {
        String content = token != null && !token.isBlank() ? token : text;
        return new ChatIntentOutcome.BotReply(content, ChatIntent.WEB_SCHEDULE.name());
    }

    private ChatIntentOutcome userFacingReply(String text) {
        return new ChatIntentOutcome.BotReply(text, ChatIntent.WEB_SCHEDULE.name());
    }
}

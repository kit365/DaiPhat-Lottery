package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleDateExtraction;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleFuzzyCandidate;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationMatchResult;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.dto.chat.schedule.ScheduleSlots;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowService;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.*;

@Service
@RequiredArgsConstructor
public class DrawScheduleFlowService implements ChatFlowService {

    private static final String DEFAULT_SCHEDULE_REGION = LotteryRegionCode.MIEN_NAM.code();
    private static final LocalTime DRAW_CUTOFF = LocalTime.of(16, 15);
    private static final int STATION_LIST_PAGE_SIZE = 8;

    private final ChatScheduleParser parser;
    private final ChatScheduleStationResolver stations;
    private final ChatScheduleFlowRecovery flowRecovery;
    private final ChatMessageProperties chatMessageProperties;
    private final LotteryStationServicePort lotteryStationService;
    private final ChatTicketInventoryService chatTicketInventoryService;

    @Override
    public String flowIntent() {
        return ChatIntent.WEB_SCHEDULE.name();
    }

    @Override
    public ChatIntentOutcome startFlow(
            ConversationModel conversation,
            MessageModel customerMessage,
            ChatClassifyResponse classification
    ) {
        Optional<ChatIntentOutcome> showOutcome = tryHandleShowShortcut(conversation, customerMessage.getContent());
        if (showOutcome.isPresent()) {
            return showOutcome.get();
        }
        // Chọn đài từ chip: giữ context (ngày/goal) — không reset flow.
        if (parser.isSelectStationToken(customerMessage.getContent())) {
            flowRecovery.restoreIfNeeded(conversation, null);
            Optional<ChatIntentOutcome> selected = tryApplySelectStationToken(
                    conversation,
                    customerMessage.getContent(),
                    List.of()
            );
            if (selected.isPresent()) {
                return selected.get();
            }
        }
        if (parser.matchesSlotAnswer(customerMessage.getContent())) {
            Optional<ChatIntentOutcome> resumed = tryResumeSlotAnswer(
                    conversation,
                    null,
                    customerMessage,
                    classification
            );
            if (resumed.isPresent()) {
                return resumed.get();
            }
        }
        resetScheduleFlow(conversation);
        if (isBareScheduleQuery(customerMessage.getContent())) {
            if (!hasGoal(conversation)) {
                return askGoalReply(conversation);
            }
            return askDefaultRegionChoiceReply(conversation);
        }
        Optional<ChatIntentOutcome> weekdayInquiry = tryHandleWeekdayInquiry(
                conversation,
                customerMessage.getContent()
        );
        if (weekdayInquiry.isPresent()) {
            return weekdayInquiry.get();
        }
        Optional<ChatIntentOutcome> regionCatalog = tryHandleRegionStationCatalogInquiry(
                conversation,
                customerMessage.getContent()
        );
        if (regionCatalog.isPresent()) {
            return regionCatalog.get();
        }
        Optional<ChatIntentOutcome> earlyOutcome = mergeSlots(conversation, customerMessage.getContent(), classification);
        if (earlyOutcome.isPresent()) {
            return earlyOutcome.get();
        }
        Optional<ChatIntentOutcome> stationSchedule = tryHandleStationScheduleShortcut(
                conversation,
                customerMessage.getContent()
        );
        if (stationSchedule.isPresent()) {
            return stationSchedule.get();
        }
        return advanceFlow(conversation);
    }

    @Override
    public Optional<ChatIntentOutcome> tryResumeSlotAnswer(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel customerMessage,
            ChatClassifyResponse classification
    ) {
        if (!conversation.isBotOwned() || !parser.matchesSlotAnswer(customerMessage.getContent())) {
            return Optional.empty();
        }
        PendingFlowState activeFlow = flowRecovery.restoreIfNeeded(conversation, flow).orElse(null);

        // Chip chọn đài: áp dụng ngay sau khi restore (kể cả khi pending slot lệch).
        if (parser.isSelectStationToken(customerMessage.getContent())) {
            Optional<ChatIntentOutcome> selected = tryApplySelectStationToken(
                    conversation,
                    customerMessage.getContent(),
                    List.of()
            );
            if (selected.isPresent()) {
                return selected;
            }
        }

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
            ChatClassifyResponse classification
    ) {
        if (!conversation.isBotOwned()) {
            return Optional.empty();
        }
        PendingFlowState activeFlow = flowRecovery.restoreIfNeeded(conversation, flow).orElse(null);
        if (activeFlow == null || activeFlow.pendingSlot() == null || activeFlow.pendingSlot().isBlank()) {
            return Optional.empty();
        }
        // Do not force schedule slot answers when the user clearly asked for tickets / results.
        if (classification != null) {
            String intent = classification.getIntent();
            if (ChatIntent.WEB_SEARCH.name().equals(intent)
                    || ChatIntent.WEB_SUGGEST.name().equals(intent)
                    || ChatIntent.WEB_RESULT.name().equals(intent)) {
                return Optional.empty();
            }
        }
        if (isStandaloneTicketSuggestMessage(customerMessage.getContent())) {
            return Optional.empty();
        }
        if (parser.mentionsWeekdayInquiry(customerMessage.getContent())
                || parser.mentionsRegionStationCatalogQuestion(customerMessage.getContent())
                || parser.mentionsScheduleAndResult(customerMessage.getContent())
                || (parser.mentionsScheduleIntent(customerMessage.getContent())
                && !parser.isSelectStationToken(customerMessage.getContent())
                && !parser.isSetGoalToken(customerMessage.getContent()))) {
            // Câu hỏi lịch mới (vd. "xổ thứ mấy") — để startFlow xử lý, không gắn vào slot cũ.
            return Optional.empty();
        }
        Optional<String> setGoal = parser.parseSetGoal(customerMessage.getContent());
        if (setGoal.isPresent()) {
            resetScheduleFlow(conversation);
            applyGoal(conversation, setGoal.get());
            if (conversation.collectedSlot(SLOT_REGION) == null) {
                applyDefaultRegion(conversation);
            }
            return Optional.of(advanceFlow(conversation));
        }
        if (isScheduleRestartMessage(customerMessage.getContent())
                || isScheduleRestartQuery(customerMessage.getContent())) {
            resetScheduleFlow(conversation);
            if (isBareScheduleQuery(customerMessage.getContent())) {
                return Optional.of(askDefaultRegionChoiceReply(conversation));
            }
            return Optional.of(startFlow(conversation, customerMessage, classification));
        }
        mergeSlots(conversation, customerMessage.getContent(), classification);
        ChatIntentOutcome outcome = dispatchPendingSlot(conversation, customerMessage.getContent());
        return Optional.ofNullable(outcome);
    }

    private boolean isStandaloneTicketSuggestMessage(String message) {
        return parser.isStandaloneTicketSuggestMessage(message);
    }

    private ChatIntentOutcome dispatchPendingSlot(ConversationModel conversation, String message) {
        ChatSchedulePendingSlot pendingSlot = conversation.getPendingSlot();
        if (pendingSlot == null) {
            return advanceFlow(conversation);
        }
        return switch (pendingSlot) {
            case GOAL -> handleGoalSlot(conversation, message);
            case LOCATION -> handleLocationSlot(conversation, message);
            case LOCATION_CHOICE -> handleLocationChoiceSlot(conversation, message);
            case DATE -> handleDateSlot(conversation, message);
            case DATE_MODE -> handleDateModeSlot(conversation, message);
            case CONFIRM_STATION -> handleConfirmStationSlot(conversation, message);
        };
    }

    private ChatIntentOutcome handleGoalSlot(ConversationModel conversation, String message) {
        Optional<String> tokenGoal = parser.parseSetGoal(message);
        if (tokenGoal.isPresent()) {
            applyGoal(conversation, tokenGoal.get());
            return advanceFlow(conversation);
        }
        String normalized = parser.normalize(message);
        if (normalized.contains("ket qua")) {
            applyGoal(conversation, GOAL_RESULT);
            return advanceFlow(conversation);
        }
        if (normalized.contains("goi y") || normalized.contains("xem ve") || normalized.contains("mua ve")) {
            applyGoal(conversation, GOAL_TICKET);
            return advanceFlow(conversation);
        }
        if (normalized.contains("lich")) {
            applyGoal(conversation, GOAL_SCHEDULE);
            return advanceFlow(conversation);
        }
        conversation.setPendingSlot(ChatSchedulePendingSlot.GOAL);
        return askGoalReply(conversation);
    }

    private ChatIntentOutcome handleLocationSlot(ConversationModel conversation, String message) {
        Optional<ChatIntentOutcome> selectStation = tryApplySelectStationToken(conversation, message, List.of());
        if (selectStation.isPresent()) {
            return selectStation.get();
        }

        String normalized = parser.normalize(message);

        if (mentionsNationAll(normalized)) {
            applyDefaultRegion(conversation);
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
            return advanceFlow(conversation);
        }

        if (mentionsSpecificStationChoice(normalized) && conversation.collectedSlot(SLOT_REGION) != null) {
            return promptAllStationList(conversation, 0);
        }

        if (isScheduleMenuPhrase(message)) {
            if (!normalized.isBlank()) {
                return userFacingReply(scheduleMessages().getStationNotFound());
            }
            return promptAllStationList(conversation, 0);
        }

        ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(
                List<ChatScheduleFuzzyCandidate> candidates
        )) {
            return promptConfirmStations(conversation, candidates);
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)) {
            if (!stationMatchesRegionContext(conversation, match.station())) {
                return userFacingReply(scheduleMessages().getStationNotFound());
            }
            return afterStationSelected(conversation, match.station());
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Multiple) {
            return advanceFlow(conversation);
        }

        if (resolveRegion(conversation, message)) {
            return advanceFlow(conversation);
        }

        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);

        if (isPickingStationInRegion(conversation)) {
            if (!normalized.isBlank()) {
                return userFacingReply(scheduleMessages().getStationNotFound());
            }
            return promptAllStationList(conversation, 0);
        }

        if (stations.hasYamlAliasHit(message)) {
            return userFacingReply(scheduleMessages().getStationNotFound());
        }
        if (!normalized.isBlank()) {
            return userFacingReply(scheduleMessages().getRegionNotFound());
        }
        return askDefaultRegionChoiceReply(conversation);
    }

    private boolean hasCollectedDate(ConversationModel conversation) {
        return ScheduleSlots.from(conversation).hasDate();
    }

    private boolean mentionsExplicitDateChoice(String message) {
        return parser.mentionsExplicitDateChoice(message);
    }

    private ChatIntentOutcome handleLocationChoiceSlot(ConversationModel conversation, String message) {
        String normalized = parser.normalize(message);
        if (mentionsRegionTodayChoice(normalized, message)) {
            return applyRegionTodayIntent(conversation);
        }
        if (mentionsWeekScheduleChoice(normalized, message)) {
            return applyWeekScheduleIntent(conversation);
        }
        if (mentionsAllDays(normalized) || parser.mentionsAllDaysFromMessage(message)) {
            return applyWeekScheduleIntent(conversation);
        }
        if (mentionsAllStationsExact(normalized)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
            conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            return advanceFlow(conversation);
        }
        if (mentionsAllStationsContains(normalized)) {
            return applyRegionTodayIntent(conversation);
        }
        if (mentionsSpecificStationChoice(normalized)) {
            return promptAllStationList(conversation, 0);
        }

        if (isScheduleMenuPhrase(message)) {
            String region = conversation.collectedSlot(SLOT_REGION);
            if (region == null) {
                applyDefaultRegion(conversation);
                region = DEFAULT_SCHEDULE_REGION;
            }
            return botReply(formatRegionChoicePrompt(region), TOKEN_REGION_CHOICE_PREFIX + region);
        }

        ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(var candidates)) {
            return promptConfirmStations(conversation, candidates);
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)) {
            if (!stationMatchesRegionContext(conversation, match.station())) {
                return userFacingReply(scheduleMessages().getStationNotFound());
            }
            return afterStationSelected(conversation, match.station());
        }
        if (resolveResult instanceof ChatScheduleStationResolveResult.Multiple) {
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
            resetScheduleFlow(conversation);
            conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
            return askDefaultRegionChoiceReply(conversation);
        }
        if (parser.mentionsScheduleIntent(message) && !mentionsExplicitDateChoice(message)) {
            if (!ScheduleSlots.from(conversation).hasLocation()) {
                return askDefaultRegionChoiceReply(conversation);
            }
        }

        String normalized = parser.normalize(message);
        boolean resultGoal = isResultGoal(conversation);

        if (mentionsAllDays(normalized) || parser.mentionsAllDaysFromMessage(message)) {
            if (resultGoal) {
                conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
                return askResultDateModeReply(conversation);
            }
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
            conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            return advanceFlow(conversation);
        }
        if (parser.mentionsRelativeToday(message)) {
            applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
            return advanceFlow(conversation);
        }
        if (parser.mentionsRelativeTomorrow(message)) {
            if (resultGoal) {
                // Kết quả không hỏi "ngày mai" — quay lại chọn ngày hợp lệ.
                conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
                return askResultDateModeReply(conversation);
            }
            applyDateExtraction(conversation, ChatScheduleDateExtraction.tomorrow());
            return advanceFlow(conversation);
        }
        if (parser.mentionsDateModePick(message)) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
            return askDateReply(conversation);
        }

        ChatScheduleDateExtraction extraction = parser.extractExtraction(message);
        if (extraction.missingYearClarification()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
            return askDateYearReply(conversation, message);
        }
        if (extraction.invalidDateAttempt()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
            return userFacingReply(scheduleMessages().getDateNotFound());
        }
        if (extraction.mode() != null) {
            applyDateExtraction(conversation, extraction);
            return advanceFlow(conversation);
        }

        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        return resultGoal ? askResultDateModeReply(conversation) : askDateModeReply(conversation);
    }

    private ChatIntentOutcome handleDateSlot(ConversationModel conversation, String message) {
        ChatScheduleDateExtraction extraction = parser.extractExtraction(message);
        if (extraction.missingYearClarification()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
            return askDateYearReply(conversation, message);
        }
        if (extraction.invalidDateAttempt()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
            return userFacingReply(scheduleMessages().getDateNotFound());
        }
        if (extraction.mode() != null) {
            applyDateExtraction(conversation, extraction);
            return advanceFlow(conversation);
        }
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
        return askDateReply(conversation);
    }

    private ChatIntentOutcome handleConfirmStationSlot(ConversationModel conversation, String message) {
        List<Long> candidateIds = readConfirmStationIds(conversation);
        Optional<ChatIntentOutcome> selectStation = tryApplySelectStationToken(conversation, message, candidateIds);
        if (selectStation.isPresent()) {
            return selectStation.get();
        }

        ChatScheduleStationResolveResult resolveResult = stations.resolve(message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)) {
            if (candidateIds.isEmpty() || candidateIds.contains(match.station().getId())) {
                conversation.removeCollectedSlot(SLOT_CONFIRM_STATION_IDS);
                return afterStationSelected(conversation, match.station());
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
                conversation.removeCollectedSlot(SLOT_CONFIRM_STATION_IDS);
                return afterStationSelected(conversation, station.get());
            }
        }

        conversation.setPendingSlot(ChatSchedulePendingSlot.CONFIRM_STATION);
        return botReply(
                scheduleMessages().askConfirmStation(readConfirmStationNames(candidateIds)),
                buildConfirmStationToken(candidateIds, readConfirmStationNames(candidateIds))
        );
    }

    private ChatIntentOutcome advanceFlow(ConversationModel conversation) {
        Optional<ChatIntentOutcome> missingSlot = nextMissingSlot(conversation);
        return missingSlot.orElseGet(() -> executeAndClear(conversation));
    }

    private Optional<ChatIntentOutcome> nextMissingSlot(ConversationModel conversation) {
        if (isResultGoal(conversation)) {
            return nextMissingSlotForResult(conversation);
        }

        ScheduleSlots slots = ScheduleSlots.from(conversation);

        if (conversation.getPendingSlot() == ChatSchedulePendingSlot.GOAL) {
            return Optional.of(askGoalReply(conversation));
        }

        if (!slots.hasLocation()) {
            return Optional.of(askDefaultRegionChoiceReply(conversation));
        }

        if (!slots.hasStation() && slots.region() != null && SCOPE_PICK_STATION.equals(slots.scope())) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
            return Optional.of(promptAllStationList(conversation, 0));
        }

        if (SCOPE_REGION_TODAY.equals(slots.scope()) && !slots.hasDate()) {
            applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
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
            if (SCOPE_REGION_ALL.equals(slots.scope()) && shouldAutoRegionAll(conversation)) {
                applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
            } else {
                conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
                return Optional.of(askDateModeReply(conversation));
            }
        }

        if (slots.stationId() != null && slots.stationIds() == null) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
        } else if (slots.stationIds() != null && !slots.stationIds().isBlank()) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATIONS);
        } else if (SCOPE_REGION_ALL.equals(slots.scope()) || SCOPE_REGION_TODAY.equals(slots.scope())
                || (slots.region() != null && slots.scope() == null)) {
            if (!SCOPE_REGION_TODAY.equals(slots.scope())) {
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            }
        }

        return Optional.empty();
    }

    /** RESULT: hỏi ngày → chọn đài quay đúng ngày đó → hiện KQ full. */
    private Optional<ChatIntentOutcome> nextMissingSlotForResult(ConversationModel conversation) {
        ScheduleSlots slots = ScheduleSlots.from(conversation);

        if (!slots.hasDate()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
            return Optional.of(askResultDateModeReply(conversation));
        }

        if (!slots.hasStation()) {
            return Optional.of(promptStationsForResultDate(conversation));
        }

        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
        return Optional.empty();
    }

    private boolean isResultGoal(ConversationModel conversation) {
        return GOAL_RESULT.equals(conversation.collectedSlot(SLOT_GOAL));
    }

    private boolean isScheduleAndResultGoal(ConversationModel conversation) {
        return GOAL_SCHEDULE_AND_RESULT.equals(conversation.collectedSlot(SLOT_GOAL));
    }

    private boolean shouldAutoRegionAll(ConversationModel conversation) {
        if (Boolean.parseBoolean(conversation.collectedSlot(SLOT_REGION_ALL_INTENT))) {
            return true;
        }
        // Đã chọn ngày rồi mà chọn miền → xem tất cả đài miền đó trong ngày đó.
        return hasCollectedDate(conversation);
    }

    private ChatIntentOutcome executeAndClear(ConversationModel conversation) {
        ScheduleSlots slots = ScheduleSlots.from(conversation);
        String goal = conversation.collectedSlot(SLOT_GOAL);

        if (GOAL_TICKET.equals(goal)) {
            ChatIntentOutcome ticketOutcome = executeTicketGoal(slots);
            resetScheduleFlow(conversation);
            return ticketOutcome;
        }

        if (GOAL_SCHEDULE_AND_RESULT.equals(goal)) {
            return executeStationBundleAndClear(conversation, slots);
        }

        boolean allDays = ChatScheduleDateMode.ALL_DAYS.name().equals(slots.dateMode());
        boolean forceResultSummary = GOAL_RESULT.equals(goal);
        StringBuilder tokenBuilder = new StringBuilder(TOKEN_RESULT_PREFIX);

        if (SCOPE_STATIONS.equals(slots.scope()) && slots.stationIds() != null && !slots.stationIds().isBlank()) {
            tokenBuilder.append(RESULT_PARAM_STATIONS).append("=").append(slots.stationIds());
        } else if (SCOPE_STATION.equals(slots.scope()) && slots.stationId() != null) {
            tokenBuilder.append(RESULT_PARAM_STATION).append("=").append(slots.stationId());
        } else if (SCOPE_REGION_TODAY.equals(slots.scope()) && slots.region() != null) {
            tokenBuilder.append(RESULT_PARAM_REGION).append("=").append(slots.region())
                    .append(":").append(RESULT_PARAM_SCOPE_TODAY);
            List<Long> todayStationIds = resolveTodayStationIdsForRegion(slots.region());
            if (!todayStationIds.isEmpty()) {
                tokenBuilder.append(":").append(RESULT_PARAM_STATIONS).append("=").append(joinIds(todayStationIds));
            }
        } else if (SCOPE_NATION_ALL.equals(slots.scope())) {
            tokenBuilder.append("scope=nation");
        } else if (slots.region() != null) {
            tokenBuilder.append(RESULT_PARAM_REGION).append("=").append(slots.region())
                    .append(":").append(RESULT_PARAM_SCOPE_ALL);
        } else if (slots.stationId() != null) {
            tokenBuilder.append(RESULT_PARAM_STATION).append("=").append(slots.stationId());
        } else {
            resetScheduleFlow(conversation);
            return askDefaultRegionChoiceReply(conversation);
        }

        if (!allDays && slots.drawDate() != null && !slots.drawDate().isBlank()) {
            tokenBuilder.append(":").append(RESULT_PARAM_DATE).append("=").append(slots.drawDate());
        } else if (allDays && slots.stationId() != null) {
            parseStationId(slots.stationId()).flatMap(stations::findActiveById).ifPresent(station -> {
                LocalDate highlightDate = resolveStationHighlightDate(station);
                tokenBuilder.append(":").append(RESULT_PARAM_DATE).append("=").append(highlightDate);
            });
        } else if (SCOPE_REGION_TODAY.equals(slots.scope())) {
            tokenBuilder.append(":").append(RESULT_PARAM_DATE).append("=").append(DrawScheduleUtils.today());
        }

        String token = tokenBuilder.toString();
        if (forceResultSummary || shouldShowResultSummary(slots)) {
            token = buildResultSummaryToken(slots);
        }
        resetScheduleFlow(conversation);
        return terminalReply(token);
    }

    private ChatIntentOutcome executeStationBundleAndClear(ConversationModel conversation, ScheduleSlots slots) {
        if (!SCOPE_STATION.equals(slots.scope()) || slots.stationId() == null) {
            resetScheduleFlow(conversation);
            return askDefaultRegionChoiceReply(conversation);
        }
        Optional<LotteryStationModel> stationOpt = parseStationId(slots.stationId()).flatMap(stations::findActiveById);
        if (stationOpt.isEmpty()) {
            resetScheduleFlow(conversation);
            return userFacingReply(scheduleMessages().getStationNotFound());
        }
        LotteryStationModel station = stationOpt.get();
        LocalTime drawTime = station.getDrawTime() != null ? station.getDrawTime() : DRAW_CUTOFF;
        LocalDate resultDate = DrawScheduleUtils.resolveLastDrawDate(station.getDrawDays(), drawTime);
        String region = station.getRegion() != null && station.getRegion().region() != null
                ? station.getRegion().region()
                : DEFAULT_SCHEDULE_REGION;
        String dateLabel = resultDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        StringBuilder tokenBuilder = new StringBuilder(TOKEN_STATION_BUNDLE_PREFIX);
        tokenBuilder.append(RESULT_PARAM_STATION).append('=').append(station.getId());
        tokenBuilder.append(':').append(RESULT_PARAM_REGION).append('=').append(region);
        tokenBuilder.append(":stationName=").append(encodeTokenValue(station.getName()));
        tokenBuilder.append(':').append(RESULT_PARAM_DATE).append('=').append(resultDate);

        String displayText = scheduleMessages().stationBundleIntro(station.getName(), dateLabel);
        resetScheduleFlow(conversation);
        return botReply(displayText, tokenBuilder.toString());
    }

    private ChatIntentOutcome applyRegionTodayIntent(ConversationModel conversation) {
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_TODAY);
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
        return advanceFlow(conversation);
    }

    private ChatIntentOutcome applyWeekScheduleIntent(ConversationModel conversation) {
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
        conversation.removeCollectedSlot(SLOT_DRAW_DATE);
        return advanceFlow(conversation);
    }

    /**
     * Hub footer shortcut: SCHEDULE_SHOW:goal=SCHEDULE:region=MIEN_NAM:scope=all
     * → emit SCHEDULE_RESULT / SUMMARY ngay, không hỏi lại slot.
     */
    private Optional<ChatIntentOutcome> tryHandleShowShortcut(ConversationModel conversation, String message) {
        if (message == null || !message.trim().startsWith(TOKEN_SHOW_PREFIX)) {
            return Optional.empty();
        }
        Map<String, String> params = parseShowTokenParams(message.trim().substring(TOKEN_SHOW_PREFIX.length()));
        resetScheduleFlow(conversation);

        String goal = params.getOrDefault("goal", GOAL_SCHEDULE).toUpperCase();
        applyGoal(conversation, goal);

        // Kết quả: hỏi ngày — giữ đài nếu hub gửi station=.
        if (GOAL_RESULT.equals(goal)) {
            String stationId = params.get(RESULT_PARAM_STATION);
            if (stationId != null && !stationId.isBlank()) {
                parseStationId(stationId).flatMap(stations::findActiveById).ifPresentOrElse(
                        station -> applyStation(conversation, station),
                        () -> conversation.putCollectedSlot(SLOT_STATION_ID, stationId)
                );
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
            } else {
                applyDefaultRegion(conversation);
                conversation.removeCollectedSlot(SLOT_STATION_ID);
                conversation.removeCollectedSlot(SLOT_STATION_IDS);
                conversation.removeCollectedSlot(SLOT_SCOPE);
            }
            conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            conversation.removeCollectedSlot(SLOT_DATE_MODE);
            return Optional.of(askResultDateModeReply(conversation));
        }

        String stationId = params.get(RESULT_PARAM_STATION);
        String region = params.get(RESULT_PARAM_REGION);
        String scope = params.get("scope");
        String date = params.get(RESULT_PARAM_DATE);

        if (stationId != null && !stationId.isBlank()) {
            parseStationId(stationId).flatMap(stations::findActiveById).ifPresentOrElse(
                    station -> applyStation(conversation, station),
                    () -> conversation.putCollectedSlot(SLOT_STATION_ID, stationId)
            );
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
        } else {
            if (region == null || region.isBlank()) {
                region = DEFAULT_SCHEDULE_REGION;
            }
            conversation.putCollectedSlot(SLOT_REGION, region);
            if ("today".equalsIgnoreCase(scope)) {
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_TODAY);
                applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
            } else {
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
                conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
                conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            }
        }

        if (date != null && !date.isBlank()) {
            if ("today".equalsIgnoreCase(date)) {
                applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
            } else if ("tomorrow".equalsIgnoreCase(date)) {
                applyDateExtraction(conversation, ChatScheduleDateExtraction.tomorrow());
            } else {
                conversation.putCollectedSlot(SLOT_DRAW_DATE, date);
                conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());
            }
        } else if (stationId != null && conversation.collectedSlot(SLOT_DATE_MODE) == null) {
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
        }

        if (GOAL_TICKET.equals(goal)) {
            ScheduleSlots slots = ScheduleSlots.from(conversation);
            ChatIntentOutcome ticketOutcome = executeTicketGoal(slots);
            resetScheduleFlow(conversation);
            return Optional.of(ticketOutcome);
        }

        return Optional.of(executeAndClear(conversation));
    }

    private static Map<String, String> parseShowTokenParams(String payload) {
        Map<String, String> params = new HashMap<>();
        if (payload == null || payload.isBlank()) {
            return params;
        }
        for (String part : payload.split(":")) {
            int eq = part.indexOf('=');
            if (eq <= 0 || eq >= part.length() - 1) {
                continue;
            }
            params.put(part.substring(0, eq).trim(), part.substring(eq + 1).trim());
        }
        return params;
    }

    private ChatIntentOutcome promptPickStationList(ConversationModel conversation) {
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_PICK_STATION);
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        String region = conversation.collectedSlot(SLOT_REGION);
        if (region == null) {
            applyDefaultRegion(conversation);
            region = DEFAULT_SCHEDULE_REGION;
        }
        final String regionFilter = region;
        LocalDate drawDate = resolveCollectedDrawDate(conversation).orElse(DrawScheduleUtils.today());
        List<LotteryStationResponse> stationsOnDate = lotteryStationService.getByDrawDate(drawDate).stream()
                .filter(station -> regionFilter.equalsIgnoreCase(station.region()))
                .toList();
        String token = buildPickStationListToken(regionFilter, drawDate, stationsOnDate, null);
        return botReply(formatAskStationInRegion(regionFilter), token);
    }

    private ChatIntentOutcome promptStationsForResultDate(ConversationModel conversation) {
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_PICK_STATION);
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        if (conversation.collectedSlot(SLOT_REGION) == null) {
            applyDefaultRegion(conversation);
        }
        final String regionFilter = conversation.collectedSlot(SLOT_REGION);
        LocalDate drawDate = resolveCollectedDrawDate(conversation).orElse(DrawScheduleUtils.today());
        List<LotteryStationResponse> stationsOnDate = lotteryStationService.getByDrawDate(drawDate).stream()
                .filter(station -> regionFilter == null || regionFilter.equalsIgnoreCase(station.region()))
                .toList();
        if (stationsOnDate.isEmpty()) {
            stationsOnDate = lotteryStationService.getByDrawDate(drawDate);
        }
        String dateLabel = formatDisplayDate(drawDate);
        if (stationsOnDate.isEmpty()) {
            conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
            return userFacingReply(scheduleMessages().askResultNoStation(dateLabel));
        }
        String regionForToken = regionFilter != null ? regionFilter : DEFAULT_SCHEDULE_REGION;
        String token = buildPickStationListToken(regionForToken, drawDate, stationsOnDate, GOAL_RESULT);
        return botReply(scheduleMessages().askResultStation(dateLabel), token);
    }

    private Optional<LocalDate> resolveCollectedDrawDate(ConversationModel conversation) {
        String raw = conversation.collectedSlot(SLOT_DRAW_DATE);
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDate.parse(raw.trim()));
        } catch (DateTimeParseException ex) {
            return Optional.empty();
        }
    }

    private static String formatDisplayDate(LocalDate date) {
        if (date == null) {
            return "";
        }
        return String.format("%02d/%02d/%04d", date.getDayOfMonth(), date.getMonthValue(), date.getYear());
    }

    private String buildPickStationListToken(
            String region,
            LocalDate drawDate,
            List<LotteryStationResponse> todayStations
    ) {
        return buildPickStationListToken(region, drawDate, todayStations, null);
    }

    private String buildPickStationListToken(
            String region,
            LocalDate drawDate,
            List<LotteryStationResponse> todayStations,
            String goal
    ) {
        StringBuilder builder = new StringBuilder(TOKEN_PICK_STATION_LIST_PREFIX);
        // goal trước stations để không dính vào tên đài cuối (id:Name).
        if (goal != null && !goal.isBlank()) {
            builder.append(SLOT_GOAL).append('=').append(goal.trim().toUpperCase()).append(':');
        }
        builder.append(RESULT_PARAM_REGION).append('=').append(region)
                .append(':').append(RESULT_PARAM_DATE).append('=').append(drawDate);
        if (!todayStations.isEmpty()) {
            builder.append(':').append(RESULT_PARAM_STATIONS).append('=');
            for (int index = 0; index < todayStations.size(); index++) {
                if (index > 0) {
                    builder.append(',');
                }
                LotteryStationResponse station = todayStations.get(index);
                builder.append(station.id()).append(':').append(station.name());
            }
        }
        return builder.toString();
    }

    private String buildResultSummaryToken(ScheduleSlots slots) {
        StringBuilder builder = new StringBuilder(TOKEN_RESULT_SUMMARY_PREFIX);
        LocalDate today = DrawScheduleUtils.today();
        String rawDrawDate = slots.drawDate() != null && !slots.drawDate().isBlank()
                ? slots.drawDate()
                : today.toString();

        LocalDate parsedTarget;
        String resolvedDrawDate;
        try {
            parsedTarget = LocalDate.parse(rawDrawDate);
            resolvedDrawDate = rawDrawDate;
        } catch (DateTimeParseException ex) {
            parsedTarget = today;
            resolvedDrawDate = today.toString();
        }
        final LocalDate targetDate = parsedTarget;
        final String drawDate = resolvedDrawDate;

        String rawRegion = slots.region();
        final String region = (rawRegion == null || rawRegion.isBlank())
                ? resolveRegionFromStationSlots(slots).orElse(DEFAULT_SCHEDULE_REGION)
                : rawRegion;

        if (SCOPE_STATION.equals(slots.scope()) && slots.stationId() != null) {
            // Flow RESULT đã chọn đài theo ngày → luôn trả đúng đài đó.
            builder.append(RESULT_PARAM_STATION).append('=').append(slots.stationId());
            builder.append(':').append(RESULT_PARAM_REGION).append('=').append(region);
            parseStationId(slots.stationId())
                    .flatMap(stations::findActiveById)
                    .map(LotteryStationModel::getName)
                    .filter(name -> name != null && !name.isBlank())
                    .ifPresent(name -> builder.append(":stationName=").append(encodeTokenValue(name)));
        } else if (SCOPE_STATIONS.equals(slots.scope()) && slots.stationIds() != null && !slots.stationIds().isBlank()) {
            builder.append(RESULT_PARAM_STATIONS).append('=').append(slots.stationIds());
            builder.append(':').append(RESULT_PARAM_REGION).append('=').append(region);
        } else {
            builder.append(RESULT_PARAM_REGION).append('=').append(region);
            List<Long> dayStationIds = resolveStationIdsForRegionOnDate(region, targetDate);
            if (!dayStationIds.isEmpty()) {
                builder.append(':').append(RESULT_PARAM_STATIONS).append('=').append(joinIds(dayStationIds));
            }
        }

        builder.append(':').append(RESULT_PARAM_DATE).append('=').append(drawDate);
        return builder.toString();
    }

    private Optional<String> resolveRegionFromStationSlots(ScheduleSlots slots) {
        if (slots.stationId() == null) {
            return Optional.empty();
        }
        return parseStationId(slots.stationId())
                .flatMap(stations::findActiveById)
                .map(station -> station.getRegion() != null ? station.getRegion().region() : null)
                .filter(value -> value != null && !value.isBlank());
    }

    private List<Long> resolveTodayStationIdsForRegion(String region) {
        return resolveStationIdsForRegionOnDate(region, DrawScheduleUtils.today());
    }

    private List<Long> resolveStationIdsForRegionOnDate(String region, LocalDate drawDate) {
        if (region == null || region.isBlank() || drawDate == null) {
            return List.of();
        }
        return lotteryStationService.getByDrawDate(drawDate).stream()
                .filter(station -> region.equalsIgnoreCase(station.region()))
                .map(LotteryStationResponse::id)
                .toList();
    }

    private boolean shouldShowResultSummary(ScheduleSlots slots) {
        if (!isDrawCutoffPassed()) {
            return false;
        }
        if (SCOPE_REGION_TODAY.equals(slots.scope())) {
            return !slots.hasDate() || isTodayDate(slots.drawDate());
        }
        if (SCOPE_STATION.equals(slots.scope()) && slots.stationId() != null) {
            if (slots.hasDate()) {
                return isTodayDate(slots.drawDate());
            }
            LocalDate today = DrawScheduleUtils.today();
            return parseStationId(slots.stationId())
                    .flatMap(stations::findActiveById)
                    .map(station -> station.getDrawDays() != null && station.getDrawDays().contains(today.getDayOfWeek()))
                    .orElse(false);
        }
        if (SCOPE_STATIONS.equals(slots.scope())) {
            return !slots.hasDate() || isTodayDate(slots.drawDate());
        }
        return false;
    }

    private boolean isDrawCutoffPassed() {
        return !DrawScheduleUtils.nowTime().isBefore(DRAW_CUTOFF);
    }

    private boolean isTodayDate(String drawDate) {
        if (drawDate == null || drawDate.isBlank()) {
            return false;
        }
        try {
            return LocalDate.parse(drawDate).equals(DrawScheduleUtils.today());
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private boolean mentionsRegionTodayChoice(String normalized, String message) {
        return parser.mentionsRegionToday(normalized) || parser.mentionsRelativeToday(message);
    }

    private boolean mentionsWeekScheduleChoice(String normalized, String message) {
        return parser.mentionsWeekSchedule(normalized)
                || (mentionsAllDays(normalized) && !mentionsAllStations(normalized))
                || parser.mentionsAllDaysFromMessage(message) && !mentionsAllStations(normalized);
    }

    private boolean isScheduleMenuPhrase(String message) {
        String normalized = parser.normalize(message);
        return parser.mentionsSpecificStationChoice(normalized)
                || parser.mentionsRegionToday(normalized)
                || parser.mentionsWeekSchedule(normalized)
                || parser.mentionsRelativeToday(message)
                || parser.mentionsAllStationsContains(normalized);
    }

    private ChatIntentOutcome promptPickStationInRegion(ConversationModel conversation) {
        return promptAllStationList(conversation, 0);
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
                scheduleMessages().askConfirmStation(names),
                buildConfirmStationToken(ids, names)
        );
    }

    private Optional<ChatIntentOutcome> mergeSlots(
            ConversationModel conversation,
            String message,
            ChatClassifyResponse classification
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
        applyGoalFromMessage(conversation, message);
        parser.parseSetGoal(message).ifPresent(goal -> applyGoal(conversation, goal));

        Optional<ChatIntentOutcome> selectStation = tryApplySelectStationToken(conversation, message, List.of());
        if (selectStation.isPresent()) {
            return selectStation;
        }

        if (message != null && message.trim().startsWith(TOKEN_PICK_STATION_PAGE_PREFIX)) {
            int page = parseStationListPage(message);
            return Optional.of(promptAllStationList(conversation, page));
        }

        applyDateExtraction(conversation, parser.extractExtraction(message));

        Optional<ChatIntentOutcome> catalogOutcome = tryHandleRegionStationCatalogInquiry(conversation, message);
        if (catalogOutcome.isPresent()) {
            return catalogOutcome;
        }

        if (parser.mentionsNationAll(message)) {
            applyDefaultRegion(conversation);
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
            conversation.removeCollectedSlot(SLOT_STATION_ID);
            conversation.removeCollectedSlot(SLOT_STATION_IDS);
        }

        if (!isPickingStationInRegion(conversation)) {
            String region = parser.findRegionCode(message);
            if (region != null) {
                conversation.putCollectedSlot(SLOT_REGION, region);
                if (shouldUseRegionAllScope(message)) {
                    conversation.putCollectedSlot(SLOT_REGION_ALL_INTENT, "true");
                    conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
                    conversation.removeCollectedSlot(SLOT_STATION_ID);
                    conversation.removeCollectedSlot(SLOT_STATION_IDS);
                    clearDateSelectionForImplicitRegionAll(conversation, message);
                    if (!parser.mentionsExplicitDateChoice(message) && !hasCollectedDate(conversation)) {
                        applyDateExtraction(conversation, ChatScheduleDateExtraction.today());
                    }
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
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)
                && isPickingStationInRegion(conversation)) {
            return Optional.of(afterStationSelected(conversation, match.station()));
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
        if (SCOPE_REGION_TODAY.equals(conversation.collectedSlot(SLOT_SCOPE))) {
            return true;
        }
        if (isScheduleMenuPhrase(message)) {
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
        ChatScheduleStationResolveResult resolveResult = stations.resolveExplicit(message);
        return !(resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)
                && match.source() != ChatScheduleStationMatchSource.FUZZY
                || resolveResult instanceof ChatScheduleStationResolveResult.Multiple);
    }

    private boolean isBareScheduleQuery(String message) {
        if (message != null && TOKEN_RESTART.equals(message.trim())) {
            return true;
        }
        if (!parser.matchesBareSchedulePrompt(message) && !isScheduleRestartQuery(message)) {
            return false;
        }
        ChatScheduleDateExtraction extraction = parser.extractExtraction(message);
        return parser.findRegionCode(message) == null
                && hasNoExplicitStationCue(message)
                && !extraction.isPresent()
                && !extraction.invalidDateAttempt();
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
            if (shouldUseRegionAllScope(message)) {
                conversation.putCollectedSlot(SLOT_REGION_ALL_INTENT, "true");
                conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);
                clearDateSelectionForImplicitRegionAll(conversation, message);
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

    private boolean mentionsAllStationsExact(String normalized) {
        return parser.mentionsAllStationsExact(normalized);
    }

    private boolean mentionsAllStationsContains(String normalized) {
        return parser.mentionsAllStationsContains(normalized);
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

    private boolean shouldUseRegionAllScope(String message) {
        if (parser.mentionsRegionStationCatalogQuestion(message)) {
            return false;
        }
        return parser.mentionsRegionAllListIntent(message) || isImplicitRegionAllQuery(message);
    }

    private boolean isImplicitRegionAllQuery(String message) {
        return parser.mentionsScheduleIntent(message)
                && parser.findRegionCode(message) != null
                && !parser.mentionsExplicitDateChoice(message)
                && !stations.hasYamlAliasHit(message)
                && !parser.mentionsSpecificStationChoice(parser.normalize(message));
    }

    private void clearDateSelectionForImplicitRegionAll(ConversationModel conversation, String message) {
        if (parser.mentionsExplicitDateChoice(message)) {
            return;
        }
        conversation.removeCollectedSlot(SLOT_DRAW_DATE);
        conversation.removeCollectedSlot(SLOT_DATE_MODE);
    }

    private String formatRegionChoicePrompt(String regionCode) {
        return scheduleMessages().askRegionChoice(formatRegionLabel(regionCode));
    }

    private String formatAskStationInRegion(String regionCode) {
        return scheduleMessages().askStationInRegion(formatRegionLabel(regionCode));
    }

    private String formatRegionLabel(String regionCode) {
        return LotteryRegionCode.fromCode(regionCode)
                .map(LotteryRegionCode::displayName)
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

    private void resetScheduleFlow(ConversationModel conversation) {
        conversation.clearPendingFlow(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
    }

    private void applyDefaultRegion(ConversationModel conversation) {
        conversation.putCollectedSlot(SLOT_REGION, DEFAULT_SCHEDULE_REGION);
    }

    private ChatIntentOutcome askDefaultRegionChoiceReply(ConversationModel conversation) {
        applyDefaultRegion(conversation);
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        return botReply(
                scheduleMessages().askRegionChoice(formatRegionLabel(DEFAULT_SCHEDULE_REGION)),
                TOKEN_REGION_CHOICE_PREFIX + DEFAULT_SCHEDULE_REGION
        );
    }

    private ChatIntentOutcome askLocationReply(ConversationModel conversation) {
        return askDefaultRegionChoiceReply(conversation);
    }

    private ChatIntentOutcome askDateReply(ConversationModel conversation) {
        ScheduleSlots slots = ScheduleSlots.from(conversation);
        String token = TOKEN_ASK_DATE;
        if (slots.stationId() != null) {
            token = TOKEN_ASK_DATE + ":" + RESULT_PARAM_STATION + "=" + slots.stationId();
        }
        return botReply(scheduleMessages().getAskDate(), token);
    }

    private ChatIntentOutcome askGoalReply(ConversationModel conversation) {
        conversation.setPendingSlot(ChatSchedulePendingSlot.GOAL);
        return botReply(scheduleMessages().getAskGoal(), TOKEN_ASK_GOAL);
    }

    private boolean hasGoal(ConversationModel conversation) {
        String goal = conversation.collectedSlot(SLOT_GOAL);
        return goal != null && !goal.isBlank();
    }

    private boolean shouldAskGoal(ConversationModel conversation) {
        ScheduleSlots slots = ScheduleSlots.from(conversation);
        return !hasGoal(conversation) && !slots.hasLocation() && !slots.hasDate();
    }

    private void applyGoal(ConversationModel conversation, String goal) {
        if (goal == null || goal.isBlank()) {
            return;
        }
        conversation.putCollectedSlot(SLOT_GOAL, goal.trim().toUpperCase());
    }

    private void applyGoalFromMessage(ConversationModel conversation, String message) {
        if (hasGoal(conversation) || message == null) {
            return;
        }
        String normalized = parser.normalize(message);
        boolean wantsSchedule = parser.mentionsScheduleIntent(message)
                || parser.mentionsWeekdayInquiry(message)
                || normalized.contains("lich quay")
                || normalized.contains("lich xo")
                || normalized.contains("lich ");
        boolean wantsResult = normalized.contains("ket qua")
                || normalized.contains("xo so")
                || normalized.contains("do ve");
        if (wantsSchedule && wantsResult) {
            applyGoal(conversation, GOAL_SCHEDULE_AND_RESULT);
            return;
        }
        if (wantsSchedule) {
            applyGoal(conversation, GOAL_SCHEDULE);
            return;
        }
        if (wantsResult) {
            applyGoal(conversation, GOAL_RESULT);
        } else if (normalized.contains("goi y") || normalized.contains("mua ve") || normalized.contains("xem ve")) {
            applyGoal(conversation, GOAL_TICKET);
        }
    }

    private Optional<ChatIntentOutcome> tryHandleRegionStationCatalogInquiry(
            ConversationModel conversation,
            String message
    ) {
        if (!parser.mentionsRegionStationCatalogQuestion(message)) {
            return Optional.empty();
        }
        String region = parser.findRegionCode(message);
        if (region == null) {
            region = DEFAULT_SCHEDULE_REGION;
        }
        resetScheduleFlow(conversation);
        return Optional.of(userFacingReply(buildRegionStationCatalogAnswer(region)));
    }

    /** Hỏi "xổ thứ mấy / ngày mấy / ngày gần nhất" → trả ngày quay gần nhất (dd/MM/yyyy). */
    private Optional<ChatIntentOutcome> tryHandleWeekdayInquiry(
            ConversationModel conversation,
            String message
    ) {
        if (!parser.mentionsWeekdayInquiry(message)) {
            return Optional.empty();
        }
        return completeStationWeekSchedule(conversation, message);
    }

    /**
     * Free-text nhắc đài + hỏi lịch/xổ → hiện lịch đài ngay (không hỏi "xem ngày nào?").
     */
    private Optional<ChatIntentOutcome> tryHandleStationScheduleShortcut(
            ConversationModel conversation,
            String message
    ) {
        if (isResultGoal(conversation) || !parser.looksLikeStationScheduleQuestion(message)) {
            return Optional.empty();
        }
        if (!ScheduleSlots.from(conversation).hasStation()) {
            ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
            if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(var candidates)) {
                applyGoal(conversation, GOAL_SCHEDULE);
                return Optional.of(promptConfirmStations(conversation, candidates));
            }
            if (!(resolveResult instanceof ChatScheduleStationResolveResult.Single)) {
                return Optional.empty();
            }
        }
        if (!ScheduleSlots.from(conversation).hasStation()) {
            return Optional.empty();
        }
        return completeStationWeekSchedule(conversation, message);
    }

    private Optional<ChatIntentOutcome> completeStationWeekSchedule(
            ConversationModel conversation,
            String message
    ) {
        applyGoalFromMessage(conversation, message);
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
        conversation.removeCollectedSlot(SLOT_DRAW_DATE);

        if (!ScheduleSlots.from(conversation).hasStation()) {
            ChatScheduleStationResolveResult resolveResult = applyStationResolve(conversation, message);
            if (resolveResult instanceof ChatScheduleStationResolveResult.Ambiguous(var candidates)) {
                return Optional.of(promptConfirmStations(conversation, candidates));
            }
            if (resolveResult instanceof ChatScheduleStationResolveResult.Single(var match)) {
                applyStation(conversation, match.station());
            }
        }

        if (ScheduleSlots.from(conversation).hasStation()) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
            Optional<LotteryStationModel> station = resolveCollectedStation(conversation);
            if (station.isPresent() && parser.mentionsWeekdayInquiry(message)) {
                resetScheduleFlow(conversation);
                return Optional.of(userFacingReply(buildStationNearestDrawDateAnswer(station.get())));
            }
            return Optional.of(executeAndClear(conversation));
        }
        return Optional.of(askDefaultRegionChoiceReply(conversation));
    }

    private Optional<LotteryStationModel> resolveCollectedStation(ConversationModel conversation) {
        return parseStationId(ScheduleSlots.from(conversation).stationId())
                .flatMap(stations::findActiveById);
    }

    private String buildStationNearestDrawDateAnswer(LotteryStationModel station) {
        LocalTime drawTime = station.getDrawTime() != null ? station.getDrawTime() : DRAW_CUTOFF;
        LocalDate nearestDraw = DrawScheduleUtils.resolveNextDrawDate(station.getDrawDays(), drawTime);
        String dateLabel = nearestDraw.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String timeLabel = drawTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
        String weekdays = formatStationDrawWeekdays(station);
        return scheduleMessages().stationNearestDrawDate(station.getName(), weekdays, dateLabel, timeLabel);
    }

    private String buildRegionStationCatalogAnswer(String regionCode) {
        var stationPage = lotteryStationService.getAll(
                1,
                100,
                null,
                null,
                null,
                regionCode,
                null,
                true,
                "name",
                "asc"
        );
        List<LotteryStationResponse> stationList = stationPage != null && stationPage.getRecordList() != null
                ? stationPage.getRecordList()
                : List.of();
        String numberedList = formatNumberedStationList(stationList);
        return scheduleMessages().regionStationCatalog(
                formatRegionLabel(regionCode),
                stationList.size(),
                numberedList
        );
    }

    private String formatNumberedStationList(List<LotteryStationResponse> stationList) {
        if (stationList == null || stationList.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < stationList.size(); index++) {
            if (index > 0) {
                builder.append('\n');
            }
            builder.append(index + 1).append(". ").append(stationList.get(index).name());
        }
        return builder.toString();
    }

    private String formatStationDrawWeekdays(LotteryStationModel station) {
        if (station.getDrawDays() == null || station.getDrawDays().isEmpty()) {
            return "";
        }
        return station.getDrawDays().stream()
                .map(DrawScheduleFlowService::toVietnameseDayLabel)
                .collect(Collectors.joining(", "));
    }

    private static String toVietnameseDayLabel(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "Thứ 2";
            case TUESDAY -> "Thứ 3";
            case WEDNESDAY -> "Thứ 4";
            case THURSDAY -> "Thứ 5";
            case FRIDAY -> "Thứ 6";
            case SATURDAY -> "Thứ 7";
            case SUNDAY -> "Chủ nhật";
        };
    }

    private ChatIntentOutcome afterStationSelected(ConversationModel conversation, LotteryStationModel station) {
        applyStation(conversation, station);
        if (isScheduleAndResultGoal(conversation)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.ALL_DAYS.name());
            conversation.removeCollectedSlot(SLOT_DRAW_DATE);
            return executeStationBundleAndClear(conversation, ScheduleSlots.from(conversation));
        }
        // Kết quả: đã có ngày + đài → hiện full KQ ngay, không hỏi lịch.
        if (isResultGoal(conversation) && hasCollectedDate(conversation)) {
            conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);
            conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());
            return executeAndClear(conversation);
        }
        if (isResultGoal(conversation) && !hasCollectedDate(conversation)) {
            return askResultDateModeReply(conversation);
        }
        if (hasCollectedDate(conversation)) {
            return advanceFlow(conversation);
        }
        return promptStationReady(conversation, station);
    }

    private Optional<ChatIntentOutcome> tryApplySelectStationToken(
            ConversationModel conversation,
            String message,
            List<Long> allowedIds
    ) {
        Optional<Long> tokenId = parser.parseSelectStationId(message);
        if (tokenId.isEmpty()) {
            return Optional.empty();
        }
        Optional<LotteryStationModel> station = stations.findActiveById(tokenId.get());
        if (station.isEmpty()) {
            return Optional.empty();
        }
        if (!allowedIds.isEmpty() && !allowedIds.contains(tokenId.get())) {
            return Optional.empty();
        }
        return Optional.of(afterStationSelected(conversation, station.get()));
    }

    private ChatIntentOutcome promptStationReady(ConversationModel conversation, LotteryStationModel station) {
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        String region = conversation.collectedSlot(SLOT_REGION);
        if (region == null && station.getRegion() != null) {
            region = station.getRegion().region();
        }
        StringBuilder tokenBuilder = new StringBuilder(TOKEN_STATION_READY_PREFIX);
        tokenBuilder.append(RESULT_PARAM_STATION).append('=').append(station.getId());
        if (region != null) {
            tokenBuilder.append(':').append(RESULT_PARAM_REGION).append('=').append(region);
        }
        tokenBuilder.append(":name=").append(station.getName());
        return botReply(scheduleMessages().stationReady(station.getName()), tokenBuilder.toString());
    }

    private ChatIntentOutcome executeTicketGoal(ScheduleSlots slots) {
        Long stationId = parseStationId(slots.stationId()).orElse(null);
        String drawDate = slots.drawDate();
        var tickets = chatTicketInventoryService.findAvailable(
                null,
                stationId,
                drawDate != null && !drawDate.isBlank() ? drawDate : ChatTicketInventoryService.DRAW_DATE_TODAY,
                ChatTicketInventoryService.DEFAULT_LIMIT
        );
        ChatTicketInventoryService.TicketInventoryReply reply =
                chatTicketInventoryService.formatReply(tickets, null, false);
        return new ChatIntentOutcome.BotReply(
                reply.content(),
                reply.displayContent(),
                ChatIntent.WEB_SUGGEST.name()
        );
    }

    private ChatIntentOutcome promptAllStationList(ConversationModel conversation, int page) {
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_PICK_STATION);
        conversation.removeCollectedSlot(SLOT_STATION_ID);
        conversation.removeCollectedSlot(SLOT_STATION_IDS);
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        String region = conversation.collectedSlot(SLOT_REGION);
        if (region == null) {
            applyDefaultRegion(conversation);
            region = DEFAULT_SCHEDULE_REGION;
        }
        final String regionFilter = region;
        var stationPage = lotteryStationService.getAll(
                page + 1,
                STATION_LIST_PAGE_SIZE,
                null,
                null,
                null,
                regionFilter,
                null,
                true,
                "name",
                "asc"
        );
        List<LotteryStationResponse> pageStations = stationPage != null && stationPage.getRecordList() != null
                ? stationPage.getRecordList()
                : List.of();
        boolean hasNext = stationPage != null
                && stationPage.getPagination() != null
                && !stationPage.getPagination().isLast();
        String token = buildAllStationListToken(regionFilter, page, pageStations, hasNext);
        return botReply(formatAskStationInRegion(regionFilter), token);
    }

    private String buildAllStationListToken(
            String region,
            int page,
            List<LotteryStationResponse> stationsOnPage,
            boolean hasNext
    ) {
        StringBuilder builder = new StringBuilder(TOKEN_PICK_STATION_LIST_PREFIX);
        builder.append(RESULT_PARAM_REGION).append('=').append(region)
                .append(":page=").append(page);
        if (!stationsOnPage.isEmpty()) {
            builder.append(':').append(RESULT_PARAM_STATIONS).append('=');
            for (int index = 0; index < stationsOnPage.size(); index++) {
                if (index > 0) {
                    builder.append(',');
                }
                LotteryStationResponse station = stationsOnPage.get(index);
                builder.append(station.id()).append(':').append(station.name());
            }
        }
        if (hasNext) {
            builder.append(":hasNext=true");
        }
        return builder.toString();
    }

    private int parseStationListPage(String message) {
        if (message == null || !message.trim().startsWith(TOKEN_PICK_STATION_PAGE_PREFIX)) {
            return 0;
        }
        String payload = message.trim().substring(TOKEN_PICK_STATION_PAGE_PREFIX.length());
        if (payload.startsWith("page=")) {
            try {
                return Math.max(0, Integer.parseInt(payload.substring(5).trim()) - 1);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private ChatIntentOutcome askDateYearReply(ConversationModel conversation, String message) {
        String shortDateLabel = parser.extractShortDateLabel(message);
        String reply = scheduleMessages().askDateYear(shortDateLabel);
        return userFacingReply(reply != null ? reply : scheduleMessages().getAskDate());
    }

    private ChatIntentOutcome askDateModeReply(ConversationModel conversation) {
        return botReply(scheduleMessages().getAskDateMode(), TOKEN_ASK_DATE_MODE);
    }

    private ChatIntentOutcome askResultDateModeReply(ConversationModel conversation) {
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        String prompt = scheduleMessages().getAskResultDateMode();
        if (prompt == null || prompt.isBlank()) {
            prompt = "Bạn muốn xem kết quả ngày nào?";
        }
        return botReply(prompt, TOKEN_ASK_DATE_MODE + ":goal=" + GOAL_RESULT);
    }

    private Optional<Long> parseStationId(String rawStationId) {
        if (rawStationId == null || rawStationId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(rawStationId.trim()));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    private LocalDate resolveStationHighlightDate(LotteryStationModel station) {
        LocalDate today = DrawScheduleUtils.today();
        if (station.getDrawDays() != null && station.getDrawDays().contains(today.getDayOfWeek())) {
            return today;
        }
        return DrawScheduleUtils.resolveNextDrawDate(station.getDrawDays(), station.getDrawTime());
    }

    private ChatIntentOutcome terminalReply(String token) {
        return botReply(token, token);
    }

    private ChatIntentOutcome botReply(String text, String token) {
        String content = token != null && !token.isBlank() ? token : text;
        return new ChatIntentOutcome.BotReply(content, text, ChatIntent.WEB_SCHEDULE.name());
    }

    private ChatIntentOutcome userFacingReply(String text) {
        return new ChatIntentOutcome.BotReply(text, text, ChatIntent.WEB_SCHEDULE.name());
    }

    private ChatMessageProperties.ScheduleMessages scheduleMessages() {
        return chatMessageProperties.getSchedule();
    }

    private static String encodeTokenValue(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

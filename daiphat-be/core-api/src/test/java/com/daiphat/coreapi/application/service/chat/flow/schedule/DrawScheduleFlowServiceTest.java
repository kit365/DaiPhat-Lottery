package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleDateExtraction;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleFuzzyCandidate;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationMatchResult;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleMessages;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleMessages.DATE_NOT_FOUND;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("DrawScheduleFlowService")
class DrawScheduleFlowServiceTest {

    private static ChatMessageProperties messageProperties() {
        ChatMessageProperties props = new ChatMessageProperties();
        ChatMessageProperties.ScheduleMessages schedule = new ChatMessageProperties.ScheduleMessages();
        schedule.setAskLocation(ChatScheduleMessages.ASK_LOCATION);
        schedule.setAskDate(ChatScheduleMessages.ASK_DATE);
        schedule.setAskDateMode(ChatScheduleMessages.ASK_DATE_MODE);
        schedule.setDateNotFound(ChatScheduleMessages.DATE_NOT_FOUND);
        schedule.setRegionNotFound(ChatScheduleMessages.REGION_NOT_FOUND);
        schedule.setStationNotFound(ChatScheduleMessages.STATION_NOT_FOUND);
        props.setSchedule(schedule);
        return props;
    }

    @Mock
    private ChatScheduleStationResolver stations;

    @Mock
    private ChatScheduleFlowRecovery flowRecovery;

    @Mock
    private LotteryStationServicePort lotteryStationService;

    @Mock
    private ChatTicketInventoryService chatTicketInventoryService;

    private DrawScheduleFlowService flowService;
    private ChatScheduleParser parser;

    @BeforeEach
    void setUp() {
        ChatScheduleProperties properties = ChatScheduleTestFixtures.minimalProperties();
        parser = spy(new ChatScheduleParser(properties, stations));
        flowService = new DrawScheduleFlowService(
                parser, stations, flowRecovery, messageProperties(), lotteryStationService, chatTicketInventoryService);
        when(lotteryStationService.getByDrawDate(any())).thenReturn(List.of());
        when(flowRecovery.restoreIfNeeded(any(), any())).thenAnswer(invocation -> {
            PendingFlowState flow = invocation.getArgument(1);
            if (flow != null) {
                return Optional.of(flow);
            }
            ConversationModel conversation = invocation.getArgument(0);
            return conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name());
        });
        when(stations.resolve(anyString())).thenReturn(ChatScheduleStationResolveResult.None.INSTANCE);
    }

    @Test
    void startFlow_lichMoThuong_asksLocation() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch mở thưởng");

        when(parser.extractExtraction("lịch mở thưởng")).thenReturn(ChatScheduleDateExtraction.empty());

        ChatIntentOutcome outcome = flowService.startFlow(
                conversation,
                message,
                classification(Map.of())
        );

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
    }

    @Test
    void startFlow_lichMoThuongThu3_asksLocationNotStationConfirm() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch mở thưởng thứ 3");

        LocalDate tuesday = ChatScheduleParser.nextOrSame(LocalDate.now(), java.time.DayOfWeek.TUESDAY);
        when(parser.extractExtraction("lịch mở thưởng thứ 3"))
                .thenReturn(ChatScheduleDateExtraction.specific(tuesday));

        ChatIntentOutcome outcome = flowService.startFlow(
                conversation,
                message,
                classification(Map.of())
        );

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_DRAW_DATE)).isEqualTo(tuesday.toString());
    }

    @Test
    void startFlow_dateOnlyWithoutRegionThenRegion_skipsDateModeQuestion() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch quay ngày 19/1");
        LocalDate jan19 = LocalDate.of(LocalDate.now().getYear(), 1, 19);
        if (jan19.isBefore(LocalDate.now().minusDays(1))) {
            jan19 = jan19.plusYears(1);
        }

        when(parser.extractExtraction("lịch quay ngày 19/1"))
                .thenReturn(ChatScheduleDateExtraction.specific(jan19));

        ChatIntentOutcome askLocation = flowService.startFlow(conversation, message, classification(Map.of()));
        assertThat(((ChatIntentOutcome.BotReply) askLocation).content()).startsWith(TOKEN_RESULT_PREFIX);

        when(parser.findRegionCode("Miền Nam")).thenReturn(LotteryRegionCode.MIEN_NAM.code());
        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Miền Nam"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_DATE + "=" + jan19)
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_dateModeBareIntentWithoutLocation_asksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        when(parser.extractExtraction("lịch mở thưởng")).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent("lịch mở thưởng")).thenReturn(true);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("lịch mở thưởng"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
    }

    @Test
    void continueFlow_dateModeBareIntentWithStation_restartsAndAsksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        conversation.putCollectedSlot(SLOT_STATION_ID, "42");
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);

        when(parser.extractExtraction("lịch mở thưởng")).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent("lịch mở thưởng")).thenReturn(true);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("lịch mở thưởng"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
    }

    @Test
    void continueFlow_dateModeRandomText_showsDateModeButtonsNotError() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        conversation.putCollectedSlot(SLOT_STATION_ID, "42");
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);

        when(parser.extractExtraction("abc xyz")).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent("abc xyz")).thenReturn(false);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("abc xyz"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).isEqualTo(TOKEN_ASK_DATE_MODE);
        assertThat(conversation.getPendingSlot()).isEqualTo(ChatSchedulePendingSlot.DATE_MODE);
    }

    @Test
    void continueFlow_dateModeInvalidDate_showsErrorText() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        conversation.putCollectedSlot(SLOT_STATION_ID, "42");
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);

        doReturn(ChatScheduleDateExtraction.invalid()).when(parser).extractExtraction("30/2/2026");

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("30/2/2026"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).isEqualTo(DATE_NOT_FOUND);
    }

    @Test
    void startFlow_scheduleKeyword_asksLocation() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch quay");

        ChatIntentOutcome outcome = flowService.startFlow(
                conversation,
                message,
                classification(Map.of())
        );

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.getPendingIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
    }

    @Test
    void startFlow_withDateOnly_asksLocation() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch quay hôm nay");

        when(parser.extractExtraction("lịch quay hôm nay"))
                .thenReturn(ChatScheduleDateExtraction.today());

        ChatIntentOutcome outcome = flowService.startFlow(
                conversation,
                message,
                classification(Map.of(ENTITY_DRAW_DATE, LocalDate.now().toString()))
        );

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.collectedSlot(SLOT_DRAW_DATE))
                .isEqualTo(LocalDate.now().toString());
        assertThat(conversation.getPendingSlot()).isNull();
    }

    @Test
    void startFlow_regionAllIntent_skipsStationChoice() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("miền nam hôm nay quay đài nào");

        when(parser.findRegionCode(message.getContent())).thenReturn(LotteryRegionCode.MIEN_NAM.code());
        when(parser.mentionsRegionAllListIntent(message.getContent())).thenReturn(true);
        when(parser.extractExtraction(message.getContent())).thenReturn(ChatScheduleDateExtraction.today());

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_DATE + "=" + LocalDate.now());
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void startFlow_stationOnly_showsFullWeekSchedule() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch hcm");

        LotteryStationModel station = station(42L, LotteryRegionCode.MIEN_NAM);
        when(stations.resolve("lịch hcm")).thenReturn(
                new ChatScheduleStationResolveResult.Single(
                        new ChatScheduleStationMatchResult(station, ChatScheduleStationMatchSource.YAML)
                )
        );

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=42");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).doesNotContain(RESULT_PARAM_DATE);
    }

    @Test
    void continueFlow_locationResolvesStation_executesWhenDatePresent() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        conversation.putCollectedSlot(SLOT_DRAW_DATE, LocalDate.now().toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        LotteryStationModel station = station(42L, LotteryRegionCode.MIEN_NAM);
        ChatScheduleStationResolveResult.Single hcmMatch = new ChatScheduleStationResolveResult.Single(
                new ChatScheduleStationMatchResult(station, ChatScheduleStationMatchSource.YAML)
        );
        when(stations.resolve("TP.HCM")).thenReturn(hcmMatch);
        when(stations.resolveExplicit("TP.HCM")).thenReturn(hcmMatch);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("TP.HCM"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .startsWith(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=42");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_regionChoiceAll_executesRegionScope() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_DRAW_DATE, LocalDate.now().toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("tất cả"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_regionChoiceSpecific_asksStationInRegion() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("đài cụ thể"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .startsWith(TOKEN_PICK_STATION_LIST_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_SCOPE)).isEqualTo(SCOPE_PICK_STATION);
    }

    @Test
    void continueFlow_pickStationInRegion_resolvesAndShowsFullWeek() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_PICK_STATION);

        LotteryStationModel station = station(42L, LotteryRegionCode.MIEN_NAM);
        station.setName("Bến Tre");
        when(stations.resolve("Bến Tre")).thenReturn(
                new ChatScheduleStationResolveResult.Single(
                        new ChatScheduleStationMatchResult(station, ChatScheduleStationMatchSource.AUTO_ALIAS)
                )
        );

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Bến Tre"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=42");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_dateModeAllDays_emitsResultWithoutDate() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        conversation.putCollectedSlot(SLOT_STATION_ID, "7");
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);

        when(parser.mentionsAllDaysFromMessage("tất cả ngày")).thenReturn(true);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("tất cả ngày"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=7");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_dateSlot_setsDateAndExecutes() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE);
        conversation.putCollectedSlot(SLOT_STATION_ID, "7");
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_STATION);

        LocalDate saturday = LocalDate.now();
        when(parser.extractExtraction("thứ 7"))
                .thenReturn(ChatScheduleDateExtraction.specific(saturday));

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("thứ 7"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=7:" + RESULT_PARAM_DATE + "=" + saturday);
    }

    @Test
    void startFlow_multiStation_emitsStationsToken() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("hcm với bến tre hôm nay");

        LotteryStationModel hcm = station(1L, LotteryRegionCode.MIEN_NAM);
        LotteryStationModel benTre = station(2L, LotteryRegionCode.MIEN_NAM);
        benTre.setName("Bến Tre");
        ChatScheduleStationResolveResult.Multiple multiMatch = new ChatScheduleStationResolveResult.Multiple(List.of(
                new ChatScheduleStationMatchResult(hcm, ChatScheduleStationMatchSource.YAML),
                new ChatScheduleStationMatchResult(benTre, ChatScheduleStationMatchSource.AUTO_ALIAS)
        ));
        when(stations.resolve(message.getContent())).thenReturn(multiMatch);
        when(stations.resolveExplicit(message.getContent())).thenReturn(multiMatch);
        when(parser.extractExtraction(message.getContent())).thenReturn(ChatScheduleDateExtraction.today());

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATIONS + "=1,2:" + RESULT_PARAM_DATE + "=" + LocalDate.now());
    }

    @Test
    void startFlow_daiMienNamThu3_emitsRegionAllWithDateNotConfirm() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch mở thưởng đài miền nam thứ 3");

        LocalDate tuesday = LocalDate.now();
        when(parser.findRegionCode(message.getContent())).thenReturn(LotteryRegionCode.MIEN_NAM.code());
        when(parser.mentionsRegionAllListIntent(message.getContent())).thenReturn(true);
        when(parser.extractExtraction(message.getContent()))
                .thenReturn(ChatScheduleDateExtraction.specific(tuesday));

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_DATE + "=" + tuesday)
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_regionChoiceAllWithPersistedDate_emitsResultNotDateMode() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_DRAW_DATE, LocalDate.now().toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Tất cả"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_SCOPE_ALL)
                .contains(RESULT_PARAM_DATE + "=");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void tryResumeSlotAnswer_selectStationToken_confirmsStationAndShowsReady() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.CONFIRM_STATION);
        conversation.putCollectedSlot(SLOT_CONFIRM_STATION_IDS, "7");
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());

        LotteryStationModel bacLieu = station(7L, LotteryRegionCode.MIEN_NAM);
        bacLieu.setName("Bạc Liêu");
        when(stations.findActiveById(7L)).thenReturn(Optional.of(bacLieu));

        Optional<ChatIntentOutcome> outcome = flowService.tryResumeSlotAnswer(
                conversation,
                null,
                customerMessage(TOKEN_SELECT_STATION_PREFIX + "id=7"),
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content())
                .startsWith(TOKEN_STATION_READY_PREFIX);
        assertThat(conversation.collectedSlot(SLOT_STATION_ID)).isEqualTo("7");
    }

    @Test
    void continueFlow_confirmStationWithPersistedDate_emitsResultNotDateMode() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.CONFIRM_STATION);
        conversation.putCollectedSlot(SLOT_CONFIRM_STATION_IDS, "5");
        LocalDate tuesday = LocalDate.now();
        conversation.putCollectedSlot(SLOT_DRAW_DATE, tuesday.toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        LotteryStationModel dongNai = station(5L, LotteryRegionCode.MIEN_NAM);
        dongNai.setName("Đồng Nai");
        when(stations.findActiveById(5L)).thenReturn(Optional.of(dongNai));
        when(stations.resolve("Đồng Nai")).thenReturn(
                new ChatScheduleStationResolveResult.Single(
                        new ChatScheduleStationMatchResult(dongNai, ChatScheduleStationMatchSource.AUTO_ALIAS)
                )
        );

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Đồng Nai"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=5:" + RESULT_PARAM_DATE + "=" + tuesday);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void startFlow_dateOnlyWithoutRegion_asksLocation() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch mở thưởng thứ 3");

        LocalDate tuesday = LocalDate.now();
        when(parser.extractExtraction(message.getContent()))
                .thenReturn(ChatScheduleDateExtraction.specific(tuesday));

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_DRAW_DATE)).isEqualTo(tuesday.toString());
    }

    @Test
    void startFlow_ambiguousFuzzy_promptsConfirmation() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("tiền giang");

        LotteryStationModel tienGiang = station(10L, LotteryRegionCode.MIEN_NAM);
        tienGiang.setName("Tiền Giang");
        LotteryStationModel kienGiang = station(11L, LotteryRegionCode.MIEN_NAM);
        kienGiang.setName("Kiên Giang");
        when(stations.resolve("tiền giang")).thenReturn(
                new ChatScheduleStationResolveResult.Ambiguous(List.of(
                        new ChatScheduleFuzzyCandidate(tienGiang, 0.88),
                        new ChatScheduleFuzzyCandidate(kienGiang, 0.82)
                ))
        );

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .startsWith(TOKEN_CONFIRM_STATION_PREFIX);
        assertThat(conversation.getPendingSlot()).isEqualTo(ChatSchedulePendingSlot.CONFIRM_STATION);
    }

    @Test
    void startFlow_daiMienNamThu3_executesRegionAllWithoutStationConfirm() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch mở thưởng đài miền nam thứ 3");
        LocalDate tuesday = ChatScheduleParser.nextOrSame(LocalDate.now(), java.time.DayOfWeek.TUESDAY);

        when(parser.findRegionCode(message.getContent())).thenReturn(LotteryRegionCode.MIEN_NAM.code());
        when(parser.mentionsRegionAllListIntent(message.getContent())).thenReturn(true);
        when(parser.extractExtraction(message.getContent()))
                .thenReturn(ChatScheduleDateExtraction.specific(tuesday));

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_DATE + "=" + tuesday)
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_regionChoiceAllWithExistingDate_executesWithoutAskingDate() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        LocalDate tuesday = ChatScheduleParser.nextOrSame(LocalDate.now(), java.time.DayOfWeek.TUESDAY);
        conversation.putCollectedSlot(SLOT_DRAW_DATE, tuesday.toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("xem tất cả"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_DATE + "=" + tuesday)
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_confirmStationWithExistingDate_executesWithoutAskingDate() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.CONFIRM_STATION);
        conversation.putCollectedSlot(SLOT_CONFIRM_STATION_IDS, "5");
        LocalDate tuesday = ChatScheduleParser.nextOrSame(LocalDate.now(), java.time.DayOfWeek.TUESDAY);
        conversation.putCollectedSlot(SLOT_DRAW_DATE, tuesday.toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        LotteryStationModel dongNai = station(5L, LotteryRegionCode.MIEN_NAM);
        dongNai.setName("Đồng Nai");
        when(stations.resolve("Đồng Nai")).thenReturn(
                new ChatScheduleStationResolveResult.Single(
                        new ChatScheduleStationMatchResult(dongNai, ChatScheduleStationMatchSource.AUTO_ALIAS)
                )
        );

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Đồng Nai"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=5:" + RESULT_PARAM_DATE + "=" + tuesday);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_dateThenRegion_executesRegionAllWithoutSecondChoice() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        LocalDate jan19 = LocalDate.of(2026, 1, 19);
        conversation.putCollectedSlot(SLOT_DRAW_DATE, jan19.toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        when(parser.findRegionCode("Miền Nam")).thenReturn(LotteryRegionCode.MIEN_NAM.code());

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Miền Nam"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_DATE + "=" + jan19)
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void startFlow_regionOnlyWithoutDate_stillAsksRegionChoice() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch quay miền nam");

        when(parser.findRegionCode(message.getContent())).thenReturn(LotteryRegionCode.MIEN_NAM.code());
        when(parser.mentionsRegionAllListIntent(message.getContent())).thenReturn(false);
        when(parser.extractExtraction(message.getContent())).thenReturn(ChatScheduleDateExtraction.empty());

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).isEqualTo(TOKEN_ASK_DATE_MODE);
        assertThat(conversation.getPendingSlot()).isEqualTo(ChatSchedulePendingSlot.DATE_MODE);
        assertThat(conversation.collectedSlot(SLOT_SCOPE)).isEqualTo(SCOPE_REGION_ALL);
    }

    @Test
    void startFlow_traCuuLichQuay_clearsStaleSlotsAndAsksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_DRAW_DATE, LocalDate.now().toString());
        conversation.putCollectedSlot(SLOT_STATION_ID, "99");
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        String query = "tra cứu lịch quay";
        MessageModel message = customerMessage(query);
        when(parser.extractExtraction(query)).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent(query)).thenReturn(true);

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_REGION)).isNull();
        assertThat(conversation.collectedSlot(SLOT_DRAW_DATE)).isNull();
        assertThat(conversation.collectedSlot(SLOT_STATION_ID)).isNull();
    }

    @Test
    void tryContinue_bareScheduleQueryRestartsFlowAndAsksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        String query = "tra cứu lịch quay";
        when(parser.extractExtraction(query)).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent(query)).thenReturn(true);

        MessageModel message = customerMessage(query);
        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElseThrow();

        Optional<ChatIntentOutcome> outcome = flowService.tryContinue(
                conversation,
                flow,
                message,
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_REGION)).isNull();
    }

    @Test
    void tryContinue_traCuuLichKhac_restartsFlowAndAsksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        String query = "tra cứu lịch khác";
        when(parser.extractExtraction(query)).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent(query)).thenReturn(true);

        MessageModel message = customerMessage(query);
        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElseThrow();

        Optional<ChatIntentOutcome> outcome = flowService.tryContinue(
                conversation,
                flow,
                message,
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_REGION)).isNull();
    }

    @Test
    void startFlow_traCuuLichKhac_asksLocation() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("tra cứu lịch khác");

        when(parser.extractExtraction("tra cứu lịch khác")).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent("tra cứu lịch khác")).thenReturn(true);

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
    }

    @Test
    void startFlow_scheduleRestartToken_asksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_STATION_ID, "42");
        conversation.putCollectedSlot(SLOT_DRAW_DATE, "2026-07-04");
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        MessageModel message = customerMessage(TOKEN_RESTART);

        ChatIntentOutcome outcome = flowService.startFlow(
                conversation,
                message,
                classification(Map.of(ENTITY_REGION, LotteryRegionCode.MIEN_NAM.code(), ENTITY_STATION_ID, "42"))
        );

        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_REGION)).isNull();
        assertThat(conversation.collectedSlot(SLOT_STATION_ID)).isNull();
    }

    @Test
    void startFlow_scheduleShowToken_emitsRegionWeekSchedule() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);

        MessageModel message = customerMessage(
                TOKEN_SHOW_PREFIX + "goal=SCHEDULE:region=MIEN_NAM:scope=all"
        );

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        String content = ((ChatIntentOutcome.BotReply) outcome).content();
        assertThat(content).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(content).contains("region=MIEN_NAM");
        assertThat(content).contains("scope=all");
        assertThat(conversation.getPendingSlot()).isNull();
    }

    @Test
    void startFlow_scheduleShowResultToken_asksResultDateFirst() {
        ConversationModel conversation = openConversation();

        MessageModel message = customerMessage(
                TOKEN_SHOW_PREFIX + "goal=RESULT:region=MIEN_NAM:scope=today"
        );

        ChatIntentOutcome outcome = flowService.startFlow(conversation, message, classification(Map.of()));

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        String content = ((ChatIntentOutcome.BotReply) outcome).content();
        assertThat(content).startsWith(TOKEN_ASK_DATE_MODE);
        assertThat(content).contains("goal=RESULT");
        assertThat(conversation.getPendingSlot()).isEqualTo(ChatSchedulePendingSlot.DATE_MODE);
        assertThat(conversation.collectedSlot(SLOT_GOAL)).isEqualTo(GOAL_RESULT);
    }

    @Test
    void tryContinue_dateModeBareScheduleIntent_restartsAndAsksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_STATION_ID, "99");
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        String query = "tra cứu lịch khác";
        when(parser.extractExtraction(query)).thenReturn(ChatScheduleDateExtraction.empty());
        when(parser.mentionsScheduleIntent(query)).thenReturn(true);

        MessageModel message = customerMessage(query);
        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElseThrow();

        Optional<ChatIntentOutcome> outcome = flowService.tryContinue(
                conversation,
                flow,
                message,
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_STATION_ID)).isNull();
    }

    @Test
    void tryContinue_scheduleQueryWithWeekdayRestartsFlowAndAsksLocation() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_STATION_ID, "99");
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);

        String query = "tra cứu lịch quay thứ 3";
        LocalDate tuesday = ChatScheduleParser.nextOrSame(LocalDate.now(), java.time.DayOfWeek.TUESDAY);
        when(parser.extractExtraction(query)).thenReturn(ChatScheduleDateExtraction.specific(tuesday));
        when(parser.mentionsScheduleIntent(query)).thenReturn(true);

        MessageModel message = customerMessage(query);
        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElseThrow();

        Optional<ChatIntentOutcome> outcome = flowService.tryContinue(
                conversation,
                flow,
                message,
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content()).startsWith(TOKEN_RESULT_PREFIX);
        assertThat(conversation.getPendingSlot()).isNull();
        assertThat(conversation.collectedSlot(SLOT_REGION)).isNull();
        assertThat(conversation.collectedSlot(SLOT_STATION_ID)).isNull();
        assertThat(conversation.collectedSlot(SLOT_DRAW_DATE)).isEqualTo(tuesday.toString());
    }

    @Test
    void continueFlow_dateModeAllDays_regionAll_executesFullWeekWithoutDate() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.DATE_MODE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_SCOPE, SCOPE_REGION_ALL);

        when(parser.mentionsAllDaysFromMessage("Tất cả ngày")).thenReturn(true);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Tất cả ngày"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code()
                        + ":" + RESULT_PARAM_SCOPE_ALL);
        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).doesNotContain(RESULT_PARAM_DATE);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_locationChoiceTatCaNgayWithPersistedDate_executesFullWeekNotSingleDay() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());
        conversation.putCollectedSlot(SLOT_DRAW_DATE, LocalDate.now().toString());
        conversation.putCollectedSlot(SLOT_DATE_MODE, ChatScheduleDateMode.SPECIFIC_DATE.name());

        when(parser.mentionsAllDaysFromMessage("Tất cả ngày")).thenReturn(true);

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("Tất cả ngày"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .isEqualTo(TOKEN_RESULT_PREFIX + RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code()
                        + ":" + RESULT_PARAM_SCOPE_ALL);
        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).doesNotContain(RESULT_PARAM_DATE);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void continueFlow_regionChoiceAllStationsText_emitsScheduleResult() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());

        ChatIntentOutcome outcome = continueFlow(conversation, customerMessage("tất cả đài"));

        assertThat(((ChatIntentOutcome.BotReply) outcome).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains("scope=today")
                .contains(RESULT_PARAM_DATE + "=");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void tryResumeSlotAnswer_recoversDateModeAfterRegionChoiceWhenFlowMissing() {
        ConversationModel conversation = openConversation();
        ChatScheduleFlowRecoveryReader recoveryReader = mock(ChatScheduleFlowRecoveryReader.class);
        when(recoveryReader.fetchRecentBotTokens(conversation.getId())).thenReturn(List.of(
                MessageModel.builder()
                        .content(TOKEN_ASK_DATE_MODE)
                        .senderType(MessageSenderType.AI_SYSTEM)
                        .build(),
                MessageModel.builder()
                        .content(TOKEN_REGION_CHOICE_PREFIX + LotteryRegionCode.MIEN_NAM.code())
                        .senderType(MessageSenderType.AI_SYSTEM)
                        .build()
        ));
        DrawScheduleFlowService serviceWithRecovery = new DrawScheduleFlowService(
                parser,
                stations,
                new ChatScheduleFlowRecovery(recoveryReader),
                messageProperties(),
                lotteryStationService,
                chatTicketInventoryService
        );

        Optional<ChatIntentOutcome> outcome = serviceWithRecovery.tryResumeSlotAnswer(
                conversation,
                null,
                customerMessage("Hôm nay"),
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code());
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void tryResumeSlotAnswer_recoversFromBotTokenWhenFlowMissing() {
        ConversationModel conversation = openConversation();
        ChatScheduleFlowRecoveryReader recoveryReader = mock(ChatScheduleFlowRecoveryReader.class);
        when(recoveryReader.fetchRecentBotTokens(conversation.getId())).thenReturn(List.of(
                MessageModel.builder()
                        .content(TOKEN_REGION_CHOICE_PREFIX + LotteryRegionCode.MIEN_NAM.code())
                        .senderType(MessageSenderType.AI_SYSTEM)
                        .build()
        ));
        DrawScheduleFlowService serviceWithRecovery = new DrawScheduleFlowService(
                parser,
                stations,
                new ChatScheduleFlowRecovery(recoveryReader),
                messageProperties(),
                lotteryStationService,
                chatTicketInventoryService
        );

        Optional<ChatIntentOutcome> outcome = serviceWithRecovery.tryResumeSlotAnswer(
                conversation,
                null,
                customerMessage("tất cả đài"),
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains("scope=today");
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    @Test
    void tryResumeSlotAnswer_withActiveFlow_advances() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION_CHOICE);
        conversation.putCollectedSlot(SLOT_REGION, LotteryRegionCode.MIEN_NAM.code());

        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElseThrow();
        Optional<ChatIntentOutcome> outcome = flowService.tryResumeSlotAnswer(
                conversation,
                flow,
                customerMessage("Tất cả"),
                classification(Map.of())
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content())
                .contains(RESULT_PARAM_REGION + "=" + LotteryRegionCode.MIEN_NAM.code())
                .contains(RESULT_PARAM_SCOPE_ALL);
        assertThat(conversation.hasPendingScheduleFlow()).isFalse();
    }

    private ChatIntentOutcome continueFlow(ConversationModel conversation, MessageModel message) {
        PendingFlowState flow = conversation.findActiveFlow(ChatIntent.WEB_SCHEDULE.name()).orElseThrow();
        return flowService.tryContinue(conversation, flow, message, classification(Map.of())).orElse(null);
    }

    private ConversationModel openConversation() {
        return ConversationModel.builder()
                .id(1L)
                .title("Support")
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();
    }

    private MessageModel customerMessage(String content) {
        return MessageModel.builder()
                .conversationId(1L)
                .senderType(MessageSenderType.CUSTOMER)
                .content(content)
                .build();
    }

    private ChatClassifyResponse classification(Map<String, String> entities) {
        return ChatClassifyResponse.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(0.9)
                .entities(entities)
                .build();
    }

    private LotteryStationModel station(Long id, LotteryRegionCode regionCode) {
        LotteryRegionModel region = new LotteryRegionModel();
        region.setCode(regionCode.code());
        LotteryStationModel model = new LotteryStationModel();
        model.setId(id);
        model.setName("Hồ Chí Minh");
        model.setStatus(LotteryStationStatus.ACTIVE);
        model.setRegion(region);
        return model;
    }
}

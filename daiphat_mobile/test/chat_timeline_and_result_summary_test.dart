import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/chat/domain/entities/chat_models.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/viewmodels/chat_viewmodel.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_constants.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_message_mapper.dart';
import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/domain/repositories/home_lottery_repository.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/home_viewmodel.dart';

void main() {
  group('parseScheduleResultSummaryToken', () {
    test('parses full SCHEDULE_RESULT_SUMMARY token with region, scope, date, goal', () {
      const raw =
          'SCHEDULE_RESULT_SUMMARY:region=MIEN_NAM:scope=all:date=YESTERDAY|goal=RESULT';
      final parsed = parseScheduleResultSummaryToken(raw);
      expect(parsed, isNotNull);
      expect(parsed!.region, 'MIEN_NAM');
      expect(parsed.drawDate, 'YESTERDAY');
    });

    test('parses raw token without SCHEDULE_RESULT_SUMMARY: prefix', () {
      const raw = 'region=MIEN_NAM:scope=all:date=YESTERDAY|goal=RESULT';
      final parsed = parseScheduleResultSummaryToken(raw);
      expect(parsed, isNotNull);
      expect(parsed!.region, 'MIEN_NAM');
      expect(parsed.drawDate, 'YESTERDAY');
    });

    test('parses multiple stations and specific date', () {
      const raw =
          'SCHEDULE_RESULT_SUMMARY:region=MIEN_NAM:stations=1,2,3:date=2026-07-27';
      final parsed = parseScheduleResultSummaryToken(raw);
      expect(parsed, isNotNull);
      expect(parsed!.region, 'MIEN_NAM');
      expect(parsed.stationIds, [1, 2, 3]);
      expect(parsed.drawDate, '2026-07-27');
    });

    test('parses single station and encoded stationName', () {
      const raw =
          'SCHEDULE_STATION_BUNDLE:station=3:region=MIEN_NAM:stationName=B%E1%BA%BFn%20Tre:date=2026-07-28';
      final parsed = parseScheduleResultSummaryToken(raw);
      expect(parsed, isNotNull);
      expect(parsed!.stationId, 3);
      expect(parsed.stationName, 'Bến Tre');
      expect(parsed.region, 'MIEN_NAM');
      expect(parsed.drawDate, '2026-07-28');
    });
  });

  group('mapApiMessage for schedule result summary', () {
    test('maps SCHEDULE_RESULT_SUMMARY into scheduleResultSummary variant with actions', () {
      final message = ChatMessageModel(
        id: 101,
        conversationId: 1,
        senderType: ChatSenderType.aiSystem,
        type: 'TEXT',
        content:
            'SCHEDULE_RESULT_SUMMARY:region=MIEN_NAM:scope=all:date=YESTERDAY|goal=RESULT',
        createdAt: DateTime.now(),
      );

      final uiMessage = mapApiMessage(message);
      expect(uiMessage.variant, ChatMessageVariant.scheduleResultSummary);
      expect(uiMessage.text, 'Kết quả xổ số theo yêu cầu của bạn:');
      expect(uiMessage.scheduleResultSummary, isNotNull);
      expect(uiMessage.scheduleResultSummary!.region, 'MIEN_NAM');
      expect(uiMessage.scheduleResultSummary!.drawDate, 'YESTERDAY');
      expect(uiMessage.actions.length, 3);
      expect(uiMessage.actions[0].label, 'Tra cứu kết quả khác');
      expect(uiMessage.actions[0].payload, 'SCHEDULE_SET_GOAL:RESULT');
      expect(uiMessage.actions[1].label, 'Xem lịch mở thưởng');
      expect(uiMessage.actions[1].payload, 'SCHEDULE_SET_GOAL:SCHEDULE');
      expect(uiMessage.actions[2].label, 'Gợi ý vé');
      expect(uiMessage.actions[2].payload, suggestTicketsMessage);
    });

    test('maps raw region= token without prefix into scheduleResultSummary variant', () {
      final message = ChatMessageModel(
        id: 102,
        conversationId: 1,
        senderType: ChatSenderType.aiSystem,
        type: 'TEXT',
        content: 'region=MIEN_NAM:scope=all:date=YESTERDAY|goal=RESULT',
        createdAt: DateTime.now(),
      );

      final uiMessage = mapApiMessage(message);
      expect(uiMessage.variant, ChatMessageVariant.scheduleResultSummary);
      expect(uiMessage.text, 'Kết quả xổ số theo yêu cầu của bạn:');
      expect(uiMessage.scheduleResultSummary, isNotNull);
      expect(uiMessage.scheduleResultSummary!.region, 'MIEN_NAM');
      expect(uiMessage.scheduleResultSummary!.drawDate, 'YESTERDAY');
    });

    test('maps SCHEDULE_ASK_DATE_MODE:goal=RESULT into 3 action buttons matching web', () {
      final message = ChatMessageModel(
        id: 103,
        conversationId: 1,
        senderType: ChatSenderType.aiSystem,
        type: 'TEXT',
        content: 'SCHEDULE_ASK_DATE_MODE:goal=RESULT',
        createdAt: DateTime.now(),
      );

      final uiMessage = mapApiMessage(message);
      expect(uiMessage.text, 'Bạn muốn xem kết quả ngày nào?');
      expect(uiMessage.actions.length, 3);
      expect(uiMessage.actions[0].label, 'Hôm nay');
      expect(uiMessage.actions[0].payload, 'Hôm nay');
      expect(uiMessage.actions[0].primary, isTrue);
      expect(uiMessage.actions[1].label, 'Hôm qua');
      expect(uiMessage.actions[1].payload, 'Hôm qua');
      expect(uiMessage.actions[2].label, 'Chọn ngày khác');
      expect(uiMessage.actions[2].payload, 'ACTION_PICK_DATE:goal=RESULT');
    });

    test('maps SCHEDULE_PICK_STATION_LIST with date and stations into clean labels and title', () {
      final message = ChatMessageModel(
        id: 104,
        conversationId: 1,
        senderType: ChatSenderType.aiSystem,
        type: 'TEXT',
        content:
            'SCHEDULE_PICK_STATION_LIST:stations=15:Trà Vinh,13:Vĩnh Long:date=2026-09-25:goal=RESULT',
        createdAt: DateTime.now(),
      );

      final uiMessage = mapApiMessage(message);
      expect(uiMessage.text, 'Chọn đài muốn xem kết quả ngày 25/09/2026:');
      expect(uiMessage.actions.length, 2);
      expect(uiMessage.actions[0].label, 'Trà Vinh');
      expect(uiMessage.actions[0].payload, 'SCHEDULE_SELECT_STATION:id=15:name=Trà Vinh');
      expect(uiMessage.actions[1].label, 'Vĩnh Long');
      expect(uiMessage.actions[1].payload, 'SCHEDULE_SELECT_STATION:id=13:name=Vĩnh Long');
    });
  });

  group('mergeTimelineWithOverlay ordering', () {
    test('user optimistic message appears BEFORE bot replies received after send', () {
      final existingTimeline = <UiChatMessage>[
        const UiChatMessage(
          id: 'bot-1',
          isUser: false,
          text: 'Chào bạn',
          timeLabel: '10:00',
        ),
      ];

      final optimisticUser = const UiChatMessage(
        id: 'optimistic-user-123',
        isUser: true,
        text: 'Gợi ý số khác',
        sentContent: 'gợi ý vé số cho tôi|exclude=1,2',
        timeLabel: '10:01',
      );

      // WebSocket bot reply arrives rapidly and gets appended to timeline
      final incomingBotReply = const UiChatMessage(
        id: 'bot-reply-2',
        isUser: false,
        text: 'Gợi ý vé số cho bạn:',
        timeLabel: '10:01',
        variant: ChatMessageVariant.ticketSuggest,
      );

      final updatedTimeline = [...existingTimeline, incomingBotReply];

      // Merge with botReplyCountAtSend = 1 (existing count before send)
      final merged = mergeTimelineWithOverlay(
        timeline: updatedTimeline,
        overlay: [optimisticUser],
        botReplyCountAtSend: 1,
        awaitingBotReply: false,
      );

      expect(merged.length, 3);
      expect(merged[0].id, 'bot-1');
      expect(merged[1].id, 'optimistic-user-123'); // Customer message comes BEFORE bot reply!
      expect(merged[2].id, 'bot-reply-2'); // Bot reply comes AFTER customer message!
    });

    test('customer message stays before bot reply while awaiting reply', () {
      final existingTimeline = <UiChatMessage>[
        const UiChatMessage(
          id: 'bot-1',
          isUser: false,
          text: 'Chào bạn',
          timeLabel: '10:00',
        ),
      ];

      final optimisticUser = const UiChatMessage(
        id: 'optimistic-user-456',
        isUser: true,
        text: 'Hôm qua',
        sentContent: 'SCHEDULE_SHOW:date=YESTERDAY|goal=RESULT',
        timeLabel: '10:05',
      );

      final typing = const UiChatMessage(
        id: 'typing-456',
        isUser: false,
        text: 'Đại Phát đang soạn tin...',
        timeLabel: '10:05',
        variant: ChatMessageVariant.typing,
      );

      // Incoming result summary arrives while awaitingBotReply is true
      final incomingResultBot = const UiChatMessage(
        id: 'bot-2',
        isUser: false,
        text: 'Kết quả xổ số theo yêu cầu của bạn:',
        timeLabel: '10:05',
        variant: ChatMessageVariant.scheduleResultSummary,
      );

      final updatedTimeline = [...existingTimeline, incomingResultBot];

      // While typing/awaiting is active, bot reply is held or placed after user
      final merged = mergeTimelineWithOverlay(
        timeline: updatedTimeline,
        overlay: [optimisticUser, typing],
        botReplyCountAtSend: 1,
        awaitingBotReply: true,
      );

      expect(merged.any((m) => m.id == 'optimistic-user-456'), isTrue);
      final userIdx = merged.indexWhere((m) => m.id == 'optimistic-user-456');
      final botIdx = merged.indexWhere((m) => m.id == 'bot-2');
      if (botIdx != -1) {
        expect(userIdx < botIdx, isTrue);
      }
    });

    test('prunes optimistic message once confirmed on server timeline', () {
      final confirmedTimeline = <UiChatMessage>[
        const UiChatMessage(
          id: 'server-user-1',
          isUser: true,
          text: 'Gợi ý số khác',
          sentContent: 'gợi ý vé số cho tôi|exclude=1,2',
          timeLabel: '10:01',
        ),
        const UiChatMessage(
          id: 'bot-2',
          isUser: false,
          text: 'Gợi ý vé số cho bạn:',
          timeLabel: '10:01',
          variant: ChatMessageVariant.ticketSuggest,
        ),
      ];

      final optimisticUser = const UiChatMessage(
        id: 'optimistic-user-123',
        isUser: true,
        text: 'Gợi ý số khác',
        sentContent: 'gợi ý vé số cho tôi|exclude=1,2',
        timeLabel: '10:01',
      );

      final merged = mergeTimelineWithOverlay(
        timeline: confirmedTimeline,
        overlay: [optimisticUser],
        botReplyCountAtSend: 0,
        awaitingBotReply: false,
      );

      // Optimistic should be pruned, exact server message preserved
      expect(merged.length, 2);
      expect(merged[0].id, 'server-user-1');
      expect(merged[1].id, 'bot-2');
    });
  });

  group('ChatScreen schedule result summary UI', () {
    testWidgets(
      'renders schedule result summary card with full prize table and action buttons',
      (tester) async {
        const summaryData = ScheduleResultSummaryData(
          region: 'MIEN_NAM',
          drawDate: 'YESTERDAY',
        );
        const message = UiChatMessage(
          id: 'result-msg',
          isUser: false,
          text: 'Kết quả xổ số theo yêu cầu của bạn:',
          timeLabel: '15:30',
          variant: ChatMessageVariant.scheduleResultSummary,
          scheduleResultSummary: summaryData,
          actions: [
            ChatMessageAction(
              label: 'Tra cứu kết quả khác',
              payload: 'SCHEDULE_SET_GOAL:RESULT',
            ),
            ChatMessageAction(
              label: 'Xem lịch mở thưởng',
              payload: 'SCHEDULE_SET_GOAL:SCHEDULE',
            ),
            ChatMessageAction(
              label: 'Gợi ý vé',
              payload: suggestTicketsMessage,
            ),
          ],
        );

        const state = ChatState(
          isAuthenticated: true,
          timelineMessages: [message],
          showWelcome: false,
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              chatViewModelProvider
                  .overrideWith(() => _StaticChatViewModel(state)),
              homeLotteryRepositoryProvider
                  .overrideWithValue(_MockHomeLotteryRepository()),
            ],
            child: const MaterialApp(
              home: Scaffold(
                body: ChatScreen(isAuthenticated: true, isActive: true),
              ),
            ),
          ),
        );

        await tester.pump();
        await tester.pumpAndSettle();

        expect(
          find.text('Kết quả xổ số theo yêu cầu của bạn:'),
          findsOneWidget,
        );
        expect(find.text('TP. Hồ Chí Minh'), findsOneWidget);
        expect(find.text('Đặc biệt'), findsOneWidget);
        expect(find.text('123456'), findsOneWidget);
        expect(find.text('Giải 1'), findsOneWidget);
        expect(find.text('654321'), findsOneWidget);
        expect(find.text('Tra cứu kết quả khác'), findsOneWidget);
        expect(find.text('Xem lịch mở thưởng'), findsOneWidget);
        expect(find.text('Gợi ý vé'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });
}

class _StaticChatViewModel extends ChatViewModel {
  _StaticChatViewModel(this.initialState);

  final ChatState initialState;

  @override
  ChatState build() => initialState;

  @override
  Future<void> bootstrap({required bool isAuthenticated}) async {}
}

class _MockHomeLotteryRepository implements HomeLotteryRepository {
  @override
  Future<HomeLotteryFetchResult> fetchResults(
    DateTime drawDate, {
    String? region,
  }) async {
    return HomeLotteryFetchResult(
      data: HomeLotteryData(
        results: [
          LotteryResult(
            id: 1,
            stationId: 1,
            province: 'TP. Hồ Chí Minh',
            dateLabel: '27/09/2026',
            dayOfWeek: 'Chủ nhật',
            drawDate: drawDate,
            status: 'COMPLETED',
            prizes: const LotteryPrizes(
              special: '123456',
              first: '654321',
              second: '112233',
              third: ['11111', '22222'],
              fourth: ['3333', '4444', '5555'],
              fifth: ['6666'],
              sixth: ['777', '888', '999'],
              seventh: ['12'],
              eighth: ['99'],
            ),
          ),
        ],
        availableProvinces: const ['TP. Hồ Chí Minh'],
      ),
    );
  }
}

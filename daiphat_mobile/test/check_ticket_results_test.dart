import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/domain/entities/ticket_check.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/check_ticket_view.dart';
import 'package:daiphat_mobile/src/features/schedule/presentation/providers/schedule_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _CheckedTicketViewModel extends TicketCheckViewModel {
  @override
  TicketCheckState build() => TicketCheckState(
        selectedDate: DateTime(2026, 9, 15),
        stations: const [LotteryStationDraw(id: 7, province: 'Bạc Liêu')],
        selectedStationId: 7,
        hasChecked: true,
        checkResult: const TicketCheckResult(
          stationId: 7,
          stationName: 'Bạc Liêu',
          drawDate: '2026-09-15',
          ticketNumber: '123456',
          resultAvailable: true,
          winning: false,
          totalWinningAmount: 0,
          matchedPrizes: [],
        ),
        checkedStationResult: LotteryResult(
          id: 10,
          stationId: 7,
          province: 'Bạc Liêu',
          dateLabel: '15/09/2026',
          dayOfWeek: 'Thứ Ba',
          drawDate: DateTime(2026, 9, 15),
          status: 'COMPLETED',
          prizes: const LotteryPrizes(
            special: '118673',
            first: '98197',
            second: '62910',
            third: ['00689', '17129', '23230'],
            fourth: ['02344', '09565', '11319', '05962'],
            fifth: ['0128', '7467', '8257'],
            sixth: ['3869', '6200', '0766'],
            seventh: ['984', '045', '270'],
            eighth: ['54', '07', '18'],
          ),
        ),
      );

  @override
  Future<void> loadStations(DateTime date) async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('dò vé shows complete station results below lookup state', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ticketCheckViewModelProvider.overrideWith(
            _CheckedTicketViewModel.new,
          ),
          lotteryScheduleProvider.overrideWith((ref) async => const []),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const CheckTicketView(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Rất tiếc, chưa trúng giải'), findsOneWidget);
    expect(find.text('Kết quả đài Bạc Liêu'), findsOneWidget);
    expect(find.text('Kết quả đầy đủ'), findsOneWidget);
    expect(find.text('Đặc biệt'), findsOneWidget);
    expect(find.text('118673'), findsOneWidget);
    expect(find.text('Giải tám'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

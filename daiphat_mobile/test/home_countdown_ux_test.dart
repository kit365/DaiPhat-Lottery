import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/lottery_countdown_banner.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/results_card.dart';

void main() {
  group('Home Countdown UX & ResultsCard Tests', () {
    testWidgets(
      'LotteryCountdownBanner displays countdown message before draw time',
      (tester) async {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        var refreshCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LotteryCountdownBanner(
                date: today,
                selectedProvinces: const ['Bạc Liêu'],
                allAvailableProvinces: const ['Bạc Liêu', 'Bến Tre', 'Vũng Tàu'],
                drawTime: '23:59', // Future draw time today
                isWaitingForResults: true,
                hasResults: false,
                onRefresh: () => refreshCalled = true,
              ),
            ),
          ),
        );
        await tester.pump();

        // Check for message pattern: "{Province} đang chờ xổ số lúc {drawTime}. Còn HH:MM:SS nữa"
        expect(
          find.textContaining('Bạc Liêu đang chờ xổ số lúc 23:59. Còn'),
          findsOneWidget,
        );
        expect(find.textContaining('nữa'), findsOneWidget);
        expect(refreshCalled, isFalse);
      },
    );

    testWidgets(
      'LotteryCountdownBanner displays all provinces label when none or all selected',
      (tester) async {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LotteryCountdownBanner(
                date: today,
                selectedProvinces: const [],
                allAvailableProvinces: const ['Bạc Liêu', 'Bến Tre', 'Vũng Tàu'],
                drawTime: '23:59',
                isWaitingForResults: true,
                hasResults: false,
              ),
            ),
          ),
        );
        await tester.pump();

        expect(
          find.textContaining('Các đài miền Nam đang chờ xổ số lúc 23:59. Còn'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'LotteryCountdownBanner displays expired message when past draw time with no results',
      (tester) async {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        var refreshCalled = false;

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LotteryCountdownBanner(
                date: today,
                selectedProvinces: const [],
                allAvailableProvinces: const ['Bạc Liêu', 'Bến Tre', 'Vũng Tàu'],
                drawTime: '00:01', // Already passed today
                isWaitingForResults: true,
                hasResults: false,
                onRefresh: () => refreshCalled = true,
              ),
            ),
          ),
        );
        await tester.pump();

        expect(
          find.text(
            'Các đài miền Nam đã tới giờ quay số lúc 00:01. Hệ thống đang chờ cập nhật kết quả.',
          ),
          findsOneWidget,
        );

        // Tap triggers refresh
        await tester.tap(find.byType(LotteryCountdownBanner));
        expect(refreshCalled, isTrue);
      },
    );

    testWidgets(
      'Both countdown banner and ResultsCard with stations render together when waiting',
      (tester) async {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        const provinces = ['Bạc Liêu', 'Bến Tre', 'Vũng Tàu'];

        final results = <LotteryResult>[
          for (var i = 0; i < provinces.length; i++)
            LotteryResult(
              id: i + 1,
              stationId: i + 1,
              province: provinces[i],
              dateLabel: 'Hôm nay',
              dayOfWeek: 'Thứ Ba',
              drawDate: today,
              status: 'PENDING',
              prizes: const LotteryPrizes(),
            ),
        ];

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: Column(
                  children: [
                    LotteryCountdownBanner(
                      date: today,
                      selectedProvinces: provinces,
                      allAvailableProvinces: provinces,
                      drawTime: '23:59',
                      isWaitingForResults: true,
                      hasResults: false,
                    ),
                    ResultsCard(
                      results: results,
                      displayProvinces: provinces,
                      isSingleSel: false,
                      selLabel: null,
                      isWaitingForResults: true,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
        await tester.pump();

        // Verify countdown banner is present
        expect(
          find.textContaining('Các đài miền Nam đang chờ xổ số lúc 23:59. Còn'),
          findsOneWidget,
        );

        // Verify all 3 station headers are rendered in ResultsCard
        expect(find.text('Bạc Liêu'), findsOneWidget);
        expect(find.text('Bến Tre'), findsOneWidget);
        expect(find.text('Vũng Tàu'), findsOneWidget);

        // Verify "Đang chờ" is rendered in Special row for all 3 stations
        expect(find.text('Đang chờ'), findsNWidgets(3));
      },
    );
  });
}

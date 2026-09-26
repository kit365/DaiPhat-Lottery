import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/lottery_countdown_banner.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/results_card.dart';

void main() {
  group('Home Countdown UX (Web-Identical) & ResultsCard Tests', () {
    testWidgets('LotteryCountdownBanner displays web-matching countdown message and 3 dots before draw time', (
      tester,
    ) async {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      var refreshCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LotteryCountdownBanner(
              date: today,
              selectedProvinces: const ['TP. Hồ Chí Minh'],
              allAvailableProvinces: const ['TP. Hồ Chí Minh', 'Long An'],
              drawTime: '23:59', // Future draw time today
              isWaitingForResults: true,
              hasResults: false,
              onRefresh: () => refreshCalled = true,
            ),
          ),
        ),
      );
      await tester.pump();

      // Check for exact web message pattern: "{Province} đang chờ xổ số lúc {drawTime}. Còn HH:MM:SS nữa"
      expect(
        find.textContaining('TP. Hồ Chí Minh đang chờ xổ số lúc 23:59. Còn'),
        findsOneWidget,
      );
      expect(
        find.textContaining('nữa'),
        findsOneWidget,
      );
      expect(refreshCalled, isFalse);
    });

    testWidgets('LotteryCountdownBanner displays web-matching expired message when past draw time with no results', (
      tester,
    ) async {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      var refreshCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LotteryCountdownBanner(
              date: today,
              selectedProvinces: const [],
              allAvailableProvinces: const ['Bình Phước', 'Hậu Giang', 'TP. Hồ Chí Minh', 'Long An'],
              drawTime: '00:01', // Already passed today
              isWaitingForResults: true,
              hasResults: false,
              onRefresh: () => refreshCalled = true,
            ),
          ),
        ),
      );
      await tester.pump();

      // Exact web message: "Các đài miền Nam đã tới giờ quay số lúc 00:01. Hệ thống đang chờ cập nhật kết quả."
      expect(
        find.text('Các đài miền Nam đã tới giờ quay số lúc 00:01. Hệ thống đang chờ cập nhật kết quả.'),
        findsOneWidget,
      );

      // Verify tap on banner triggers refresh
      await tester.tap(find.byType(LotteryCountdownBanner));
      expect(refreshCalled, isTrue);
    });

    testWidgets('ResultsCard in multi-province mode does NOT squish "Đang chờ" across columns', (
      tester,
    ) async {
      const provinces = ['Bình Phước', 'Hậu Giang', 'TP. Hồ Chí Minh', 'Long An'];
      final results = <LotteryResult>[
        for (var i = 0; i < provinces.length; i++)
          LotteryResult(
            id: i + 1,
            stationId: i + 1,
            province: provinces[i],
            dateLabel: 'Hôm nay',
            dayOfWeek: 'Thứ Bảy',
            drawDate: DateTime.now(),
            status: 'PENDING',
            prizes: const LotteryPrizes(),
          ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 375,
              child: ResultsCard(
                results: results,
                displayProvinces: provinces,
                isSingleSel: false,
                selLabel: null,
                isWaitingForResults: true,
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      // Should NOT render any 'Đang chờ' in multi-province mode
      expect(find.text('Đang chờ'), findsNothing);
      // Special row and other rows should show '--' cleanly for all 4 provinces
      expect(find.text('--'), findsWidgets);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ResultsCard in single province mode cleanly renders "Đang chờ" when waiting', (
      tester,
    ) async {
      const provinces = ['TP. Hồ Chí Minh'];
      final results = <LotteryResult>[
        LotteryResult(
          id: 1,
          stationId: 1,
          province: provinces.first,
          dateLabel: 'Hôm nay',
          dayOfWeek: 'Thứ Bảy',
          drawDate: DateTime.now(),
          status: 'PENDING',
          prizes: const LotteryPrizes(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 375,
              child: ResultsCard(
                results: results,
                displayProvinces: provinces,
                isSingleSel: true,
                selLabel: 'TP. Hồ Chí Minh',
                isWaitingForResults: true,
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      // In single mode with ample horizontal room, it should show 'Đang chờ'
      expect(find.text('Đang chờ'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}

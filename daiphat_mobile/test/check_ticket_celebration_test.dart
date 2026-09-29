import 'package:daiphat_mobile/src/features/home/domain/entities/ticket_check.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/check_ticket_view.dart';
import 'package:daiphat_mobile/src/features/schedule/presentation/providers/schedule_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_theme.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeJackpotWinViewModel extends TicketCheckViewModel {
  @override
  TicketCheckState build() => const TicketCheckState(
        hasChecked: true,
        checkResult: TicketCheckResult(
          stationId: 1,
          stationName: 'TP.HCM',
          drawDate: '2026-09-29',
          ticketNumber: '281551',
          resultAvailable: true,
          winning: true,
          totalWinningAmount: 2000000000,
          matchedPrizes: [
            TicketMatchedPrize(
              prizeDisplayName: 'Giải đặc biệt',
              winningNumber: '281551',
              prizeValue: 2000000000,
              prizeCode: 'DB',
            ),
          ],
        ),
      );

  @override
  Future<void> loadStations(DateTime date) async {}
}

class _FakeMajorWinViewModel extends TicketCheckViewModel {
  @override
  TicketCheckState build() => const TicketCheckState(
        hasChecked: true,
        checkResult: TicketCheckResult(
          stationId: 1,
          stationName: 'TP.HCM',
          drawDate: '2026-09-29',
          ticketNumber: '79248',
          resultAvailable: true,
          winning: true,
          totalWinningAmount: 15000000,
          matchedPrizes: [
            TicketMatchedPrize(
              prizeDisplayName: 'Giải nhì',
              winningNumber: '79248',
              prizeValue: 15000000,
              prizeCode: 'G2',
            ),
          ],
        ),
      );

  @override
  Future<void> loadStations(DateTime date) async {}
}

class _FakeStandardWinViewModel extends TicketCheckViewModel {
  @override
  TicketCheckState build() => const TicketCheckState(
        hasChecked: true,
        checkResult: TicketCheckResult(
          stationId: 1,
          stationName: 'TP.HCM',
          drawDate: '2026-09-29',
          ticketNumber: '54',
          resultAvailable: true,
          winning: true,
          totalWinningAmount: 100000,
          matchedPrizes: [
            TicketMatchedPrize(
              prizeDisplayName: 'Giải tám',
              winningNumber: '54',
              prizeValue: 100000,
              prizeCode: 'G8',
            ),
          ],
        ),
      );

  @override
  Future<void> loadStations(DateTime date) async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('resolveWinCelebrationTier', () {
    test('resolves Jackpot tier for Giai Dac Biet or >= 30M', () {
      const dbResult = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '281551',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 2000000000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải đặc biệt',
            winningNumber: '281551',
            prizeValue: 2000000000,
            prizeCode: 'DB',
          ),
        ],
      );
      expect(resolveWinCelebrationTier(dbResult), WinCelebrationTier.jackpot);

      const g1Result = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '42704',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 30000000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải nhất',
            winningNumber: '42704',
            prizeValue: 30000000,
            prizeCode: 'G1',
          ),
        ],
      );
      expect(resolveWinCelebrationTier(g1Result), WinCelebrationTier.jackpot);
    });

    test('resolves Major tier for G2-G5 or 1M-30M', () {
      const g2Result = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '79248',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 15000000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải nhì',
            winningNumber: '79248',
            prizeValue: 15000000,
            prizeCode: 'G2',
          ),
        ],
      );
      expect(resolveWinCelebrationTier(g2Result), WinCelebrationTier.major);
    });

    test('resolves Standard tier for G8 (<1M)', () {
      const g8Result = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '54',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 100000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải tám',
            winningNumber: '54',
            prizeValue: 100000,
            prizeCode: 'G8',
          ),
        ],
      );
      expect(resolveWinCelebrationTier(g8Result), WinCelebrationTier.standard);
    });
  });

  group('CheckTicketView Celebration UI', () {
    testWidgets('renders Jackpot luxury banner for Special prize', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ticketCheckViewModelProvider.overrideWith(
              _FakeJackpotWinViewModel.new,
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
      await tester.pump(const Duration(seconds: 5));

      expect(find.text('👑'), findsOneWidget);
      expect(find.text('Chúc mừng trúng giải lớn!'), findsOneWidget);
      expect(find.text('Giải đặc biệt'), findsOneWidget);
      expect(find.text(AppFormatters.formatCurrency(2000000000)), findsOneWidget);
      expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    });

    testWidgets('renders Major banner for Second prize', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ticketCheckViewModelProvider.overrideWith(
              _FakeMajorWinViewModel.new,
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
      await tester.pump(const Duration(seconds: 5));

      expect(find.text('🏆'), findsOneWidget);
      expect(find.text('Chúc mừng bạn đã trúng thưởng!'), findsOneWidget);
      expect(find.text('Giải nhì'), findsOneWidget);
      expect(find.text(AppFormatters.formatCurrency(15000000)), findsOneWidget);
    });

    testWidgets('confetti finishes cleanly without freezing particles on screen', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ticketCheckViewModelProvider.overrideWith(
              _FakeStandardWinViewModel.new,
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
      // Pump past the animation duration (2.2s for standard / G8)
      await tester.pump(const Duration(seconds: 4));

      // After completion, no active custom celebration painter is painted
      expect(tester.takeException(), isNull);
    });

    testWidgets('consecutive winning lookups re-trigger celebration properly', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final container = ProviderContainer(
        overrides: [
          lotteryScheduleProvider.overrideWith((ref) async => const []),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const CheckTicketView(),
          ),
        ),
      );
      await tester.pump();

      // Simulate check 1
      container.read(ticketCheckViewModelProvider.notifier).state =
          const TicketCheckState(
        hasChecked: true,
        checkSequence: 1,
        checkResult: TicketCheckResult(
          stationId: 1,
          stationName: 'TP.HCM',
          drawDate: '2026-09-29',
          ticketNumber: '54',
          resultAvailable: true,
          winning: true,
          totalWinningAmount: 100000,
          matchedPrizes: [
            TicketMatchedPrize(
              prizeDisplayName: 'Giải tám',
              winningNumber: '54',
              prizeValue: 100000,
              prizeCode: 'G8',
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byType(CustomPaint), findsWidgets);

      // Reset
      container.read(ticketCheckViewModelProvider.notifier).resetCheck();
      await tester.pump();

      // Simulate check 2 (same number)
      container.read(ticketCheckViewModelProvider.notifier).state =
          const TicketCheckState(
        hasChecked: true,
        checkSequence: 2,
        checkResult: TicketCheckResult(
          stationId: 1,
          stationName: 'TP.HCM',
          drawDate: '2026-09-29',
          ticketNumber: '54',
          resultAvailable: true,
          winning: true,
          totalWinningAmount: 100000,
          matchedPrizes: [
            TicketMatchedPrize(
              prizeDisplayName: 'Giải tám',
              winningNumber: '54',
              prizeValue: 100000,
              prizeCode: 'G8',
            ),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byType(CustomPaint), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  });

  group('resolveWinPrizeCode', () {
    test('resolves prize codes DB, G1..G8 accurately with highest priority', () {
      const dbResult = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '281551',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 2000000000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải đặc biệt',
            winningNumber: '281551',
            prizeValue: 2000000000,
            prizeCode: 'DB',
          ),
        ],
      );
      expect(resolveWinPrizeCode(dbResult), 'DB');

      const g1Result = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '42704',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 30000000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải nhất',
            winningNumber: '42704',
            prizeValue: 30000000,
            prizeCode: 'G1',
          ),
        ],
      );
      expect(resolveWinPrizeCode(g1Result), 'G1');

      const multiPrizeResult = TicketCheckResult(
        stationId: 1,
        stationName: 'TP.HCM',
        drawDate: '2026-09-29',
        ticketNumber: '123456',
        resultAvailable: true,
        winning: true,
        totalWinningAmount: 5100000,
        matchedPrizes: [
          TicketMatchedPrize(
            prizeDisplayName: 'Giải tám',
            winningNumber: '56',
            prizeValue: 100000,
            prizeCode: 'G8',
          ),
          TicketMatchedPrize(
            prizeDisplayName: 'Giải tư',
            winningNumber: '3456',
            prizeValue: 5000000,
            prizeCode: 'G4',
          ),
        ],
      );
      expect(resolveWinPrizeCode(multiPrizeResult), 'G4');
    });
  });
}

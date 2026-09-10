import 'dart:io';

import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/check_ticket_view.dart';
import 'package:daiphat_mobile/src/features/schedule/data/models/lottery_station_schedule.dart';
import 'package:daiphat_mobile/src/features/schedule/presentation/providers/schedule_providers.dart';
import 'package:daiphat_mobile/src/features/checkout/data/system_config_service.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/widgets/checkout_datetime_picker.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/theme/app_theme.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_picker_field.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeTicketCheckViewModel extends TicketCheckViewModel {
  @override
  TicketCheckState build() => const TicketCheckState();

  @override
  Future<void> loadStations(DateTime date) async {}

  @override
  Future<void> check() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Dò vé maps functional text to shared typography tokens', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWithValue(
            ApiClient(
              dio: Dio(BaseOptions(baseUrl: 'https://example.invalid')),
            ),
          ),
          ticketCheckViewModelProvider.overrideWith(
            _FakeTicketCheckViewModel.new,
          ),
          lotteryScheduleProvider.overrideWith(
            (ref) async => const [
              LotteryStationSchedule(
                stationId: 1,
                stationName: 'Đài mẫu',
                region: 'MIEN_NAM',
                drawDays: ['MONDAY'],
                drawDaysDisplay: ['Thứ 2'],
                drawTime: '16:15',
              ),
            ],
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(1.3)),
            child: child!,
          ),
          home: const CheckTicketView(),
        ),
      ),
    );
    await tester.pump();

    final pageTitle = tester.widget<Text>(find.text('Dò vé'));
    final fieldLabel = tester.widget<Text>(find.text('Chọn ngày'));
    final primaryAction = tester.widget<Text>(find.text('Tra cứu kết quả'));
    final numberField = tester.widget<TextField>(find.byType(TextField));
    final dateField = find.bySemanticsLabel('Chọn ngày quay');
    final stationField = find.bySemanticsLabel('Chọn đài quay');

    expect(pageTitle.style?.fontFamily, AppTypography.mainFamily);
    expect(pageTitle.style?.fontSize, 20);
    expect(find.text('TRA CỨU VÉ SỐ'), findsNothing);
    expect(
      find.text('Nhập thông tin vé để kiểm tra kết quả nhanh chóng'),
      findsNothing,
    );
    expect(find.text('Lưu ý quan trọng'), findsNothing);
    expect(fieldLabel.style?.fontFamily, AppTypography.mainFamily);
    expect(fieldLabel.style?.fontSize, 12);
    expect(numberField.style?.fontFamily, AppTypography.displayFamily);
    expect(numberField.style?.fontSize, 18);
    expect(numberField.textAlignVertical, TextAlignVertical.center);
    expect(numberField.decoration?.hintText, 'Ví dụ: 123456');
    expect(
      numberField.decoration?.hintStyle?.fontFamily,
      AppTypography.mainFamily,
    );
    expect(numberField.decoration?.hintStyle?.fontSize, 14);
    expect(primaryAction.style?.fontFamily, AppTypography.mainFamily);
    expect(primaryAction.style?.fontSize, 16);
    expect(tester.getSize(dateField).height, greaterThanOrEqualTo(48));
    expect(tester.getSize(stationField).height, greaterThanOrEqualTo(48));
    expect(find.text('Chọn nhanh'), findsNothing);
    expect(find.bySemanticsLabel('Chọn ngày Hôm nay'), findsNothing);
    expect(find.text('Hướng dẫn dò vé'), findsNothing);
    expect(find.text('Khung giờ mở thưởng 3 miền'), findsNothing);
    expect(find.text('Mua vé số may mắn'), findsNothing);
    expect(find.text('Lịch mở thưởng'), findsOneWidget);
    expect(find.text('Miền Nam'), findsOneWidget);
    expect(find.text('16:15'), findsOneWidget);
    expect(find.text('Miền Trung'), findsNothing);
    expect(find.text('Miền Bắc'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  test('Dò vé keeps shared UI utilities and no fractional font sizes', () {
    final source = File(
      'lib/src/features/home/presentation/views/check_ticket_view.dart',
    ).readAsStringSync();

    expect(source, contains('AppTypography.pageTitle()'));
    expect(source, contains('AppTypography.h4('));
    expect(source, contains('AppTypography.labelLarge('));
    expect(source, contains('AppTypography.bodyMedium('));
    expect(source, contains('AppTypography.lotteryDigit('));
    expect(source, contains('AppTypography.buttonLarge()'));
    expect(source, contains('AppPickerField('));
    expect(source, contains('LotteryDatePickerDialog.show('));
    expect(source, contains('final useYesterday ='));
    expect(source, contains('textInputAction: TextInputAction.done'));
    expect(source, contains('letterSpacing: 3'));
    expect(source, contains('class _CheckTicketSupportSection'));
    expect(source, contains("'Lịch mở thưởng'"));
    expect(source, contains('availableScheduleRegions('));
    expect(source, contains('scheduleRegionDrawTimes('));
    expect(source, isNot(contains('Miền Trung 17:15')));
    expect(source, isNot(contains('Miền Bắc 18:15')));
    expect(source, isNot(contains('class _QuickDateChip')));
    expect(source, contains('AppFormatters.formatCurrency('));
    expect(RegExp(r'fontSize:\s*\d+\.\d+').hasMatch(source), isFalse);
    expect(source, isNot(contains('TextStyle(')));

    final checkoutSource = File(
      'lib/src/features/checkout/presentation/widgets/checkout_datetime_picker.dart',
    ).readAsStringSync();
    expect(checkoutSource, contains('AppPickerField('));
  });

  testWidgets('Dò vé does not fabricate regions when schedule data is empty', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWithValue(
            ApiClient(
              dio: Dio(BaseOptions(baseUrl: 'https://example.invalid')),
            ),
          ),
          ticketCheckViewModelProvider.overrideWith(
            _FakeTicketCheckViewModel.new,
          ),
          lotteryScheduleProvider.overrideWith(
            (ref) async => const <LotteryStationSchedule>[],
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const CheckTicketView(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Chưa có dữ liệu lịch mở thưởng'), findsOneWidget);
    expect(find.text('Miền Nam'), findsNothing);
    expect(find.text('Miền Trung'), findsNothing);
    expect(find.text('Miền Bắc'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Checkout embedded date field uses the shared picker shell', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          operatingHoursProvider.overrideWith(
            (ref) async => const SiteOperatingHours(),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(1.3)),
            child: child!,
          ),
          home: Scaffold(
            body: CheckoutDateTimePicker(
              value: null,
              embedded: true,
              onChanged: (_) {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(AppPickerField), findsOneWidget);
    expect(find.text('Thời gian đến lấy *'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

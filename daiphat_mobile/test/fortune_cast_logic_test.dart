import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/fortune/data/models/fortune_cast_result.dart';
import 'package:daiphat_mobile/src/features/fortune/utils/fortune_ui.dart';
import 'package:daiphat_mobile/src/shared/utils/api_error_message.dart';

void main() {
  group('fortune UI helpers', () {
    test('maps five elements like the website', () {
      expect(fortuneElementLabel('METAL'), 'Kim');
      expect(fortuneElementLabel('WOOD'), 'Mộc');
      expect(fortuneElementLabel('WATER'), 'Thủy');
      expect(fortuneElementLabel('FIRE'), 'Hỏa');
      expect(fortuneElementLabel('EARTH'), 'Thổ');
      expect(fortuneElementLabel(null), '—');
    });

    test('formats fortune dates as DD-MM-YYYY', () {
      expect(formatFortuneDisplayDate('2026-08-16'), '16-08-2026');
      expect(formatFortuneDisplayDate('16-08-2026'), '16-08-2026');
    });

    test('localizes ISO dates inside prose', () {
      expect(
        localizeFortuneProseDates('Quẻ ngày 2026-08-16 cho đuôi 27'),
        'Quẻ ngày 16-08-2026 cho đuôi 27',
      );
    });

    test('validates birth date like the website', () {
      expect(buildBirthDateIso('16', '8', '1995'), '1995-08-16');
      expect(buildBirthDateIso('31', '2', '1995'), isNull);
      expect(
        buildBirthDateIso('1', '1', '1899', DateTime(2026, 8, 16)),
        isNull,
      );
      expect(
        buildBirthDateIso('17', '8', '2026', DateTime(2026, 8, 16)),
        isNull,
      );
    });

    test('formats countdown as HH:MM:SS', () {
      expect(formatCountdownHms(const Duration(hours: 2, minutes: 3, seconds: 4)), '02:03:04');
    });

    test('parses buyPath query from backend', () {
      final parsed = parseFortuneBuyPath(
        '/buy-ticket?ticketNumber=27&drawDate=2026-08-17',
      );
      expect(parsed.ticketNumber, '27');
      expect(parsed.drawDate, '2026-08-17');
    });
  });

  group('FortuneCastResult', () {
    test('parses API payload used by the website', () {
      final result = FortuneCastResult.fromJson({
        'luckyTail': '27',
        'primaryTail': '27',
        'fallbackUsed': false,
        'userElement': 'FIRE',
        'dayElement': 'WATER',
        'prose': 'Bản mệnh Hỏa, đuôi may mắn 27.',
        'proseSource': 'TEMPLATE',
        'castDate': '2026-08-16',
        'sellableDrawDate': '2026-08-17',
        'buyPath': '/buy-ticket?ticketNumber=27&drawDate=2026-08-17',
        'alreadyCastToday': true,
        'previousCastSummary': {
          'castDate': '2026-08-15',
          'luckyTail': '09',
          'userElement': 'FIRE',
        },
        'nextUnlockAt': '2026-08-17T00:00:00Z',
      });

      expect(result.luckyTail, '27');
      expect(result.alreadyCastToday, isTrue);
      expect(result.previousCastSummary?.luckyTail, '09');
      expect(result.nextUnlockAt, isNotNull);
    });

    test('random payload matches website body', () {
      final json = const CastFortunePayload(
        randomElement: true,
        birthYear: 2026,
      ).toJson();
      expect(json['randomElement'], isTrue);
      expect(json['birthYear'], 2026);
    });
  });

  test('maps fortune API errors to Vietnamese', () {
    expect(
      toUserFacingApiMessage('Birth year is required to cast your fortune.'),
      'Vui lòng nhập ngày sinh để gieo quẻ.',
    );
    expect(
      toUserFacingApiMessage(
        'No sellable ticket endings are available for today\'s draw.',
      ),
      'Hôm nay chưa có đuôi vé để gieo quẻ. Vui lòng thử lại sau.',
    );
  });
}

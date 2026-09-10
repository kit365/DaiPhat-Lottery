import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';

void main() {
  group('buildProductTitle Helper Tests', () {
    test('standard province name formats as "Vé số <Province>"', () {
      expect(buildProductTitle('Long An'), equals('Vé số Long An'));
      expect(buildProductTitle('Bạc Liêu'), equals('Vé số Bạc Liêu'));
      expect(buildProductTitle('Đồng Tháp'), equals('Vé số Đồng Tháp'));
      expect(buildProductTitle('Tiền Giang'), equals('Vé số Tiền Giang'));
    });

    test(
      'province name starting with "Đài " formats as "Vé số <Province>"',
      () {
        expect(buildProductTitle('Đài Long An'), equals('Vé số Long An'));
        expect(buildProductTitle('Đài Bạc Liêu'), equals('Vé số Bạc Liêu'));
        expect(buildProductTitle('đài Tiền Giang'), equals('Vé số Tiền Giang'));
      },
    );

    test(
      'already formatted "Vé số ..." keeps existing prefix without duplication',
      () {
        expect(buildProductTitle('Vé số TP.HCM'), equals('Vé số TP.HCM'));
        expect(
          buildProductTitle('vé số Bình Dương'),
          equals('vé số Bình Dương'),
        );
        expect(
          buildProductTitle('Vé số Kiến thiết Long An'),
          equals('Vé số Kiến thiết Long An'),
        );
      },
    );

    test('empty or null or placeholder fallback to "Vé số kiến thiết"', () {
      expect(buildProductTitle(null), equals('Vé số kiến thiết'));
      expect(buildProductTitle(''), equals('Vé số kiến thiết'));
      expect(buildProductTitle('   '), equals('Vé số kiến thiết'));
      expect(buildProductTitle('Đang cập nhật'), equals('Vé số kiến thiết'));
    });
  });

  group('LotteryTicketListItem productTitle and titleText Tests', () {
    test('productTitle and titleText return formatted product title', () {
      final item = LotteryTicketListItem(
        id: 1,
        displayName: 'Vé số Long An',
        code: '123456',
        shortName: 'LA',
        dateLabel: 'Thứ 7, 29/08/2026',
        dayFilter: TicketDayFilter.today,
        drawDate: DateTime(2026, 8, 29),
        status: 'IN_STOCK',
        statusDisplayName: 'Đang bán',
        stationName: 'Long An',
      );

      expect(item.productTitle, equals('Vé số Long An'));
      expect(item.titleText, equals('Vé số Long An'));
      expect(item.stationDisplayText, equals('Long An'));
    });

    test(
      'mapLotteryTicketToListItem properly sets displayName with product title',
      () {
        final ticket = LotteryTicket(
          id: 101,
          stationId: 1,
          stationName: 'Long An',
          ticketImg: null,
          serialNumber: 'SN-001',
          numbers: '854921',
          drawDate: DateTime(2026, 8, 29),
          quantity: 5,
          batchCode: 'BATCH-01',
          status: 'IN_STOCK',
          statusDisplayName: 'Đang mở bán',
          verified: true,
          priceSnapshot: 10000,
        );

        final item = mapLotteryTicketToListItem(ticket);
        expect(item.displayName, equals('Vé số Long An'));
        expect(item.productTitle, equals('Vé số Long An'));
        expect(item.titleText, equals('Vé số Long An'));
        expect(item.stationDisplayText, equals('Long An'));
      },
    );
  });
}

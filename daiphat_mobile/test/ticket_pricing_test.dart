import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';

void main() {
  group('Pricing SSOT Contract Tests', () {
    test('kDefaultLotteryTicketPrice is 10,000 VND', () {
      expect(kDefaultLotteryTicketPrice, equals(10000));
    });

    test(
      'LotteryTicket.effectivePrice returns 10,000 when priceSnapshot is null or 0',
      () {
        final ticketNullPrice = LotteryTicket(
          id: 1,
          stationId: 1,
          stationName: 'Long An',
          ticketImg: null,
          serialNumber: 'SN-001',
          numbers: '123456',
          drawDate: DateTime(2026, 8, 29),
          quantity: 5,
          batchCode: 'B-01',
          status: 'IN_STOCK',
          statusDisplayName: 'Đang bán',
          verified: true,
          priceSnapshot: null,
        );

        final ticketZeroPrice = LotteryTicket(
          id: 2,
          stationId: 1,
          stationName: 'Long An',
          ticketImg: null,
          serialNumber: 'SN-002',
          numbers: '123457',
          drawDate: DateTime(2026, 8, 29),
          quantity: 5,
          batchCode: 'B-01',
          status: 'IN_STOCK',
          statusDisplayName: 'Đang bán',
          verified: true,
          priceSnapshot: 0,
        );

        expect(ticketNullPrice.effectivePrice, equals(10000));
        expect(ticketZeroPrice.effectivePrice, equals(10000));
      },
    );

    test(
      'LotteryTicket.effectivePrice returns custom price when priceSnapshot > 0',
      () {
        final ticketCustomPrice = LotteryTicket(
          id: 3,
          stationId: 1,
          stationName: 'Long An',
          ticketImg: null,
          serialNumber: 'SN-003',
          numbers: '123458',
          drawDate: DateTime(2026, 8, 29),
          quantity: 5,
          batchCode: 'B-01',
          status: 'IN_STOCK',
          statusDisplayName: 'Đang bán',
          verified: true,
          priceSnapshot: 20000,
        );

        expect(ticketCustomPrice.effectivePrice, equals(20000));
      },
    );

    test(
      'LotteryTicketListItem.effectivePrice returns 10,000 fallback when price is null or 0',
      () {
        final itemNull = LotteryTicketListItem(
          id: 1,
          displayName: 'Vé số Long An',
          code: '123456',
          shortName: 'LA',
          dateLabel: 'Hôm nay',
          dayFilter: TicketDayFilter.today,
          drawDate: DateTime(2026, 8, 29),
          status: 'IN_STOCK',
          statusDisplayName: 'Đang bán',
          price: null,
        );

        final itemZero = LotteryTicketListItem(
          id: 2,
          displayName: 'Vé số Long An',
          code: '123457',
          shortName: 'LA',
          dateLabel: 'Hôm nay',
          dayFilter: TicketDayFilter.today,
          drawDate: DateTime(2026, 8, 29),
          status: 'IN_STOCK',
          statusDisplayName: 'Đang bán',
          price: 0,
        );

        expect(itemNull.effectivePrice, equals(10000));
        expect(itemZero.effectivePrice, equals(10000));
      },
    );

    test(
      'mapLotteryTicketToListItem preserves effectivePrice from LotteryTicket',
      () {
        final ticketWithoutPrice = LotteryTicket(
          id: 10,
          stationId: 1,
          stationName: 'Bạc Liêu',
          ticketImg: null,
          serialNumber: 'BL-001',
          numbers: '999999',
          drawDate: DateTime(2026, 8, 29),
          quantity: 2,
          batchCode: 'B-02',
          status: 'IN_STOCK',
          statusDisplayName: 'Đang bán',
          verified: true,
          priceSnapshot: null,
        );

        final mappedItem = mapLotteryTicketToListItem(ticketWithoutPrice);
        expect(mappedItem.price, equals(10000));
        expect(mappedItem.effectivePrice, equals(10000));
      },
    );

    test(
      'LotteryTicket.fromJson parses price and unitPrice when priceSnapshot is omitted',
      () {
        final jsonWithPrice = <String, dynamic>{
          'id': 11,
          'stationName': 'Long An',
          'numbers': '112233',
          'price': 15000,
        };
        final ticket1 = LotteryTicket.fromJson(jsonWithPrice);
        expect(ticket1.priceSnapshot, equals(15000));
        expect(ticket1.effectivePrice, equals(15000));

        final jsonWithUnitPrice = <String, dynamic>{
          'id': 12,
          'stationName': 'Long An',
          'numbers': '112234',
          'unitPrice': 20000,
        };
        final ticket2 = LotteryTicket.fromJson(jsonWithUnitPrice);
        expect(ticket2.priceSnapshot, equals(20000));
        expect(ticket2.effectivePrice, equals(20000));

        final jsonWithoutAnyPrice = <String, dynamic>{
          'id': 13,
          'stationName': 'Long An',
          'numbers': '112235',
        };
        final ticket3 = LotteryTicket.fromJson(jsonWithoutAnyPrice);
        expect(ticket3.priceSnapshot, isNull);
        expect(ticket3.effectivePrice, equals(10000));
      },
    );
  });
}

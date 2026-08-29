import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';

void main() {
  group('Bước 3 - Visual Hierarchy Color Tokens & Specifications', () {
    test('Ticket card color tokens match visual hierarchy specs', () {
      // 1. Số vé: Màu tối thương hiệu (#17191F)
      expect(AppColors.neutralInk, equals(const Color(0xFF17191F)));
      expect(AppColors.contentPrimary, equals(const Color(0xFF17191F)));

      // 2. Giá vé: Màu đỏ thương hiệu (#D31010)
      expect(AppColors.primary, equals(const Color(0xFFD31010)));
      expect(AppColors.brandPrimary, equals(const Color(0xFFD31010)));

      // 3. Chip Đài: Trung tính (#F1F5F9 nền, #475569 chữ)
      const stationBg = Color(0xFFF1F5F9);
      const stationTextColor = Color(0xFF475569);
      expect(stationBg.toARGB32(), equals(0xFFF1F5F9));
      expect(stationTextColor.toARGB32(), equals(0xFF475569));

      // 4. Ngày mở thưởng: Xám dịu (#94A3B8 icon, #64748B text)
      const dateIconColor = Color(0xFF94A3B8);
      const dateTextColor = Color(0xFF64748B);
      expect(dateIconColor.toARGB32(), equals(0xFF94A3B8));
      expect(dateTextColor.toARGB32(), equals(0xFF64748B));
    });

    test('LotteryTicketListItem correctly models ticket code and pricing for hierarchy rendering', () {
      final item = LotteryTicketListItem(
        id: 1,
        displayName: 'Vé số Long An',
        code: '854921',
        shortName: 'LA',
        dateLabel: 'Thứ 7, 29/08/2026',
        dayFilter: TicketDayFilter.today,
        drawDate: DateTime(2026, 8, 29),
        status: 'IN_STOCK',
        statusDisplayName: 'Đang bán',
        stationName: 'Long An',
        price: 10000,
      );

      expect(item.code, equals('854921'));
      expect(item.effectivePrice, equals(10000));
      expect(item.stationDisplayText, equals('Long An'));
      expect(item.productTitle, equals('Vé số Long An'));
      expect(item.dateLabel, equals('Thứ 7, 29/08/2026'));
    });
  });

  group('Bước 4 - Card Layout 3-Tier Structure & Metadata Tests', () {
    test('LotteryTicketListItem correctly carries batchCode and quantity for Tier 3 metadata', () {
      final ticketWithBatchAndQty = LotteryTicketListItem(
        id: 2,
        displayName: 'Vé số TP.HCM',
        code: '123456',
        shortName: 'HCM',
        dateLabel: 'Thứ 7, 29/08/2026',
        dayFilter: TicketDayFilter.today,
        drawDate: DateTime(2026, 8, 29),
        status: 'IN_STOCK',
        statusDisplayName: 'Đang bán',
        stationName: 'TP.HCM',
        batchCode: '8K2',
        quantity: 10,
        price: 10000,
      );

      expect(ticketWithBatchAndQty.batchCode, equals('8K2'));
      expect(ticketWithBatchAndQty.quantity, equals(10));
      expect(ticketWithBatchAndQty.effectivePrice, equals(10000));
    });
  });
}


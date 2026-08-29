import 'package:flutter/material.dart';

import '../data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class TicketStatusUi {
  final String label;
  final Color color;
  final Color bgColor;

  const TicketStatusUi({
    required this.label,
    required this.color,
    required this.bgColor,
  });
}

class TicketPossessionDisplay {
  final String label;
  final String? hint;
  final Color color;
  final Color bgColor;
  final IconData icon;

  const TicketPossessionDisplay({
    required this.label,
    this.hint,
    required this.color,
    required this.bgColor,
    required this.icon,
  });
}

class TicketPayoutDisplay {
  final String label;
  final Color color;
  final Color bgColor;
  final IconData icon;

  const TicketPayoutDisplay({
    required this.label,
    required this.color,
    required this.bgColor,
    required this.icon,
  });
}

const _statusUi = <String, TicketStatusUi>{
  'PENDING_DRAW': TicketStatusUi(
    label: 'Chờ quay số',
    color: AppColors.ticketPendingForeground,
    bgColor: AppColors.ticketPendingSurface,
  ),
  'WON': TicketStatusUi(
    label: 'Trúng thưởng',
    color: AppColors.ticketPendingForeground,
    bgColor: AppColors.ticketPendingSurface,
  ),
  'LOST': TicketStatusUi(
    label: 'Không trúng',
    color: AppColors.ticketLostForeground,
    bgColor: AppColors.ticketLostSurface,
  ),
};

const _serialStatusLabels = <String, String>{
  'IN_STOCK': 'Trong kho',
  'RESERVED': 'Đang giữ chỗ',
  'PROXY_HOLDING': 'Đại lý giữ hộ',
  'SOLD': 'Đã bán',
  'EXPIRED': 'Đã hết hạn kỳ quay',
};

const _payoutEligibleSerialStatuses = {'PROXY_HOLDING', 'EXPIRED'};

TicketStatusUi ticketStatusUi(String status) =>
    _statusUi[status] ?? _statusUi['PENDING_DRAW']!;

List<String> splitTicketNumbers(String? numbers) {
  final digits = (numbers ?? '').replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return [];
  if (digits.length % 2 == 0 && digits.length >= 2 && digits.length <= 12) {
    final pairs = <String>[];
    for (var i = 0; i < digits.length; i += 2) {
      pairs.add(digits.substring(i, i + 2));
    }
    return pairs;
  }
  return digits.split('');
}

TicketPossessionDisplay? resolveTicketPossessionDisplay(
  PurchasedTicket ticket,
) {
  if (ticket.serialStatus == 'PROXY_HOLDING') {
    return const TicketPossessionDisplay(
      label: 'Đại lý đang giữ hộ',
      hint: 'Vé chưa được bạn lấy tại quầy',
      color: AppColors.ticketHoldingForeground,
      bgColor: AppColors.ticketHoldingSurface,
      icon: Icons.store_outlined,
    );
  }
  if (ticket.serialStatus == 'SOLD' || ticket.actualPickedUpAt != null) {
    return const TicketPossessionDisplay(
      label: 'Đã lấy vé',
      hint: 'Bạn đã nhận vé vật lý tại đại lý',
      color: AppColors.ticketPickedUpForeground,
      bgColor: AppColors.ticketPickedUpSurface,
      icon: Icons.back_hand_outlined,
    );
  }
  if (ticket.serialStatus == 'RESERVED') {
    return const TicketPossessionDisplay(
      label: 'Đang giữ chỗ',
      hint: 'Chờ hoàn tất đơn hàng',
      color: AppColors.ticketReservedForeground,
      bgColor: AppColors.ticketReservedSurface,
      icon: Icons.schedule_outlined,
    );
  }
  if (ticket.serialStatus == 'EXPIRED') {
    return const TicketPossessionDisplay(
      label: 'Còn tại đại lý',
      hint: 'Kỳ quay đã hết hạn — vé vẫn được đại lý giữ',
      color: AppColors.ticketHoldingForeground,
      bgColor: AppColors.ticketHoldingSurface,
      icon: Icons.store_outlined,
    );
  }
  if (ticket.serialStatus == null) return null;
  return TicketPossessionDisplay(
    label: _serialStatusLabels[ticket.serialStatus] ?? ticket.serialStatus!,
    color: AppColors.ticketReservedForeground,
    bgColor: AppColors.ticketReservedSurface,
    icon: Icons.confirmation_number_outlined,
  );
}

TicketPayoutDisplay? resolveTicketPayoutDisplay(PurchasedTicket ticket) {
  if (ticket.drawResultStatus != 'WON') return null;

  final status = ticket.activePayoutStatus;
  if (ticket.payoutState == 'PAID_OUT' || status == 'COMPLETED') {
    return const TicketPayoutDisplay(
      label: 'Đã trả thưởng',
      color: AppColors.payoutCompleteForeground,
      bgColor: AppColors.payoutCompleteSurface,
      icon: Icons.check_circle_outline,
    );
  }
  if (ticket.payoutState == 'PAYOUT_PENDING' ||
      status == 'PENDING' ||
      status == 'APPROVED') {
    return TicketPayoutDisplay(
      label: status == 'APPROVED'
          ? 'Đã duyệt — chờ hoàn tất'
          : 'Đang xử lý trả thưởng',
      color: AppColors.payoutPendingForeground,
      bgColor: AppColors.payoutPendingSurface,
      icon: Icons.hourglass_top_outlined,
    );
  }
  if (status == 'MANUAL_RESOLUTION') {
    return const TicketPayoutDisplay(
      label: 'Cần đổi thưởng tại đại lý',
      color: AppColors.payoutManualForeground,
      bgColor: AppColors.payoutManualSurface,
      icon: Icons.store_outlined,
    );
  }
  if (status == 'REJECTED') {
    return const TicketPayoutDisplay(
      label: 'Bị từ chối trả thưởng',
      color: AppColors.payoutManualForeground,
      bgColor: AppColors.payoutManualSurface,
      icon: Icons.cancel_outlined,
    );
  }
  if (status == 'CANCELLED') {
    return const TicketPayoutDisplay(
      label: 'Đã hủy yêu cầu',
      color: AppColors.payoutNeutralForeground,
      bgColor: AppColors.payoutNeutralSurface,
      icon: Icons.block_outlined,
    );
  }
  if (ticket.redemptionZone == 'PAST_ISSUER_LOCKED') {
    return const TicketPayoutDisplay(
      label: 'Hết hạn trả thưởng',
      color: AppColors.payoutManualForeground,
      bgColor: AppColors.payoutManualSurface,
      icon: Icons.lock_outline,
    );
  }
  if (ticket.redemptionZone == 'PAST_CUSTOMER_URGENT' ||
      ticket.canClaimOnline == false ||
      ticket.claimChannel == 'IN_PERSON') {
    return const TicketPayoutDisplay(
      label: 'Đổi thưởng tại đại lý',
      color: AppColors.payoutInPersonForeground,
      bgColor: AppColors.payoutInPersonSurface,
      icon: Icons.store_outlined,
    );
  }
  return const TicketPayoutDisplay(
    label: 'Chưa yêu cầu trả thưởng',
    color: AppColors.ticketPickedUpForeground,
    bgColor: AppColors.ticketPickedUpSurface,
    icon: Icons.payments_outlined,
  );
}

bool canRequestPrizePayout(PurchasedTicket ticket) {
  final status = ticket.activePayoutStatus;
  final withinCustomerWindow =
      ticket.redemptionZone == null ||
      ticket.redemptionZone == 'WITHIN_CUSTOMER';
  return ticket.drawResultStatus == 'WON' &&
      ticket.canClaimOnline == true &&
      withinCustomerWindow &&
      ticket.serialStatus != null &&
      _payoutEligibleSerialStatuses.contains(ticket.serialStatus) &&
      (ticket.payoutState == null || ticket.payoutState == 'NONE') &&
      status != 'PENDING' &&
      status != 'APPROVED' &&
      status != 'COMPLETED' &&
      status != 'MANUAL_RESOLUTION';
}

String? getPrizePayoutIneligibilityMessage(PurchasedTicket ticket) {
  if (ticket.drawResultStatus != 'WON') return null;
  final status = ticket.activePayoutStatus;
  if (status == 'PENDING' ||
      status == 'APPROVED' ||
      ticket.payoutState == 'PAYOUT_PENDING') {
    return 'Vé đang có yêu cầu trả thưởng đang xử lý.';
  }
  if (ticket.payoutState == 'PAID_OUT' || status == 'COMPLETED') {
    return null;
  }
  if (status == 'MANUAL_RESOLUTION') {
    return 'Yêu cầu trả thưởng trực tuyến đã bị từ chối quá số lần cho phép — vui lòng đến đại lý đổi thưởng.';
  }
  if (ticket.redemptionZone == 'PAST_ISSUER_LOCKED') {
    return 'Đã hết hạn trả thưởng — không thể đổi thưởng.';
  }
  if (ticket.redemptionZone == 'PAST_CUSTOMER_URGENT') {
    final days = ticket.daysRemainingToIssuer;
    if (days != null && days >= 0) {
      if (days == 0) {
        return 'Đã hết hạn đổi thưởng trực tuyến. Vui lòng mang vé đến đại lý trong hôm nay trước khi hết hạn chính thức.';
      }
      final dayLabel = days == 1 ? '1 ngày' : '$days ngày';
      return 'Đã hết hạn đổi thưởng trực tuyến. Vui lòng mang vé đến đại lý trong $dayLabel tới (còn hạn lĩnh nhà đài).';
    }
    return 'Đã hết hạn đổi thưởng trực tuyến. Vui lòng mang vé đến đại lý nếu còn trong hạn lĩnh nhà đài.';
  }
  if (ticket.canClaimOnline == false || ticket.claimChannel == 'IN_PERSON') {
    return 'Vé này bắt buộc đổi thưởng trực tiếp tại đại lý.';
  }
  if (ticket.serialStatus == null ||
      !_payoutEligibleSerialStatuses.contains(ticket.serialStatus)) {
    final statusLabel = ticket.serialStatus != null
        ? (_serialStatusLabels[ticket.serialStatus] ?? ticket.serialStatus)
        : 'không xác định';
    return 'Vé đang ở trạng thái "$statusLabel" — chưa thể gửi yêu cầu trả thưởng.';
  }
  return null;
}

String serialPayoutStateLabel(String? state) {
  switch (state) {
    case 'PAYOUT_PENDING':
      return 'Đang xử lý trả thưởng';
    case 'PAID_OUT':
      return 'Đã trả thưởng';
    case 'NONE':
    default:
      return 'Chưa yêu cầu trả thưởng';
  }
}

import 'package:flutter/material.dart';

import '../data/models/purchased_ticket.dart';

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
    color: Color(0xFFD97706),
    bgColor: Color(0xFFFFFBEB),
  ),
  'WON': TicketStatusUi(
    label: 'Trúng thưởng',
    color: Color(0xFFD97706),
    bgColor: Color(0xFFFFFBEB),
  ),
  'LOST': TicketStatusUi(
    label: 'Không trúng',
    color: Color(0xFFEF4444),
    bgColor: Color(0xFFFEF2F2),
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

TicketPossessionDisplay? resolveTicketPossessionDisplay(PurchasedTicket ticket) {
  if (ticket.serialStatus == 'PROXY_HOLDING') {
    return const TicketPossessionDisplay(
      label: 'Đại lý đang giữ hộ',
      hint: 'Vé chưa được bạn lấy tại quầy',
      color: Color(0xFFB45309),
      bgColor: Color(0xFFFFFBEB),
      icon: Icons.store_outlined,
    );
  }
  if (ticket.serialStatus == 'SOLD' || ticket.actualPickedUpAt != null) {
    return const TicketPossessionDisplay(
      label: 'Đã lấy vé',
      hint: 'Bạn đã nhận vé vật lý tại đại lý',
      color: Color(0xFF0369A1),
      bgColor: Color(0xFFF0F9FF),
      icon: Icons.back_hand_outlined,
    );
  }
  if (ticket.serialStatus == 'RESERVED') {
    return const TicketPossessionDisplay(
      label: 'Đang giữ chỗ',
      hint: 'Chờ hoàn tất đơn hàng',
      color: Color(0xFF475569),
      bgColor: Color(0xFFF8FAFC),
      icon: Icons.schedule_outlined,
    );
  }
  if (ticket.serialStatus == 'EXPIRED') {
    return const TicketPossessionDisplay(
      label: 'Còn tại đại lý',
      hint: 'Kỳ quay đã hết hạn — vé vẫn được đại lý giữ',
      color: Color(0xFFB45309),
      bgColor: Color(0xFFFFFBEB),
      icon: Icons.store_outlined,
    );
  }
  if (ticket.serialStatus == null) return null;
  return TicketPossessionDisplay(
    label: _serialStatusLabels[ticket.serialStatus] ?? ticket.serialStatus!,
    color: const Color(0xFF475569),
    bgColor: const Color(0xFFF8FAFC),
    icon: Icons.confirmation_number_outlined,
  );
}

TicketPayoutDisplay? resolveTicketPayoutDisplay(PurchasedTicket ticket) {
  if (ticket.drawResultStatus != 'WON') return null;

  final status = ticket.activePayoutStatus;
  if (ticket.payoutState == 'PAID_OUT' || status == 'COMPLETED') {
    return const TicketPayoutDisplay(
      label: 'Đã trả thưởng',
      color: Color(0xFF047857),
      bgColor: Color(0xFFECFDF5),
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
      color: const Color(0xFFB45309),
      bgColor: const Color(0xFFFFFBEB),
      icon: Icons.hourglass_top_outlined,
    );
  }
  if (status == 'MANUAL_RESOLUTION') {
    return const TicketPayoutDisplay(
      label: 'Cần đổi thưởng tại đại lý',
      color: Color(0xFFBE123C),
      bgColor: Color(0xFFFFF1F2),
      icon: Icons.store_outlined,
    );
  }
  if (status == 'REJECTED') {
    return const TicketPayoutDisplay(
      label: 'Bị từ chối trả thưởng',
      color: Color(0xFFBE123C),
      bgColor: Color(0xFFFFF1F2),
      icon: Icons.cancel_outlined,
    );
  }
  if (status == 'CANCELLED') {
    return const TicketPayoutDisplay(
      label: 'Đã hủy yêu cầu',
      color: Color(0xFF475569),
      bgColor: Color(0xFFF1F5F9),
      icon: Icons.block_outlined,
    );
  }
  if (ticket.canClaimOnline == false || ticket.claimChannel == 'IN_PERSON') {
    return const TicketPayoutDisplay(
      label: 'Đổi thưởng tại đại lý',
      color: Color(0xFF6D28D9),
      bgColor: Color(0xFFF5F3FF),
      icon: Icons.store_outlined,
    );
  }
  return const TicketPayoutDisplay(
    label: 'Chưa yêu cầu trả thưởng',
    color: Color(0xFF0369A1),
    bgColor: Color(0xFFF0F9FF),
    icon: Icons.payments_outlined,
  );
}

bool canRequestPrizePayout(PurchasedTicket ticket) {
  final status = ticket.activePayoutStatus;
  return ticket.drawResultStatus == 'WON' &&
      ticket.canClaimOnline == true &&
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
    return 'Yêu cầu trả thưởng online đã bị từ chối quá số lần cho phép — vui lòng đến đại lý đổi thưởng.';
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

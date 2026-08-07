import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';

class _BadgeColors {
  final Color bg;
  final Color fg;
  const _BadgeColors(this.bg, this.fg);
}

_BadgeColors _refundColors(RefundRequestStatus status) {
  switch (status) {
    case RefundRequestStatus.waitingForInfo:
      return const _BadgeColors(Color(0xFFFFF9F3), Color(0xFFB76E00));
    case RefundRequestStatus.approved:
    case RefundRequestStatus.readyToPay:
      return const _BadgeColors(Color(0xFFEFF8FF), Color(0xFF175CD3));
    case RefundRequestStatus.paid:
    case RefundRequestStatus.transferred:
      return const _BadgeColors(Color(0xFFE4F8ED), Color(0xFF1CA75A));
    case RefundRequestStatus.manualResolution:
      return const _BadgeColors(Color(0xFFFFF5F5), Color(0xFFC62828));
  }
}

_BadgeColors _ticketColors(TicketStatus status) {
  switch (status) {
    case TicketStatus.open:
      return const _BadgeColors(Color(0xFFEFF8FF), Color(0xFF175CD3));
    case TicketStatus.inProgress:
      return const _BadgeColors(Color(0xFFFFF9F3), Color(0xFFB76E00));
    case TicketStatus.waitingForCustomer:
      return const _BadgeColors(Color(0xFFFFF4E5), Color(0xFF9A4D00));
    case TicketStatus.resolved:
      return const _BadgeColors(Color(0xFFE4F8ED), Color(0xFF1CA75A));
    case TicketStatus.rejected:
      return const _BadgeColors(Color(0xFFFFF4F4), Color(0xFFEE1314));
    case TicketStatus.closed:
      return const _BadgeColors(Color(0xFFF4F6F8), Color(0xFF637381));
  }
}

Widget _pill(String label, Color bg, Color fg) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      label,
      style: GoogleFonts.publicSans(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: fg,
      ),
    ),
  );
}

class RefundStatusBadge extends StatelessWidget {
  final RefundRequestStatus status;
  const RefundStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final c = _refundColors(status);
    return _pill(status.label, c.bg, c.fg);
  }
}

class PrizePayoutStatusBadge extends StatelessWidget {
  final PrizePayoutRequestStatus status;
  const PrizePayoutStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    return _pill(status.label, status.bgColor, status.textColor);
  }
}

class ComplaintStatusBadge extends StatelessWidget {
  final TicketStatus status;
  const ComplaintStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final c = _ticketColors(status);
    return _pill(status.label, c.bg, c.fg);
  }
}

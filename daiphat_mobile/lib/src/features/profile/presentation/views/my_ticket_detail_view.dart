import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/home/presentation/providers/lottery_results_lookup_provider.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/prize_payout_request_sheet.dart';
import 'package:daiphat_mobile/src/features/profile/utils/ticket_display_utils.dart';
import 'package:daiphat_mobile/src/features/profile/utils/rebuy_ticket.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';

class MyTicketDetailView extends ConsumerWidget {
  final String ticketId;

  const MyTicketDetailView({super.key, required this.ticketId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticket = GoRouterState.of(context).extra as PurchasedTicket?;
    if (ticket == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => context.pop(),
          ),
        ),
        body: const Center(child: Text('Không tìm thấy thông tin vé')),
      );
    }

    return _TicketDetailBody(ticket: ticket);
  }
}

class _TicketDetailBody extends ConsumerWidget {
  final PurchasedTicket ticket;

  const _TicketDetailBody({required this.ticket});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ticketStatusUi(ticket.drawResultStatus);
    final possession = resolveTicketPossessionDisplay(ticket);
    final payout = resolveTicketPayoutDisplay(ticket);
    final numberParts = splitTicketNumbers(ticket.numbers);
    final isWon = ticket.drawResultStatus == 'WON';
    final isEligible = canRequestPrizePayout(ticket);
    final ineligibility = getPrizePayoutIneligibilityMessage(ticket);
    final currencyFmt = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Chi tiết vé',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildTicketStub(
              context: context,
              status: status,
              numberParts: numberParts,
              isWon: isWon,
              possession: possession,
              payout: payout,
              currencyFmt: currencyFmt,
            ),
            if (isWon) ...[
              const SizedBox(height: 16),
              _buildPrizeSection(
                context,
                ref,
                isEligible: isEligible,
                ineligibility: ineligibility,
                payout: payout,
              ),
            ],
            const SizedBox(height: 16),
            _buildViewDrawResultButton(context, ref),
            const SizedBox(height: 10),
            _buildRebuyButton(context),
          ],
        ),
      ),
    );
  }

  Widget _buildViewDrawResultButton(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _openDrawResults(context, ref),
        icon: const Icon(Icons.calendar_month_rounded, size: 18),
        label: Text(
          'Xem kết quả kỳ quay',
          style: GoogleFonts.publicSans(
            fontWeight: FontWeight.w800,
            fontSize: 14,
          ),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textMain,
          backgroundColor: const Color(0xFFF1F5F9),
          side: BorderSide.none,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildRebuyButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: () => openRebuyTicket(context, ticket),
        icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
        label: Text(
          'Mua lại bộ số này',
          style: GoogleFonts.publicSans(
            fontWeight: FontWeight.w800,
            fontSize: 14,
          ),
        ),
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  void _openDrawResults(BuildContext context, WidgetRef ref) {
    final drawDateIso = _normalizeDrawDateIso(ticket.drawDate);
    final drawDate = drawDateIso == null
        ? null
        : DateTime.tryParse(drawDateIso);
    final stationName = ticket.stationName?.trim();
    final searchDigits = ticket.numbers.replaceAll(RegExp(r'\D'), '');

    ref.read(lotteryResultsLookupProvider.notifier).setLookup(
          LotteryResultsLookup(
            drawDate: drawDate == null
                ? null
                : DateTime(drawDate.year, drawDate.month, drawDate.day),
            stationName: (stationName != null && stationName.isNotEmpty)
                ? stationName
                : null,
            search: searchDigits.isNotEmpty ? searchDigits : null,
          ),
        );

    context.go(AppRoute.home.path);
  }

  String? _normalizeDrawDateIso(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    final isoMatch = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(trimmed);
    if (isoMatch != null) {
      return '${isoMatch.group(1)}-${isoMatch.group(2)}-${isoMatch.group(3)}';
    }
    final parsed = DateTime.tryParse(trimmed);
    if (parsed == null) return null;
    final local = parsed.toLocal();
    final y = local.year.toString().padLeft(4, '0');
    final m = local.month.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Widget _buildTicketStub({
    required BuildContext context,
    required TicketStatusUi status,
    required List<String> numberParts,
    required bool isWon,
    required TicketPossessionDisplay? possession,
    required TicketPayoutDisplay? payout,
    required NumberFormat currencyFmt,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 4,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isWon
                    ? const [Color(0xFFFBBF24), Color(0xFFF59E0B), Color(0xFFEA580C)]
                    : ticket.drawResultStatus == 'PENDING_DRAW'
                        ? const [Color(0xFFFBBF24), Color(0xFFF97316), Color(0xFFF59E0B)]
                        : const [Color(0xFFCBD5E1), Color(0xFF94A3B8)],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isWon
                              ? const [Color(0xFFFBBF24), Color(0xFFF59E0B)]
                              : ticket.drawResultStatus == 'PENDING_DRAW'
                                  ? const [Color(0xFFFBBF24), Color(0xFFF97316)]
                                  : const [Color(0xFFE2E8F0), Color(0xFFCBD5E1)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        isWon
                            ? Icons.emoji_events_outlined
                            : Icons.confirmation_number_outlined,
                        color: isWon || ticket.drawResultStatus == 'PENDING_DRAW'
                            ? Colors.white
                            : const Color(0xFF64748B),
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ticket.stationName ?? 'Vé số Đại Phát',
                            style: GoogleFonts.publicSans(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textMain,
                            ),
                          ),
                          const SizedBox(height: 6),
                          _buildStatusChip(status.label, status.color, status.bgColor),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Mã serial vé',
                              style: GoogleFonts.publicSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textMuted,
                              ),
                            ),
                            Text(
                              ticket.serialNumber ?? ticket.numbers,
                              style: GoogleFonts.publicSans(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 36, color: const Color(0xFFE2E8F0)),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Giá vé',
                            style: GoogleFonts.publicSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textMuted,
                            ),
                          ),
                          Text(
                            currencyFmt.format(ticket.price),
                            style: GoogleFonts.publicSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textMain,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Bộ số dự thưởng',
                  style: GoogleFonts.publicSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: numberParts.isNotEmpty
                      ? numberParts
                          .map(
                            (n) => Container(
                              width: 48,
                              height: 48,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                gradient: isWon
                                    ? const LinearGradient(
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                        colors: [
                                          Color(0xFFFDE68A),
                                          Color(0xFFF59E0B),
                                        ],
                                      )
                                    : null,
                                color: isWon ? null : const Color(0xFFF1F5F9),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isWon
                                      ? const Color(0xFFFBBF24)
                                      : const Color(0xFFCBD5E1),
                                ),
                              ),
                              child: Text(
                                n,
                                style: GoogleFonts.publicSans(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: isWon
                                      ? const Color(0xFF78350F)
                                      : AppColors.textMain,
                                ),
                              ),
                            ),
                          )
                          .toList()
                      : [
                          Text(
                            ticket.numbers,
                            style: GoogleFonts.publicSans(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                ),
                const SizedBox(height: 20),
                const Divider(color: Color(0xFFE2E8F0)),
                const SizedBox(height: 16),
                _buildInfoRow('Ngày mở thưởng', _formatDrawDate(ticket.drawDate)),
                _buildInfoRow('Thời gian mua vé', _formatDateTime(ticket.purchasedAt)),
                _buildInfoRow('Kết quả đối chiếu', status.label, valueColor: status.color),
                if (isWon && ticket.prizeAmount != null)
                  _buildInfoRow(
                    'Tổng tiền trúng thưởng',
                    currencyFmt.format(ticket.prizeAmount),
                    valueColor: const Color(0xFFF59E0B),
                  ),
                if (isWon && ticket.payoutState != null)
                  _buildInfoRow(
                    'Trạng thái trả thưởng',
                    serialPayoutStateLabel(ticket.payoutState),
                  ),
                if (possession != null)
                  _buildInfoRow('Tình trạng nhận vé', possession.label),
                _buildOrderCodeRow(context, ticket.orderCode),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Xác thực vé điện tử',
                        style: GoogleFonts.publicSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF94A3B8),
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: QrImageView(
                          data: ticket.orderCode.isNotEmpty
                              ? ticket.orderCode
                              : ticket.ticketId.toString(),
                          size: 120,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ticket.orderCode,
                        style: GoogleFonts.publicSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFCBD5E1),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrizeSection(
    BuildContext context,
    WidgetRef ref, {
    required bool isEligible,
    required String? ineligibility,
    required TicketPayoutDisplay? payout,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.card_giftcard, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Chúc mừng bạn đã trúng thưởng!',
                  style: GoogleFonts.publicSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF78350F),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            isEligible
                ? 'Bạn có thể gửi yêu cầu trả thưởng online. Tiền sẽ được chuyển sau khi nhân viên duyệt.'
                : ticket.canClaimOnline == false || ticket.claimChannel == 'IN_PERSON'
                    ? 'Vé này cần mang đến đại lý để đổi thưởng trực tiếp.'
                    : 'Tiền thưởng sẽ được chuyển tới tài khoản ngân hàng sau khi yêu cầu được duyệt.',
            style: GoogleFonts.publicSans(
              fontSize: 13,
              color: const Color(0xFF64748B),
            ),
          ),
          if (payout != null) ...[
            const SizedBox(height: 10),
            _buildStatusChip(payout.label, payout.color, payout.bgColor),
          ],
          if (ineligibility != null) ...[
            const SizedBox(height: 8),
            Text(
              ineligibility,
              style: GoogleFonts.publicSans(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ],
          if (isEligible) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _openPayoutSheet(context, ref),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Yêu cầu trả thưởng ngay',
                  style: GoogleFonts.publicSans(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _openPayoutSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PrizePayoutRequestSheet(
        ticket: ticket,
        prizePayoutService: ref.read(prizePayoutServiceProvider),
        bankAccountService: ref.read(bankAccountServiceProvider),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: GoogleFonts.publicSans(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: GoogleFonts.publicSans(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: valueColor ?? AppColors.textMain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCodeRow(BuildContext context, String orderCode) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              'Mã đơn hàng',
              style: GoogleFonts.publicSans(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Align(
              alignment: Alignment.centerRight,
              child: InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: orderCode));
                  AppToast.success('Đã sao chép mã đơn hàng');
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      orderCode,
                      style: GoogleFonts.publicSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.copy, size: 14, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String label, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: GoogleFonts.publicSans(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  String _formatDrawDate(String value) {
    try {
      final dt = DateTime.parse(value).toLocal();
      return DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(dt);
    } catch (_) {
      return value;
    }
  }

  String _formatDateTime(String value) {
    try {
      final dt = DateTime.parse(value).toLocal();
      return DateFormat('dd/MM/yyyy - HH:mm:ss').format(dt);
    } catch (_) {
      return value;
    }
  }
}

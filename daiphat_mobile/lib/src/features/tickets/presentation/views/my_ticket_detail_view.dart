import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/home/presentation/providers/lottery_results_lookup_provider.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/presentation/providers/bank_accounts_providers.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/presentation/providers/prize_payouts_providers.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/presentation/widgets/prize_payout_request_sheet.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/utils/ticket_display_utils.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/utils/rebuy_ticket.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/ticket_number_display.dart';

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
        body: Center(
          child: Text(
            'Không tìm thấy thông tin vé',
            style: AppTypography.bodyMedium(color: AppColors.contentSecondary),
          ),
        ),
      );
    }

    return _TicketDetailBody(ticket: ticket);
  }
}

class _TicketDetailBody extends ConsumerStatefulWidget {
  final PurchasedTicket ticket;

  const _TicketDetailBody({required this.ticket});

  @override
  ConsumerState<_TicketDetailBody> createState() => _TicketDetailBodyState();
}

class _TicketDetailBodyState extends ConsumerState<_TicketDetailBody> {
  late PurchasedTicket _ticket;
  PurchasedTicket get ticket => _ticket;

  @override
  void initState() {
    super.initState();
    _ticket = widget.ticket;
  }

  @override
  Widget build(BuildContext context) {
    final status = ticketStatusUi(_ticket.drawResultStatus);
    final possession = resolveTicketPossessionDisplay(_ticket);
    final payout = resolveTicketPayoutDisplay(_ticket);
    final fullNumber = normalizeFullTicketNumber(_ticket.numbers);
    final isWon = _ticket.drawResultStatus == 'WON';
    final isEligible = canRequestPrizePayout(_ticket);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
        surfaceTintColor: AppColors.transparent,
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
          style: AppTypography.mainWith(
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
              status: status,
              fullNumber: fullNumber,
              isWon: isWon,
              possession: possession,
            ),
            if (isWon) ...[
              const SizedBox(height: 16),
              _buildPrizeSection(
                context,
                isEligible: isEligible,
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
          style: AppTypography.mainWith(
            fontWeight: FontWeight.w800,
            fontSize: 14,
          ),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textMain,
          backgroundColor: AppColors.surfaceSlate100,
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
          style: AppTypography.mainWith(
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

    ref
        .read(lotteryResultsLookupProvider.notifier)
        .setLookup(
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
    required TicketStatusUi status,
    required String fullNumber,
    required bool isWon,
    required TicketPossessionDisplay? possession,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderSubtle),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 16,
            offset: Offset(0, 4),
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
                    ? const [
                        AppColors.ticketStripWonStart,
                        AppColors.ticketStripWonMid,
                        AppColors.ticketStripWonEnd,
                      ]
                    : ticket.drawResultStatus == 'PENDING_DRAW'
                    ? const [
                        AppColors.ticketStripPendingStart,
                        AppColors.ticketStripPendingEnd,
                        AppColors.ticketStripPendingStart,
                      ]
                    : const [
                        AppColors.ticketStripLostStart,
                        AppColors.ticketStripLostEnd,
                      ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ticket.stationName ?? 'Vé số Đại Phát',
                            style: AppTypography.mainWith(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textMain,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Kỳ quay: ${_formatDrawDate(ticket.drawDate)}',
                            style: AppTypography.mainWith(
                              fontSize: 12,
                              color: AppColors.ticketMetadataForeground,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    _buildStatusChip(
                      status.label,
                      status.color,
                      status.bgColor,
                      borderColor: status.borderColor,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Bộ số dự thưởng',
                  style: AppTypography.mainWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.ticketMetadataForeground,
                  ),
                ),
                const SizedBox(height: 8),
                TicketNumberDisplay.detail(value: fullNumber),
                if (isWon &&
                    ticket.matchedPrizeDisplayName?.trim().isNotEmpty ==
                        true) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 16,
                        color: AppColors.ticketResultWonForeground,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        ticket.matchedPrizeDisplayName!,
                        style: AppTypography.mainWith(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: AppColors.ticketResultWonForeground,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),
                _buildTicketMetaPanel(),
                if (possession != null) ...[
                  const SizedBox(height: 12),
                  _buildStatusChip(
                    possession.label,
                    possession.color,
                    possession.bgColor,
                    borderColor: possession.borderColor,
                    icon: possession.icon,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketMetaPanel() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.ticketNumberSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.ticketNumberBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mã serial vé',
                  style: AppTypography.mainWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.ticketMetadataForeground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  ticket.serialNumber ?? ticket.numbers,
                  style: AppTypography.mainWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ticketNumberForeground,
                  ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 34, color: AppColors.ticketNumberBorder),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Giá vé',
                style: AppTypography.mainWith(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.ticketMetadataForeground,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                AppFormatters.formatCurrency(ticket.price),
                style: AppTypography.mainWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ticketNumberForeground,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPrizeSection(
    BuildContext context, {
    required bool isEligible,
    required TicketPayoutDisplay? payout,
  }) {
    final isPayoutInProgress =
        _ticket.activePayoutStatus == 'PENDING' ||
        _ticket.activePayoutStatus == 'APPROVED' ||
        _ticket.payoutState == 'PAYOUT_PENDING';
    final isPayoutCompleted =
        _ticket.activePayoutStatus == 'COMPLETED' ||
        _ticket.payoutState == 'PAID_OUT';
    final isStationOfficeOnly = isStationOfficeRedemption(_ticket);
    final isRedemptionUrgent =
        _ticket.redemptionZone == 'PAST_CUSTOMER_URGENT' ||
        _ticket.redemptionZone == 'PAST_ISSUER_LOCKED';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.ticketNumberSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.ticketResultWonBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: AppColors.ticketResultWonSurface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.workspace_premium_rounded,
                  color: AppColors.ticketResultWonForeground,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Đổi thưởng',
                      style: AppTypography.mainWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ticketResultWonForeground,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isPayoutCompleted
                          ? 'Đã trả thưởng'
                          : isPayoutInProgress
                          ? 'Yêu cầu đang xử lý'
                          : isStationOfficeOnly
                          ? 'Đổi tại văn phòng đài'
                          : _ticket.canClaimOnline == false ||
                                _ticket.claimChannel == 'IN_PERSON'
                          ? 'Đổi tại đại lý'
                          : 'Có thể đổi thưởng trực tuyến',
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        color: AppColors.ticketMetadataForeground,
                      ),
                    ),
                  ],
                ),
              ),
              if (_ticket.prizeAmount != null)
                Text(
                  AppFormatters.formatCurrency(_ticket.prizeAmount),
                  style: AppTypography.mainWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppColors.ticketResultWonForeground,
                  ),
                ),
            ],
          ),
          if (payout != null) ...[
            const SizedBox(height: 10),
            _buildStatusChip(
              payout.label,
              payout.color,
              payout.bgColor,
              borderColor: payout.borderColor,
              icon: payout.icon,
            ),
          ],
          if (isRedemptionUrgent) ...[
            const SizedBox(height: 8),
            Text(
              _redemptionRemainingLabel(_ticket),
              style: AppTypography.mainWith(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.brandPrimaryCrimson,
              ),
            ),
          ],
          if (isEligible) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _openPayoutSheet(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.ticketActionPayoutBg,
                  foregroundColor: AppColors.ticketActionPayoutFg,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Yêu cầu trả thưởng ngay',
                  style: AppTypography.mainWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ],
          if (_hasPayoutDetailLink) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _openPayoutDetail(context),
                icon: const Icon(Icons.receipt_long_outlined, size: 18),
                label: Text(
                  'Xem chi tiết yêu cầu đổi thưởng',
                  style: AppTypography.mainWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.contentSlate700,
                  side: const BorderSide(color: AppColors.borderMuted),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  bool get _hasPayoutDetailLink {
    final status = _ticket.activePayoutStatus;
    return _ticket.activePayoutRequestId != null &&
        (status == 'PENDING' || status == 'APPROVED' || status == 'COMPLETED');
  }

  void _openPayoutDetail(BuildContext context) {
    final requestId = _ticket.activePayoutRequestId;
    if (requestId == null) return;
    context.pushNamed(
      AppRoute.prizePayoutDetail.name,
      pathParameters: {'id': '$requestId'},
    );
  }

  Future<void> _openPayoutSheet(BuildContext context) async {
    final result = await showModalBottomSheet<dynamic>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.transparent,
      builder: (context) => PrizePayoutRequestSheet(
        ticket: _ticket,
        previewPrizePayout: ref.read(previewPrizePayoutProvider),
        createPrizePayout: ref.read(createPrizePayoutProvider),
        uploadRecipientIdImage:
            ref.read(uploadPrizePayoutRecipientIdImageProvider),
        getMyBankAccounts: ref.read(getMyBankAccountsProvider),
        getBanks: ref.read(getBanksProvider),
        createBankAccount: ref.read(createBankAccountProvider),
      ),
    );

    if (result == true && mounted) {
      setState(() {
        _ticket = _ticket.copyWith(
          activePayoutStatus: 'PENDING',
          canClaimOnline: false,
          payoutState: 'PAYOUT_PENDING',
        );
      });
    }
  }

  Widget _buildStatusChip(
    String label,
    Color color,
    Color bgColor, {
    Color? borderColor,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor ?? color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.mainWith(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _redemptionRemainingLabel(PurchasedTicket ticket) {
    final issuerUntil = ticket.issuerRedemptionDeadline == null
        ? null
        : _formatDrawDate(ticket.issuerRedemptionDeadline!);
    final issuerDays = ticket.daysRemainingToIssuer;

    if (ticket.redemptionZone == 'PAST_ISSUER_LOCKED') {
      return issuerUntil == null
          ? 'Hết hạn trả thưởng'
          : 'Hết hạn trả thưởng · $issuerUntil';
    }
    if (ticket.redemptionZone == 'PAST_CUSTOMER_URGENT') {
      if (issuerDays != null && issuerDays >= 0) {
        final dayPart = _daysChannelLabel(issuerDays, counter: true);
        return issuerUntil == null ? dayPart : '$dayPart · $issuerUntil';
      }
      return issuerUntil == null
          ? 'Hết hạn trả thưởng'
          : 'Hết hạn trả thưởng · $issuerUntil';
    }
    if (ticket.customerRedemptionDeadline != null) {
      final days = _calendarDaysUntil(ticket.customerRedemptionDeadline!);
      final until = _formatDrawDate(ticket.customerRedemptionDeadline!);
      if (days != null) {
        final dayPart = _daysChannelLabel(days, counter: false);
        return '$dayPart · $until';
      }
      return 'Còn hạn đổi trực tuyến · $until';
    }
    return issuerUntil ?? '';
  }

  String _daysChannelLabel(int days, {required bool counter}) {
    final suffix = counter ? 'đổi tại quầy' : 'đổi trực tuyến';
    if (days == 0) return 'Hết hạn $suffix trong hôm nay';
    if (days == 1) return 'Còn 1 ngày $suffix';
    return 'Còn $days ngày $suffix';
  }

  int? _calendarDaysUntil(String deadline) {
    try {
      final d = DateTime.parse(deadline);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final end = DateTime(d.year, d.month, d.day);
      return end.difference(today).inDays;
    } catch (_) {
      return null;
    }
  }

  String _formatDrawDate(String value) {
    try {
      final dt = DateTime.parse(value).toLocal();
      return DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(dt);
    } catch (_) {
      return value;
    }
  }
}

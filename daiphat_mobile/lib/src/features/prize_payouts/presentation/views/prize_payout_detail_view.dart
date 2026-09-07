import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/entities/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/presentation/providers/prize_payouts_providers.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/presentation/widgets/prize_payout_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../viewmodels/prize_payout_detail_viewmodel.dart';

class PrizePayoutDetailView extends ConsumerStatefulWidget {
  final int requestId;
  const PrizePayoutDetailView({super.key, required this.requestId});

  @override
  ConsumerState<PrizePayoutDetailView> createState() =>
      _PrizePayoutDetailViewState();
}

class _PrizePayoutDetailViewState extends ConsumerState<PrizePayoutDetailView> {
  late final PrizePayoutDetailViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = PrizePayoutDetailViewModel(
      ref.read(getPrizePayoutDetailProvider),
      ref.read(cancelPrizePayoutProvider),
      widget.requestId,
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  String _money(int? amount) =>
      amount == null ? '—' : AppFormatters.formatCurrency(amount);

  String _fmtDate(String? raw, {bool withTime = false}) {
    if (raw == null || raw.isEmpty) return '—';
    return withTime
        ? AppFormatters.formatDateTimeIso(raw, fallback: '—')
        : AppFormatters.formatDateIso(raw, fallback: '—');
  }

  Future<void> _confirmCancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Hủy yêu cầu?',
          style: AppTypography.mainWith(fontWeight: FontWeight.w800),
        ),
        content: Text(
          'Vé sẽ quay về trạng thái đang giữ hộ và bạn có thể gửi lại sau.',
          style: AppTypography.mainWith(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Không', style: AppTypography.mainWith()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
            ),
            child: Text(
              'Hủy yêu cầu',
              style: AppTypography.mainWith(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await _viewModel.cancel();
    if (!mounted) return;
    if (err == null) {
      AppToast.success('Đã hủy yêu cầu trả thưởng.');
    } else {
      AppToast.error(err);
    }
  }

  @override
  Widget build(BuildContext context) {
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
          'Chi tiết trả thưởng',
          style: AppTypography.mainWith(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading && _viewModel.payout == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          final payout = _viewModel.payout;
          if (payout == null) {
            return _buildError();
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _viewModel.load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeader(payout),
                const SizedBox(height: 16),
                _buildInfoCard(payout),
                const SizedBox(height: 16),
                _buildBankCard(payout),
                if (payout.status == PrizePayoutRequestStatus.completed &&
                    payout.transferEvidenceUrl != null &&
                    payout.transferEvidenceUrl!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _buildEvidenceCard(payout),
                ],
                if (payout.status == PrizePayoutRequestStatus.rejected) ...[
                  const SizedBox(height: 16),
                  _buildRejectCard(payout),
                ],
                if (payout.status == PrizePayoutRequestStatus.pending) ...[
                  const SizedBox(height: 20),
                  _buildCancelButton(),
                ],
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            _viewModel.error ?? 'Không tìm thấy yêu cầu trả thưởng',
            textAlign: TextAlign.center,
            style: AppTypography.mainWith(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _viewModel.load,
            child: Text(
              'Thử lại',
              style: AppTypography.mainWith(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(PrizePayoutRequestResponse payout) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                payout.requestCode,
                style: AppTypography.mainWith(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Tạo lúc ${_fmtDate(payout.createdAt, withTime: true)}',
                style: AppTypography.mainWith(
                  fontSize: 13,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
        PrizePayoutStatusBadge(status: payout.status),
      ],
    );
  }

  Widget _buildInfoCard(PrizePayoutRequestResponse payout) {
    final showReject =
        payout.status == PrizePayoutRequestStatus.rejected &&
        payout.rejectCount > 0;
    return _card(
      'Thông tin yêu cầu',
      Column(
        children: [
          _row('Mã yêu cầu', payout.requestCode),
          if (showReject)
            _row(
              'Số lần từ chối trực tuyến',
              '${payout.rejectCount} / ${payout.maxOnlineRejectRetry}',
            ),
          _row('Giá trị giải', _money(payout.grossAmount)),
          _row('Thuế TNCN', _money(payout.taxAmount)),
          _row('Hoa hồng đại lý', _money(payout.commissionAmount)),
          _row(
            'Thực nhận',
            _money(payout.netAmount ?? payout.grossAmount),
            highlight: true,
          ),
          _row(
            'Đài / Ngày quay',
            '${payout.stationName ?? '—'} · ${_fmtDate(payout.drawDate)}',
          ),
          _row(
            'Dãy số / Giải',
            '${payout.numbers ?? '—'} · ${payout.prizeDisplayName ?? payout.prizeCode ?? '—'}',
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _buildBankCard(PrizePayoutRequestResponse payout) {
    return _card(
      'Tài khoản thụ hưởng',
      Column(
        children: [
          _row('Ngân hàng', payout.bankName ?? '—'),
          _row('Số TK', payout.bankAccountNumber ?? '—'),
          _row('Chủ TK', payout.accountHolderName ?? '—', isLast: true),
        ],
      ),
    );
  }

  Widget _buildEvidenceCard(PrizePayoutRequestResponse payout) {
    return _card(
      'Biên lai chuyển khoản',
      ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          payout.transferEvidenceUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Container(
            height: 120,
            color: AppColors.surfaceNeutral,
            alignment: Alignment.center,
            child: Text(
              'Không tải được ảnh biên lai',
              style: AppTypography.mainWith(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRejectCard(PrizePayoutRequestResponse payout) {
    final canResubmit =
        !payout.onlineClaimLocked && payout.orderDetailId != null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.statusErrorSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Lý do từ chối',
            style: AppTypography.mainWith(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            payout.rejectReason?.isNotEmpty == true
                ? payout.rejectReason!
                : 'Không rõ',
            style: AppTypography.mainWith(
              fontSize: 14,
              color: AppColors.contentSlate700,
              height: 1.5,
            ),
          ),
          if (canResubmit) ...[
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => context.pushNamed(AppRoute.myTickets.name),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surfacePrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: Text(
                'Gửi yêu cầu mới từ Vé của tôi',
                style: AppTypography.mainWith(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCancelButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _viewModel.isCancelling ? null : _confirmCancel,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textMuted,
          side: const BorderSide(color: AppColors.contentNeutral),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        icon: _viewModel.isCancelling
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.close_rounded, size: 18),
        label: Text(
          'Hủy yêu cầu',
          style: AppTypography.mainWith(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Widget _row(
    String label,
    String value, {
    bool highlight = false,
    bool isLast = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(bottom: BorderSide(color: AppColors.borderLight)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: AppTypography.mainWith(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: AppTypography.mainWith(
                fontSize: highlight ? 15 : 14,
                fontWeight: highlight ? FontWeight.w800 : FontWeight.w600,
                color: highlight ? AppColors.primary : AppColors.textMain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(String title, Widget child) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: AppTypography.mainWith(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

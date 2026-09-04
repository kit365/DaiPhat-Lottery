import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/presentation/providers/bank_accounts_providers.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';
import 'package:daiphat_mobile/src/features/refunds/presentation/providers/refunds_providers.dart';
import 'package:daiphat_mobile/src/features/refunds/presentation/widgets/refund_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../viewmodels/refund_detail_viewmodel.dart';

class RefundDetailView extends ConsumerStatefulWidget {
  final int refundId;
  const RefundDetailView({super.key, required this.refundId});

  @override
  ConsumerState<RefundDetailView> createState() => _RefundDetailViewState();
}

class _RefundDetailViewState extends ConsumerState<RefundDetailView> {
  late final RefundDetailViewModel _viewModel;
  int? _selectedBankId;

  @override
  void initState() {
    super.initState();
    _viewModel = RefundDetailViewModel(
      ref.read(getRefundDetailProvider),
      ref.read(attachRefundBankAccountProvider),
      ref.read(getMyBankAccountsProvider),
      widget.refundId,
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  String _maskBank(String accountNo) {
    final digits = accountNo.replaceAll(RegExp(r'\s'), '');
    if (digits.length <= 4) return digits;
    final starCount = (digits.length - 4).clamp(0, 6);
    return '${'*' * starCount}${digits.substring(digits.length - 4)}';
  }

  String _fmtDate(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return '—';
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  }

  Future<void> _attach(int bankAccountId) async {
    final err = await _viewModel.attachBankAccount(bankAccountId);
    if (!mounted) return;
    if (err == null) {
      AppToast.success('Đã gửi cập nhật tài khoản ngân hàng.');
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
          'Chi tiết hoàn tiền',
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
          if (_viewModel.isLoading && _viewModel.refund == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          final refund = _viewModel.refund;
          if (refund == null) {
            return _buildError();
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _viewModel.load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeader(refund),
                const SizedBox(height: 16),
                if (refund.status == RefundRequestStatus.waitingForInfo)
                  _buildWaitingWarning(refund),
                if (refund.status == RefundRequestStatus.manualResolution)
                  _buildManualWarning(),
                _buildRequestInfo(refund),
                const SizedBox(height: 16),
                _buildBankSection(refund),
                if (refund.status.isTransferComplete) ...[
                  const SizedBox(height: 16),
                  _buildTransferComplete(refund),
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
            _viewModel.error ?? 'Không tìm thấy yêu cầu hoàn tiền',
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

  Widget _buildHeader(RefundRequestResponse refund) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Yêu cầu hoàn tiền #${refund.id}',
                style: AppTypography.mainWith(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
            ),
            RefundStatusBadge(status: refund.status),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Tạo lúc ${_fmtDate(refund.createdAt)}',
          style: AppTypography.mainWith(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildWaitingWarning(RefundRequestResponse refund) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.statusWarningSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.statusWarningForeground.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.statusWarningForeground.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: AppColors.statusWarningForeground,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cần cập nhật tài khoản ngân hàng',
                  style: AppTypography.mainWith(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.statusWarningForeground,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  refund.operatorNote?.trim().isNotEmpty == true
                      ? refund.operatorNote!.trim()
                      : 'Vui lòng cung cấp hoặc chọn lại tài khoản ngân hàng để nhận hoàn tiền.',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Số lần yêu cầu cập nhật: ${refund.retryCount} / ${refund.maxRefundBankInfoRetry}',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManualWarning() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDestructiveSoft,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDestructiveSubtle),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: AppColors.brandPrimaryDarkRed,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              ProfileIconography.support,
              color: AppColors.surfacePrimary,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cần xử lý thủ công',
                  style: AppTypography.mainWith(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.brandPrimaryDarkRed,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Yêu cầu hoàn tiền này không thể xử lý trực tuyến. Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH để được hỗ trợ trong thời gian sớm nhất.',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestInfo(RefundRequestResponse refund) {
    return _card(
      icon: ProfileIconography.order,
      title: 'Thông tin yêu cầu',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _infoRow('Loại hoàn tiền', refund.refundType.label),
          const SizedBox(height: 12),
          _infoRow(
            'Đơn hàng liên quan',
            refund.orderCode?.trim().isNotEmpty == true
                ? refund.orderCode!.trim()
                : '—',
          ),
          if (refund.refundTickets.isNotEmpty) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Vé trong yêu cầu',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceNeutral,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${refund.refundTickets.length} vé',
                    style: AppTypography.mainWith(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...refund.refundTickets.map(_buildTicketItem),
          ] else if (refund.orderDetailIds.isNotEmpty) ...[
            const SizedBox(height: 12),
            _infoRow('Số chi tiết vé', '${refund.orderDetailIds.length} vé'),
          ],
          const SizedBox(height: 16),
          Text(
            'Số tiền hoàn',
            style: AppTypography.mainWith(
              fontSize: 13,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            AppFormatters.formatCurrency(refund.refundAmount),
            style: AppTypography.mainWith(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 12),
          _infoRow('Lý do hoàn tiền', refund.refundReason),
        ],
      ),
    );
  }

  Widget _buildTicketItem(RefundTicketItem ticket) {
    final drawLabel = AppFormatters.formatDateIso(
      ticket.drawDate,
      fallback: '—',
    );
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceSlate50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ticket.numbers ?? '—',
            style: AppTypography.mainWith(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textMain,
            ),
          ),
          if (ticket.serialNumber != null)
            Text(
              'SN: ${ticket.serialNumber}',
              style: AppTypography.monoWith(
                fontSize: 11,
                color: AppColors.textMuted,
              ),
            ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _miniInfo('Đài', ticket.stationName ?? '—')),
              Expanded(child: _miniInfo('Ngày quay', drawLabel)),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(child: _miniInfo('Số lượng', '${ticket.quantity}')),
              Expanded(
                child: _miniInfo(
                  'Thành tiền',
                  AppFormatters.formatCurrency(ticket.subtotalAmount),
                  valueColor: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniInfo(String label, String value, {Color? valueColor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 11,
            color: AppColors.contentPlaceholderStrong,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTypography.mainWith(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: valueColor ?? AppColors.textMain,
          ),
        ),
      ],
    );
  }

  Widget _buildBankSection(RefundRequestResponse refund) {
    final bank = refund.bankAccount;
    final isWaiting = refund.status == RefundRequestStatus.waitingForInfo;
    final banks = _viewModel.myBanks;

    return _card(
      icon: Icons.account_balance_rounded,
      title: 'Tài khoản nhận hoàn',
      highlight: isWaiting,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (bank != null) ...[
            _bankTile(bank),
            const SizedBox(height: 12),
          ] else if (!isWaiting)
            Text(
              'Không có thông tin tài khoản',
              style: AppTypography.mainWith(
                fontSize: 14,
                color: AppColors.textMuted,
              ),
            ),
          if (isWaiting) ...[
            if (banks.isEmpty)
              Text(
                'Bạn chưa có tài khoản ngân hàng đã lưu. Vui lòng thêm tài khoản trong mục "Tài khoản ngân hàng".',
                style: AppTypography.mainWith(
                  fontSize: 13,
                  color: AppColors.textMuted,
                  height: 1.5,
                ),
              )
            else ...[
              Text(
                'Chọn tài khoản nhận hoàn',
                style: AppTypography.mainWith(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.borderLight),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    isExpanded: true,
                    value: _selectedBankId ?? bank?.id,
                    hint: Text(
                      'Chọn tài khoản',
                      style: AppTypography.mainWith(fontSize: 14),
                    ),
                    items: banks
                        .map(
                          (b) => DropdownMenuItem<int>(
                            value: b.id,
                            child: Text(
                              '${b.bankName} — ${_maskBank(b.bankAccountNo)}',
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.mainWith(fontSize: 13),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _selectedBankId = v),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _viewModel.isSubmitting
                      ? null
                      : () {
                          final id = _selectedBankId ?? bank?.id;
                          if (id != null) _attach(id);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.surfacePrimary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: _viewModel.isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.surfacePrimary,
                          ),
                        )
                      : const Icon(Icons.check_rounded, size: 18),
                  label: Text(
                    'Gửi cập nhật tài khoản',
                    style: AppTypography.mainWith(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _bankTile(UserBankAccountResponse bank) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            border: Border.all(color: AppColors.borderLight),
            borderRadius: BorderRadius.circular(12),
          ),
          child: bank.bankLogo != null && bank.bankLogo!.isNotEmpty
              ? Image.network(
                  bank.bankLogo!,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.account_balance_rounded,
                    color: AppColors.textMuted,
                  ),
                )
              : const Icon(
                  Icons.account_balance_rounded,
                  color: AppColors.textMuted,
                ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                bank.bankName,
                style: AppTypography.mainWith(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
              Text(
                _maskBank(bank.bankAccountNo),
                style: AppTypography.monoWith(
                  fontSize: 13,
                  color: AppColors.textMuted,
                ),
              ),
              Text(
                bank.bankAccountName,
                style: AppTypography.mainWith(
                  fontSize: 12,
                  color: AppColors.contentPlaceholderStrong,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTransferComplete(RefundRequestResponse refund) {
    final payout = refund.payoutTransaction;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.statusSuccessSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.statusSuccess.withValues(alpha: 0.2),
        ),
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
                  color: AppColors.statusSuccess,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  color: AppColors.surfacePrimary,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Đã chuyển khoản',
                style: AppTypography.mainWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
            ],
          ),
          if (payout?.paidAt != null) ...[
            const SizedBox(height: 12),
            Text(
              'Thời gian: ${_fmtDate(payout!.paidAt)}',
              style: AppTypography.mainWith(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
          ],
          if (payout?.note != null && payout!.note!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Ghi chú: ${payout.note}',
              style: AppTypography.mainWith(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
          ],
          if (payout?.paymentEvidenceUrl != null &&
              payout!.paymentEvidenceUrl!.isNotEmpty) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                payout.paymentEvidenceUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  height: 120,
                  color: AppColors.surfacePrimary,
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
          ],
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTypography.mainWith(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: AppColors.textMain,
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _card({
    required IconData icon,
    required String title,
    required Widget child,
    bool highlight = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: highlight
            ? AppColors.statusWarningSurface
            : AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: highlight
            ? Border.all(color: AppColors.statusWarningForeground, width: 1.5)
            : Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: highlight
                      ? AppColors.statusWarningForeground.withValues(
                          alpha: 0.15,
                        )
                      : AppColors.statusErrorSurface,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: highlight
                      ? AppColors.statusWarningForeground
                      : AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: AppTypography.mainWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
            ],
          ),
          const Divider(height: 24, color: AppColors.borderLight),
          child,
        ],
      ),
    );
  }
}

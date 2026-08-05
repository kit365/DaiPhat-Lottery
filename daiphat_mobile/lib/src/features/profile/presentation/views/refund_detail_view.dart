import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/profile_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
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

  final _currencyFmt = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _viewModel = RefundDetailViewModel(
      ref.read(refundServiceProvider),
      ref.read(bankAccountServiceProvider),
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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(err ?? 'Đã gửi cập nhật tài khoản ngân hàng.'),
        backgroundColor: err == null ? AppColors.success : AppColors.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 20, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Chi tiết hoàn tiền',
          style: GoogleFonts.publicSans(
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
            style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _viewModel.load,
            child: Text(
              'Thử lại',
              style: GoogleFonts.publicSans(
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
                style: GoogleFonts.publicSans(
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
          style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
        ),
      ],
    );
  }

  Widget _buildWaitingWarning(RefundRequestResponse refund) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF9F3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFB020).withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFB020).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.warning_amber_rounded,
                color: Color(0xFFB76E00), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cần cập nhật tài khoản ngân hàng',
                  style: GoogleFonts.publicSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFFB76E00),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  refund.operatorNote?.trim().isNotEmpty == true
                      ? refund.operatorNote!.trim()
                      : 'Vui lòng cung cấp hoặc chọn lại tài khoản ngân hàng để nhận hoàn tiền.',
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Số lần yêu cầu cập nhật: ${refund.retryCount} / ${refund.maxRefundBankInfoRetry}',
                  style: GoogleFonts.publicSans(
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
        color: const Color(0xFFFFF5F5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: Color(0xFFC62828),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.headset_mic_rounded,
                color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cần xử lý thủ công',
                  style: GoogleFonts.publicSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFFC62828),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Yêu cầu hoàn tiền này không thể xử lý trực tuyến. Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH để được hỗ trợ trong thời gian sớm nhất.',
                  style: GoogleFonts.publicSans(
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
      icon: Icons.receipt_long_rounded,
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
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF4F6F8),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${refund.refundTickets.length} vé',
                    style: GoogleFonts.publicSans(
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
            style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
          ),
          const SizedBox(height: 4),
          Text(
            _currencyFmt.format(refund.refundAmount),
            style: GoogleFonts.publicSans(
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
    String drawLabel = '—';
    final dt = DateTime.tryParse(ticket.drawDate ?? '');
    if (dt != null) drawLabel = DateFormat('dd/MM/yyyy').format(dt);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFCFCFD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E8EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ticket.numbers ?? '—',
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textMain,
            ),
          ),
          if (ticket.serialNumber != null)
            Text(
              'SN: ${ticket.serialNumber}',
              style: GoogleFonts.robotoMono(fontSize: 11, color: AppColors.textMuted),
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
                  _currencyFmt.format(ticket.subtotalAmount),
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
          style: GoogleFonts.publicSans(fontSize: 11, color: const Color(0xFF919EAB)),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.publicSans(
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
              style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.textMuted),
            ),
          if (isWaiting) ...[
            if (banks.isEmpty)
              Text(
                'Bạn chưa có tài khoản ngân hàng đã lưu. Vui lòng thêm tài khoản trong mục "Tài khoản ngân hàng".',
                style: GoogleFonts.publicSans(
                  fontSize: 13,
                  color: AppColors.textMuted,
                  height: 1.5,
                ),
              )
            else ...[
              Text(
                'Chọn tài khoản nhận hoàn',
                style: GoogleFonts.publicSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE5E8EB)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    isExpanded: true,
                    value: _selectedBankId ?? bank?.id,
                    hint: Text(
                      'Chọn tài khoản',
                      style: GoogleFonts.publicSans(fontSize: 14),
                    ),
                    items: banks
                        .map(
                          (b) => DropdownMenuItem<int>(
                            value: b.id,
                            child: Text(
                              '${b.bankName} — ${_maskBank(b.bankAccountNo)}',
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.publicSans(fontSize: 13),
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
                    foregroundColor: Colors.white,
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
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check_rounded, size: 18),
                  label: Text(
                    'Gửi cập nhật tài khoản',
                    style: GoogleFonts.publicSans(
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
            color: Colors.white,
            border: Border.all(color: const Color(0xFFE5E8EB)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: bank.bankLogo != null && bank.bankLogo!.isNotEmpty
              ? Image.network(bank.bankLogo!, fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(
                      Icons.account_balance_rounded, color: AppColors.textMuted))
              : const Icon(Icons.account_balance_rounded, color: AppColors.textMuted),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                bank.bankName,
                style: GoogleFonts.publicSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
              Text(
                _maskBank(bank.bankAccountNo),
                style: GoogleFonts.robotoMono(fontSize: 13, color: AppColors.textMuted),
              ),
              Text(
                bank.bankAccountName,
                style: GoogleFonts.publicSans(fontSize: 12, color: const Color(0xFF919EAB)),
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
        color: const Color(0xFFE4F8ED),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1CD162).withValues(alpha: 0.2)),
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
                  color: Color(0xFF1CD162),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_rounded, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Text(
                'Đã chuyển khoản',
                style: GoogleFonts.publicSans(
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
              style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
            ),
          ],
          if (payout?.note != null && payout!.note!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Ghi chú: ${payout.note}',
              style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
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
                  color: Colors.white,
                  alignment: Alignment.center,
                  child: Text(
                    'Không tải được ảnh biên lai',
                    style: GoogleFonts.publicSans(
                        fontSize: 12, color: AppColors.textMuted),
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
          style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.publicSans(
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
        color: highlight ? const Color(0xFFFFF9F3) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: highlight
            ? Border.all(color: const Color(0xFFFFB020), width: 1.5)
            : Border.all(color: const Color(0xFFEEEEEE)),
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
                      ? const Color(0xFFFFB020).withValues(alpha: 0.15)
                      : const Color(0xFFFFF4F4),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon,
                    size: 18,
                    color: highlight
                        ? const Color(0xFFB76E00)
                        : AppColors.primary),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: GoogleFonts.publicSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
            ],
          ),
          const Divider(height: 24, color: Color(0xFFF0F0F0)),
          child,
        ],
      ),
    );
  }
}

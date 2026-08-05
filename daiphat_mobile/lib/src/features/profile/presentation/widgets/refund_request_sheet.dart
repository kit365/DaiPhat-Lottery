import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/bank_search_screen.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class RefundRequestSheet extends StatefulWidget {
  final OrderResponse order;
  final OrderService orderService;
  final BankAccountService bankAccountService;
  final Future<bool> Function(CreateOrderRefundRequest request) onSubmit;

  const RefundRequestSheet({
    super.key,
    required this.order,
    required this.orderService,
    required this.bankAccountService,
    required this.onSubmit,
  });

  @override
  State<RefundRequestSheet> createState() => _RefundRequestSheetState();
}

class _RefundRequestSheetState extends State<RefundRequestSheet> {
  final _reasonController = TextEditingController();

  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  OrderRefundEligibilityResponse? _eligibility;
  List<UserBankAccountResponse> _bankAccounts = const [];
  int? _selectedBankAccountId;
  int _secondsLeft = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        widget.orderService.getRefundEligibility(widget.order.id),
        widget.bankAccountService.getMyAccounts(),
      ]);

      final eligibility = results[0] as OrderRefundEligibilityResponse;
      final bankAccounts = results[1] as List<UserBankAccountResponse>;
      UserBankAccountResponse? defaultAccount;
      for (final account in bankAccounts) {
        if (account.isDefault) {
          defaultAccount = account;
          break;
        }
      }
      defaultAccount ??= bankAccounts.isNotEmpty ? bankAccounts.first : null;

      _timer?.cancel();
      final seconds = computeRefundSecondsLeft(
        refundDeadlineAt: eligibility.refundDeadlineAt,
        paymentSuccessAt: eligibility.paymentSuccessAt,
        graceMinutes: eligibility.graceMinutes,
        fallbackRemainingSeconds: eligibility.remainingSeconds,
      );

      setState(() {
        _eligibility = eligibility;
        _bankAccounts = bankAccounts;
        _selectedBankAccountId = defaultAccount?.id;
        _secondsLeft = seconds;
        _isLoading = false;
      });

      if (seconds > 0) {
        _timer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (!mounted) return;
          setState(() {
            if (_secondsLeft > 0) {
              _secondsLeft--;
            } else {
              _timer?.cancel();
            }
          });
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  bool get _isRefundBlocked {
    final eligibility = _eligibility;
    if (_isLoading || eligibility == null) return true;
    if (!eligibility.eligible) return true;
    return _secondsLeft <= 0;
  }

  int get _refundAmount {
    final eligibility = _eligibility;
    if (eligibility?.totalRefundAmount != null) {
      return eligibility!.totalRefundAmount!;
    }
    final tickets = eligibility?.refundTickets ?? const <RefundEligibleTicketItem>[];
    if (tickets.isNotEmpty) {
      return tickets.fold<int>(0, (sum, item) => sum + item.subtotalAmount);
    }
    return widget.order.totalAmount;
  }

  Future<void> _handleCreateBankAccount() async {
    final created = await showDialog<UserBankAccountResponse>(
      context: context,
      builder: (context) =>
          BankAccountFormDialog(service: widget.bankAccountService),
    );

    if (created == null || !mounted) return;

    setState(() {
      _bankAccounts = [created, ..._bankAccounts.where((e) => e.id != created.id)];
      _selectedBankAccountId = created.id;
    });
  }

  Future<void> _handleSubmit() async {
    final reason = _reasonController.text.trim();
    if (reason.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập lý do hoàn tiền')),
      );
      return;
    }
    if (_selectedBankAccountId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn tài khoản nhận hoàn')),
      );
      return;
    }
    if (_isRefundBlocked) return;

    setState(() => _isSubmitting = true);
    final ok = await widget.onSubmit(
      CreateOrderRefundRequest(
        refundReason: reason,
        bankAccountId: _selectedBankAccountId!,
      ),
    );
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (ok) {
      Navigator.of(context).pop(true);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Gửi yêu cầu hoàn tiền thất bại')),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _isLoading
            ? const SizedBox(
                height: 320,
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            : _error != null
                ? SizedBox(
                    height: 320,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          color: AppColors.textMuted,
                          size: 44,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.publicSans(
                            color: AppColors.textMuted,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _load,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  )
                : _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    final eligibility = _eligibility!;
    final tickets = eligibility.refundTickets;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD9D9D9),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Hủy đơn & hoàn tiền',
                  style: GoogleFonts.publicSans(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textMain,
                  ),
                ),
              ),
              IconButton(
                onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildOrderInfo(),
          const SizedBox(height: 16),
          _buildCountdownCard(),
          const SizedBox(height: 16),
          _buildBankSection(),
          const SizedBox(height: 16),
          _buildTicketsSection(tickets),
          const SizedBox(height: 16),
          _buildReasonField(),
          const SizedBox(height: 16),
          _buildSummaryCard(),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isSubmitting || _isRefundBlocked ? null : _handleSubmit,
              icon: _isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.currency_exchange_rounded),
              label: Text(
                _isRefundBlocked
                    ? 'Không đủ điều kiện hoàn tiền'
                    : 'Xác nhận hủy & hoàn tiền',
                style: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFFE0E0E0),
                disabledForegroundColor: const Color(0xFF757575),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderInfo() {
    final order = widget.order;
    final status = _eligibility?.orderStatus ?? order.status;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E8EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Thông tin đơn hàng',
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 12),
          _infoRow('Mã đơn', _eligibility?.orderCode ?? order.orderCode),
          _infoRow('Trạng thái', _statusLabel(status)),
          _infoRow(
            'Ngày đặt',
            _formatDate(_eligibility?.orderCreatedAt ?? order.createdAt),
          ),
          _infoRow(
            'Tổng đơn hàng',
            _formatCurrency(_eligibility?.orderTotalAmount ?? order.totalAmount),
          ),
        ],
      ),
    );
  }

  Widget _buildCountdownCard() {
    final eligibility = _eligibility!;
    final isExpired = _secondsLeft <= 0;
    final title = isExpired
        ? 'Đã hết thời gian yêu cầu hoàn tiền'
        : _secondsLeft <= 5 * 60
            ? 'Sắp hết thời gian yêu cầu hoàn tiền'
            : 'Thời gian còn lại để yêu cầu hoàn tiền';

    final message = eligibility.eligible
        ? 'Hạn chót: ${eligibility.graceMinutes} phút kể từ khi thanh toán thành công'
        : (eligibility.reason ?? 'Đơn hàng hiện không đủ điều kiện hoàn tiền');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isExpired ? const Color(0xFFFFF4F4) : const Color(0xFFFFF9F3),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isExpired ? const Color(0xFFFFDAD6) : const Color(0xFFFFE0B2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isExpired ? const Color(0xFFB3261E) : const Color(0xFF9A4D00),
            ),
          ),
          const SizedBox(height: 8),
          if (eligibility.eligible && !isExpired)
            Text(
              _formatCountdown(_secondsLeft),
              style: GoogleFonts.publicSans(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
              ),
            ),
          const SizedBox(height: 4),
          Text(
            message,
            style: GoogleFonts.publicSans(
              fontSize: 12,
              height: 1.45,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBankSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E8EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tài khoản nhận hoàn',
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 12),
          if (_bankAccounts.isEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bạn chưa có tài khoản ngân hàng.',
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                TextButton.icon(
                  onPressed: _isSubmitting ? null : _handleCreateBankAccount,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Thêm tài khoản ngân hàng'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: EdgeInsets.zero,
                  ),
                ),
              ],
            )
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<int>(
                  initialValue: _selectedBankAccountId,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFFF9FAFB),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
                    ),
                  ),
                  items: _bankAccounts
                      .map(
                        (account) => DropdownMenuItem<int>(
                          value: account.id,
                          child: Text(
                            '${account.bankName} - ${_maskAccountNo(account.bankAccountNo)}${account.isDefault ? ' (Mặc định)' : ''}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: _isSubmitting
                      ? null
                      : (value) => setState(() => _selectedBankAccountId = value),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: _isSubmitting ? null : _handleCreateBankAccount,
                  icon: const Icon(Icons.add_card_rounded),
                  label: const Text('Thêm tài khoản mới'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildTicketsSection(List<RefundEligibleTicketItem> tickets) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E8EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Danh sách vé được hoàn',
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 12),
          if (tickets.isEmpty)
            Text(
              'Không có chi tiết vé. Số tiền hoàn được tính theo tổng đơn hàng.',
              style: GoogleFonts.publicSans(
                fontSize: 13,
                color: AppColors.textMuted,
                height: 1.45,
              ),
            )
          else
            ...tickets.map(
              (ticket) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ticket.numbers ?? '---',
                      style: GoogleFonts.publicSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${ticket.stationName ?? 'Chưa rõ đài'} • ${_formatShortDate(ticket.drawDate)}',
                      style: GoogleFonts.publicSans(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'SL ${ticket.quantity} • ${_formatCurrency(ticket.subtotalAmount)}',
                      style: GoogleFonts.publicSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReasonField() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E8EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Lý do hoàn tiền',
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reasonController,
            enabled: !_isSubmitting,
            maxLines: 4,
            maxLength: 500,
            decoration: InputDecoration(
              hintText: 'Nhập lý do hủy đơn và hoàn tiền',
              filled: true,
              fillColor: const Color(0xFFF9FAFB),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F5FF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x332065D1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tổng tiền đủ điều kiện hoàn',
            style: GoogleFonts.publicSans(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _formatCurrency(_refundAmount),
            style: GoogleFonts.publicSans(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF2065D1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.publicSans(
                fontSize: 13,
                color: AppColors.textMuted,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.publicSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textMain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatCountdown(int seconds) {
    final duration = Duration(seconds: seconds);
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final secs = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    final hours = duration.inHours;
    return hours > 0
        ? '${hours.toString().padLeft(2, '0')}:$minutes:$secs'
        : '$minutes:$secs';
  }

  String _formatCurrency(int amount) {
    return NumberFormat.currency(locale: 'vi_VN', symbol: 'đ', decimalDigits: 0)
        .format(amount);
  }

  String _formatDate(String? value) {
    if (value == null || value.isEmpty) return '-';
    final date = DateTime.tryParse(value)?.toLocal();
    if (date == null) return value;
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  String _formatShortDate(String? value) {
    if (value == null || value.isEmpty) return '-';
    final date = DateTime.tryParse(value)?.toLocal();
    if (date == null) return value;
    return DateFormat('dd/MM/yyyy').format(date);
  }

  String _maskAccountNo(String accountNo) {
    final digits = accountNo.replaceAll(' ', '');
    if (digits.length <= 4) return digits;
    return '${'*' * (digits.length - 4)}${digits.substring(digits.length - 4)}';
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'PREPARING':
        return 'Đang chuẩn bị';
      case 'PENDING_PICKUP':
        return 'Chờ nhận vé';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }
}

class BankAccountFormDialog extends StatefulWidget {
  final BankAccountService service;

  const BankAccountFormDialog({super.key, required this.service});

  @override
  State<BankAccountFormDialog> createState() => _BankAccountFormDialogState();
}

class _BankAccountFormDialogState extends State<BankAccountFormDialog> {
  static const _termsPreviewText =
      'Tôi cam kết thông tin tài khoản ngân hàng đã nhập là chính xác';
  static const _termsDetailText =
      'Tôi hiểu rằng đại lý được miễn trừ trách nhiệm đối với các trường hợp hoàn tiền chậm trễ hoặc thất bại do thông tin tài khoản tôi cung cấp không chính xác.';

  final _accountNoController = TextEditingController();
  final _accountNameController = TextEditingController();

  bool _isLoadingBanks = true;
  bool _isSubmitting = false;
  bool _isDefault = false;
  bool _agreed = false;
  bool _termsExpanded = false;
  String? _error;
  List<VietQrBankResponse> _banks = const [];
  VietQrBankResponse? _selectedBank;

  @override
  void initState() {
    super.initState();
    _loadBanks();
  }

  Future<void> _loadBanks() async {
    setState(() {
      _isLoadingBanks = true;
      _error = null;
    });
    try {
      final banks = await widget.service.getBanks();
      if (!mounted) return;
      setState(() {
        _banks = banks;
        _selectedBank = null;
        _isLoadingBanks = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _isLoadingBanks = false;
      });
    }
  }

  Future<void> _openBankPicker() async {
    if (_isSubmitting || _banks.isEmpty) return;

    final selected = await Navigator.of(context, rootNavigator: true)
        .push<VietQrBankResponse>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => BankSearchScreen(banks: _banks),
      ),
    );

    if (selected != null && mounted) {
      setState(() => _selectedBank = selected);
    }
  }

  Widget _buildBankSelector() {
    final bank = _selectedBank;

    return InkWell(
      onTap: _isSubmitting ? null : _openBankPicker,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: _inputDecoration(hintText: 'Chọn ngân hàng...'),
        child: Row(
          children: [
            if (bank != null) ...[
              _buildBankLogoPreview(bank),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bank.shortName,
                      style: GoogleFonts.publicSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                    ),
                    Text(
                      bank.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.publicSans(
                        fontSize: 12,
                        color: const Color(0xFF919EAB),
                      ),
                    ),
                  ],
                ),
              ),
            ] else
              Expanded(
                child: Text(
                  'Chọn ngân hàng...',
                  style: GoogleFonts.publicSans(
                    fontSize: 14,
                    color: const Color(0xFFC4CDD5),
                  ),
                ),
              ),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF919EAB),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBankLogoPreview(VietQrBankResponse bank) {
    final logoUrl = bank.logo?.trim();
    final initial = bank.shortName.isNotEmpty
        ? bank.shortName[0].toUpperCase()
        : 'B';

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE5E8EB)),
        color: Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: logoUrl != null && logoUrl.isNotEmpty
          ? Image.network(
              logoUrl,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Center(
                child: Text(
                  initial,
                  style: GoogleFonts.publicSans(
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                    color: AppColors.primary,
                  ),
                ),
              ),
            )
          : Center(
              child: Text(
                initial,
                style: GoogleFonts.publicSans(
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  color: AppColors.primary,
                ),
              ),
            ),
    );
  }

  Future<void> _submit() async {
    if (_selectedBank == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn ngân hàng')),
      );
      return;
    }
    if (_accountNoController.text.trim().isEmpty ||
        _accountNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập đầy đủ thông tin tài khoản')),
      );
      return;
    }
    if (!_agreed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bạn cần xác nhận cam kết thông tin tài khoản')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final result = await widget.service.createAccount(
        CreateUserBankAccountRequest(
          bankBin: _selectedBank!.bin,
          bankAccountNo: _accountNoController.text.trim(),
          bankAccountName: _accountNameController.text.trim().toUpperCase(),
          isDefault: _isDefault,
          agreedToRefundTerms: true,
        ),
      );
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  void dispose() {
    _accountNoController.dispose();
    _accountNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final maxHeight = media.size.height * 0.85;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.white,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 520, maxHeight: maxHeight),
          child: _isLoadingBanks
              ? const SizedBox(
                  height: 280,
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Thêm tài khoản ngân hàng',
                              style: GoogleFonts.publicSans(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textMain,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: _isSubmitting
                                ? null
                                : () => Navigator.of(context).pop(),
                            icon: const Icon(
                              Icons.close_rounded,
                              color: Color(0xFF919EAB),
                            ),
                          ),
                        ],
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          style: GoogleFonts.publicSans(
                            fontSize: 13,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      _buildRequiredLabel('Ngân hàng'),
                      const SizedBox(height: 6),
                      _buildBankSelector(),
                      const SizedBox(height: 14),
                      _buildRequiredLabel('Số tài khoản'),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _accountNoController,
                        keyboardType: TextInputType.number,
                        enabled: !_isSubmitting,
                        decoration: _inputDecoration(
                          hintText: 'Nhập số tài khoản',
                        ),
                      ),
                      const SizedBox(height: 14),
                      _buildRequiredLabel('Tên chủ tài khoản'),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _accountNameController,
                        enabled: !_isSubmitting,
                        textCapitalization: TextCapitalization.characters,
                        decoration: _inputDecoration(
                          hintText: 'NGUYEN VAN A',
                        ),
                      ),
                      const SizedBox(height: 10),
                      _buildCheckboxRow(
                        value: _isDefault,
                        onChanged: _isSubmitting
                            ? null
                            : (value) =>
                                setState(() => _isDefault = value ?? false),
                        child: Text(
                          'Đặt làm tài khoản mặc định',
                          style: GoogleFonts.publicSans(fontSize: 14),
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildCheckboxRow(
                        value: _agreed,
                        onChanged: _isSubmitting
                            ? null
                            : (value) =>
                                setState(() => _agreed = value ?? false),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            InkWell(
                              onTap: _isSubmitting
                                  ? null
                                  : () => setState(
                                        () =>
                                            _termsExpanded = !_termsExpanded,
                                      ),
                              child: Text.rich(
                                TextSpan(
                                  style: GoogleFonts.publicSans(
                                    fontSize: 14,
                                    color: AppColors.textMain,
                                  ),
                                  children: [
                                    TextSpan(text: '$_termsPreviewText... '),
                                    TextSpan(
                                      text: _termsExpanded
                                          ? 'thu gọn'
                                          : 'xem thêm',
                                      style: GoogleFonts.publicSans(
                                        fontSize: 14,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (_termsExpanded) ...[
                              const SizedBox(height: 6),
                              Text(
                                _termsDetailText,
                                style: GoogleFonts.publicSans(
                                  fontSize: 14,
                                  height: 1.45,
                                  color: const Color(0xFF637381),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : () => Navigator.of(context).pop(),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF637381),
                                side: const BorderSide(color: Color(0xFFE5E8EB)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                'Hủy',
                                style: GoogleFonts.publicSans(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed:
                                  (_isSubmitting || !_agreed) ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor:
                                    AppColors.primary.withValues(alpha: 0.35),
                                disabledForegroundColor:
                                    Colors.white.withValues(alpha: 0.85),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: _isSubmitting
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      'Thêm tài khoản',
                                      style: GoogleFonts.publicSans(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({required String hintText}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.publicSans(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: const Color(0xFFC4CDD5),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 12,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary),
      ),
    );
  }

  Widget _buildCheckboxRow({
    required bool value,
    required ValueChanged<bool?>? onChanged,
    required Widget child,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 24,
          height: 24,
          child: Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: child),
      ],
    );
  }

  Widget _buildRequiredLabel(String label) {
    return RichText(
      text: TextSpan(
        style: GoogleFonts.publicSans(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textMain,
        ),
        children: [
          TextSpan(text: label),
          const TextSpan(
            text: ' *',
            style: TextStyle(color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}

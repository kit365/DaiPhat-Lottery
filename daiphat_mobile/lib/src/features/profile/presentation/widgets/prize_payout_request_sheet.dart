import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/refund_request_sheet.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class PrizePayoutRequestSheet extends StatefulWidget {
  final PurchasedTicket ticket;
  final PrizePayoutService prizePayoutService;
  final BankAccountService bankAccountService;

  const PrizePayoutRequestSheet({
    super.key,
    required this.ticket,
    required this.prizePayoutService,
    required this.bankAccountService,
  });

  @override
  State<PrizePayoutRequestSheet> createState() =>
      _PrizePayoutRequestSheetState();
}

class _PrizePayoutRequestSheetState extends State<PrizePayoutRequestSheet> {
  int _step = 1;
  bool _isLoadingPreview = true;
  bool _isLoadingBanks = false;
  bool _isSubmitting = false;
  String? _error;
  PrizePayoutPreview? _preview;
  List<UserBankAccountResponse> _bankAccounts = const [];
  int? _selectedBankAccountId;

  final _currencyFmt = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: '₫',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _loadPreview();
  }

  Future<void> _loadPreview() async {
    setState(() {
      _isLoadingPreview = true;
      _error = null;
    });

    try {
      final preview = await widget.prizePayoutService.preview(
        orderDetailId: widget.ticket.orderDetailId,
        serialId: widget.ticket.serialId,
      );
      if (!mounted) return;
      setState(() {
        _preview = preview;
        _isLoadingPreview = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _formatError(e);
        _isLoadingPreview = false;
      });
    }
  }

  String _formatError(Object error) {
    if (error is ApiException) {
      return error.message;
    }
    return error.toString().replaceFirst('Exception: ', '');
  }

  Future<void> _loadBankAccounts() async {
    setState(() {
      _isLoadingBanks = true;
      _error = null;
    });

    try {
      final bankAccounts = await widget.bankAccountService.getMyAccounts();
      UserBankAccountResponse? defaultAccount;
      for (final account in bankAccounts) {
        if (account.isDefault) {
          defaultAccount = account;
          break;
        }
      }
      defaultAccount ??= bankAccounts.isNotEmpty ? bankAccounts.first : null;

      if (!mounted) return;
      setState(() {
        _bankAccounts = bankAccounts;
        _selectedBankAccountId = defaultAccount?.id;
        _isLoadingBanks = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _formatError(e);
        _isLoadingBanks = false;
      });
    }
  }

  Future<void> _goToStep2() async {
    setState(() => _step = 2);
    if (_bankAccounts.isEmpty) {
      await _loadBankAccounts();
    }
  }

  Future<void> _handleAddBankAccount() async {
    final created = await showDialog<UserBankAccountResponse>(
      context: context,
      useRootNavigator: true,
      builder: (context) =>
          BankAccountFormDialog(service: widget.bankAccountService),
    );
    if (created == null || !mounted) return;
    await _loadBankAccounts();
    if (!mounted) return;
    setState(() => _selectedBankAccountId = created.id);
  }

  Future<void> _submit() async {
    if (_selectedBankAccountId == null) return;

    setState(() => _isSubmitting = true);
    try {
      await widget.prizePayoutService.create(
        orderDetailId: widget.ticket.orderDetailId,
        serialId: widget.ticket.serialId,
        bankAccountId: _selectedBankAccountId!,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã gửi yêu cầu trả thưởng thành công',
            style: GoogleFonts.publicSans(fontWeight: FontWeight.w600),
          ),
          backgroundColor: const Color(0xFF16A34A),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _formatError(e),
            style: GoogleFonts.publicSans(),
          ),
          backgroundColor: AppColors.primary,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _formatDrawDate(String value) {
    try {
      final dt = DateTime.parse(value).toLocal();
      return DateFormat('dd/MM/yyyy').format(dt);
    } catch (_) {
      return value.isEmpty ? '—' : value;
    }
  }

  String _formatMoney(int? value) {
    if (value == null) return '—';
    return _currencyFmt.format(value);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(bottom: bottomInset),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Yêu cầu trả thưởng',
                          style: GoogleFonts.publicSans(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textMain,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(
                          Icons.close_rounded,
                          color: Color(0xFF919EAB),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _buildStepIndicator(),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: _step == 1 ? _buildStep1() : _buildStep2(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            height: 4,
            decoration: BoxDecoration(
              color: _step >= 2 ? AppColors.primary : const Color(0xFFE5E8EB),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep1() {
    final ticket = widget.ticket;
    final gross = _preview?.grossAmount ?? ticket.prizeAmount;
    final tax = _preview?.taxAmount;
    final commission = _preview?.commissionAmount;
    final net = _preview?.netAmount;
    final canContinue =
        !_isLoadingPreview && (_preview == null || _preview!.canClaimOnline);

    if (_error != null && _preview == null) {
      return Column(
        children: [
          Text(
            _error!,
            style: GoogleFonts.publicSans(color: AppColors.textMuted),
          ),
          const SizedBox(height: 12),
          TextButton(onPressed: _loadPreview, child: const Text('Thử lại')),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Xác nhận thông tin vé trúng thưởng',
          style: GoogleFonts.publicSans(
            fontSize: 14,
            color: const Color(0xFF637381),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E8EB)),
          ),
          child: Column(
            children: [
              _buildInfoRow('Đài', ticket.stationName ?? '—'),
              _buildInfoRow('Ngày quay', _formatDrawDate(ticket.drawDate)),
              _buildInfoRow(
                'Dãy số',
                ticket.numbers,
                valueStyle: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: AppColors.textMain,
                ),
              ),
              _buildInfoRow(
                'Giải',
                ticket.matchedPrizeDisplayName ??
                    ticket.matchedPrizeCode ??
                    '—',
              ),
              if (_isLoadingPreview)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Đang tính số tiền thực nhận…',
                    style: GoogleFonts.publicSans(
                      fontSize: 13,
                      color: const Color(0xFF637381),
                    ),
                  ),
                )
              else ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: Color(0xFFE5E8EB)),
                ),
                _buildInfoRow('Giá trị giải', _formatMoney(gross)),
                _buildInfoRow('Thuế TNCN', _formatMoney(tax)),
                _buildInfoRow('Hoa hồng đại lý', _formatMoney(commission)),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: Color(0xFFE5E8EB)),
                ),
                _buildInfoRow(
                  'Thực nhận',
                  _formatMoney(net ?? gross),
                  valueStyle: GoogleFonts.publicSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Tên chủ tài khoản ngân hàng phải khớp tên khách hàng. Yêu cầu vẫn cần nhân viên duyệt trước khi chuyển tiền.',
          style: GoogleFonts.publicSans(
            fontSize: 12,
            color: const Color(0xFF919EAB),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: canContinue ? _goToStep2 : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Tiếp tục',
              style: GoogleFonts.publicSans(
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Chọn tài khoản nhận thưởng',
          style: GoogleFonts.publicSans(
            fontSize: 14,
            color: const Color(0xFF637381),
          ),
        ),
        const SizedBox(height: 12),
        if (_isLoadingBanks)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          )
        else if (_error != null && _bankAccounts.isEmpty)
          Column(
            children: [
              Text(
                _error!,
                style: GoogleFonts.publicSans(color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _loadBankAccounts,
                child: const Text('Thử lại'),
              ),
            ],
          )
        else if (_bankAccounts.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFE5E8EB),
                style: BorderStyle.solid,
              ),
            ),
            child: Column(
              children: [
                Text(
                  'Bạn chưa có tài khoản ngân hàng.',
                  style: GoogleFonts.publicSans(
                    fontSize: 14,
                    color: const Color(0xFF637381),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _handleAddBankAccount,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF212B36),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(
                    'Thêm tài khoản',
                    style: GoogleFonts.publicSans(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          )
        else ...[
          ..._bankAccounts.map((account) {
            final selected = _selectedBankAccountId == account.id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () =>
                    setState(() => _selectedBankAccountId = account.id),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: selected
                        ? const Color(0xFFFFF5F5)
                        : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : const Color(0xFFE5E8EB),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        selected
                            ? Icons.radio_button_checked
                            : Icons.radio_button_off,
                        color: selected
                            ? AppColors.primary
                            : AppColors.textMuted,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              account.bankName,
                              style: GoogleFonts.publicSans(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              account.bankAccountNo,
                              style: GoogleFonts.publicSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.4,
                              ),
                            ),
                            Text(
                              account.bankAccountName,
                              style: GoogleFonts.publicSans(
                                fontSize: 12,
                                color: const Color(0xFF637381),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          TextButton(
            onPressed: _handleAddBankAccount,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              padding: EdgeInsets.zero,
            ),
            child: Text(
              '+ Thêm tài khoản khác',
              style: GoogleFonts.publicSans(
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _isSubmitting ? null : () => setState(() => _step = 1),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textMain,
                  side: const BorderSide(color: Color(0xFFE5E8EB)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Quay lại',
                  style: GoogleFonts.publicSans(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _selectedBankAccountId == null || _isSubmitting
                    ? null
                    : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor:
                      AppColors.primary.withValues(alpha: 0.4),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        'Gửi yêu cầu',
                        style: GoogleFonts.publicSans(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, {TextStyle? valueStyle}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.publicSans(
                fontSize: 14,
                color: const Color(0xFF637381),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: valueStyle ??
                  GoogleFonts.publicSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMain,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

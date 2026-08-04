import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';
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
  State<PrizePayoutRequestSheet> createState() => _PrizePayoutRequestSheetState();
}

class _PrizePayoutRequestSheetState extends State<PrizePayoutRequestSheet> {
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  PrizePayoutPreview? _preview;
  List<UserBankAccountResponse> _bankAccounts = const [];
  int? _selectedBankAccountId;

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
      final results = await Future.wait([
        widget.prizePayoutService.preview(
          orderDetailId: widget.ticket.orderDetailId,
          serialId: widget.ticket.serialId,
        ),
        widget.bankAccountService.getMyAccounts(),
      ]);

      final preview = results[0] as PrizePayoutPreview;
      final bankAccounts = results[1] as List<UserBankAccountResponse>;
      UserBankAccountResponse? defaultAccount;
      for (final account in bankAccounts) {
        if (account.isDefault) {
          defaultAccount = account;
          break;
        }
      }
      defaultAccount ??= bankAccounts.isNotEmpty ? bankAccounts.first : null;

      setState(() {
        _preview = preview;
        _bankAccounts = bankAccounts;
        _selectedBankAccountId = defaultAccount?.id;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
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
            e.toString().replaceFirst('Exception: ', ''),
            style: GoogleFonts.publicSans(),
          ),
          backgroundColor: AppColors.primary,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
              const SizedBox(height: 16),
              Text(
                'Yêu cầu trả thưởng',
                style: GoogleFonts.publicSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 16),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (_error != null)
                Column(
                  children: [
                    Text(
                      _error!,
                      style: GoogleFonts.publicSans(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 12),
                    TextButton(onPressed: _load, child: const Text('Thử lại')),
                  ],
                )
              else ...[
                if (_preview != null) ...[
                  _buildAmountRow('Tiền thưởng gộp', currencyFmt.format(_preview!.grossAmount)),
                  if (_preview!.taxAmount > 0)
                    _buildAmountRow('Thuế', '- ${currencyFmt.format(_preview!.taxAmount)}'),
                  if (_preview!.commissionAmount > 0)
                    _buildAmountRow(
                      'Phí',
                      '- ${currencyFmt.format(_preview!.commissionAmount)}',
                    ),
                  const Divider(height: 24),
                  _buildAmountRow(
                    'Thực nhận',
                    currencyFmt.format(_preview!.netAmount),
                    isBold: true,
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Tài khoản nhận tiền',
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 8),
                if (_bankAccounts.isEmpty)
                  Text(
                    'Bạn chưa có tài khoản ngân hàng. Vui lòng thêm tài khoản trong phần hoàn tiền đơn hàng.',
                    style: GoogleFonts.publicSans(
                      fontSize: 13,
                      color: AppColors.textMuted,
                    ),
                  )
                else
                  ..._bankAccounts.map((account) {
                    final selected = _selectedBankAccountId == account.id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => setState(() => _selectedBankAccountId = account.id),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.primary.withValues(alpha: 0.06)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primary
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
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
                                    Text(
                                      '${account.bankAccountNo} • ${account.bankAccountName}',
                                      style: GoogleFonts.publicSans(
                                        fontSize: 12,
                                        color: AppColors.textMuted,
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
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _selectedBankAccountId == null || _isSubmitting
                        ? null
                        : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
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
                            'Xác nhận yêu cầu',
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
        ),
      ),
    );
  }

  Widget _buildAmountRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.publicSans(
              fontSize: 13,
              color: AppColors.textMuted,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.publicSans(
              fontSize: isBold ? 16 : 13,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              color: isBold ? const Color(0xFFF59E0B) : AppColors.textMain,
            ),
          ),
        ],
      ),
    );
  }
}

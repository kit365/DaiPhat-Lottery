import 'package:flutter/material.dart';

import '../../domain/entities/bank_account.dart';
import '../../domain/usecases/bank_account_usecases.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/utils/app_toast.dart';
import 'bank_search_screen.dart';
class BankAccountFormDialog extends StatefulWidget {
  final GetBanks getBanks;
  final CreateBankAccount createBankAccount;

  const BankAccountFormDialog({
    super.key,
    required this.getBanks,
    required this.createBankAccount,
  });

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
      final banks = await widget.getBanks();
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
                      style: AppTypography.mainWith(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                    ),
                    Text(
                      bank.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        color: AppColors.contentPlaceholderStrong,
                      ),
                    ),
                  ],
                ),
              ),
            ] else
              Expanded(
                child: Text(
                  'Chọn ngân hàng...',
                  style: AppTypography.mainWith(
                    fontSize: 14,
                    color: AppColors.contentPlaceholderStrong,
                  ),
                ),
              ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.contentPlaceholderStrong,
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
        border: Border.all(color: AppColors.borderLight),
        color: AppColors.surfacePrimary,
      ),
      clipBehavior: Clip.antiAlias,
      child: logoUrl != null && logoUrl.isNotEmpty
          ? Image.network(
              logoUrl,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => Center(
                child: Text(
                  initial,
                  style: AppTypography.mainWith(
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
                style: AppTypography.mainWith(
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
      AppToast.info('Vui lòng chọn ngân hàng');
      return;
    }
    if (_accountNoController.text.trim().isEmpty ||
        _accountNameController.text.trim().isEmpty) {
      AppToast.info('Vui lòng nhập đầy đủ thông tin tài khoản');
      return;
    }
    if (!_agreed) {
      AppToast.info('Bạn cần xác nhận cam kết thông tin tài khoản');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final result = await widget.createBankAccount(
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
      AppToast.error(e.toString().replaceFirst('Exception: ', ''));
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
        color: AppColors.surfacePrimary,
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
                              style: AppTypography.mainWith(
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
                              color: AppColors.contentPlaceholderStrong,
                            ),
                          ),
                        ],
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          style: AppTypography.mainWith(
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
                        decoration: _inputDecoration(hintText: 'NGUYEN VAN A'),
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
                          style: AppTypography.mainWith(fontSize: 14),
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
                                      () => _termsExpanded = !_termsExpanded,
                                    ),
                              child: Text.rich(
                                TextSpan(
                                  style: AppTypography.mainWith(
                                    fontSize: 14,
                                    color: AppColors.textMain,
                                  ),
                                  children: [
                                    TextSpan(text: '$_termsPreviewText... '),
                                    TextSpan(
                                      text: _termsExpanded
                                          ? 'thu gọn'
                                          : 'xem thêm',
                                      style: AppTypography.mainWith(
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
                                style: AppTypography.mainWith(
                                  fontSize: 14,
                                  height: 1.45,
                                  color: AppColors.contentNeutral,
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
                                foregroundColor: AppColors.contentNeutral,
                                side: const BorderSide(
                                  color: AppColors.borderLight,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                'Hủy',
                                style: AppTypography.mainWith(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: (_isSubmitting || !_agreed)
                                  ? null
                                  : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: AppColors.surfacePrimary,
                                disabledBackgroundColor: AppColors.primary
                                    .withValues(alpha: 0.35),
                                disabledForegroundColor: AppColors
                                    .surfacePrimary
                                    .withValues(alpha: 0.85),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
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
                                        color: AppColors.surfacePrimary,
                                      ),
                                    )
                                  : Text(
                                      'Thêm tài khoản',
                                      style: AppTypography.mainWith(
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
      hintStyle: AppTypography.mainWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.contentPlaceholderStrong,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderLight),
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
        style: AppTypography.caption(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textMain,
        ),
        children: [
          TextSpan(text: label),
          TextSpan(
            text: ' *',
            style: AppTypography.caption(color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}

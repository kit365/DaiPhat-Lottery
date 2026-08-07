import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'bank_search_screen.dart';

class BankAccountFormPage extends StatefulWidget {
  final BankAccountService service;
  final List<VietQrBankResponse> banks;
  final UserBankAccountResponse? account;

  const BankAccountFormPage({
    super.key,
    required this.service,
    required this.banks,
    this.account,
  });

  bool get isEditing => account != null;

  @override
  State<BankAccountFormPage> createState() => _BankAccountFormPageState();
}

class _BankAccountFormPageState extends State<BankAccountFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _accountNoController = TextEditingController();
  final _accountNameController = TextEditingController();

  VietQrBankResponse? _selectedBank;
  bool _isDefault = false;
  bool _agreedToTerms = false;
  bool _isSubmitting = false;
  String? _bankError;

  @override
  void initState() {
    super.initState();
    final account = widget.account;
    if (account != null) {
      _accountNoController.text = account.bankAccountNo;
      _accountNameController.text = account.bankAccountName;
      _isDefault = account.isDefault;
      _agreedToTerms = true;
      for (final bank in widget.banks) {
        if (bank.bin == account.bankBin) {
          _selectedBank = bank;
          break;
        }
      }
    }
  }

  @override
  void dispose() {
    _accountNoController.dispose();
    _accountNameController.dispose();
    super.dispose();
  }

  Future<void> _pickBank() async {
    final bank = await Navigator.of(context).push<VietQrBankResponse>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => BankSearchScreen(banks: widget.banks),
      ),
    );
    if (bank != null) {
      setState(() {
        _selectedBank = bank;
        _bankError = null;
      });
    }
  }

  Future<void> _submit() async {
    final isFormValid = _formKey.currentState?.validate() ?? false;
    setState(() {
      _bankError = _selectedBank == null ? 'Vui lòng chọn ngân hàng' : null;
    });
    if (!isFormValid || _selectedBank == null) return;

    if (!_agreedToTerms) {
      AppToast.error('Bạn cần đồng ý với điều khoản hoàn tiền.');
      return;
    }

    setState(() => _isSubmitting = true);

    final request = CreateUserBankAccountRequest(
      bankBin: _selectedBank!.bin,
      bankAccountNo: _accountNoController.text.replaceAll(RegExp(r'\s'), ''),
      bankAccountName: _accountNameController.text.trim().toUpperCase(),
      isDefault: _isDefault,
      agreedToRefundTerms: true,
    );

    try {
      final result = widget.isEditing
          ? await widget.service.updateAccount(widget.account!.id, request)
          : await widget.service.createAccount(request);
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      AppToast.error(e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      AppToast.error('Không lưu được tài khoản ngân hàng.');
    }
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
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.isEditing ? 'Sửa tài khoản' : 'Thêm tài khoản',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _buildLabel('Ngân hàng'),
            const SizedBox(height: 8),
            _buildBankPicker(),
            if (_bankError != null) ...[
              const SizedBox(height: 6),
              Text(
                _bankError!,
                style: GoogleFonts.publicSans(
                  fontSize: 12,
                  color: AppColors.error,
                ),
              ),
            ],
            const SizedBox(height: 18),
            _buildLabel('Số tài khoản'),
            const SizedBox(height: 8),
            _buildTextField(
              controller: _accountNoController,
              hintText: 'Nhập số tài khoản',
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')),
                LengthLimitingTextInputFormatter(50),
              ],
              validator: (value) {
                final v = (value ?? '').replaceAll(RegExp(r'\s'), '');
                if (v.isEmpty) return 'Vui lòng nhập số tài khoản';
                if (v.length < 6) return 'Số tài khoản không hợp lệ';
                return null;
              },
            ),
            const SizedBox(height: 18),
            _buildLabel('Tên chủ tài khoản'),
            const SizedBox(height: 8),
            _buildTextField(
              controller: _accountNameController,
              hintText: 'NGUYEN VAN A',
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [LengthLimitingTextInputFormatter(150)],
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Vui lòng nhập tên chủ tài khoản';
                }
                return null;
              },
            ),
            const SizedBox(height: 8),
            Text(
              'Tên phải trùng khớp với tên đã đăng ký tại ngân hàng.',
              style: GoogleFonts.publicSans(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 12),
            _buildCheckbox(
              value: _isDefault,
              onChanged: (v) => setState(() => _isDefault = v),
              label: 'Đặt làm tài khoản mặc định',
            ),
            _buildCheckbox(
              value: _agreedToTerms,
              onChanged: (v) => setState(() => _agreedToTerms = v),
              label:
                  'Tôi cam kết thông tin tài khoản là chính xác và đồng ý với '
                  'điều khoản hoàn tiền của Đại Phát.',
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: const Color(0xFFE4A2A2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        widget.isEditing ? 'Lưu thay đổi' : 'Thêm tài khoản',
                        style: GoogleFonts.publicSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.publicSans(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textMain,
      ),
    );
  }

  Widget _buildBankPicker() {
    final bank = _selectedBank;

    return InkWell(
      onTap: _pickBank,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF4F6F8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _bankError != null ? AppColors.error : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            if (bank?.logo != null && bank!.logo!.isNotEmpty) ...[
              SizedBox(
                width: 36,
                height: 24,
                child: CachedNetworkImage(
                  imageUrl: bank.logo!,
                  fit: BoxFit.contain,
                  errorWidget: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                bank == null
                    ? 'Chọn ngân hàng'
                    : '${bank.shortName} - ${bank.name}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: bank == null ? FontWeight.w400 : FontWeight.w600,
                  color: bank == null
                      ? const Color(0xFFA0A8AF)
                      : AppColors.textMain,
                ),
              ),
            ),
            const Icon(
              Icons.keyboard_arrow_down_rounded,
              color: Color(0xFF919EAB),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    TextInputType? keyboardType,
    TextCapitalization textCapitalization = TextCapitalization.none,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: textCapitalization,
      inputFormatters: inputFormatters,
      validator: validator,
      style: GoogleFonts.publicSans(fontSize: 14, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: GoogleFonts.publicSans(
          fontSize: 14,
          color: const Color(0xFFA0A8AF),
          fontWeight: FontWeight.w400,
        ),
        filled: true,
        fillColor: const Color(0xFFF4F6F8),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
      ),
    );
  }

  Widget _buildCheckbox({
    required bool value,
    required ValueChanged<bool> onChanged,
    required String label,
  }) {
    return InkWell(
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: value,
                activeColor: AppColors.primary,
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                onChanged: (v) => onChanged(v ?? false),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                  label,
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    height: 1.4,
                    color: AppColors.textMain,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/usecases/bank_account_usecases.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/entities/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/usecases/prize_payout_usecases.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/presentation/widgets/bank_account_form_dialog.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';

class PrizePayoutRequestSheet extends StatefulWidget {
  final PurchasedTicket ticket;
  final PreviewPrizePayout previewPrizePayout;
  final CreatePrizePayout createPrizePayout;
  final UploadPrizePayoutRecipientIdImage uploadRecipientIdImage;
  final GetMyBankAccounts getMyBankAccounts;
  final GetBanks getBanks;
  final CreateBankAccount createBankAccount;

  const PrizePayoutRequestSheet({
    super.key,
    required this.ticket,
    required this.previewPrizePayout,
    required this.createPrizePayout,
    required this.uploadRecipientIdImage,
    required this.getMyBankAccounts,
    required this.getBanks,
    required this.createBankAccount,
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
  bool _isUploadingFront = false;
  bool _isUploadingBack = false;
  String? _error;
  PrizePayoutPreview? _preview;
  List<UserBankAccountResponse> _bankAccounts = const [];
  int? _selectedBankAccountId;

  final _idNumberController = TextEditingController();
  String? _frontLocalPath;
  String? _backLocalPath;
  String? _frontImageUrl;
  String? _backImageUrl;

  @override
  void initState() {
    super.initState();
    _loadPreview();
  }

  @override
  void dispose() {
    _idNumberController.dispose();
    super.dispose();
  }

  bool get _isValidCccd =>
      RegExp(r'^\d{9,12}$').hasMatch(_idNumberController.text.trim());

  bool get _canContinueIdentity =>
      _isValidCccd &&
      (_frontImageUrl?.isNotEmpty ?? false) &&
      (_backImageUrl?.isNotEmpty ?? false) &&
      !_isUploadingFront &&
      !_isUploadingBack;

  Future<void> _loadPreview() async {
    setState(() {
      _isLoadingPreview = true;
      _error = null;
    });

    try {
      final preview = await widget.previewPrizePayout(
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
      final bankAccounts = await widget.getMyBankAccounts();
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

  Future<void> _goToBankStep() async {
    setState(() => _step = 3);
    if (_bankAccounts.isEmpty) {
      await _loadBankAccounts();
    }
  }

  Future<ImageSource?> _chooseImageSource() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded),
                title: Text(
                  'Chụp ảnh',
                  style: AppTypography.mainWith(fontWeight: FontWeight.w600),
                ),
                onTap: () => Navigator.of(context).pop(ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded),
                title: Text(
                  'Chọn từ thư viện',
                  style: AppTypography.mainWith(fontWeight: FontWeight.w600),
                ),
                onTap: () => Navigator.of(context).pop(ImageSource.gallery),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickAndUpload(bool front) async {
    final source = await _chooseImageSource();
    if (source == null || !mounted) return;

    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 2000,
    );
    if (picked == null || !mounted) return;

    setState(() {
      if (front) {
        _frontLocalPath = picked.path;
        _frontImageUrl = null;
        _isUploadingFront = true;
      } else {
        _backLocalPath = picked.path;
        _backImageUrl = null;
        _isUploadingBack = true;
      }
      _error = null;
    });

    try {
      final url = await widget.uploadRecipientIdImage(picked.path);
      if (!mounted) return;
      setState(() {
        if (front) {
          _frontImageUrl = url;
          _isUploadingFront = false;
        } else {
          _backImageUrl = url;
          _isUploadingBack = false;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (front) {
          _frontLocalPath = null;
          _frontImageUrl = null;
          _isUploadingFront = false;
        } else {
          _backLocalPath = null;
          _backImageUrl = null;
          _isUploadingBack = false;
        }
      });
      AppToast.error(_formatError(e));
    }
  }

  Future<void> _handleAddBankAccount() async {
    final created = await showDialog<UserBankAccountResponse>(
      context: context,
      useRootNavigator: true,
      builder: (context) =>
          BankAccountFormDialog(
            getBanks: widget.getBanks,
            createBankAccount: widget.createBankAccount,
          ),
    );
    if (created == null || !mounted) return;
    await _loadBankAccounts();
    if (!mounted) return;
    setState(() => _selectedBankAccountId = created.id);
  }

  Future<void> _submit() async {
    if (_selectedBankAccountId == null || !_canContinueIdentity) return;

    setState(() => _isSubmitting = true);
    try {
      await widget.createPrizePayout(
        orderDetailId: widget.ticket.orderDetailId,
        serialId: widget.ticket.serialId,
        bankAccountId: _selectedBankAccountId!,
        recipientIdNumber: _idNumberController.text.trim(),
        recipientIdImageUrl: _frontImageUrl!,
        recipientIdImageBackUrl: _backImageUrl!,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      AppToast.success('Đã gửi yêu cầu trả thưởng thành công');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(_formatError(e));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _formatDrawDate(String value) =>
      AppFormatters.formatDateIso(value, fallback: value.isEmpty ? '—' : value);

  String _formatMoney(int? value) =>
      value == null ? '—' : AppFormatters.formatCurrency(value);

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(bottom: bottomInset),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
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
                        color: AppColors.borderSubtle,
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
                          style: AppTypography.mainWith(
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
                          color: AppColors.contentPlaceholderStrong,
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
                child: switch (_step) {
                  1 => _buildStep1(),
                  2 => _buildStep2Identity(),
                  _ => _buildStep3Bank(),
                },
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
        for (var i = 1; i <= 3; i++) ...[
          if (i > 1) const SizedBox(width: 8),
          Expanded(
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                color: _step >= i ? AppColors.primary : AppColors.borderLight,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ],
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
            style: AppTypography.mainWith(color: AppColors.textMuted),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _loadPreview,
            child: Text(
              'Thử lại',
              style: AppTypography.buttonSmall(color: AppColors.primary),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Xác nhận thông tin vé trúng thưởng',
          style: AppTypography.mainWith(
            fontSize: 14,
            color: AppColors.contentNeutral,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              _buildInfoRow('Đài', ticket.stationName ?? '—'),
              _buildInfoRow('Ngày quay', _formatDrawDate(ticket.drawDate)),
              _buildInfoRow(
                'Dãy số',
                ticket.numbers,
                valueStyle: AppTypography.mainWith(
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
                    style: AppTypography.mainWith(
                      fontSize: 13,
                      color: AppColors.contentNeutral,
                    ),
                  ),
                )
              else ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: AppColors.borderLight),
                ),
                _buildInfoRow('Giá trị giải', _formatMoney(gross)),
                _buildInfoRow('Thuế TNCN', _formatMoney(tax)),
                _buildInfoRow('Hoa hồng đại lý', _formatMoney(commission)),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: AppColors.borderLight),
                ),
                _buildInfoRow(
                  'Thực nhận',
                  _formatMoney(net ?? gross),
                  valueStyle: AppTypography.mainWith(
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
          style: AppTypography.mainWith(
            fontSize: 12,
            color: AppColors.contentPlaceholderStrong,
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: canContinue ? () => setState(() => _step = 2) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
              disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Tiếp tục',
              style: AppTypography.mainWith(
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2Identity() {
    final idText = _idNumberController.text.trim();
    final showIdError = idText.isNotEmpty && !_isValidCccd;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Xác minh danh tính — tải CCCD mặt trước, mặt sau và nhập số CCCD',
          style: AppTypography.mainWith(
            fontSize: 14,
            color: AppColors.contentNeutral,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Số CCCD / CMND *',
          style: AppTypography.mainWith(
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _idNumberController,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(12),
          ],
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: 'Nhập 9–12 chữ số',
            errorText: showIdError ? 'Số CCCD/CMND phải đủ 9 đến 12 chữ số' : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildCccdPicker(
                label: 'CCCD mặt trước *',
                localPath: _frontLocalPath,
                uploaded: _frontImageUrl != null,
                uploading: _isUploadingFront,
                onPick: () => _pickAndUpload(true),
                onClear: () => setState(() {
                  _frontLocalPath = null;
                  _frontImageUrl = null;
                }),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildCccdPicker(
                label: 'CCCD mặt sau *',
                localPath: _backLocalPath,
                uploaded: _backImageUrl != null,
                uploading: _isUploadingBack,
                onPick: () => _pickAndUpload(false),
                onClear: () => setState(() {
                  _backLocalPath = null;
                  _backImageUrl = null;
                }),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'Ảnh CCCD dùng để nhân viên đối chiếu khi duyệt trả thưởng trực tuyến.',
          style: AppTypography.mainWith(
            fontSize: 12,
            color: AppColors.contentPlaceholderStrong,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _step = 1),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textMain,
                  side: const BorderSide(color: AppColors.borderLight),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Quay lại',
                  style: AppTypography.mainWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _canContinueIdentity ? _goToBankStep : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.surfacePrimary,
                  disabledBackgroundColor: AppColors.primary.withValues(
                    alpha: 0.4,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Tiếp tục',
                  style: AppTypography.mainWith(
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

  Widget _buildCccdPicker({
    required String label,
    required String? localPath,
    required bool uploaded,
    required bool uploading,
    required VoidCallback onPick,
    required VoidCallback onClear,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        AspectRatio(
          aspectRatio: 3 / 4,
          child: InkWell(
            onTap: uploading ? null : onPick,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderLight),
                color: AppColors.surfaceSoft,
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (localPath != null)
                    Image.file(File(localPath), fit: BoxFit.cover)
                  else
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.add_a_photo_outlined,
                            size: 22,
                            color: AppColors.contentNeutral,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Chụp / chọn ảnh',
                            textAlign: TextAlign.center,
                            style: AppTypography.mainWith(
                              fontSize: 12,
                              color: AppColors.contentNeutral,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (uploading)
                    Container(
                      color: Colors.black45,
                      alignment: Alignment.center,
                      child: const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  if (!uploading && localPath != null)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        child: InkWell(
                          onTap: onClear,
                          borderRadius: BorderRadius.circular(8),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.close, size: 16),
                          ),
                        ),
                      ),
                    ),
                  if (!uploading && uploaded)
                    Positioned(
                      left: 6,
                      bottom: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Đã tải',
                          style: AppTypography.mainWith(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3Bank() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Chọn tài khoản nhận thưởng',
          style: AppTypography.mainWith(
            fontSize: 14,
            color: AppColors.contentNeutral,
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
                style: AppTypography.mainWith(color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _loadBankAccounts,
                child: Text(
                  'Thử lại',
                  style: AppTypography.buttonSmall(color: AppColors.primary),
                ),
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
                color: AppColors.borderLight,
                style: BorderStyle.solid,
              ),
            ),
            child: Column(
              children: [
                Text(
                  'Bạn chưa có tài khoản ngân hàng.',
                  style: AppTypography.mainWith(
                    fontSize: 14,
                    color: AppColors.contentNeutral,
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _handleAddBankAccount,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.contentHeading,
                    foregroundColor: AppColors.surfacePrimary,
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
                    style: AppTypography.mainWith(
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
                        ? AppColors.surfaceDestructiveSoft
                        : AppColors.surfaceSoft,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : AppColors.borderLight,
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
                              style: AppTypography.mainWith(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              account.bankAccountNo,
                              style: AppTypography.mainWith(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.4,
                              ),
                            ),
                            Text(
                              account.bankAccountName,
                              style: AppTypography.mainWith(
                                fontSize: 12,
                                color: AppColors.contentNeutral,
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
              style: AppTypography.mainWith(
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
                onPressed: _isSubmitting
                    ? null
                    : () => setState(() => _step = 2),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textMain,
                  side: const BorderSide(color: AppColors.borderLight),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Quay lại',
                  style: AppTypography.mainWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _selectedBankAccountId == null ||
                        _isSubmitting ||
                        !_canContinueIdentity
                    ? null
                    : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.surfacePrimary,
                  disabledBackgroundColor: AppColors.primary.withValues(
                    alpha: 0.4,
                  ),
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
                          color: AppColors.surfacePrimary,
                        ),
                      )
                    : Text(
                        'Gửi yêu cầu',
                        style: AppTypography.mainWith(
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
              style: AppTypography.mainWith(
                fontSize: 14,
                color: AppColors.contentNeutral,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style:
                  valueStyle ??
                  AppTypography.mainWith(
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

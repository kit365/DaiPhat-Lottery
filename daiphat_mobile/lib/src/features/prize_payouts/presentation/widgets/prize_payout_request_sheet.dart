import 'dart:io';

import 'package:flutter/material.dart';
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
  bool _isLoadingStep1 = false;
  bool _isLoadingBanks = false;
  bool _isSubmitting = false;
  bool _isUploadingFront = false;
  bool _isUploadingBack = false;
  String? _step1Error;
  PrizePayoutPreview? _preview;
  List<UserBankAccountResponse> _bankAccounts = const [];
  int? _selectedBankAccountId;

  String? _frontLocalPath;
  String? _backLocalPath;
  String? _frontImageUrl;
  String? _backImageUrl;

  bool get _canSubmit =>
      (_frontImageUrl?.isNotEmpty ?? false) &&
      (_backImageUrl?.isNotEmpty ?? false) &&
      _selectedBankAccountId != null &&
      !_isUploadingFront &&
      !_isUploadingBack &&
      !_isSubmitting;

  String _formatError(Object error) {
    if (error is ApiException) {
      return error.message;
    }
    return error.toString().replaceFirst('Exception: ', '');
  }

  Future<void> _onStep1Continue() async {
    setState(() {
      _isLoadingStep1 = true;
      _step1Error = null;
    });

    try {
      final preview = await widget.previewPrizePayout(
        orderDetailId: widget.ticket.orderDetailId,
        serialId: widget.ticket.serialId,
      );

      if (!mounted) return;

      if (!preview.canClaimOnline) {
        setState(() {
          _isLoadingStep1 = false;
          _step1Error =
              'Vé này hiện không thể nhận thưởng trực tuyến. Vui lòng mang vé đến đại lý hoặc văn phòng đài để nhận thưởng.';
        });
        return;
      }

      _preview = preview;

      if (_bankAccounts.isEmpty) {
        await _loadBankAccounts();
      }

      if (!mounted) return;
      setState(() {
        _isLoadingStep1 = false;
        _step = 2;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingStep1 = false;
        _step1Error = _formatError(e);
      });
    }
  }

  Future<void> _loadBankAccounts() async {
    setState(() {
      _isLoadingBanks = true;
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
        _isLoadingBanks = false;
      });
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
      builder: (context) => BankAccountFormDialog(
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
    if (!_canSubmit) return;

    setState(() => _isSubmitting = true);
    try {
      final result = await widget.createPrizePayout(
        orderDetailId: widget.ticket.orderDetailId,
        serialId: widget.ticket.serialId,
        bankAccountId: _selectedBankAccountId!,
        recipientIdImageUrl: _frontImageUrl!,
        recipientIdImageBackUrl: _backImageUrl!,
      );
      if (!mounted) return;
      Navigator.of(context).pop(result);
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
                child: _step == 1 ? _buildStep1() : _buildStep2(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var i = 1; i <= 2; i++) ...[
              if (i > 1) const SizedBox(width: 8),
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color:
                        _step >= i ? AppColors.primary : AppColors.borderLight,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '1. Xác nhận vé trúng',
              style: AppTypography.mainWith(
                fontSize: 12,
                fontWeight: _step == 1 ? FontWeight.w700 : FontWeight.w500,
                color: _step == 1
                    ? AppColors.primary
                    : AppColors.contentPlaceholderStrong,
              ),
            ),
            Text(
              '2. Thông tin nhận thưởng',
              style: AppTypography.mainWith(
                fontSize: 12,
                fontWeight: _step == 2 ? FontWeight.w700 : FontWeight.w500,
                color: _step == 2
                    ? AppColors.primary
                    : AppColors.contentPlaceholderStrong,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStep1() {
    final ticket = widget.ticket;
    final displayPrizeAmount = ticket.prizeAmount ?? _preview?.grossAmount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Xác nhận thông tin vé trúng thưởng',
          style: AppTypography.mainWith(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
            color: AppColors.surfaceSoft,
          ),
          child: Column(
            children: [
              _buildInfoRow('Đài', ticket.stationName ?? '—'),
              _buildInfoRow('Ngày quay', _formatDrawDate(ticket.drawDate)),
              _buildInfoRow(
                'Dãy số',
                ticket.numbers,
                valueStyle: AppTypography.mainWith(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: AppColors.textMain,
                ),
              ),
              _buildInfoRow(
                'Giải trúng',
                ticket.matchedPrizeDisplayName ??
                    ticket.matchedPrizeCode ??
                    '—',
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Divider(height: 1, color: AppColors.borderLight),
              ),
              _buildInfoRow(
                'Giá trị giải',
                _formatMoney(displayPrizeAmount),
                valueStyle: AppTypography.mainWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        if (_step1Error != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceDestructiveSoft,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  color: AppColors.primary,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _step1Error!,
                    style: AppTypography.mainWith(
                      fontSize: 12,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surfaceSoft,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline_rounded,
                size: 16,
                color: AppColors.contentPlaceholderStrong,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Yêu cầu vẫn cần nhân viên duyệt đối soát trước khi giải ngân chuyển khoản.',
                  style: AppTypography.mainWith(
                    fontSize: 12,
                    color: AppColors.contentNeutral,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoadingStep1 ? null : _onStep1Continue,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
              disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isLoadingStep1
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.surfacePrimary,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Tiếp tục',
                        style: AppTypography.mainWith(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    final preview = _preview;
    final gross = preview?.grossAmount ?? widget.ticket.prizeAmount;
    final tax = preview?.taxAmount ?? 0;
    final commission = preview?.commissionAmount ?? 0;
    final net = preview?.netAmount ?? gross;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary Breakdown Box
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceSoft,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Chi tiết giải & khấu trừ',
                style: AppTypography.mainWith(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.contentNeutral,
                ),
              ),
              const SizedBox(height: 8),
              _buildInfoRow('Giá trị giải thưởng', _formatMoney(gross)),
              _buildInfoRow(
                'Thuế TNCN',
                tax > 0 ? '-${_formatMoney(tax)}' : '0 đ (Miễn thuế)',
                valueStyle: AppTypography.mainWith(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: tax > 0 ? AppColors.primary : AppColors.textMain,
                ),
              ),
              _buildInfoRow(
                'Hoa hồng đại lý',
                commission > 0 ? '-${_formatMoney(commission)}' : '0 đ',
                valueStyle: AppTypography.mainWith(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color:
                      commission > 0 ? AppColors.primary : AppColors.textMain,
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Divider(height: 1, color: AppColors.borderLight),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Thực nhận chuyển khoản',
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                      Text(
                        'Sau khi trừ thuế và phí',
                        style: AppTypography.mainWith(
                          fontSize: 10,
                          color: AppColors.contentPlaceholderStrong,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    _formatMoney(net),
                    style: AppTypography.mainWith(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Section 1: CCCD Upload (No manual CCCD input)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '1',
                    style: AppTypography.mainWith(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Ảnh căn cước công dân (CCCD)',
                  style: AppTypography.mainWith(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
              ],
            ),
            Text(
              'Bắt buộc 2 mặt',
              style: AppTypography.mainWith(
                fontSize: 11,
                color: AppColors.contentPlaceholderStrong,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Số CCCD được trích xuất tự động qua OCR (không cần nhập tay, không cần selfie).',
          style: AppTypography.mainWith(
            fontSize: 12,
            color: AppColors.contentNeutral,
          ),
        ),
        const SizedBox(height: 12),
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
        // CCCD Privacy & Security Policy Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.verified_user_rounded,
                size: 18,
                color: Color(0xFF16A34A),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Cam kết bảo mật thông tin CCCD',
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF15803D),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Hình ảnh và thông tin CCCD chỉ được sử dụng duy nhất nhằm xác thực danh tính đổi thưởng và đối soát nghiệp vụ nội bộ theo quy định. Hệ thống cam kết bảo mật tuyệt đối, không chia sẻ cho bên thứ ba hoặc phục vụ mục đích thương mại ngoài luồng.',
                      style: AppTypography.mainWith(
                        fontSize: 11,
                        color: const Color(0xFF166534),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Section 2: Bank Accounts
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '2',
                    style: AppTypography.mainWith(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Tài khoản ngân hàng nhận tiền',
                  style: AppTypography.mainWith(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
              ],
            ),
            if (_bankAccounts.isNotEmpty)
              InkWell(
                onTap: _handleAddBankAccount,
                child: Text(
                  '+ Thêm tài khoản',
                  style: AppTypography.mainWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (_isLoadingBanks)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          )
        else if (_bankAccounts.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
              color: AppColors.surfaceSoft,
            ),
            child: Column(
              children: [
                Text(
                  'Bạn chưa có tài khoản ngân hàng nào.',
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    color: AppColors.contentNeutral,
                  ),
                ),
                const SizedBox(height: 10),
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
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    account.bankName,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.mainWith(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                                if (account.isDefault) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(
                                        alpha: 0.1,
                                      ),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'Mặc định',
                                      style: AppTypography.mainWith(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              account.bankAccountNo,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.mainWith(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.4,
                              ),
                            ),
                            Text(
                              account.bankAccountName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
        ],
        const SizedBox(height: 20),

        // Action Buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed:
                    _isSubmitting ? null : () => setState(() => _step = 1),
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
                onPressed: _canSubmit ? _submit : null,
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
          aspectRatio: 3 / 2.2,
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
                          const Icon(
                            Icons.add_a_photo_outlined,
                            size: 24,
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
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Đang tải…',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
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
                          color: Colors.green.shade700,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.check,
                              color: Colors.white,
                              size: 11,
                            ),
                            const SizedBox(width: 3),
                            Text(
                              'Đã tải',
                              style: AppTypography.mainWith(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
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

  Widget _buildInfoRow(String label, String value, {TextStyle? valueStyle}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: AppTypography.mainWith(
                fontSize: 13,
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
}

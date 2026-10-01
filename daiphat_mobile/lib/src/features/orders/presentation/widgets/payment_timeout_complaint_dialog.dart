import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import 'package:daiphat_mobile/src/features/orders/presentation/providers/orders_providers.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';

class PaymentTimeoutComplaintDialog extends ConsumerStatefulWidget {
  final String orderId;
  final String orderCode;
  final int? totalAmount;
  final VoidCallback? onSubmitted;

  const PaymentTimeoutComplaintDialog({
    super.key,
    required this.orderId,
    required this.orderCode,
    this.totalAmount,
    this.onSubmitted,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String orderId,
    required String orderCode,
    int? totalAmount,
    VoidCallback? onSubmitted,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (context) => PaymentTimeoutComplaintDialog(
        orderId: orderId,
        orderCode: orderCode,
        totalAmount: totalAmount,
        onSubmitted: onSubmitted,
      ),
    );
  }

  @override
  ConsumerState<PaymentTimeoutComplaintDialog> createState() =>
      _PaymentTimeoutComplaintDialogState();
}

class _PaymentTimeoutComplaintDialogState
    extends ConsumerState<PaymentTimeoutComplaintDialog> {
  XFile? _selectedFile;
  bool _isSubmitting = false;

  static const int _maxFileSizeBytes = 10 * 1024 * 1024; // 10MB

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.surfacePrimary,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded, color: AppColors.primary),
              title: Text(
                'Chụp ảnh biên lai',
                style: AppTypography.bodyMedium(fontWeight: FontWeight.w600),
              ),
              onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
              title: Text(
                'Chọn từ thư viện',
                style: AppTypography.bodyMedium(fontWeight: FontWeight.w600),
              ),
              onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    final picked = await picker.pickImage(
      source: source,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 90,
    );

    if (picked == null || !mounted) return;

    final length = await picked.length();
    if (length > _maxFileSizeBytes) {
      AppToast.error('Ảnh biên lai không được vượt quá 10MB.');
      return;
    }

    setState(() {
      _selectedFile = picked;
    });
  }

  Future<void> _submit() async {
    final file = _selectedFile;
    if (file == null || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      final submitUsecase = ref.read(submitPaymentTimeoutComplaintProvider);
      await submitUsecase(widget.orderId, file.path);

      if (!mounted) return;
      AppToast.success('Đã gửi chứng từ. Cửa hàng sẽ kiểm tra và phản hồi.');
      widget.onSubmitted?.call();
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      AppToast.error(
        e.message.isNotEmpty
            ? e.message
            : 'Không thể gửi chứng từ thanh toán. Vui lòng thử lại.',
      );
    } catch (e) {
      if (!mounted) return;
      AppToast.error('Không thể gửi chứng từ thanh toán. Vui lòng thử lại.');
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cleanCode = widget.orderCode.startsWith('#')
        ? widget.orderCode
        : '#${widget.orderCode}';

    return Dialog(
      backgroundColor: AppColors.surfacePrimary,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header: Title & Close Button
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Gửi khiếu nại thanh toán',
                            style: AppTypography.h4(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.contentPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Gửi chứng từ để cửa hàng kiểm tra giao dịch đã thanh toán.',
                            style: AppTypography.bodySmall(
                              fontSize: 13,
                              color: AppColors.contentMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.close_rounded,
                        color: AppColors.contentMuted,
                        size: 22,
                      ),
                      onPressed: _isSubmitting
                          ? null
                          : () => Navigator.of(context).pop(),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1, color: AppColors.borderLight),
                const SizedBox(height: 16),

                // Info Box (Green)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1FFF7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFB8E8D0)),
                  ),
                  child: RichText(
                    text: TextSpan(
                      style: AppTypography.bodySmall(
                        fontSize: 13,
                        color: const Color(0xFF118D57),
                      ),
                      children: [
                        const TextSpan(text: 'Đơn '),
                        TextSpan(
                          text: cleanCode,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const TextSpan(
                          text: ' đã bị hệ thống hủy do quá thời gian thanh toán.',
                        ),
                        if (widget.totalAmount != null && widget.totalAmount! > 0) ...[
                          const TextSpan(text: ' Giá trị đơn: '),
                          TextSpan(
                            text: AppFormatters.formatCurrency(widget.totalAmount!),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const TextSpan(text: '.'),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Upload Box Label
                RichText(
                  text: TextSpan(
                    style: AppTypography.bodyMedium(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.contentPrimary,
                    ),
                    children: const [
                      TextSpan(text: 'Ảnh biên lai thanh toán '),
                      TextSpan(
                        text: '*',
                        style: TextStyle(color: AppColors.primary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Dashed Upload Container / Preview
                CustomPaint(
                  painter: _DashedRectPainter(
                    color: _selectedFile != null
                        ? AppColors.primary
                        : const Color(0xFFB8C2CC),
                    strokeWidth: 1.5,
                    gap: 4,
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAFBFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: _selectedFile == null
                        ? InkWell(
                            onTap: _pickImage,
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppColors.statusErrorSurface,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.cloud_upload_rounded,
                                      color: AppColors.primary,
                                      size: 28,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Chọn ảnh biên lai',
                                    style: AppTypography.bodyMedium(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: AppColors.contentPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'JPG, PNG hoặc WEBP · tối đa 10MB',
                                    style: AppTypography.caption(
                                      fontSize: 12,
                                      color: AppColors.contentMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    maxHeight: 160,
                                  ),
                                  child: Image.file(
                                    File(_selectedFile!.path),
                                    width: double.infinity,
                                    fit: BoxFit.contain,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      _selectedFile!.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.caption(
                                        fontSize: 12,
                                        color: AppColors.contentMuted,
                                      ),
                                    ),
                                  ),
                                  InkWell(
                                    onTap: _isSubmitting
                                        ? null
                                        : () => setState(() => _selectedFile = null),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      child: Text(
                                        'Bỏ ảnh',
                                        style: AppTypography.caption(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  InkWell(
                                    onTap: _isSubmitting ? null : _pickImage,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      child: Text(
                                        'Đổi ảnh',
                                        style: AppTypography.caption(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.statusInfoForeground,
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
                const SizedBox(height: 12),

                // Note subtext
                Text(
                  'Vui lòng gửi đúng biên lai của đơn này. Sau khi gửi, chứng từ sẽ được chuyển sang trạng thái chờ cửa hàng xác minh.',
                  style: AppTypography.caption(
                    fontSize: 12,
                    color: AppColors.contentMuted,
                  ),
                ),
                const SizedBox(height: 20),

                // Action Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.borderDefault),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      child: Text(
                        'Hủy',
                        style: AppTypography.buttonSmall(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.contentPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _selectedFile == null || _isSubmitting
                          ? null
                          : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.surfacePrimary,
                        disabledBackgroundColor:
                            AppColors.primary.withValues(alpha: 0.4),
                        disabledForegroundColor:
                            AppColors.surfacePrimary.withValues(alpha: 0.7),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
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
                              'Gửi khiếu nại',
                              style: AppTypography.buttonSmall(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.surfacePrimary,
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
}

class _DashedRectPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double gap;

  _DashedRectPainter({
    required this.color,
    this.strokeWidth = 1.0,
    this.gap = 5.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final Path path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(0, 0, size.width, size.height),
          const Radius.circular(12),
        ),
      );

    final Path dashPath = Path();
    double distance = 0.0;
    for (final pathMetric in path.computeMetrics()) {
      while (distance < pathMetric.length) {
        dashPath.addPath(
          pathMetric.extractPath(distance, distance + gap),
          Offset.zero,
        );
        distance += gap * 2;
      }
    }

    canvas.drawPath(dashPath, paint);
  }

  @override
  bool shouldRepaint(_DashedRectPainter oldDelegate) =>
      color != oldDelegate.color ||
      strokeWidth != oldDelegate.strokeWidth ||
      gap != oldDelegate.gap;
}

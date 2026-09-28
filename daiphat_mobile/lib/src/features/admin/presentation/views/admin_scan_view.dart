import 'dart:io';
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:image_picker/image_picker.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../viewmodels/admin_scan_viewmodel.dart';

class AdminScanView extends StatefulWidget {
  final AdminScanViewModel viewModel;

  const AdminScanView({super.key, required this.viewModel});

  @override
  State<AdminScanView> createState() => _AdminScanViewState();
}

class _AdminScanViewState extends State<AdminScanView> {
  final _pinController = TextEditingController();

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        final vm = widget.viewModel;
        final isRemote = vm.isSessionConnected;

        return Scaffold(
          backgroundColor: AppColors.surfaceNeutral,
          appBar: AppBar(
            backgroundColor: AppColors.surfacePrimary,
            elevation: 0.5,
            title: Text(
              isRemote ? 'Máy quét vé Web Admin' : 'Quét vé số OCR (Admin)',
              style: AppTypography.h3(
                color: AppColors.textMain,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            iconTheme: const IconThemeData(color: AppColors.textMain),
            actions: [
              if (isRemote)
                IconButton(
                  icon: const Icon(
                    Icons.link_off_rounded,
                    color: AppColors.primary,
                  ),
                  tooltip: 'Ngắt kết nối',
                  onPressed: () => vm.disconnectRemoteSession(),
                ),
            ],
          ),
          body: isRemote
              ? _buildRemoteConnectedBody(context)
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildPairingCard(context),
                      const SizedBox(height: 16),
                      _buildPairingGuideCard(context),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _buildPairingCard(BuildContext context) {
    final vm = widget.viewModel;
    final isConnecting = vm.isConnecting;
    final errorMessage = vm.errorMessage;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.phonelink_setup_rounded,
                    color: AppColors.primary,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'KẾT NỐI VỚI WEB ADMIN',
                        style: AppTypography.subtitle2(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Nhập mã PIN 6 số hiển thị trên Web Admin để bắt đầu truyền vé.',
                        style: AppTypography.caption(
                          fontSize: 12,
                          color: AppColors.contentSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _pinController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: AppTypography.h1(
                fontWeight: FontWeight.w900,
                fontSize: 28,
                letterSpacing: 8,
                color: AppColors.primary,
              ),
              decoration: InputDecoration(
                counterText: '',
                hintText: '000000',
                hintStyle: const TextStyle(
                  color: AppColors.contentPlaceholder,
                  letterSpacing: 8,
                ),
                filled: true,
                fillColor: AppColors.surfaceNeutral,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDefault),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: AppColors.primary,
                    width: 2,
                  ),
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.content_paste_rounded),
                  tooltip: 'Dán mã',
                  onPressed: () async {
                    final data = await Clipboard.getData(Clipboard.kTextPlain);
                    if (data?.text != null) {
                      final digits = data!.text!.replaceAll(RegExp(r'\D'), '');
                      if (digits.length >= 6) {
                        _pinController.text = digits.substring(0, 6);
                      } else {
                        _pinController.text = digits;
                      }
                    }
                  },
                ),
              ),
            ),
            if (errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDestructiveSoft,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.borderDestructiveSubtle),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.warning_amber_rounded,
                      color: AppColors.statusError,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        errorMessage,
                        style: AppTypography.caption(
                          fontSize: 12,
                          color: AppColors.statusErrorForeground,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.surfacePrimary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: isConnecting
                    ? null
                    : () => vm.connectToWebSession(_pinController.text),
                icon: isConnecting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.surfacePrimary,
                        ),
                      )
                    : const Icon(Icons.link_rounded),
                label: Text(
                  isConnecting ? 'Đang kết nối...' : 'Kết nối với Web Admin',
                  style: AppTypography.buttonMedium(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPairingGuideCard(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hướng dẫn kết nối 3 bước:',
              style: AppTypography.subtitle2(
                fontWeight: FontWeight.bold,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 12),
            _guideStep(
              1,
              'Mở trang Web Admin trên máy tính, vào mục Tạo phiếu nhập / Quét vé OCR.',
            ),
            const SizedBox(height: 8),
            _guideStep(
              2,
              'Nhấn nút "Quét vé bằng Mobile App" để lấy mã PIN 6 số.',
            ),
            const SizedBox(height: 8),
            _guideStep(
              3,
              'Nhập mã PIN ở trên và nhấn "Kết nối với Web Admin" để bắt đầu.',
            ),
          ],
        ),
      ),
    );
  }

  Widget _guideStep(int step, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 22,
          height: 22,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Text(
            '$step',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: AppTypography.caption(
              fontSize: 12,
              color: AppColors.contentSecondary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRemoteConnectedBody(BuildContext context) {
    final vm = widget.viewModel;
    final tickets = vm.remoteScannedTickets;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildRemoteStatusBar(context),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: _buildRemoteActionButtons(context),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Vé đã gửi sang Web (${tickets.length})',
                style: AppTypography.subtitle2(
                  fontWeight: FontWeight.bold,
                  color: AppColors.textMain,
                ),
              ),
              if (tickets.isNotEmpty)
                Text(
                  'Đang đồng bộ trực tiếp',
                  style: AppTypography.caption(
                    fontSize: 11,
                    color: AppColors.statusSuccessForeground,
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: _buildRemoteScannedList(),
        ),
      ],
    );
  }

  Widget _buildRemoteStatusBar(BuildContext context) {
    final vm = widget.viewModel;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        border: Border(
          bottom: BorderSide(
            color: AppColors.borderDefault,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.statusSuccessSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.statusSuccess.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.statusSuccess,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'ĐÃ KẾT NỐI',
                  style: AppTypography.caption(
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    color: AppColors.statusSuccessForeground,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Phiên #${vm.remoteSessionCode}',
              style: AppTypography.subtitle2(
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${vm.remoteScannedCount} vé đã gửi',
              style: AppTypography.caption(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRemoteActionButtons(BuildContext context) {
    final vm = widget.viewModel;
    final isScanning = vm.isScanning;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: isScanning
                ? null
                : () => _handlePickAndConfirm(ImageSource.camera),
            icon: isScanning
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.surfacePrimary,
                    ),
                  )
                : const Icon(Icons.camera_alt_rounded, size: 22),
            label: Text(
              isScanning ? 'Đang gửi vé lên Web...' : 'Chụp vé số (Camera)',
              style: AppTypography.buttonMedium(
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 42,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.textMain,
              side: const BorderSide(color: AppColors.borderDefault),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: isScanning
                ? null
                : () => _handlePickAndConfirm(ImageSource.gallery),
            icon: const Icon(Icons.photo_library_outlined, size: 18),
            label: Text(
              'Chọn ảnh từ thư viện',
              style: AppTypography.buttonSmall(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handlePickAndConfirm(ImageSource source) async {
    final vm = widget.viewModel;
    final photos = await vm.pickPhotos(source);
    if (!mounted || photos.isEmpty) return;
    _showConfirmUploadBottomSheet(photos);
  }

  void _showConfirmUploadBottomSheet(List<XFile> photos) {
    final vm = widget.viewModel;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            decoration: const BoxDecoration(
              color: AppColors.surfacePrimary,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.borderDefault,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.preview_rounded,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Xem trước vé (${photos.length} ảnh)',
                        style: AppTypography.subtitle1(
                          fontWeight: FontWeight.bold,
                          color: AppColors.textMain,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 240,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: photos.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final photo = photos[index];
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Stack(
                          children: [
                            Image.file(
                              File(photo.path),
                              height: 240,
                              fit: BoxFit.cover,
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: GestureDetector(
                                onTap: () {
                                  setModalState(() {
                                    photos.removeAt(index);
                                  });
                                  if (photos.isEmpty) {
                                    Navigator.pop(ctx);
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    color: Colors.white,
                                    size: 16,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Kiểm tra hình ảnh vé rõ nét, không bị lóa hoặc mất góc trước khi gửi sang Web Admin.',
                  style: AppTypography.caption(
                    color: AppColors.textMuted,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textMain,
                          side: const BorderSide(color: AppColors.borderDefault),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Hủy / Chọn lại'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.surfacePrimary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () async {
                          final messenger = ScaffoldMessenger.of(context);
                          Navigator.pop(ctx);
                          final count = await vm.uploadPickedPhotos(photos);
                          if (count > 0) {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text('Đã gửi thành công $count vé sang Web Admin!'),
                                backgroundColor: AppColors.statusSuccessForeground,
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.send_rounded, size: 18),
                        label: Text(
                          'Xác nhận gửi (${photos.length})',
                          style: AppTypography.buttonMedium(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildRemoteScannedList() {
    final tickets = widget.viewModel.remoteScannedTickets;

    if (tickets.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            padding: const EdgeInsets.all(32),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.surfacePrimary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderDefault),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.camera_alt_outlined,
                  size: 48,
                  color: AppColors.contentPlaceholder,
                ),
                const SizedBox(height: 12),
                Text(
                  'Chưa có vé nào được gửi',
                  style: AppTypography.subtitle2(
                    fontWeight: FontWeight.w600,
                    color: AppColors.contentSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Bấm "Chụp vé số" ở trên để chụp và tự động truyền vé sang Web.',
                  textAlign: TextAlign.center,
                  style: AppTypography.caption(
                    fontSize: 12,
                    color: AppColors.contentMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      itemCount: tickets.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final ticket = tickets[index];
        return Card(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.borderDefault),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _ticketImage(ticket.imagePath),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Ảnh vé #${tickets.length - index}',
                            style: AppTypography.subtitle2(
                              fontWeight: FontWeight.bold,
                              color: AppColors.textMain,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.statusSuccessSurface,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.check_circle_rounded,
                                  size: 13,
                                  color: AppColors.statusSuccessForeground,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Đã tải lên Web',
                                  style: AppTypography.caption(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.statusSuccessForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đã gửi lúc ${DateFormat('HH:mm:ss').format(ticket.scannedAt)} • Chờ đối soát trên máy tính',
                        style: AppTypography.caption(
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
        );
      },
    );
  }

  Widget _ticketImage(String? source) {
    Widget placeholder() => const SizedBox(
      width: 60,
      height: 60,
      child: Icon(Icons.confirmation_number_rounded),
    );
    if (source == null || source.isEmpty) return placeholder();
    Widget error(BuildContext context, Object error, StackTrace? stack) =>
        placeholder();
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return Image.network(
        source,
        width: 60,
        height: 60,
        fit: BoxFit.cover,
        errorBuilder: error,
      );
    }
    try {
      if (source.startsWith('data:') ||
          (!source.contains('\\') && !source.startsWith('/'))) {
        final raw = source.startsWith('data:')
            ? source.substring(source.indexOf(',') + 1)
            : source;
        return Image.memory(
          base64Decode(raw),
          width: 60,
          height: 60,
          fit: BoxFit.cover,
          errorBuilder: error,
        );
      }
      return Image.file(
        File(source),
        width: 60,
        height: 60,
        fit: BoxFit.cover,
        errorBuilder: error,
      );
    } catch (_) {
      return placeholder();
    }
  }
}

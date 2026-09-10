import 'dart:io';
import 'package:flutter/material.dart';
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
  String _selectedStationFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!widget.viewModel.isConnected && !widget.viewModel.isConnecting) {
        widget.viewModel.startConnecting(webIsWaiting: true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        final isConnected = widget.viewModel.isConnected;

        return Scaffold(
          backgroundColor: AppColors.surfaceNeutral,
          appBar: AppBar(
            backgroundColor: AppColors.surfacePrimary,
            elevation: 0.5,
            title: Text(
              'Quét vé số OCR (Admin)',
              style: AppTypography.h3(
                color: AppColors.textMain,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            iconTheme: const IconThemeData(color: AppColors.textMain),
            actions: [
              if (isConnected)
                IconButton(
                  icon: const Icon(
                    Icons.link_off_rounded,
                    color: AppColors.primary,
                  ),
                  tooltip: 'Ngắt kết nối Web',
                  onPressed: () => widget.viewModel.disconnectSession(),
                ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildConnectionStatusCard(context),
                const SizedBox(height: 16),
                _buildScanActionsCard(context),
                const SizedBox(height: 20),
                _buildScannedListHeader(),
                const SizedBox(height: 12),
                _buildStationTabs(),
                const SizedBox(height: 12),
                _buildScannedList(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildConnectionStatusCard(BuildContext context) {
    final isConnected = widget.viewModel.isConnected;
    final isConnecting = widget.viewModel.isConnecting;
    final errorMessage = widget.viewModel.errorMessage;
    final countdown = widget.viewModel.countdownSeconds;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isConnected
              ? AppColors.statusSuccess.withValues(alpha: 0.5)
              : (errorMessage != null
                    ? AppColors.brandPrimaryBorder
                    : AppColors.borderDefault),
        ),
      ),
      color: isConnected
          ? AppColors.statusSuccessSurface
          : (errorMessage != null
                ? AppColors.surfaceDestructiveSoft
                : AppColors.surfacePrimary),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isConnected
                        ? AppColors.statusSuccessSurface
                        : (errorMessage != null
                              ? AppColors.statusErrorSurface
                              : AppColors.statusWarningSurface),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isConnected
                        ? Icons.phonelink_ring_rounded
                        : (errorMessage != null
                              ? Icons.error_outline_rounded
                              : Icons.phonelink_erase_rounded),
                    color: isConnected
                        ? AppColors.statusSuccessForeground
                        : (errorMessage != null
                              ? AppColors.statusErrorForeground
                              : AppColors.statusWarningForeground),
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isConnected
                            ? 'ĐÃ KẾT NỐI WEB ADMIN'
                            : (isConnecting
                                  ? 'ĐANG CHỜ KẾT NỐI WEB ($countdown s)'
                                  : 'CHƯA KẾT NỐI WEB ADMIN'),
                        style: AppTypography.subtitle2(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: isConnected
                              ? AppColors.statusSuccessForeground
                              : (errorMessage != null
                                    ? AppColors.statusErrorForeground
                                    : AppColors.statusWarningForeground),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isConnected
                            ? 'Mã phiên: ${widget.viewModel.sessionCode} (Real-time Active)'
                            : (isConnecting
                                  ? 'Đang tìm kiếm trang Admin Web đang mở để tự động kết nối...'
                                  : 'Mở màn hình "Quét vé bằng Mobile App" trên Web Admin để ghép nối.'),
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
            if (errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfacePrimary,
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
            if (!isConnected) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.surfacePrimary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: isConnecting
                      ? null
                      : () => widget.viewModel.startConnecting(
                          webIsWaiting: true,
                        ),
                  icon: isConnecting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.surfacePrimary,
                          ),
                        )
                      : const Icon(Icons.sync_rounded, size: 20),
                  label: Text(
                    isConnecting
                        ? 'Đang kết nối ($countdown s)...'
                        : 'Thử kết nối lại với Web',
                    style: AppTypography.buttonMedium(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildScanActionsCard(BuildContext context) {
    final isConnected = widget.viewModel.isConnected;
    final isScanning = widget.viewModel.isScanning;

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
              'Thao tác Quét vé số OCR',
              style: AppTypography.subtitle1(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Ảnh chụp vé sau khi xử lý OCR sẽ tự động đồng bộ Real-time lên danh sách của phiếu nhập lô vé trên Web Admin.',
              style: AppTypography.caption(
                fontSize: 12,
                color: AppColors.contentSecondary,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isConnected
                          ? AppColors.primary
                          : AppColors.surfaceDisabled,
                      foregroundColor: isConnected
                          ? AppColors.surfacePrimary
                          : AppColors.contentDisabled,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: (isConnected && !isScanning)
                        ? () => widget.viewModel.scanTicket(ImageSource.camera)
                        : null,
                    icon: isScanning
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.surfacePrimary,
                            ),
                          )
                        : const Icon(Icons.camera_alt_rounded),
                    label: Text(
                      isScanning ? 'Đang soi vé...' : 'Chụp vé số',
                      style: AppTypography.buttonMedium(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isConnected
                          ? AppColors.primary
                          : AppColors.contentDisabled,
                      side: BorderSide(
                        color: isConnected
                            ? AppColors.primary
                            : AppColors.borderDefault,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: (isConnected && !isScanning)
                        ? () => widget.viewModel.scanTicket(ImageSource.gallery)
                        : null,
                    icon: const Icon(Icons.photo_library_rounded),
                    label: Text(
                      'Tải ảnh lên',
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
      ),
    );
  }

  Widget _buildScannedListHeader() {
    final tickets = widget.viewModel.scannedTickets;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Vé đã quét trong phiên (${tickets.length})',
          style: AppTypography.subtitle1(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: AppColors.textMain,
          ),
        ),
        if (tickets.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.statusInfoSurface,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Real-time Synced',
              style: AppTypography.caption(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.statusInfoForeground,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildStationTabs() {
    final tickets = widget.viewModel.scannedTickets;

    // Extract unique station names dynamically from scanned tickets
    final Map<String, int> stationCounts = {};
    for (var ticket in tickets) {
      final name = ticket.stationName.trim();
      if (name.isNotEmpty) {
        stationCounts[name] = (stationCounts[name] ?? 0) + 1;
      }
    }

    final List<Map<String, dynamic>> tabs = [
      {'id': 'ALL', 'label': 'Tất cả', 'count': tickets.length},
      ...stationCounts.entries.map(
        (e) => {'id': e.key, 'label': e.key, 'count': e.value},
      ),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: tabs.map((tab) {
          final isSelected = _selectedStationFilter == tab['id'];
          final String label = tab['label'];
          final int count = tab['count'];

          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              showCheckmark: false,
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _selectedStationFilter = tab['id'];
                  });
                }
              },
              backgroundColor: AppColors.surfacePrimary,
              selectedColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.borderDefault,
                ),
              ),
              label: Text(
                '$label ($count)',
                style: AppTypography.labelMedium(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected
                      ? AppColors.surfacePrimary
                      : AppColors.textMain,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildScannedList() {
    final allTickets = widget.viewModel.scannedTickets;
    final tickets = _selectedStationFilter == 'ALL'
        ? allTickets
        : allTickets
              .where((t) => t.stationName == _selectedStationFilter)
              .toList();

    if (tickets.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderDefault),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.style_outlined,
              size: 48,
              color: AppColors.contentPlaceholder,
            ),
            const SizedBox(height: 12),
            Text(
              'Chưa có vé nào được quét',
              style: AppTypography.subtitle2(
                fontWeight: FontWeight.w600,
                color: AppColors.contentSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Bấm nút "Chụp vé số" hoặc "Tải ảnh lên" để bắt đầu nhận diện và đồng bộ với Web Admin.',
              textAlign: TextAlign.center,
              style: AppTypography.caption(
                fontSize: 12,
                color: AppColors.contentMuted,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
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
                  child: ticket.imagePath != null
                      ? Image.file(
                          File(ticket.imagePath!),
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          width: 60,
                          height: 60,
                          color: AppColors.surfaceNeutral,
                          child: const Icon(Icons.confirmation_number_rounded),
                        ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            ticket.ticketNumber,
                            style: AppTypography.lotteryDigit(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                              color: AppColors.primary,
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
                            child: Text(
                              ticket.status,
                              style: AppTypography.caption(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.statusSuccessForeground,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đài: ${ticket.stationName} • Ngày: ${ticket.drawDate}',
                        style: AppTypography.caption(
                          fontSize: 12,
                          color: AppColors.textMain,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Độ tin cậy OCR: ${(ticket.confidence * 100).toStringAsFixed(0)}% • Đã gửi Web',
                        style: AppTypography.caption(
                          fontSize: 11,
                          color: AppColors.contentSecondary,
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
}

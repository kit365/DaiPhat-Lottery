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
  final TextEditingController _codeController = TextEditingController();
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
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _showConnectDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Kết nối Web Admin',
          style: AppTypography.mainWith(
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Nhập mã kết nối hiển thị trên màn hình Tạo/Nhập lô vé số của Web Admin:',
              style: AppTypography.mainWith(
                fontSize: 13,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _codeController,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Ví dụ: BATCH-8891',
                prefixIcon: const Icon(
                  Icons.qr_code_scanner_rounded,
                  color: AppColors.primary,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: () async {
              final navigator = Navigator.of(context);
              final ok = await widget.viewModel.connectToWebSession(
                _codeController.text,
              );
              if (ok && mounted) {
                navigator.pop();
              }
            },
            child: const Text('Kết nối'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        final isConnected = widget.viewModel.isConnected;

        return Scaffold(
          backgroundColor: const Color(0xFFF9F9FB),
          appBar: AppBar(
            backgroundColor: AppColors.surfacePrimary,
            elevation: 0.5,
            title: Text(
              'Quét vé số OCR (Admin)',
              style: AppTypography.mainWith(
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
                    color: Colors.redAccent,
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
              ? Colors.green.shade300
              : (errorMessage != null
                    ? Colors.red.shade300
                    : AppColors.borderDefault),
        ),
      ),
      color: isConnected
          ? const Color(0xFFF0FDF4)
          : (errorMessage != null ? const Color(0xFFFEF2F2) : AppColors.surfacePrimary),
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
                        ? Colors.green.withValues(alpha: 0.15)
                        : (errorMessage != null
                              ? Colors.red.withValues(alpha: 0.15)
                              : Colors.orange.withValues(alpha: 0.15)),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isConnected
                        ? Icons.phonelink_ring_rounded
                        : (errorMessage != null
                              ? Icons.error_outline_rounded
                              : Icons.phonelink_erase_rounded),
                    color: isConnected
                        ? Colors.green[700]
                        : (errorMessage != null
                              ? Colors.red[700]
                              : Colors.orange[800]),
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
                        style: AppTypography.mainWith(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: isConnected
                              ? Colors.green[800]
                              : (errorMessage != null
                                    ? Colors.red[800]
                                    : Colors.orange[900]),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isConnected
                            ? 'Mã phiên: ${widget.viewModel.sessionCode} (Real-time Active)'
                            : (isConnecting
                                  ? 'Đang tìm kiếm trang Admin Web đang mở để tự động kết nối...'
                                  : 'Mở màn hình "Quét vé bằng Mobile App" trên Web Admin để ghép nối.'),
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          color: Colors.grey[700],
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
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.redAccent,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        errorMessage,
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          color: Colors.red[900],
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
                    style: AppTypography.mainWith(fontWeight: FontWeight.bold),
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
              style: AppTypography.mainWith(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Ảnh chụp vé sau khi xử lý OCR sẽ tự động đồng bộ Real-time lên danh sách của phiếu nhập lô vé trên Web Admin.',
              style: AppTypography.mainWith(
                fontSize: 12,
                color: Colors.grey[600],
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
                          : Colors.grey[300],
                      foregroundColor: isConnected
                          ? AppColors.surfacePrimary
                          : Colors.grey[600],
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
                      style: AppTypography.mainWith(
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
                          : Colors.grey[500],
                      side: BorderSide(
                        color: isConnected
                            ? AppColors.primary
                            : Colors.grey[300]!,
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
                      style: AppTypography.mainWith(
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
          style: AppTypography.mainWith(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: AppColors.textMain,
          ),
        ),
        if (tickets.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Real-time Synced',
              style: AppTypography.mainWith(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.blue[800],
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
                style: AppTypography.mainWith(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppColors.surfacePrimary : AppColors.textMain,
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
            Icon(Icons.style_outlined, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              'Chưa có vé nào được quét',
              style: AppTypography.mainWith(
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Bấm nút "Chụp vé số" hoặc "Tải ảnh lên" để bắt đầu nhận diện và đồng bộ với Web Admin.',
              textAlign: TextAlign.center,
              style: AppTypography.mainWith(
                fontSize: 12,
                color: Colors.grey[500],
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
      separatorBuilder: (_, __) => const SizedBox(height: 10),
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
                          color: Colors.grey[200],
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
                            style: AppTypography.mainWith(
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
                              color: Colors.green.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              ticket.status,
                              style: AppTypography.mainWith(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.green[800],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đài: ${ticket.stationName} • Ngày: ${ticket.drawDate}',
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          color: AppColors.textMain,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Độ tin cậy OCR: ${(ticket.confidence * 100).toStringAsFixed(0)}% • Đã gửi Web',
                        style: AppTypography.mainWith(
                          fontSize: 11,
                          color: Colors.grey[600],
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

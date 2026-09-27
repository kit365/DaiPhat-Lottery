import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:image_picker/image_picker.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../viewmodels/admin_scan_viewmodel.dart';
import '../../domain/models/ocr_models.dart';
import '../../utils/ocr_validation.dart';

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
      if (!mounted) return;
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
                  tooltip: 'Đổi phiếu nhập',
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
                if (widget.viewModel.rows.isNotEmpty) _buildImportActions(),
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
                            ? 'ĐÃ KẾT NỐI OCR'
                            : (isConnecting
                                  ? 'ĐANG KẾT NỐI OCR'
                                  : 'CHƯA SẴN SÀNG QUÉT'),
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
                            ? 'Phiếu nhập: ${widget.viewModel.sessionCode}'
                            : (isConnecting
                                  ? 'Đang tải phiếu nhập và kiểm tra dịch vụ OCR...'
                                  : 'Chọn phiếu nhập lô đã tạo để quét và xác nhận vé.'),
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
            if (widget.viewModel.batchOptions.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                key: ValueKey(widget.viewModel.selectedImportBatchId),
                initialValue:
                    widget.viewModel.batchOptions.any(
                      (b) => b.id == widget.viewModel.selectedImportBatchId,
                    )
                    ? widget.viewModel.selectedImportBatchId
                    : null,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Phiếu nhập lô / nhà cung cấp',
                ),
                items: widget.viewModel.batchOptions
                    .map(
                      (batch) => DropdownMenuItem(
                        value: batch.id,
                        child: Text(
                          '${batch.batchCode} — ${batch.data['supplierName'] ?? ''}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged:
                    widget.viewModel.isScanning ||
                        widget.viewModel.confirming ||
                        isConnecting
                    ? null
                    : widget.viewModel.selectDraftBatch,
              ),
            ],
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
                    isConnecting ? 'Đang kết nối...' : 'Thử kết nối lại',
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
    final isScanning =
        widget.viewModel.isScanning ||
        widget.viewModel.confirming ||
        widget.viewModel.importResult != null;

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
              'Quét ảnh, kiểm tra kết quả và xác nhận nhập vé vào phiếu nhập lô.',
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
              widget.viewModel.importResult == null
                  ? 'Chờ xác nhận'
                  : 'Đã xử lý nhập',
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
              'Bấm nút "Chụp vé số" hoặc "Tải ảnh lên" để bắt đầu nhận diện.',
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
          child: InkWell(
            onTap: () => _editTicket(ticket.id),
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
                          'Độ tin cậy OCR: ${(ticket.confidence * 100).toStringAsFixed(0)}% • Chạm để kiểm tra',
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
    if (source.startsWith('http://') || source.startsWith('https://'))
      return Image.network(
        source,
        width: 60,
        height: 60,
        fit: BoxFit.cover,
        errorBuilder: error,
      );
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

  Widget _buildImportActions() {
    final vm = widget.viewModel;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final warning in vm.warnings)
          Padding(padding: const EdgeInsets.only(top: 8), child: Text(warning)),
        const SizedBox(height: 12),
        if (vm.importResult == null) ...[
          TextButton(
            onPressed: vm.isScanning || vm.confirming
                ? null
                : () => vm.toggleAllConfirmable(true),
            child: Text('Chọn vé hợp lệ (${vm.confirmableCount})'),
          ),
          ElevatedButton(
            onPressed: vm.canConfirmImport ? _confirmImport : null,
            child: Text(
              vm.confirming
                  ? 'Đang nhập vé...'
                  : 'Xác nhận nhập ${vm.confirmableCount} vé',
            ),
          ),
        ] else ...[
          Text(
            'Đã nhập ${vm.importResult!['successCount']}/${vm.importResult!['totalRequested']} vé; trùng: ${vm.importResult!['duplicateCount']}, lỗi: ${vm.importResult!['failedCount']}.',
          ),
          for (final batch in ocrMaps(vm.importResult!['batches']))
            for (final item in ocrMaps(batch['ticketResults']))
              Text(
                '${item['numbers'] ?? ''} / ${item['serialNumber'] ?? ''}: ${item['outcome']} ${item['message'] ?? ''}',
              ),
        ],
        TextButton(
          onPressed: vm.isScanning || vm.confirming
              ? null
              : vm.discardPreviousScan,
          child: Text(
            vm.importResult == null ? 'Xóa bản quét' : 'Quét phiên mới',
          ),
        ),
        TextButton(
          onPressed: vm.loadingLogs ? null : _showLogs,
          child: const Text('Nhật ký quét'),
        ),
      ],
    );
  }

  Future<void> _confirmImport() async {
    final vm = widget.viewModel;
    var outcome = await vm.confirmImport();
    if (!mounted) return;
    if (outcome == OcrConfirmOutcome.shortfall) {
      final q = vm.getImportQuantityCheck();
      final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Phiếu nhập còn thiếu vé'),
          content: Text(
            'Đã chọn ${q.selectedCount}/${q.remainingCapacity} vé còn lại. Tiếp tục nhập thiếu ${q.shortfallCount} vé?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Quay lại'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Tiếp tục'),
            ),
          ],
        ),
      );
      if (!mounted || accepted != true) return;
      outcome = await vm.confirmImport(acknowledgeShortfall: true);
    }
    if (!mounted) return;
    if (outcome == OcrConfirmOutcome.over ||
        outcome == OcrConfirmOutcome.blocked)
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(vm.errorMessage ?? 'Vui lòng kiểm tra các vé đã chọn.'),
        ),
      );
  }

  Future<void> _showLogs() async {
    await widget.viewModel.loadScanLogs();
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nhật ký quét'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: widget.viewModel.scanLogs
                .map(
                  (log) => ListTile(
                    title: Text('${log['eventType']}'),
                    subtitle: Text(
                      '${log['note'] ?? ''}\n${log['scannedAt'] ?? ''}',
                    ),
                  ),
                )
                .toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  Future<void> _editTicket(String key) async {
    final vm = widget.viewModel;
    final row = vm.rows.where((r) => r.key == key).firstOrNull;
    if (row == null || vm.isScanning || vm.confirming) return;
    await showDialog<void>(
      context: context,
      builder: (context) => ListenableBuilder(
        listenable: vm,
        builder: (context, _) => AlertDialog(
          title: const Text('Kiểm tra vé OCR'),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ticketImage(
                    (row.data['croppedImageUrl'] ??
                            row.data['croppedImageBase64'] ??
                            row.data['sourcePreviewUrl'])
                        ?.toString(),
                  ),
                  for (final field in ocrFieldKeys.where(
                    (f) => f != 'stationName',
                  ))
                    TextFormField(
                      initialValue: row.data[field]?.toString() ?? '',
                      readOnly: vm.importResult != null,
                      decoration: InputDecoration(
                        labelText: ocrFieldLabels[field],
                        helperText: field == 'drawDate' ? 'YYYY-MM-DD' : null,
                        errorText: vm.evaluateField(row, field).blocksImport
                            ? vm.evaluateField(row, field).message
                            : null,
                      ),
                      onChanged: (value) => vm.updateRow(key, {field: value}),
                    ),
                  DropdownButtonFormField<int>(
                    key: ValueKey('${row.drawDate}-${row.stationId}'),
                    initialValue:
                        vm
                            .stationsForDate(row.drawDate)
                            .any((s) => ocrInt(s['id']) == row.stationId)
                        ? row.stationId
                        : null,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Nhà đài',
                      errorText:
                          vm.evaluateField(row, 'stationName').blocksImport
                          ? vm.evaluateField(row, 'stationName').message
                          : null,
                    ),
                    items: vm
                        .stationsForDate(row.drawDate)
                        .map(
                          (s) => DropdownMenuItem(
                            value: ocrInt(s['id']),
                            child: Text(
                              '${s['name']}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: vm.importResult != null
                        ? null
                        : (id) {
                            final station = vm
                                .stationsForDate(row.drawDate)
                                .where((s) => ocrInt(s['id']) == id)
                                .firstOrNull;
                            vm.updateRow(key, {
                              'stationId': id,
                              'stationName': station?['name'],
                            });
                          },
                  ),
                  for (final message in [
                    ...ocrStrings(row.data['validationErrors']),
                    ...ocrStrings(row.data['businessValidationErrors']),
                  ])
                    Text(message),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Chọn để nhập'),
                    value: row.selected,
                    onChanged:
                        vm.importResult != null ||
                            (!row.selected && !vm.isRowConfirmable(row))
                        ? null
                        : (selected) => vm.toggleRow(key, selected ?? false),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            if (vm.importResult == null)
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  vm.retryImage(row.sourceImageId);
                },
                child: const Text('Quét lại'),
              ),
            if (vm.importResult == null)
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  vm.removeImage(row.sourceImageId);
                },
                child: const Text('Bỏ ảnh'),
              ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Đóng'),
            ),
          ],
        ),
      ),
    );
  }
}

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../shared/network/api_exception.dart';
import '../../data/services/ocr_image_processor.dart';
import '../../data/services/ticket_ocr_service.dart';
import '../../domain/models/ocr_models.dart';
import '../../utils/ocr_errors.dart';
import '../../utils/ocr_validation.dart';

class ScannedTicketItem {
  final String id;
  final String? imagePath;
  final String ticketNumber, stationName, drawDate, status;
  final double confidence;
  final DateTime scannedAt;
  ScannedTicketItem({
    required this.id,
    this.imagePath,
    required this.ticketNumber,
    required this.stationName,
    required this.drawDate,
    required this.status,
    required this.confidence,
    required this.scannedAt,
  });
}

class AdminScanViewModel extends ChangeNotifier {
  final TicketOcrService service;
  final ImagePicker _picker;
  final OcrImageProcessor _processor;
  final String _draftKey;
  bool _disposed = false;
  int _generation = 0;
  bool _isConnecting = false, _isScanning = false, _confirming = false;
  bool _preparingImages = false;
  Timer? _readinessTimer;
  bool _checkingReadiness = false;
  bool? _serviceReady, _templateReady;
  String? _errorMessage;
  final List<OcrQueuedImage> _images = [];
  final List<OcrReviewRow> _rows = [];
  List<OcrImportBatch> _batches = [];
  final Map<int, OcrJson> _suppliers = {};
  final Map<String, List<OcrJson>> _stations = {};
  final Map<int, double> _prices = {};
  final Map<int, Map<String, String?>> _corrections = {};
  final Map<int, Timer> _correctionTimers = {};
  Future<void> _draftWrites = Future<void>.value();
  int _returnBufferMinutes = 45;
  int? supplierId, selectedImportBatchId, prefillLineId;
  String step = 'upload';
  String invoiceEvidenceUrl = '', ticketListImageUrl = '';
  OcrJson? importResult;
  List<OcrJson> scanLogs = [];
  List<String> warnings = [];
  bool loadingLogs = false;
  bool _hasRestoredDraft = false;

  AdminScanViewModel(
    this.service, {
    ImagePicker? picker,
    OcrImageProcessor? processor,
  }) : _picker = picker ?? ImagePicker(),
       _processor = processor ?? OcrImageProcessor(),
       _draftKey = _userDraftKey(service.client.accessToken);
  static String _userDraftKey(String? token) {
    try {
      final payload = ocrMap(
        jsonDecode(
          utf8.decode(
            base64Url.decode(base64Url.normalize(token!.split('.')[1])),
          ),
        ),
      );
      return 'ocrImportDraft:${payload['sub']}';
    } catch (_) {
      return 'ocrImportDraft:anonymous';
    }
  }

  bool _isSessionConnected = false;
  String? _remoteSessionCode;
  int _remoteScannedCount = 0;
  final List<ScannedTicketItem> _remoteScannedTickets = [];

  bool get isSessionConnected => _isSessionConnected;
  String? get remoteSessionCode => _remoteSessionCode;
  int get remoteScannedCount => _remoteScannedCount;
  List<ScannedTicketItem> get remoteScannedTickets =>
      List.unmodifiable(_remoteScannedTickets);

  bool get isConnecting => _isConnecting;
  bool get isScanning => _isScanning || _preparingImages;
  bool get confirming => _confirming;
  bool get isConnected =>
      _isSessionConnected ||
      (!_isConnecting &&
          _serviceReady == true &&
          _templateReady == true &&
          selectedBatch != null &&
          selectedBatch!.editable &&
          !intakeClosed(selectedBatch!));
  String? get sessionCode => _remoteSessionCode ?? selectedBatch?.batchCode;
  String? get errorMessage => _errorMessage;
  int get countdownSeconds => 0;

  Future<bool> connectToWebSession(String code) async {
    final cleanCode = code.trim();
    if (cleanCode.length != 6) {
      _errorMessage = 'Mã phiên phải gồm đúng 6 chữ số.';
      _notify();
      return false;
    }

    _isConnecting = true;
    _errorMessage = null;
    _notify();

    try {
      await service.joinOcrSession(
        cleanCode,
        deviceName: Platform.isAndroid ? 'Android' : 'iOS',
      );
      _isSessionConnected = true;
      _remoteSessionCode = cleanCode;
      _remoteScannedCount = 0;
      _remoteScannedTickets.clear();
      _errorMessage = null;
      _notify();
      return true;
    } catch (e) {
      _errorMessage = e is ApiException
          ? e.message
          : 'Không thể kết nối với mã phiên $cleanCode';
      _isSessionConnected = false;
      _notify();
      return false;
    } finally {
      _isConnecting = false;
      _notify();
    }
  }

  Future<void> disconnectRemoteSession() async {
    if (_remoteSessionCode != null) {
      await service.closeOcrSession(_remoteSessionCode!);
    }
    _isSessionConnected = false;
    _remoteSessionCode = null;
    _remoteScannedCount = 0;
    _remoteScannedTickets.clear();
    _errorMessage = null;
    _notify();
  }

  Future<bool> scanAndUploadToWeb(ImageSource source) async {
    if (!_isSessionConnected || _remoteSessionCode == null) {
      _errorMessage = 'Chưa kết nối với Web Admin. Vui lòng nhập mã phiên!';
      _notify();
      return false;
    }

    try {
      final XFile? photo = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );
      if (photo == null) return false;

      _isScanning = true;
      _errorMessage = null;
      _notify();

      final res = await service.uploadOcrSessionTicket(
        _remoteSessionCode!,
        photo,
      );
      _remoteScannedCount += 1;

      // Haptic feedback to alert user
      HapticFeedback.mediumImpact();

      final tickets = ocrMaps(res['tickets']);
      if (tickets.isNotEmpty) {
        for (final t in tickets) {
          _remoteScannedTickets.insert(
            0,
            ScannedTicketItem(
              id: 'TICK-${DateTime.now().millisecondsSinceEpoch}',
              imagePath: photo.path,
              ticketNumber: t['numbers']?.toString() ?? '------',
              stationName: t['stationName']?.toString() ?? 'Chưa rõ đài',
              drawDate: t['drawDate']?.toString() ?? '',
              status: t['status']?.toString() ?? 'Đã gửi lên Web',
              confidence: (t['confidence'] as num?)?.toDouble() ?? 0.95,
              scannedAt: DateTime.now(),
            ),
          );
        }
      } else {
        _remoteScannedTickets.insert(
          0,
          ScannedTicketItem(
            id: 'TICK-${DateTime.now().millisecondsSinceEpoch}',
            imagePath: photo.path,
            ticketNumber: 'Vé số',
            stationName: 'Đã gửi sang Web',
            drawDate: DateFormat('dd/MM/yyyy').format(DateTime.now()),
            status: 'Thành công',
            confidence: 1.0,
            scannedAt: DateTime.now(),
          ),
        );
      }
      return true;
    } catch (e) {
      _errorMessage = 'Lỗi khi gửi ảnh lên Web: $e';
      return false;
    } finally {
      _isScanning = false;
      _notify();
    }
  }

  Future<int> uploadMultipleFromGallery() async {
    if (!_isSessionConnected || _remoteSessionCode == null) {
      _errorMessage = 'Chưa kết nối với Web Admin.';
      _notify();
      return 0;
    }

    try {
      final List<XFile> photos = await _picker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );
      if (photos.isEmpty) return 0;

      _isScanning = true;
      _errorMessage = null;
      _notify();

      int uploaded = 0;
      for (final photo in photos) {
        try {
          final res = await service.uploadOcrSessionTicket(
            _remoteSessionCode!,
            photo,
          );
          uploaded++;
          _remoteScannedCount++;
          final tickets = ocrMaps(res['tickets']);
          if (tickets.isNotEmpty) {
            for (final t in tickets) {
              _remoteScannedTickets.insert(
                0,
                ScannedTicketItem(
                  id: 'TICK-${DateTime.now().millisecondsSinceEpoch}',
                  imagePath: photo.path,
                  ticketNumber: t['numbers']?.toString() ?? '------',
                  stationName: t['stationName']?.toString() ?? 'Đài chính',
                  drawDate: t['drawDate']?.toString() ?? '',
                  status: t['status']?.toString() ?? 'Hợp lệ',
                  confidence: (t['confidence'] as num?)?.toDouble() ?? 1.0,
                  scannedAt: DateTime.now(),
                ),
              );
            }
          } else {
            _remoteScannedTickets.insert(
              0,
              ScannedTicketItem(
                id: 'TICK-${DateTime.now().millisecondsSinceEpoch}',
                imagePath: photo.path,
                ticketNumber: 'Vé số',
                stationName: 'Đã gửi sang Web',
                drawDate: DateFormat('dd/MM/yyyy').format(DateTime.now()),
                status: 'Thành công',
                confidence: 1.0,
                scannedAt: DateTime.now(),
              ),
            );
          }
          HapticFeedback.lightImpact();
          _notify();
        } catch (e) {
          _errorMessage = e is ApiException
              ? e.message
              : 'Lỗi khi gửi ảnh lên Web: $e';
          _notify();
        }
      }
      HapticFeedback.heavyImpact();
      return uploaded;
    } catch (e) {
      _errorMessage = 'Lỗi khi tải ảnh hàng loạt: $e';
      return 0;
    } finally {
      _isScanning = false;
      _notify();
    }
  }

  Future<XFile?> pickSinglePhoto(ImageSource source) async {
    try {
      return await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );
    } catch (e) {
      _errorMessage = 'Không thể mở camera: $e';
      _notify();
      return null;
    }
  }

  Future<List<XFile>> pickPhotos(ImageSource source) async {
    try {
      if (source == ImageSource.camera) {
        final XFile? photo = await _picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 85,
          maxWidth: 1920,
          maxHeight: 1080,
        );
        return photo != null ? [photo] : [];
      } else {
        return await _picker.pickMultiImage(
          imageQuality: 85,
          maxWidth: 1920,
          maxHeight: 1080,
        );
      }
    } catch (e) {
      _errorMessage = 'Không thể mở thư viện/camera: $e';
      _notify();
      return [];
    }
  }

  Future<Set<String>> uploadPickedPhotos(List<XFile> photos) async {
    if (_isScanning) return {};
    if (!_isSessionConnected || _remoteSessionCode == null) {
      _errorMessage = 'Chưa kết nối với Web Admin.';
      _notify();
      return {};
    }
    if (photos.isEmpty) return {};
    final code = _remoteSessionCode!;

    _isScanning = true;
    _errorMessage = null;
    _notify();

    final uploaded = <String>{};
    try {
      for (final photo in photos) {
        if (_disposed || !_isSessionConnected || _remoteSessionCode != code) {
          break;
        }
        try {
          final res = await service.uploadOcrSessionTicket(code, photo);
          uploaded.add(photo.path);
          if (_disposed || _remoteSessionCode != code) break;
          _remoteScannedCount++;
          _remoteScannedTickets.insert(
            0,
            ScannedTicketItem(
              id: res['id']?.toString() ?? photo.path,
              imagePath: photo.path,
              ticketNumber: 'Ảnh vé',
              stationName: 'Chờ bắt đầu quét trên Web',
              drawDate: '',
              status: 'Đã gửi ảnh',
              confidence: 0,
              scannedAt: DateTime.now(),
            ),
          );
          HapticFeedback.lightImpact();
          _notify();
        } catch (e) {
          _errorMessage = e is ApiException
              ? e.message
              : 'Lỗi khi gửi ảnh lên Web: $e';
          _notify();
        }
      }
      HapticFeedback.heavyImpact();
      return uploaded;
    } finally {
      _isScanning = false;
      _notify();
    }
  }

  List<OcrReviewRow> get rows => List.unmodifiable(_rows);
  List<OcrQueuedImage> get images => List.unmodifiable(_images);
  List<OcrImportBatch> get batchOptions => _batches
      .where(
        (b) =>
            b.editable &&
            b.batchCode.trim().isNotEmpty &&
            _suppliers[b.supplierId]?['isActive'] != false &&
            !intakeClosed(b),
      )
      .toList();
  OcrImportBatch? get selectedBatch {
    for (final b in _batches) {
      if (b.id == selectedImportBatchId) return b;
    }
    return null;
  }

  bool intakeClosed(OcrImportBatch b) => ocrIntakeClosed(
    b.drawDate,
    _suppliers[b.supplierId]?['returnCutOffTime']?.toString(),
    _returnBufferMinutes,
  );
  int get pendingImagesCount =>
      _images.where((i) => i.status == 'pending').length;
  int get confirmableCount =>
      _rows.where((r) => r.selected && isRowConfirmable(r)).length;
  bool get canConfirmImport =>
      !isScanning &&
      !_confirming &&
      importResult == null &&
      pendingImagesCount == 0 &&
      selectedBatch != null &&
      confirmableCount > 0;
  List<ScannedTicketItem> get scannedTickets => _rows
      .map(
        (r) => ScannedTicketItem(
          id: r.key,
          imagePath:
              (r.data['croppedImageUrl'] ??
                      r.data['croppedImageBase64'] ??
                      r.data['sourcePreviewUrl'])
                  ?.toString(),
          ticketNumber: r.numbers,
          stationName: r.stationName ?? '',
          drawDate: formatOcrMessage(r.drawDate ?? ''),
          status:
              const {
                'COMPLETE': 'Thành công',
                'NEEDS_REVIEW': 'Cần kiểm tra',
                'PARTIAL': 'Đọc một phần',
                'FAILED': 'Không đọc được',
                'INCOMPLETE': 'Không hợp lệ',
              }[r.status] ??
              r.status,
          confidence: ocrConfidence(r.confidence),
          scannedAt:
              DateTime.tryParse(r.data['scannedAt']?.toString() ?? '') ??
              DateTime.now(),
        ),
      )
      .toList();
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  bool _active(int generation) => !_disposed && generation == _generation;

  Future<bool> startConnecting({String? code, bool webIsWaiting = true}) async {
    if (_isConnecting || _disposed) return false;
    final generation = _generation;
    _isConnecting = true;
    _errorMessage = null;
    _notify();
    try {
      await reloadBatches();
      if (!_active(generation)) return false;
      try {
        _serviceReady = (await service.ready())['ready'] == true;
      } catch (error) {
        _serviceReady = false;
        _errorMessage = normalizeOcrError(error);
      }
      if (!_active(generation)) return false;
      try {
        _templateReady = (await service.templateReady())['ready'] == true;
      } catch (_) {
        _templateReady = false;
      }
      if (!_active(generation)) return false;
      if (!_hasRestoredDraft) {
        await resumePreviousScan();
        _hasRestoredDraft = true;
      }
      if (!_active(generation)) return false;
      if (code != null && code.trim().isNotEmpty) {
        final matches = batchOptions
            .where(
              (b) =>
                  b.batchCode == code.trim() || b.id.toString() == code.trim(),
            )
            .toList();
        if (matches.isEmpty)
          throw const ApiException(
            'Không tìm thấy phiếu nhập. Vui lòng chọn phiếu nhập lô đang mở.',
          );
        selectDraftBatch(matches.first.id);
      } else if (selectedBatch == null && batchOptions.length == 1) {
        selectDraftBatch(batchOptions.first.id);
      }
      if (_serviceReady == false)
        _errorMessage ??= ocrUnavailable;
      else if (_templateReady == false)
        _errorMessage =
            'Chưa có mẫu OCR mặc định đang hoạt động. Vui lòng cấu hình mẫu nhà đài trên Web.';
      else if (selectedBatch == null)
        _errorMessage = 'Vui lòng chọn phiếu nhập lô trước khi quét.';
    } catch (error) {
      if (_active(generation)) _errorMessage = normalizeOcrError(error);
    } finally {
      if (_active(generation)) {
        _isConnecting = false;
        _scheduleReadinessCheck();
        _notify();
      }
    }
    return isConnected;
  }

  void _scheduleReadinessCheck() {
    _readinessTimer?.cancel();
    if (_disposed || _serviceReady != false) return;
    _readinessTimer = Timer(const Duration(seconds: 5), () async {
      if (_disposed || _checkingReadiness || _isConnecting) return;
      _checkingReadiness = true;
      final generation = _generation;
      try {
        final result = await service.ready();
        if (_active(generation)) {
          _serviceReady = result['ready'] == true;
          if (_serviceReady == true && _errorMessage == ocrUnavailable)
            _errorMessage = null;
        }
      } catch (_) {
        if (_active(generation)) _serviceReady = false;
      } finally {
        _checkingReadiness = false;
        if (_active(generation)) {
          _scheduleReadinessCheck();
          _notify();
        }
      }
    });
  }

  Future<void> reloadBatches() async {
    final generation = _generation;
    final batches = await service.batches();
    if (!_active(generation)) return;
    _batches = batches;
    try {
      _returnBufferMinutes =
          ocrInt((await service.timePolicy())['returnBufferMinutes']) ?? 45;
    } catch (_) {
      /* Same web fallback. */
    }
    for (final id
        in batches.map((b) => b.supplierId).whereType<int>().toSet()) {
      try {
        final supplier = await service.supplier(id);
        if (_active(generation)) _suppliers[id] = supplier;
      } catch (_) {
        /* Keep batch supplier metadata. */
      }
    }
    if (_active(generation)) _notify();
  }

  void selectDraftBatch(int? id) {
    if (isScanning || _confirming) return;
    selectedImportBatchId = id;
    supplierId = selectedBatch?.supplierId;
    prefillLineId = null;
    _errorMessage = null;
    unawaited(persistUnimportedDraft());
    _notify();
  }

  void setSupplierId(int? id) {
    if (_isScanning || _confirming) return;
    supplierId = id;
    if (selectedBatch?.supplierId != id) {
      selectedImportBatchId = null;
      prefillLineId = null;
    }
    _notify();
  }

  void setPrefillLine(int? id) {
    if (_isScanning || _confirming) return;
    if (id == null) {
      prefillLineId = null;
      return;
    }
    final lines = selectedBatch?.lines ?? <OcrJson>[];
    if (lines.any(
      (l) =>
          ocrInt(l['id']) == id &&
          !['CANCELLED', 'PAUSED'].contains(l['status']) &&
          (l['status'] != 'IMPORTED' ||
              (ocrInt(l['totalQuantity']) ?? 0) <
                  (ocrInt(l['declareQuantity']) ?? 0)),
    ))
      prefillLineId = id;
  }

  Future<void> discardDraftBatch(int id) async {
    if (_isScanning || _confirming) return;
    try {
      await service.cancelBatch(id);
      if (selectedImportBatchId == id) selectDraftBatch(null);
      await reloadBatches();
    } catch (error) {
      _errorMessage = normalizeOcrError(error);
      _notify();
    }
  }

  void disconnectSession() {
    if (_confirming) return;
    unawaited(persistUnimportedDraft());
    _generation++;
    _isScanning = false;
    _preparingImages = false;
    _isConnecting = false;
    _readinessTimer?.cancel();
    selectedImportBatchId = null;
    supplierId = null;
    prefillLineId = null;
    _errorMessage = null;
    _notify();
  }

  Future<void> scanTicket(ImageSource source) async {
    if (isScanning || _confirming || importResult != null || !isConnected)
      return;
    final generation = _generation;
    try {
      final files = source == ImageSource.gallery
          ? await _picker.pickMultiImage()
          : [
              await _picker.pickImage(source: source),
            ].whereType<XFile>().toList();
      if (!_active(generation) || files.isEmpty) return;
      await addImages(files);
      if (_active(generation)) await scanPendingImages();
    } catch (error) {
      if (_active(generation)) {
        _errorMessage = normalizeOcrError(error);
        _notify();
      }
    }
  }

  Future<void> addImages(List<XFile> files) async {
    if (isScanning || _confirming || importResult != null) return;
    final generation = _generation;
    _preparingImages = true;
    _notify();
    try {
      for (final file in files) {
        final prepared = await _processor.prepare(file);
        if (!_active(generation)) return;
        final id = '${DateTime.now().microsecondsSinceEpoch}-${_images.length}';
        _images.add(
          OcrQueuedImage(
            id: id,
            file: prepared.file,
            fileName: prepared.name,
            previewUrl:
                'data:${prepared.mimeType};base64,${base64Encode(prepared.bytes)}',
          ),
        );
      }
    } finally {
      if (_active(generation)) {
        _preparingImages = false;
        _notify();
      }
    }
  }

  void removeImage(String id) {
    if (_isScanning || _confirming) return;
    _images.removeWhere((i) => i.id == id);
    _rows.removeWhere((r) => r.sourceImageId == id);
    if (_rows.isEmpty) {
      unawaited(_clearDraft());
    } else {
      unawaited(persistUnimportedDraft());
    }
    _notify();
  }

  Future<void> retryImage(String id) async {
    if (_isScanning || _confirming) return;
    final matches = _images.where((i) => i.id == id && i.file != null).toList();
    if (matches.isEmpty) {
      _errorMessage = 'Vui lòng chọn lại ảnh gốc để quét lại.';
      _notify();
      return;
    }
    matches.first.status = 'pending';
    _rows.removeWhere((r) => r.sourceImageId == id);
    await scanPendingImages();
  }

  Future<void> scanPendingImages() async {
    if (_isScanning || _confirming || importResult != null) return;
    if (supplierId == null ||
        selectedBatch == null ||
        !selectedBatch!.editable ||
        intakeClosed(selectedBatch!)) {
      _errorMessage =
          'Vui lòng chọn nhà cung cấp và phiếu nhập lô còn trong giờ nhận vé trước khi quét.';
      _notify();
      return;
    }
    if (_serviceReady == false || _templateReady == false) {
      _errorMessage = _templateReady == false
          ? 'Chưa có mẫu OCR mặc định.'
          : ocrUnavailable;
      _notify();
      return;
    }
    final pending = _images
        .where((i) => i.status == 'pending' && i.file != null)
        .toList();
    if (pending.isEmpty) return;
    final generation = _generation;
    final batchId = selectedImportBatchId;
    final lineId = prefillLineId;
    _isScanning = true;
    _errorMessage = null;
    warnings = [];
    _notify();
    try {
      for (var index = 0; index < pending.length; index++) {
        if (!_active(generation)) return;
        if (index > 0)
          await Future<void>.delayed(const Duration(milliseconds: 100));
        final image = pending[index];
        image.status = 'scanning';
        image.error = null;
        _notify();
        final watch = Stopwatch()..start();
        var rateRetries = 0, serviceRetries = 0;
        while (_active(generation)) {
          try {
            final response = await service.scan(
              image.file!,
              importBatchId: batchId,
              importBatchLineId: lineId,
            );
            if (!_active(generation)) return;
            final data = TicketOcrService.requireData(response);
            final messages = [
              ...ocrStrings(data['warnings']),
              response['message']?.toString() ?? '',
            ];
            if (messages.any(isOcrRateLimit) && rateRetries++ < 1) {
              await Future<void>.delayed(const Duration(seconds: 20));
              continue;
            }
            if (messages.any(isOcrBusy) && serviceRetries++ < 1) {
              await Future<void>.delayed(const Duration(seconds: 8));
              continue;
            }
            final tickets = ocrMaps(data['tickets']);
            image.scanId = data['scanId']?.toString();
            image.imageWidth = ocrInt(data['imageWidth']);
            image.imageHeight = ocrInt(data['imageHeight']);
            image.scannedAt = DateTime.now();
            image.durationMs = watch.elapsedMilliseconds;
            final source =
                data['sourceImageUrl'] ??
                tickets
                    .map((t) => t['sourceImageUrl'])
                    .whereType<String>()
                    .firstOrNull;
            if (source is String && source.trim().isNotEmpty)
              image.previewUrl = source;
            final unreadable =
                tickets.isEmpty ||
                tickets.every(
                  (t) =>
                      t['status'] == 'FAILED' &&
                      (ocrMap(t['extracted'])['numbers']?.toString().trim() ??
                              '')
                          .isEmpty &&
                      (ocrMap(
                                t['extracted'],
                              )['serialNumber']?.toString().trim() ??
                              '')
                          .isEmpty,
                );
            image.status = unreadable ? 'error' : 'done';
            if (unreadable) {
              image.error = normalizeOcrError(
                ocrStrings(data['warnings']).firstOrNull ?? response['message'],
              );
              _rows.add(failedOcrRow(image, image.error!));
            } else {
              _rows.addAll(tickets.map((t) => mapOcrTicket(t, image)));
            }
            warnings = {
              ...warnings,
              ...normalizeOcrWarnings(ocrStrings(data['warnings'])),
            }.toList();
            break;
          } catch (error) {
            if (!_active(generation)) return;
            final text = error.toString();
            final status = error is ApiException ? error.statusCode : null;
            if ((status == 429 || isOcrRateLimit(text)) && rateRetries++ < 1) {
              await Future<void>.delayed(const Duration(seconds: 20));
              continue;
            }
            if (([502, 503, 504].contains(status) ||
                    isOcrTechnical(text) ||
                    isOcrBusy(text)) &&
                serviceRetries++ < 1) {
              await Future<void>.delayed(const Duration(seconds: 8));
              continue;
            }
            image.status = 'error';
            image.error = normalizeOcrError(error);
            image.scannedAt = DateTime.now();
            image.durationMs = watch.elapsedMilliseconds;
            _rows.add(failedOcrRow(image, image.error!));
            _errorMessage = image.error;
            break;
          }
        }
        if (!_active(generation)) return;
        step = 'review';
        await persistUnimportedDraft();
        _notify();
      }
      await loadStationSchedules();
    } finally {
      if (_active(generation)) {
        _isScanning = false;
        _notify();
      }
    }
  }

  List<OcrJson> stationsForDate(String? date) => _stations[ocrDate(date)] ?? [];
  Future<void> loadStationSchedules() async {
    final generation = _generation;
    final dates = _rows
        .map((r) => ocrDate(r.drawDate))
        .whereType<String>()
        .toSet();
    try {
      final entries = await Future.wait(
        dates.map((date) async => MapEntry(date, await service.stations(date))),
      );
      if (!_active(generation)) return;
      for (final entry in entries) {
        _stations[entry.key] = entry.value;
        for (final station in entry.value) {
          final id = ocrInt(station['id']);
          final price = ocrDouble(station['price']);
          if (id != null && price != null) _prices[id] = price;
        }
      }
    } catch (_) {
      if (_active(generation))
        warnings = {
          ...warnings,
          'Không tải được lịch xổ nhà đài để kiểm tra ngày vé.',
        }.toList();
    }
    _notify();
  }

  Set<int>? _allowed(OcrReviewRow row) {
    final date = ocrDate(row.drawDate);
    if (date == null || _stations.isEmpty) return null;
    return (_stations[date] ?? [])
        .map((s) => ocrInt(s['id']))
        .whereType<int>()
        .toSet();
  }

  OcrFieldEvaluation evaluateField(OcrReviewRow row, String field) =>
      evaluateOcrField(
        row,
        field,
        allowedStationIds: _allowed(row),
        stationPrices: _prices,
      );
  bool isRowConfirmable(OcrReviewRow row) => canConfirmOcrRow(
    row,
    allowedStationIds: _allowed(row),
    stationPrices: _prices,
  );
  void updateRow(String key, OcrJson patch) {
    if (_confirming || _isScanning || importResult != null) return;
    final row = _rows.where((r) => r.key == key).firstOrNull;
    if (row == null) return;
    final allowedKeys = {...ocrFieldKeys, 'stationId', 'selected'};
    final changes = Map<String, dynamic>.fromEntries(
      patch.entries.where((e) => allowedKeys.contains(e.key)),
    );
    row.data.addAll(changes);
    if (changes.keys.any((k) => k != 'selected')) row.data['edited'] = true;
    final id = row.ocrScanResultId;
    if (id != null) {
      final corrections = _corrections.putIfAbsent(id, () => {});
      for (final e in changes.entries) {
        if (ocrFieldKeys.contains(e.key))
          corrections[e.key] = e.value?.toString();
      }
      if (corrections.isNotEmpty) {
        _correctionTimers.remove(id)?.cancel();
        _correctionTimers[id] = Timer(
          const Duration(milliseconds: 450),
          () => unawaited(_flushCorrection(id)),
        );
      }
    }
    if (changes.containsKey('drawDate')) unawaited(loadStationSchedules());
    unawaited(persistUnimportedDraft());
    _notify();
  }

  Future<void> _flushCorrection(int id) async {
    _correctionTimers.remove(id)?.cancel();
    final fields = _corrections.remove(id);
    if (fields == null || fields.isEmpty) return;
    try {
      await service.correctFields(id, fields);
    } catch (_) {
      /* Confirm-import also synchronizes corrected values. */
    }
  }

  void toggleRow(String key, bool value) => updateRow(key, {'selected': value});
  void toggleAllConfirmable(bool value) {
    if (_confirming || _isScanning || importResult != null) return;
    for (final row in _rows) {
      if (isRowConfirmable(row) || row.selected) row.data['selected'] = value;
    }
    unawaited(persistUnimportedDraft());
    _notify();
  }

  OcrQuantityCheck getImportQuantityCheck() =>
      checkOcrQuantity(_rows, selectedBatch, isRowConfirmable);
  Future<OcrConfirmOutcome> confirmImport({
    bool acknowledgeShortfall = false,
  }) async {
    if (!canConfirmImport) return OcrConfirmOutcome.blocked;
    _confirming = true;
    _errorMessage = null;
    _notify();
    final generation = _generation;
    try {
      final current = await service.batch(selectedImportBatchId!);
      if (!_active(generation)) return OcrConfirmOutcome.blocked;
      _batches = [..._batches.where((b) => b.id != current.id), current];
      if (!current.editable || intakeClosed(current))
        throw const ApiException(
          'Phiếu nhập đã đóng hoặc hết thời gian nhận vé.',
        );
      final quantity = getImportQuantityCheck();
      if (quantity.isOverCapacity) {
        _errorMessage =
            'Số vé chọn vượt chỗ còn lại trên phiếu. Bỏ bớt ${quantity.excessCount} vé trước khi nhập.';
        return OcrConfirmOutcome.over;
      }
      if (quantity.isShortfall && !acknowledgeShortfall)
        return OcrConfirmOutcome.shortfall;
      final selected = _rows
          .where((r) => r.selected && isRowConfirmable(r))
          .toList();
      if (selected.isEmpty) return OcrConfirmOutcome.blocked;
      await Future.wait(_corrections.keys.toList().map(_flushCorrection));
      if (!_active(generation)) return OcrConfirmOutcome.blocked;
      final result = await service.confirmImport({
        'mode': 'MANUAL',
        'importBatchId': current.id,
        'tickets': selected
            .map(
              (r) => {
                'numbers': r.numbers.trim(),
                'serialNumber': r.serialNumber.trim(),
                'stationId': r.stationId,
                'drawDate': ocrDate(r.drawDate),
                'ticketImageBase64': r.data['croppedImageBase64'],
                'ocrScanResultId': r.ocrScanResultId,
              },
            )
            .toList(),
      });
      importResult = result;
      step = 'result';
      await _clearDraft();
      return OcrConfirmOutcome.ok;
    } catch (error) {
      if (_active(generation)) _errorMessage = error.toString();
      return OcrConfirmOutcome.blocked;
    } finally {
      if (_active(generation)) {
        _confirming = false;
        _notify();
      }
    }
  }

  Future<void> loadScanLogs() async {
    loadingLogs = true;
    _notify();
    final generation = _generation;
    try {
      final date = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final logs = <OcrJson>[];
      for (final id
          in _rows
              .map((r) => r.ocrScanResultId)
              .whereType<int>()
              .toSet()
              .take(10)) {
        logs.addAll(
          ocrMaps(
            (await service.scanLogs(
              ocrScanResultId: id,
              scannedAtFrom: date,
              scannedAtTo: date,
            ))['recordList'],
          ),
        );
      }
      logs.sort((a, b) => '${b['scannedAt']}'.compareTo('${a['scannedAt']}'));
      if (_active(generation)) scanLogs = logs;
    } catch (_) {
      if (_active(generation)) scanLogs = [];
    } finally {
      if (_active(generation)) {
        loadingLogs = false;
        _notify();
      }
    }
  }

  Future<void> persistUnimportedDraft() {
    if (_rows.isEmpty || step == 'result') return Future<void>.value();
    final snapshot = jsonEncode({
      'step': step == 'upload' ? 'review' : step,
      'importMode': 'MANUAL',
      'supplierId': supplierId,
      'selectedImportBatchId': selectedImportBatchId,
      'invoiceEvidenceUrl': invoiceEvidenceUrl,
      'ticketListImageUrl': ticketListImageUrl,
      'rows': _rows.map((r) {
        final data = r.toJson();
        if ((data['croppedImageUrl']?.toString() ?? '').startsWith('http'))
          data['croppedImageBase64'] = null;
        return data;
      }).toList(),
      'imageMeta': _images
          .where((i) => i.status == 'done' || i.status == 'error')
          .map((i) => i.toJson())
          .toList(),
    });
    _draftWrites = _draftWrites
        .catchError((Object _) {})
        .then((_) async {
          await (await SharedPreferences.getInstance()).setString(
            _draftKey,
            snapshot,
          );
        })
        .catchError((Object _) {
          if (!_disposed) {
            warnings = {
              ...warnings,
              'Không lưu được bản nháp OCR trên thiết bị.',
            }.toList();
            _notify();
          }
        });
    return _draftWrites;
  }

  Future<void> _clearDraft() {
    _draftWrites = _draftWrites
        .catchError((Object _) {})
        .then((_) async {
          await (await SharedPreferences.getInstance()).remove(_draftKey);
        })
        .catchError((Object _) {
          if (!_disposed) {
            warnings = {
              ...warnings,
              'Không xóa được bản nháp OCR trên thiết bị.',
            }.toList();
            _notify();
          }
        });
    return _draftWrites;
  }

  Future<void> resumePreviousScan() async {
    final generation = _generation;
    try {
      final raw = (await SharedPreferences.getInstance()).getString(_draftKey);
      if (raw == null || !_active(generation)) return;
      final draft = ocrMap(jsonDecode(raw));
      final restored = ocrMaps(draft['rows']).map(OcrReviewRow.new).toList();
      if (restored.isEmpty) return;
      final images = ocrMaps(
        draft['imageMeta'],
      ).map(OcrQueuedImage.fromJson).toList();
      for (final scanId
          in restored.map((r) => r.scanId).whereType<String>().toSet()) {
        try {
          final persisted = await service.scanResults(scanId: scanId);
          for (final row in restored) {
            final found = persisted
                .where((p) => ocrInt(p['id']) == row.ocrScanResultId)
                .firstOrNull;
            if (found == null) continue;
            if (found['sourceImageUrl'] != null)
              row.data['sourcePreviewUrl'] = found['sourceImageUrl'];
            if (found['croppedImageUrl'] != null)
              row.data['croppedImageUrl'] = found['croppedImageUrl'];
          }
        } catch (_) {
          /* The saved review remains usable offline. */
        }
      }
      if (!_active(generation)) return;
      for (final row in restored) {
        if (images.any((i) => i.id == row.sourceImageId)) continue;
        images.add(
          OcrQueuedImage(
            id: row.sourceImageId,
            fileName: row.data['sourceFileName']?.toString() ?? 'scan.jpg',
            previewUrl: row.data['sourcePreviewUrl']?.toString() ?? '',
            status: row.status == 'FAILED' ? 'error' : 'done',
            scanId: row.scanId,
          ),
        );
      }
      _rows
        ..clear()
        ..addAll(restored);
      _images
        ..clear()
        ..addAll(images);
      selectedImportBatchId = ocrInt(draft['selectedImportBatchId']);
      supplierId = ocrInt(draft['supplierId']);
      invoiceEvidenceUrl = draft['invoiceEvidenceUrl']?.toString() ?? '';
      ticketListImageUrl = draft['ticketListImageUrl']?.toString() ?? '';
      step = draft['step'] == 'result'
          ? 'importMode'
          : (draft['step']?.toString() ?? 'review');
      await loadStationSchedules();
      _notify();
    } catch (_) {
      /* Ignore incomplete or invalid local drafts. */
    }
  }

  Future<void> discardPreviousScan() async {
    if (_confirming || _isScanning) return;
    _rows.clear();
    _images.clear();
    importResult = null;
    scanLogs = [];
    warnings = [];
    step = 'upload';
    await _clearDraft();
    try {
      await reloadBatches();
    } catch (_) {
      /* Reconnect can refresh batches later. */
    }
    _notify();
  }

  @override
  void dispose() {
    _readinessTimer?.cancel();
    unawaited(persistUnimportedDraft());
    for (final timer in _correctionTimers.values) {
      timer.cancel();
    }
    for (final id in _corrections.keys.toList()) {
      unawaited(_flushCorrection(id));
    }
    _disposed = true;
    _generation++;
    super.dispose();
  }
}

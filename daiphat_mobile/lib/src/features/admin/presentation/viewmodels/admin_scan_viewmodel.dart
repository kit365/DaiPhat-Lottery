import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class ScannedTicketItem {
  final String id;
  final String? imagePath;
  final String ticketNumber;
  final String stationName;
  final String drawDate;
  final String status;
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
  final ImagePicker _picker = ImagePicker();

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  bool _isConnecting = false;
  bool get isConnecting => _isConnecting;

  bool _isScanning = false;
  bool get isScanning => _isScanning;

  String? _sessionCode;
  String? get sessionCode => _sessionCode;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  final List<ScannedTicketItem> _scannedTickets = [];
  List<ScannedTicketItem> get scannedTickets => List.unmodifiable(_scannedTickets);

  int _countdownSeconds = 10;
  int get countdownSeconds => _countdownSeconds;

  // Auto-connect with Web Admin Session & 10s countdown
  Future<bool> connectToWebSession(String code) async {
    return startConnecting(code: code, webIsWaiting: true);
  }

  Future<bool> startConnecting({String? code, bool webIsWaiting = true}) async {
    _isConnecting = true;
    _isConnected = false;
    _errorMessage = null;
    _countdownSeconds = 10;
    notifyListeners();

    // 10s Countdown loop
    for (int i = 10; i > 0; i--) {
      _countdownSeconds = i;
      notifyListeners();

      // If Web is waiting and open, connect immediately within 10s
      if (webIsWaiting && i <= 8) {
        _isConnecting = false;
        _isConnected = true;
        _sessionCode = code ?? 'BATCH-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
        _errorMessage = null;
        notifyListeners();
        return true;
      }

      await Future.delayed(const Duration(seconds: 1));
    }

    // Timeout > 10s if Web is not open/waiting
    _isConnecting = false;
    _isConnected = false;
    _errorMessage = 'Chưa kết nối được trang quản trị trên Web. Vui lòng mở màn hình "Quét vé bằng Mobile App" trên Web Admin và thử lại.';
    notifyListeners();
    return false;
  }

  void disconnectSession() {
    _isConnected = false;
    _sessionCode = null;
    _scannedTickets.clear();
    _errorMessage = null;
    _countdownSeconds = 10;
    notifyListeners();
  }

  // Scan ticket from camera or gallery
  Future<void> scanTicket(ImageSource source) async {
    if (!_isConnected) {
      _errorMessage = 'Chưa kết nối với Web Admin. Vui lòng kết nối trước!';
      notifyListeners();
      return;
    }

    try {
      final XFile? photo = await _picker.pickImage(
        source: source,
        imageQuality: 85,
      );

      if (photo == null) return;

      _isScanning = true;
      _errorMessage = null;
      notifyListeners();

      // Simulate sending image to AI Ticket-Vision OCR & syncing to Web Admin Real-time
      await Future.delayed(const Duration(seconds: 2));

      // Mock OCR result returned from AI Vision microservice
      final sampleNumbers = ['789123', '456089', '123987', '654321', '998877'];
      final sampleStations = ['TP. Hồ Chí Minh', 'Tiền Giang', 'Kiên Giang', 'Đồng Tháp', 'Bến Tre'];
      final nextIndex = _scannedTickets.length;
      
      final newItem = ScannedTicketItem(
        id: 'TICK-${DateTime.now().millisecondsSinceEpoch}',
        imagePath: photo.path,
        ticketNumber: sampleNumbers[nextIndex % sampleNumbers.length],
        stationName: sampleStations[nextIndex % sampleStations.length],
        drawDate: '06/08/2026',
        status: 'Hợp lệ',
        confidence: 0.98,
        scannedAt: DateTime.now(),
      );

      _scannedTickets.insert(0, newItem);
    } catch (e) {
      _errorMessage = 'Lỗi khi quét vé số: $e';
    } finally {
      _isScanning = false;
      notifyListeners();
    }
  }
}

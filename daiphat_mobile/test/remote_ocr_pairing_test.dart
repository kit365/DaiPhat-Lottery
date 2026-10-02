import 'package:daiphat_mobile/src/features/admin/data/services/ticket_ocr_service.dart';
import 'package:daiphat_mobile/src/features/admin/presentation/viewmodels/admin_scan_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

class FakeTicketOcrService extends Fake implements TicketOcrService {
  @override
  final ApiClient client = ApiClient();

  String? joinedCode;
  String? closedCode;
  bool shouldFailJoin = false;
  final uploaded = <String>[];

  @override
  Future<Map<String, dynamic>> uploadOcrSessionTicket(
    String code,
    XFile file,
  ) async {
    if (file.path == 'failed.jpg') throw Exception('Upload failed');
    uploaded.add(file.path);
    return {'id': file.path, 'imageUrl': 'https://images.example/${file.path}'};
  }

  @override
  Future<Map<String, dynamic>> joinOcrSession(
    String code, {
    String? deviceName,
  }) async {
    if (shouldFailJoin) {
      throw Exception('Session not found');
    }
    joinedCode = code;
    return {'code': code, 'status': 'CONNECTED', 'scannedTicketCount': 0};
  }

  @override
  Future<void> closeOcrSession(String code) async {
    closedCode = code;
  }
}

void main() {
  setUpAll(() async {
    await dotenv.load(fileName: '.env');
  });

  group('AdminScanViewModel Remote Session Tests', () {
    test(
      'uploads photos only and returns successful paths for retrying failures',
      () async {
        final service = FakeTicketOcrService();
        final vm = AdminScanViewModel(service);
        await vm.connectToWebSession('849201');

        final sent = await vm.uploadPickedPhotos([
          XFile('first.jpg'),
          XFile('failed.jpg'),
          XFile('last.jpg'),
        ]);

        expect(sent, {'first.jpg', 'last.jpg'});
        expect(service.uploaded, ['first.jpg', 'last.jpg']);
        expect(vm.remoteScannedCount, 2);
        expect(vm.rows, isEmpty);
        expect(
          vm.remoteScannedTickets.every(
            (image) => image.status == 'Đã gửi ảnh',
          ),
          isTrue,
        );
      },
    );
    test('initial state has no connected session', () {
      final fakeService = FakeTicketOcrService();
      final vm = AdminScanViewModel(fakeService);

      expect(vm.isSessionConnected, isFalse);
      expect(vm.remoteSessionCode, isNull);
      expect(vm.remoteScannedCount, 0);
      expect(vm.remoteScannedTickets, isEmpty);
      expect(vm.errorMessage, isNull);
    });

    test('connectToWebSession validates 6-digit code', () async {
      final fakeService = FakeTicketOcrService();
      final vm = AdminScanViewModel(fakeService);

      final resultTooShort = await vm.connectToWebSession('12345');
      expect(resultTooShort, isFalse);
      expect(vm.isSessionConnected, isFalse);
      expect(vm.errorMessage, 'Mã phiên phải gồm đúng 6 chữ số.');

      final resultTooLong = await vm.connectToWebSession('1234567');
      expect(resultTooLong, isFalse);
      expect(vm.isSessionConnected, isFalse);
      expect(vm.errorMessage, 'Mã phiên phải gồm đúng 6 chữ số.');
    });

    test('connectToWebSession succeeds with valid 6-digit code', () async {
      final fakeService = FakeTicketOcrService();
      final vm = AdminScanViewModel(fakeService);

      final result = await vm.connectToWebSession('849201');
      expect(result, isTrue);
      expect(fakeService.joinedCode, '849201');
      expect(vm.isSessionConnected, isTrue);
      expect(vm.remoteSessionCode, '849201');
      expect(vm.errorMessage, isNull);
    });

    test('disconnectRemoteSession resets remote state', () async {
      final fakeService = FakeTicketOcrService();
      final vm = AdminScanViewModel(fakeService);

      await vm.connectToWebSession('849201');
      expect(vm.isSessionConnected, isTrue);

      await vm.disconnectRemoteSession();
      expect(fakeService.closedCode, '849201');
      expect(vm.isSessionConnected, isFalse);
      expect(vm.remoteSessionCode, isNull);
      expect(vm.remoteScannedCount, 0);
      expect(vm.remoteScannedTickets, isEmpty);
    });
  });
}

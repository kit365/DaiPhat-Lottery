import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';
import '../../../../shared/network/api_client.dart';
import '../../../../shared/network/api_exception.dart';
import '../../domain/models/ocr_models.dart';

class TicketOcrService {
  final ApiClient client;
  TicketOcrService(this.client);
  static const base = '/lottery-tickets';

  static OcrJson requireData(OcrJson response) {
    if (response['data'] is! Map)
      throw ApiException(
        response['message']?.toString() ??
            'Không nhận được kết quả từ máy chủ.',
      );
    return ocrMap(response['data']);
  }

  Future<FormData> imageForm(XFile file) async {
    final bytes = await file.readAsBytes();
    final mime =
        file.mimeType ??
        lookupMimeType(file.name, headerBytes: bytes) ??
        'application/octet-stream';
    return FormData.fromMap({
      'file': MultipartFile.fromBytes(
        bytes,
        filename: file.name,
        contentType: DioMediaType.parse(mime),
      ),
    });
  }

  Future<OcrJson> scan(
    XFile file, {
    int? importBatchLineId,
    int? importBatchId,
  }) async => client.post(
    '$base/scan',
    data: await imageForm(file),
    queryParameters: {
      if (importBatchLineId != null) 'importBatchLineId': importBatchLineId,
      if (importBatchId != null) 'importBatchId': importBatchId,
    },
    timeout: const Duration(seconds: 210),
  );
  Future<OcrJson> ready() async => requireData(
    await client.get(
      '$base/ocr-service-ready',
      timeout: const Duration(seconds: 8),
    ),
  );
  Future<OcrJson> templateReady() async => requireData(
    await client.get(
      '/ocr-templates/default-ready',
      timeout: const Duration(seconds: 30),
    ),
  );
  Future<OcrJson> confirmImport(OcrJson payload) async =>
      requireData(await client.post('$base/ocr-confirm-import', data: payload));
  Future<OcrJson> batchImport(OcrJson payload) async =>
      requireData(await client.post('$base/batch-import', data: payload));
  Future<List<OcrJson>> scanResults({
    String? scanId,
    int? importBatchLineId,
  }) async => ocrMaps(
    (await client.get(
      '$base/ocr-scan-results',
      queryParameters: {
        if (scanId != null) 'scanId': scanId,
        if (importBatchLineId != null) 'importBatchLineId': importBatchLineId,
      },
    ))['data'],
  );
  Future<void> correctFields(int id, Map<String, String?> values) async {
    await client.patch(
      '$base/ocr-scan-results/$id/fields',
      data: {
        'fields': values.entries
            .map((e) => {'fieldName': e.key, 'correctedValue': e.value})
            .toList(),
      },
    );
  }

  Future<OcrJson> scanLogs({
    int page = 1,
    int size = 20,
    int? ocrScanResultId,
    String? eventType,
    String? scannedAtFrom,
    String? scannedAtTo,
    String sortBy = 'scannedAt',
    String direction = 'desc',
  }) async => requireData(
    await client.get(
      '$base/scan-logs',
      queryParameters: {
        'page': page,
        'size': size,
        if (ocrScanResultId != null) 'ocrScanResultId': ocrScanResultId,
        if (eventType != null) 'eventType': eventType,
        if (scannedAtFrom != null) 'scannedAtFrom': scannedAtFrom,
        if (scannedAtTo != null) 'scannedAtTo': scannedAtTo,
        'sortBy': sortBy,
        'direction': direction,
      },
    ),
  );
  Future<List<OcrImportBatch>> batches() async {
    // Both endpoints cancel overdue drafts; preserve the web's sequential order.
    final data = ocrMaps(
      (await client.get('/import-batches/incomplete'))['data'],
    );
    final byId = {for (final batch in data) ocrInt(batch['id']): batch};
    try {
      final draft = ocrMap(
        (await client.get('/import-batches/active-draft'))['data'],
      );
      if (draft['id'] != null) byId[ocrInt(draft['id'])] = draft;
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) rethrow;
    }
    return byId.values.map(OcrImportBatch.new).toList();
  }

  Future<OcrImportBatch> batch(int id) async =>
      OcrImportBatch(requireData(await client.get('/import-batches/$id')));
  Future<void> cancelBatch(int id) async {
    await client.post('/import-batches/$id/cancel', data: <String, dynamic>{});
  }

  Future<List<OcrJson>> stations(String drawDate) async => ocrMaps(
    (await client.get(
      '/lottery-stations/schedule',
      queryParameters: {'drawDate': drawDate},
      timeout: const Duration(seconds: 30),
    ))['data'],
  );
  Future<OcrJson> supplier(int id) async =>
      requireData(await client.get('/lottery-suppliers/$id'));
  Future<OcrJson> timePolicy() async =>
      requireData(await client.get('/import-batches/time-policy'));
  Future<String> uploadEvidence(XFile file, {bool ticketList = false}) async {
    final result = requireData(
      await client.post(
        '/import-batches/${ticketList ? 'ticket-list-images' : 'invoice-evidence'}/upload',
        data: await imageForm(file),
        timeout: const Duration(seconds: 120),
      ),
    );
    final url = result['url']?.toString();
    if (url == null || url.isEmpty)
      throw const ApiException('Không nhận được URL tệp từ server.');
    return url;
  }
}

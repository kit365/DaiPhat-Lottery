import 'package:image_picker/image_picker.dart';

typedef OcrJson = Map<String, dynamic>;
OcrJson ocrMap(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
List<OcrJson> ocrMaps(Object? value) => value is List
    ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
    : <OcrJson>[];
List<String> ocrStrings(Object? value) =>
    value is List ? value.whereType<String>().toList() : <String>[];
int? ocrInt(Object? value) => value is num
    ? (value.isFinite ? value.toInt() : null)
    : int.tryParse('$value');
double? ocrDouble(Object? value) {
  final result = value is num ? value.toDouble() : double.tryParse('$value');
  return result != null && result.isFinite ? result : null;
}

/// Retains field metadata, polygons, rule failures and persisted IDs losslessly.
class OcrReviewRow {
  final OcrJson data;
  OcrReviewRow(OcrJson json) : data = Map.of(json);
  String get key => data['key']?.toString() ?? '';
  String get sourceImageId => data['sourceImageId']?.toString() ?? '';
  String get numbers => data['numbers']?.toString() ?? '';
  String get serialNumber => data['serialNumber']?.toString() ?? '';
  String get status => data['status']?.toString() ?? 'INCOMPLETE';
  String? get drawDate => data['drawDate']?.toString();
  String? get stationName => data['stationName']?.toString();
  String? get ticketType => data['ticketType']?.toString();
  int? get stationId => ocrInt(data['stationId']);
  int? get ocrScanResultId => ocrInt(data['ocrScanResultId']);
  String? get scanId => data['scanId']?.toString();
  bool get selected => data['selected'] == true;
  bool get edited => data['edited'] == true;
  bool get duplicate => data['duplicate'] == true;
  double get confidence => ocrDouble(data['confidence']) ?? 0;
  OcrJson get fieldValidations => ocrMap(data['fieldValidations']);
  OcrJson get fields => ocrMap(data['fields']);
  OcrJson toJson() => Map.of(data);
}

class OcrQueuedImage {
  final String id;
  XFile? file;
  final String fileName;
  String previewUrl;
  String status;
  String? error;
  String? scanId;
  int? imageWidth;
  int? imageHeight;
  DateTime? scannedAt;
  int? durationMs;
  OcrQueuedImage({
    required this.id,
    this.file,
    required this.fileName,
    required this.previewUrl,
    this.status = 'pending',
    this.error,
    this.scanId,
    this.imageWidth,
    this.imageHeight,
    this.scannedAt,
    this.durationMs,
  });
  OcrJson toJson() => {
    'id': id,
    'fileName': fileName,
    'previewUrl': previewUrl,
    'status': status,
    'error': error,
    'scanId': scanId,
    'imageWidth': imageWidth,
    'imageHeight': imageHeight,
    'scannedAt': scannedAt?.toIso8601String(),
    'durationMs': durationMs,
  };
  factory OcrQueuedImage.fromJson(OcrJson json) => OcrQueuedImage(
    id: json['id'].toString(),
    fileName: json['fileName']?.toString() ?? 'scan.jpg',
    previewUrl: json['previewUrl']?.toString() ?? '',
    status: json['status'] == 'error' ? 'error' : 'done',
    error: json['error']?.toString(),
    scanId: json['scanId']?.toString(),
    imageWidth: ocrInt(json['imageWidth']),
    imageHeight: ocrInt(json['imageHeight']),
    scannedAt: DateTime.tryParse(json['scannedAt']?.toString() ?? ''),
    durationMs: ocrInt(json['durationMs']),
  );
}

class OcrImportBatch {
  final OcrJson data;
  OcrImportBatch(this.data);
  int get id => ocrInt(data['id']) ?? 0;
  int? get supplierId => ocrInt(data['supplierId']);
  String get batchCode => data['batchCode']?.toString() ?? '';
  String get drawDate => data['drawDate']?.toString() ?? '';
  List<OcrJson> get lines => ocrMaps(data['lines']);
  bool get editable => const [
    'DRAFT',
    'RECEIVING',
    'PARTIALLY_IMPORTED',
  ].contains(data['status']);
}

class OcrQuantityCheck {
  final int selectedCount, remainingCapacity, excessCount, shortfallCount;
  final List<OcrJson> stationExcesses;
  bool get isOverCapacity => excessCount > 0 || stationExcesses.isNotEmpty;
  bool get isShortfall => !isOverCapacity && shortfallCount > 0;
  const OcrQuantityCheck({
    required this.selectedCount,
    required this.remainingCapacity,
    required this.excessCount,
    required this.shortfallCount,
    required this.stationExcesses,
  });
}

enum OcrConfirmOutcome { ok, over, shortfall, blocked }

class OcrFieldEvaluation {
  final String status;
  final String? message;
  const OcrFieldEvaluation(this.status, [this.message]);
  bool get blocksImport => status == 'invalid' || status == 'unreadable';
}

import 'dart:math' as math;
import 'dart:convert';
import 'package:intl/intl.dart';
import '../domain/models/ocr_models.dart';
import 'ocr_errors.dart';

const ocrFieldKeys = [
  'stationName',
  'drawDate',
  'numbers',
  'serialNumber',
  'batchCode',
  'ticketType',
];

List<OcrJson> parseOcrValidationRules(String raw) {
  try {
    final items = ocrMaps(jsonDecode(raw.isEmpty ? '[]' : raw));
    return [for (var i = 0; i < items.length; i++) {
      'fieldName': items[i]['fieldName'] ?? 'serialNumber',
      'ruleType': items[i]['ruleType'] ?? 'REGEX',
      'ruleConfig': ocrMap(items[i]['ruleConfig']),
      'severity': items[i]['severity'] ?? 'HARD_FAIL',
      'isActive': items[i]['isActive'] != false,
      'sortOrder': ocrInt(items[i]['sortOrder']) ?? i,
    }];
  } catch (_) { return []; }
}

({double? confidence, bool confirmed}) resolveOcrFieldConfidence(OcrReviewRow row, String key, String uiStatus) {
  final detail = ocrMap(row.fields[key]);
  final raw = ocrDouble(ocrMap(row.data['fieldConfidences'])[key] ?? detail['confidence']);
  final confidence = raw == null ? null : ocrConfidence(raw);
  if (!['stationName', 'drawDate', 'ticketType'].contains(key) || !['valid', 'corrected'].contains(uiStatus)) return (confidence: confidence, confirmed: false);
  final status = ocrMap(row.fieldValidations[key])['status'] ?? detail['validationStatus'];
  if (status != 'MATCHED') return (confidence: confidence, confirmed: false);
  String? normalized(Object? value) {
    final text = value?.toString().trim();
    if (text == null || text.isEmpty) return null;
    if (key == 'drawDate') return ocrDate(text) ?? text;
    if (key == 'ticketType') return parseOcrPrice(text)?.toString() ?? text;
    return text.toLowerCase();
  }
  final unchanged = detail['value'] != null ? normalized(detail['value']) == normalized(row.data[key]) : !row.edited;
  return unchanged ? (confidence: 1.0, confirmed: true) : (confidence: confidence, confirmed: false);
}
const ocrFieldLabels = {
  'stationName': 'Nhà đài',
  'drawDate': 'Ngày mở thưởng',
  'numbers': 'Dãy số vé',
  'serialNumber': 'Số sê-ri',
  'batchCode': 'Mã lô (Ký hiệu)',
  'ticketType': 'Mệnh giá',
};
final ocrSerialPattern = RegExp(r'^(?:[A-Za-z]\d{4,19}|\d{4,19}[A-Za-z])$');
final ocrBatchPattern = RegExp(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9\-]{2,24}$');
bool isOcrSerial(String value) => ocrSerialPattern.hasMatch(value.trim());
bool isOcrBatch(String value) =>
    !isOcrSerial(value) && ocrBatchPattern.hasMatch(value.trim());
({String serialNumber, String? batchCode}) reconcileOcrSerial(
  String? serialNumber,
  String? batchCode,
) {
  var serial = serialNumber?.trim() ?? '';
  var batch = batchCode?.trim();
  if (serial.isNotEmpty && !isOcrSerial(serial) && isOcrBatch(serial)) {
    if (!isOcrBatch(batch ?? '')) batch = serial;
    serial = '';
  }
  if (isOcrSerial(batch ?? '') && !isOcrSerial(serial)) {
    serial = batch!;
    batch = null;
  }
  return (serialNumber: serial, batchCode: batch);
}

double? parseOcrPrice(String? value) =>
    double.tryParse((value ?? '').replaceAll(RegExp(r'[^\d]'), ''));
String? ocrDate(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  try {
    return DateFormat('yyyy-MM-dd').format(
      DateFormat('yyyy-MM-dd').parseStrict(value.trim().split('T').first),
    );
  } catch (_) {
    return null;
  }
}

double ocrConfidence(double value) =>
    value <= 2 ? value.clamp(0, 1).toDouble() : value.clamp(0, 100) / 100;

OcrReviewRow mapOcrTicket(OcrJson ticket, OcrQueuedImage image) {
  final fields = ocrMap(ticket['fields']);
  final extracted = ocrMap(ticket['extracted']);
  String? field(String name) =>
      (extracted[name] ?? ocrMap(fields[name])['value'])?.toString();
  final reconciled = reconcileOcrSerial(
    field('serialNumber'),
    field('batchCode'),
  );
  final status = ticket['status'] ?? 'INCOMPLETE';
  final overall = ticket['overallValidationStatus'];
  final price = parseOcrPrice(field('ticketType'));
  return OcrReviewRow({
    ...ticket,
    'key':
        '${image.scanId ?? 'local'}-${ticket['ticketIndex']}-${ticket['ocrScanResultId'] ?? image.id}',
    'sourceImageId': image.id,
    'sourceFileName': image.fileName,
    'sourcePreviewUrl': ticket['sourceImageUrl'] ?? image.previewUrl,
    'scanId': image.scanId,
    'status': status,
    'confidence': ticket['confidence'] ?? 0,
    'imageWidth': ticket['imageWidth'] ?? image.imageWidth,
    'imageHeight': ticket['imageHeight'] ?? image.imageHeight,
    'numbers': field('numbers')?.trim() ?? '',
    'serialNumber': reconciled.serialNumber,
    'batchCode': reconciled.batchCode,
    'stationId': ticket['resolvedStationId'],
    'stationName': field('stationName'),
    'drawDate': ticket['resolvedDrawDate'] ?? extracted['drawDate'],
    'ticketType': price == null
        ? null
        : NumberFormat.decimalPattern('vi_VN').format(price),
    'fieldConfidences': ocrMap(ticket['fieldConfidences']),
    'fieldBoxes': ocrMap(ticket['fieldBoxes']),
    'sourceFieldBoxes': ocrMap(ticket['sourceFieldBoxes']),
    'fieldValidations': ocrMap(ticket['fieldValidations']),
    'fields': fields,
    'missingFields': ocrStrings(ticket['missingFields']),
    'validationErrors': normalizeOcrWarnings(
      ocrStrings(ticket['validationErrors']),
    ),
    'businessValidationErrors': normalizeOcrWarnings(
      ocrStrings(ticket['businessValidationErrors']),
    ),
    'duplicate': ticket['duplicate'] == true,
    'selected':
        (status == 'COMPLETE' || overall == 'VALID') &&
        ticket['duplicate'] != true &&
        overall != 'INVALID' &&
        !['PARTIAL', 'FAILED', 'INCOMPLETE'].contains(status) &&
        ticket['resolvedStationId'] != null &&
        (ticket['resolvedDrawDate'] ?? extracted['drawDate']) != null,
    'edited': false,
    'scannedAt': image.scannedAt?.toIso8601String(),
    'durationMs': image.durationMs,
  });
}

OcrReviewRow failedOcrRow(OcrQueuedImage image, String reason) => OcrReviewRow({
  'key': 'failed-${image.id}',
  'sourceImageId': image.id,
  'sourceFileName': image.fileName,
  'sourcePreviewUrl': image.previewUrl,
  'ticketIndex': 0,
  'status': 'FAILED',
  'confidence': 0,
  'numbers': '',
  'serialNumber': '',
  'selected': false,
  'edited': false,
  'duplicate': false,
  'overallValidationStatus': 'NEEDS_REVIEW',
  'missingFields': ['stationName', 'serialNumber', 'numbers', 'drawDate'],
  'businessValidationErrors': [normalizeOcrError(reason)],
  'validationErrors': <String>[],
  'fieldValidations': {
    for (final field in ocrFieldKeys)
      field: {
        'status': 'UNREADABLE',
        'message':
            'Không nhận diện được trường này do ảnh bị mờ hoặc bị che khuất.',
      },
  },
  'scannedAt': image.scannedAt?.toIso8601String(),
  'durationMs': image.durationMs,
});

OcrFieldEvaluation evaluateOcrField(
  OcrReviewRow row,
  String key, {
  Set<int>? allowedStationIds,
  Map<int, double> stationPrices = const {},
  String? batchDrawDate,
}) {
  final validation = ocrMap(row.fieldValidations[key]);
  final detail = ocrMap(row.fields[key]);
  final failures = ocrMaps(
    validation['ruleFailures'] ?? detail['validationFailures'],
  );
  final edited = row.edited && ocrFieldKeys.contains(key);
  final message = formatOcrMessage(
    (validation['message'] ?? detail['validationMessage'] ?? '').toString(),
  );
  final unreadable =
      validation['status'] == 'UNREADABLE' ||
      detail['validationStatus'] == 'UNREADABLE';
  if (!edited) {
    for (final failure in failures) {
      if (failure['severity'] == 'HARD_FAIL')
        return OcrFieldEvaluation(
          'invalid',
          formatOcrMessage((failure['message'] ?? message).toString()),
        );
    }
    for (final failure in failures) {
      if (failure['severity'] == 'SOFT_WARNING' &&
          [null, 'MATCHED', 'UNCERTAIN'].contains(validation['status']))
        return OcrFieldEvaluation(
          'uncertain',
          formatOcrMessage((failure['message'] ?? message).toString()),
        );
    }
  }
  OcrFieldEvaluation missing(String fallback) => OcrFieldEvaluation(
    unreadable ? 'unreadable' : 'invalid',
    unreadable && message.isNotEmpty ? message : fallback,
  );
  switch (key) {
    case 'batchCode':
      return OcrFieldEvaluation(edited ? 'corrected' : 'valid');
    case 'serialNumber':
      if (row.serialNumber.trim().isEmpty)
        return missing('Vui lòng nhập số sê-ri.');
      if (!isOcrSerial(row.serialNumber))
        return const OcrFieldEvaluation(
          'invalid',
          'Số sê-ri gồm chữ số và đúng 1 chữ cái ở đầu hoặc cuối (ví dụ A123456, 123456B).',
        );
      if (row.duplicate)
        return const OcrFieldEvaluation(
          'invalid',
          'Số sê-ri đã tồn tại trong hệ thống (trùng vé).',
        );
    case 'numbers':
      if (row.numbers.trim().isEmpty)
        return missing('Vui lòng nhập dãy số dự thưởng.');
      if (!RegExp(r'^\d{6}$').hasMatch(row.numbers.trim()))
        return const OcrFieldEvaluation(
          'invalid',
          'Dãy số dự thưởng phải đủ đúng 6 chữ số; hệ thống không tự cắt hoặc thêm số.',
        );
    case 'drawDate':
      if ((row.drawDate ?? '').trim().isEmpty)
        return missing('Vui lòng chọn ngày mở thưởng.');
      if (ocrDate(row.drawDate) == null)
        return const OcrFieldEvaluation(
          'invalid',
          'Ngày mở thưởng không đúng định dạng YYYY-MM-DD.',
        );
      if (batchDrawDate != null &&
          ocrDate(row.drawDate) != ocrDate(batchDrawDate))
        return const OcrFieldEvaluation(
          'invalid',
          'Ngày mở thưởng không khớp với ngày quay của phiếu.',
        );
    case 'stationName':
      if (row.stationId == null) return missing('Vui lòng chọn nhà đài.');
      if (allowedStationIds != null &&
          !allowedStationIds.contains(row.stationId))
        return const OcrFieldEvaluation(
          'invalid',
          'Đài OCR không mở thưởng vào ngày phiếu nhập — vui lòng kiểm tra lại.',
        );
    case 'ticketType':
      final price = parseOcrPrice(row.ticketType);
      final expected = stationPrices[row.stationId];
      if (expected != null &&
          expected > 0 &&
          (price == null || (expected - price).abs() > .01))
        return OcrFieldEvaluation(
          'invalid',
          'Mệnh giá không khớp với giá nhà đài ($expected đ).',
        );
      if ((row.ticketType ?? '').trim().isNotEmpty &&
          (price == null || price <= 0))
        return const OcrFieldEvaluation('invalid', 'Mệnh giá không hợp lệ.');
    default:
      return const OcrFieldEvaluation('uncertain');
  }
  if (edited) return const OcrFieldEvaluation('corrected');
  final status = validation['status'];
  if (status == 'UNREADABLE') return OcrFieldEvaluation('unreadable', message);
  if (status == 'MISMATCHED' ||
      (status == 'NOT_FOUND' &&
          ['serialNumber', 'numbers', 'stationName'].contains(key)))
    return OcrFieldEvaluation('invalid', message);
  if (status == 'UNCERTAIN' && ['stationName', 'ticketType'].contains(key))
    return OcrFieldEvaluation('uncertain', message);
  return const OcrFieldEvaluation('valid');
}

bool canConfirmOcrRow(
  OcrReviewRow row, {
  Set<int>? allowedStationIds,
  Map<int, double> stationPrices = const {},
  String? batchDrawDate,
}) {
  if (row.status == 'FAILED' ||
      row.duplicate ||
      row.stationId == null ||
      row.numbers.trim().isEmpty ||
      row.serialNumber.trim().isEmpty ||
      (row.drawDate ?? '').trim().isEmpty)
    return false;
  return [
    'stationName',
    'numbers',
    'serialNumber',
    'drawDate',
    'ticketType',
  ].every(
    (key) => !evaluateOcrField(
      row,
      key,
      allowedStationIds: allowedStationIds,
      stationPrices: stationPrices,
      batchDrawDate: batchDrawDate,
    ).blocksImport,
  );
}

OcrQuantityCheck checkOcrQuantity(
  List<OcrReviewRow> rows,
  OcrImportBatch? batch,
  bool Function(OcrReviewRow) confirmable,
) {
  final selected = rows.where((r) => r.selected && confirmable(r)).toList();
  final byStation = <int, int>{};
  var capacity = 0;
  for (final line in batch?.lines ?? <OcrJson>[]) {
    if (['CANCELLED', 'IMPORTED'].contains(line['status'])) continue;
    final rem = math.max(
      0,
      (ocrInt(line['declareQuantity']) ?? 0) -
          (ocrInt(line['totalQuantity']) ?? 0),
    );
    capacity += rem;
    final id = ocrInt(line['lotteryStationId']);
    if (id != null) byStation[id] = (byStation[id] ?? 0) + rem;
  }
  if (batch != null && batch.lines.isEmpty)
    capacity = math.max(
      0,
      (ocrInt(batch.data['totalDeclareQuantity']) ?? 0) -
          (ocrInt(batch.data['totalImportedQuantity']) ?? 0),
    );
  final excesses = <OcrJson>[];
  for (final id in selected.map((r) => r.stationId).whereType<int>().toSet()) {
    final stationRows = selected.where((r) => r.stationId == id).toList();
    final remaining = byStation[id] ?? 0;
    if (stationRows.length > remaining)
      excesses.add({
        'stationId': id,
        'stationName': stationRows.first.stationName ?? 'Nhà đài #$id',
        'selected': stationRows.length,
        'remaining': remaining,
      });
  }
  final excess = math.max(
    math.max(0, selected.length - capacity),
    excesses.fold<int>(
      0,
      (sum, e) => sum + (e['selected'] as int) - (e['remaining'] as int),
    ),
  );
  return OcrQuantityCheck(
    selectedCount: selected.length,
    remainingCapacity: capacity,
    excessCount: excess,
    shortfallCount: excess > 0 ? 0 : math.max(0, capacity - selected.length),
    stationExcesses: excesses,
  );
}

bool ocrIntakeClosed(
  String drawDate,
  String? cutoff,
  int buffer, {
  DateTime? now,
}) {
  final today = now ?? DateTime.now();
  if (ocrDate(drawDate) != DateFormat('yyyy-MM-dd').format(today) ||
      cutoff == null ||
      buffer <= 0)
    return false;
  final parts = cutoff.split(':');
  if (parts.length < 2) return false;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return false;
  return !today.isBefore(
    DateTime(
      today.year,
      today.month,
      today.day,
      hour,
      minute,
    ).subtract(Duration(minutes: buffer)),
  );
}

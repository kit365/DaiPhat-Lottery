import '../../../shared/network/api_exception.dart';

const ocrUnavailable =
    'Dịch vụ nhận diện vé (OCR) hiện đang gián đoạn hoặc chưa sẵn sàng kết nối. Vui lòng thử lại sau giây lát hoặc liên hệ quản trị viên.';
const ocrRateLimit =
    'Dịch vụ nhận diện vé đang bận xử lý nhiều yêu cầu cùng lúc. Vui lòng đợi khoảng 15–30 giây rồi thực hiện lại.';
const ocrTimeout =
    'Quét OCR mất quá nhiều thời gian (ảnh nhiều vé hoặc xử lý AI chậm). Vui lòng đợi 10–20 giây rồi quét lại từng ảnh, hoặc tách ảnh nhiều vé thành ảnh riêng.';
const ocrTooHeavy =
    'Ảnh quá nặng so với giới hạn tải lên / OCR. Vui lòng chụp gần hơn, ít nền hơn, hoặc giảm độ phân giải rồi quét lại.';
const ocrSoftFail =
    'Không thể đọc rõ thông tin vé từ ảnh này. Vui lòng kiểm tra lại ảnh (đủ sáng, không bị che) hoặc nhập thông tin thủ công.';

bool _contains(String text, List<String> terms) =>
    terms.any(text.toLowerCase().contains);
bool isOcrLegacyFallback(String text) => _contains(text, [
  'ocr local',
  'chuyển sang ocr',
  'legacy',
  'tạm nghỉ sau khi hết hạn mức',
  'hạn mức quét ai',
  'hệ thống dùng ocr',
]);
bool isOcrRateLimit(String text) =>
    !_contains(text, [
      'hạn mức token',
      'ocr local',
      'chuyển sang ocr',
      'quota/token',
    ]) &&
    _contains(text, ['rate limit', 'quá tải', 'http 429', 'otpm']);
bool isOcrTechnical(String text) => _contains(text, [
  'i/o error',
  'connection refused',
  'connect to http',
  'resourceaccessexception',
  'ticket-vision',
  '8090',
  'lt_122',
  'getsockopt',
  'status code 502',
  'status code 503',
  'status code 504',
  'failed to fetch',
  'network error',
  'econnrefused',
  'enotfound',
  'không thể kết nối đến máy chủ',
]);
bool isOcrBusy(String text) => _contains(text, [
  'phản hồi quá chậm',
  'đang bận',
  'timed out',
  'timeout',
  'hết thời gian chờ',
]);
bool isOcrTimeout(String text) =>
    isOcrBusy(text) ||
    _contains(text, [
      'mất quá nhiều thời gian',
      'quá thời gian chờ',
      'status code 504',
      'http 504',
      'không kết nối được máy chủ api',
      'kiểm tra backend đang chạy',
    ]);
bool isOcrTooHeavy(String text) => _contains(text, [
  'too large',
  'quá nặng',
  'vượt quá kích thước',
  'vượt quá dung lượng',
  'payload',
  'itpm',
  'token budget',
  'status code 413',
  'http 413',
]);

String formatOcrMessage(String text) {
  const days = {
    'MONDAY': 'Thứ Hai',
    'TUESDAY': 'Thứ Ba',
    'WEDNESDAY': 'Thứ Tư',
    'THURSDAY': 'Thứ Năm',
    'FRIDAY': 'Thứ Sáu',
    'SATURDAY': 'Thứ Bảy',
    'SUNDAY': 'Chủ Nhật',
  };
  for (final entry in days.entries) {
    text = text.replaceAll(
      RegExp('\\b${entry.key}\\b', caseSensitive: false),
      entry.value,
    );
  }
  return text
      .replaceAllMapped(
        RegExp(r'\b(\d{4})-(\d{2})-(\d{2})\b'),
        (m) => '${m[3]}/${m[2]}/${m[1]}',
      )
      .replaceAll(RegExp(r'ngày OCR\s*', caseSensitive: false), 'ngày ')
      .replaceAll(RegExp(r'\(rule\s+[^)]+\)', caseSensitive: false), '')
      .trim();
}

String normalizeOcrError(Object? error) {
  if (error is ApiException) {
    if (error.statusCode == 401 || error.statusCode == 403)
      return error.message;
    if (error.statusCode == 429) return ocrRateLimit;
    if (error.statusCode == 413) return ocrTooHeavy;
    if (error.statusCode == 504) return ocrTimeout;
    if (error.statusCode == 502 || error.statusCode == 503)
      return ocrUnavailable;
  }
  final text = error?.toString().trim() ?? '';
  if (text.isEmpty || isOcrLegacyFallback(text)) return ocrSoftFail;
  if (isOcrRateLimit(text)) return ocrRateLimit;
  if (isOcrTooHeavy(text)) return ocrTooHeavy;
  if (isOcrTimeout(text)) return ocrTimeout;
  if (isOcrTechnical(text)) return ocrUnavailable;
  if (RegExp(
    r'(status code \d+|http \d{3})',
    caseSensitive: false,
  ).hasMatch(text))
    return ocrSoftFail;
  if (RegExp(
    r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]',
    caseSensitive: false,
  ).hasMatch(text))
    return formatOcrMessage(text);
  final ticket = RegExp(
    r'ticket\s*#?\s*(\d+)',
    caseSensitive: false,
  ).firstMatch(text);
  final label = ticket == null ? 'Một vé trong ảnh' : 'Vé #${ticket[1]}';
  const hints = {
    'serial': 'số seri',
    'number': 'dãy số',
    'station': 'tên đài',
    'date|draw': 'ngày quay',
    'price|ticket\\s*type': 'mệnh giá',
    'batch': 'mã lô phát hành',
  };
  String? field;
  for (final e in hints.entries) {
    if (RegExp(e.key, caseSensitive: false).hasMatch(text)) {
      field = e.value;
      break;
    }
  }
  if (RegExp(
    r'cover|obscur|overlap|hidden|not clearly|unreadable|blur|glare|cut\s*off',
    caseSensitive: false,
  ).hasMatch(text)) {
    return '$label: ${field ?? 'một số thông tin'} bị che hoặc không rõ. Hãy tách các vé chồng nhau hoặc chụp lại gần hơn, rồi quét lại.';
  }
  if (RegExp(
    r'no ticket|not detect|could not find',
    caseSensitive: false,
  ).hasMatch(text))
    return 'Không phát hiện được vé trong ảnh. Vui lòng chụp rõ toàn bộ tờ vé (đủ ánh sáng, không bị cắt) rồi quét lại.';
  if (RegExp(
    r'model|unavailable|not_found|groq',
    caseSensitive: false,
  ).hasMatch(text))
    return 'Model AI đọc vé hiện không khả dụng. Vui lòng kiểm tra cấu hình GROQ_VISION_MODEL hoặc thử lại sau.';
  if (RegExp(r'[A-Za-z]{4,}').hasMatch(text))
    return '$label: nhận diện chưa đầy đủ. Vui lòng kiểm tra ảnh hoặc nhập thủ công các trường còn thiếu.';
  return formatOcrMessage(text);
}

List<String> normalizeOcrWarnings(List<String> warnings) {
  final out = <String>{};
  for (final warning in warnings) {
    if (warning.trim().isNotEmpty && !isOcrLegacyFallback(warning))
      out.add(normalizeOcrError(warning));
  }
  return [
    for (final priority in [
      ocrUnavailable,
      ocrTooHeavy,
      ocrTimeout,
      ocrRateLimit,
    ])
      if (out.remove(priority)) priority,
    ...out,
  ];
}

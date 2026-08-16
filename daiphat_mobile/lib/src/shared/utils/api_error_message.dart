/// Đổi thông báo lỗi kỹ thuật từ API sang câu dễ hiểu cho người dùng.
String toUserFacingApiMessage(Object error) {
  final raw = error
      .toString()
      .replaceFirst(RegExp(r'^Exception:\s*'), '')
      .replaceFirst(RegExp(r'^ApiException:\s*'), '')
      .trim();

  if (raw.isEmpty) {
    return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }

  final ticketStatusMatch = RegExp(
    r'[Vv]e\s+so\s+#?(\d+)\s+dang\s+o\s+trang\s+thai\s+(\w+)',
    caseSensitive: false,
  ).firstMatch(raw);

  if (ticketStatusMatch != null) {
    final ticketId = ticketStatusMatch.group(1);
    final status = ticketStatusMatch.group(2)?.toUpperCase();
    return _ticketUnavailableMessage(ticketId: ticketId, status: status);
  }

  // Biến thể có dấu / Unicode nếu BE đổi format sau này.
  final unicodeMatch = RegExp(
    r'[Vv]é\s+số\s+#?(\d+).{0,40}trạng\s*thái\s+(\w+)',
    caseSensitive: false,
  ).firstMatch(raw);
  if (unicodeMatch != null) {
    return _ticketUnavailableMessage(
      ticketId: unicodeMatch.group(1),
      status: unicodeMatch.group(2)?.toUpperCase(),
    );
  }

  if (RegExp(r'\bEXPIRED\b').hasMatch(raw) &&
      RegExp(r'(vé|ticket|trang thai|trạng thái)', caseSensitive: false)
          .hasMatch(raw)) {
    return 'Vé đã chọn đã hết hạn bán nên không thể đặt mua. Vui lòng chọn vé khác.';
  }

  if (RegExp(r'\bSOLD_OUT\b').hasMatch(raw)) {
    return 'Vé đã chọn đã hết hàng. Vui lòng chọn vé khác.';
  }

  if (RegExp(r'\bIMPORTING\b').hasMatch(raw)) {
    return 'Vé đã chọn chưa sẵn sàng bán. Vui lòng chọn vé khác.';
  }

  if (raw.contains('Birth year is required') || raw.contains('FRT_001')) {
    return 'Vui lòng nhập ngày sinh để gieo quẻ.';
  }
  if (raw.contains('Birth year is invalid') || raw.contains('FRT_002')) {
    return 'Ngày sinh không hợp lệ.';
  }
  if (raw.contains('No sellable ticket endings') || raw.contains('FRT_003')) {
    return 'Hôm nay chưa có đuôi vé để gieo quẻ. Vui lòng thử lại sau.';
  }

  return raw;
}

String _ticketUnavailableMessage({String? ticketId, String? status}) {
  final label =
      (ticketId != null && ticketId.isNotEmpty) ? 'Vé đã chọn' : 'Vé';

  switch (status) {
    case 'EXPIRED':
      return '$label đã hết hạn bán nên không thể đặt mua. Vui lòng chọn vé khác.';
    case 'SOLD_OUT':
      return '$label đã hết hàng. Vui lòng chọn vé khác.';
    case 'IMPORTING':
      return '$label chưa sẵn sàng bán. Vui lòng chọn vé khác.';
    case 'IN_STOCK':
      return '$label hiện chưa thể mua. Vui lòng thử lại hoặc chọn vé khác.';
    default:
      return '$label hiện không thể đặt mua. Vui lòng chọn vé khác.';
  }
}

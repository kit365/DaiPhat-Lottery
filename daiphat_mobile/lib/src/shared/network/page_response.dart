class PageResponse<T> {
  final List<T> items;
  final int totalPages;
  final int totalElements;
  final int pageSize;
  final int pageNumber;
  final bool isLast;
  final Map<String, int> statusCounts;

  PageResponse({
    required this.items,
    required this.totalPages,
    required this.totalElements,
    required this.pageSize,
    required this.pageNumber,
    this.isLast = true,
    this.statusCounts = const {},
  });

  bool get hasMore => !isLast;

  factory PageResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromJsonT,
  ) {
    final source = _asStringKeyedMap(json['data']) ?? json;

    final rawItems =
        source['items'] ?? source['content'] ?? source['recordList'];
    final List<dynamic> itemsJson = rawItems is List ? rawItems : const [];
    final List<T> items = itemsJson.map(fromJsonT).toList();

    final pagination = _asStringKeyedMap(source['pagination']);
    final rawCounts = _asStringKeyedMap(source['statusCounts']);

    final pageSize = _readInt(
      source['pageSize'] ?? pagination?['limit'] ?? pagination?['size'],
      fallback: items.isEmpty ? 15 : items.length,
    );
    final totalElements = _readInt(
      source['totalElements'] ??
          pagination?['totalRecords'] ??
          pagination?['totalElements'] ??
          pagination?['total'],
      fallback: items.length,
    );
    final pageNumber = _readInt(
      source['pageNumber'] ??
          source['currentPage'] ??
          pagination?['currentPage'] ??
          pagination?['page'],
      fallback: 1,
    ).clamp(1, 1 << 30);

    final totalPagesFromApi = _readInt(
      source['totalPages'] ?? pagination?['totalPages'],
      fallback: 0,
    );
    final totalPages = totalPagesFromApi > 0
        ? totalPagesFromApi
        : (pageSize > 0 && totalElements > 0
            ? ((totalElements + pageSize - 1) ~/ pageSize)
            : (items.isEmpty ? 0 : 1));

    final explicitIsLast = _readBool(
      pagination?['isLast'] ?? pagination?['last'] ?? source['isLast'],
    );
    final isLast = explicitIsLast ??
        (totalPages <= 0 || pageNumber >= totalPages || items.length < pageSize);

    return PageResponse<T>(
      statusCounts: rawCounts == null
          ? const {}
          : rawCounts.map(
              (key, value) =>
                  MapEntry(key, int.tryParse(value.toString()) ?? 0),
            ),
      items: items,
      totalPages: totalPages <= 0 ? 1 : totalPages,
      totalElements: totalElements,
      pageSize: pageSize <= 0 ? 15 : pageSize,
      pageNumber: pageNumber,
      isLast: isLast,
    );
  }

  /// Dio/json đôi khi trả `Map<dynamic, dynamic>` — không dùng `is Map<String, dynamic>`.
  static Map<String, dynamic>? _asStringKeyedMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return null;
  }

  static int _readInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value.trim()) ?? fallback;
    return fallback;
  }

  static bool? _readBool(dynamic value) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1') return true;
      if (normalized == 'false' || normalized == '0') return false;
    }
    return null;
  }
}

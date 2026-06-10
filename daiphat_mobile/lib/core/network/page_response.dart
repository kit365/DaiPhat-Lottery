class PageResponse<T> {
  final List<T> items;
  final int totalPages;
  final int totalElements;
  final int pageSize;
  final int pageNumber;

  PageResponse({
    required this.items,
    required this.totalPages,
    required this.totalElements,
    required this.pageSize,
    required this.pageNumber,
  });

  factory PageResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromJsonT,
  ) {
    // If nested in 'data', unwrap it
    final source = json.containsKey('data') && json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

    final List<dynamic> itemsJson = source['items'] ?? source['content'] ?? source['recordList'] ?? [];
    final List<T> items = itemsJson.map((item) => fromJsonT(item)).toList();

    final pagination = source['pagination'] as Map<String, dynamic>?;

    return PageResponse<T>(
      items: items,
      totalPages: source['totalPages'] ?? pagination?['totalPages'] ?? 1,
      totalElements: source['totalElements'] ?? pagination?['totalRecords'] ?? items.length,
      pageSize: source['pageSize'] ?? pagination?['limit'] ?? items.length,
      pageNumber: source['pageNumber'] ?? source['currentPage'] ?? pagination?['currentPage'] ?? 1,
    );
  }
}

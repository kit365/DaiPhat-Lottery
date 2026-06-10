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

    final pagination = source['pagination'] as Map<String, dynamic>?;
    final List<dynamic> itemsJson =
        source['recordList'] ?? source['items'] ?? source['content'] ?? [];
    final List<T> items = itemsJson.map((item) => fromJsonT(item)).toList();

    return PageResponse<T>(
      items: items,
      totalPages: pagination?['totalPages'] ?? source['totalPages'] ?? 1,
      totalElements: pagination?['totalRecords'] ?? source['totalElements'] ?? items.length,
      pageSize: pagination?['limit'] ?? source['pageSize'] ?? items.length,
      pageNumber: pagination?['currentPage'] ?? source['pageNumber'] ?? source['currentPage'] ?? 1,
    );
  }
}

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

    final List<dynamic> itemsJson = source['items'] ?? source['content'] ?? [];
    final List<T> items = itemsJson.map((item) => fromJsonT(item)).toList();

    return PageResponse<T>(
      items: items,
      totalPages: source['totalPages'] ?? 1,
      totalElements: source['totalElements'] ?? items.length,
      pageSize: source['pageSize'] ?? items.length,
      pageNumber: source['pageNumber'] ?? source['currentPage'] ?? 1,
    );
  }
}

class PaginationMeta {
  final int totalRecords;
  final int totalPages;
  final int currentPage;
  final int limit;
  final bool isLast;

  const PaginationMeta({
    required this.totalRecords,
    required this.totalPages,
    required this.currentPage,
    required this.limit,
    required this.isLast,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      totalRecords: json['totalRecords'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 0,
      currentPage: json['currentPage'] as int? ?? 1,
      limit: json['limit'] as int? ?? 10,
      isLast: json['isLast'] as bool? ?? true,
    );
  }
}

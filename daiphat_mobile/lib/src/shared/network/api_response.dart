class ApiResponse<T> {
  final bool isSuccess;
  final String message;
  final T? data;

  ApiResponse({
    required this.isSuccess,
    required this.message,
    this.data,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json)? fromJsonT,
  ) {
    // Determine success from either 'isSuccess' or 'success' fields.
    final rawSuccess = json.containsKey('isSuccess')
        ? json['isSuccess']
        : json['success'];
    final bool success = rawSuccess is bool
        ? rawSuccess
        : rawSuccess == null
            ? false
            : rawSuccess == true ||
                rawSuccess == 1 ||
                rawSuccess.toString().toLowerCase() == 'true';
    
    // Parse message
    final String msg = json['message']?.toString() ?? '';

    // Some APIs wrap data in a nested "data" object, e.g. { data: { data: ... } }
    // Let's normalize it if needed, but usually the caller passes the raw JSON data node.
    // If the top-level response has 'data', pass it to fromJsonT.
    T? parsedData;
    if (json.containsKey('data') && json['data'] != null && fromJsonT != null) {
      // In some cases, data itself is a primitive (like a string token) or a list.
      parsedData = fromJsonT(json['data']);
    } else if (fromJsonT != null) {
      // Sometimes the whole response is the object itself (not wrapped in data).
      parsedData = fromJsonT(json);
    }

    return ApiResponse<T>(
      isSuccess: success,
      message: msg,
      data: parsedData,
    );
  }
}

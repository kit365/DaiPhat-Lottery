import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';

/// Trạng thái của yêu cầu trả thưởng (đồng bộ BE / FE web).
enum PrizePayoutRequestStatus {
  pending('PENDING', 'Cần xử lý'),
  approved('APPROVED', 'Đã duyệt'),
  completed('COMPLETED', 'Đã chuyển'),
  rejected('REJECTED', 'Từ chối'),
  manualResolution('MANUAL_RESOLUTION', 'Cần xử lý tại đại lý'),
  cancelled('CANCELLED', 'Đã hủy');

  final String value;
  final String label;
  const PrizePayoutRequestStatus(this.value, this.label);

  static PrizePayoutRequestStatus fromValue(String? value) {
    return PrizePayoutRequestStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => PrizePayoutRequestStatus.pending,
    );
  }

  Color get bgColor {
    switch (this) {
      case PrizePayoutRequestStatus.pending:
        return const Color(0xFFFFF9F3);
      case PrizePayoutRequestStatus.approved:
        return const Color(0xFFEFF8FF);
      case PrizePayoutRequestStatus.completed:
        return const Color(0xFFE4F8ED);
      case PrizePayoutRequestStatus.rejected:
        return const Color(0xFFFFF4F4);
      case PrizePayoutRequestStatus.manualResolution:
        return const Color(0xFFFFF5F5);
      case PrizePayoutRequestStatus.cancelled:
        return const Color(0xFFF4F6F8);
    }
  }

  Color get textColor {
    switch (this) {
      case PrizePayoutRequestStatus.pending:
        return const Color(0xFFB76E00);
      case PrizePayoutRequestStatus.approved:
        return const Color(0xFF175CD3);
      case PrizePayoutRequestStatus.completed:
        return const Color(0xFF1CA75A);
      case PrizePayoutRequestStatus.rejected:
        return const Color(0xFFEE1314);
      case PrizePayoutRequestStatus.manualResolution:
        return const Color(0xFFC62828);
      case PrizePayoutRequestStatus.cancelled:
        return const Color(0xFF637381);
    }
  }
}

class PrizePayoutRequestResponse {
  final int id;
  final String requestCode;
  final String? orderId;
  final String? orderCode;
  final int? orderDetailId;
  final int? serialId;
  final String? serialNumber;
  final String? numbers;
  final String? stationName;
  final String? drawDate;
  final String? prizeCode;
  final String? prizeDisplayName;
  final int grossAmount;
  final int? taxAmount;
  final int? commissionAmount;
  final int? netAmount;
  final String? bankName;
  final String? bankAccountNumber;
  final String? accountHolderName;
  final PrizePayoutRequestStatus status;
  final int rejectCount;
  final int maxOnlineRejectRetry;
  final bool onlineClaimLocked;
  final String? rejectReason;
  final String? transferEvidenceUrl;
  final String? serialStatus;
  final String? payoutState;
  final String? createdAt;
  final String? updatedAt;
  final String? completedAt;

  const PrizePayoutRequestResponse({
    required this.id,
    required this.requestCode,
    required this.grossAmount,
    required this.status,
    this.orderId,
    this.orderCode,
    this.orderDetailId,
    this.serialId,
    this.serialNumber,
    this.numbers,
    this.stationName,
    this.drawDate,
    this.prizeCode,
    this.prizeDisplayName,
    this.taxAmount,
    this.commissionAmount,
    this.netAmount,
    this.bankName,
    this.bankAccountNumber,
    this.accountHolderName,
    this.rejectCount = 0,
    this.maxOnlineRejectRetry = 3,
    this.onlineClaimLocked = false,
    this.rejectReason,
    this.transferEvidenceUrl,
    this.serialStatus,
    this.payoutState,
    this.createdAt,
    this.updatedAt,
    this.completedAt,
  });

  factory PrizePayoutRequestResponse.fromJson(Map<String, dynamic> json) {
    return PrizePayoutRequestResponse(
      id: json['id'] as int? ?? 0,
      requestCode: json['requestCode']?.toString() ?? '',
      orderId: json['orderId']?.toString(),
      orderCode: json['orderCode']?.toString(),
      orderDetailId: json['orderDetailId'] as int?,
      serialId: json['serialId'] as int?,
      serialNumber: json['serialNumber']?.toString(),
      numbers: json['numbers']?.toString(),
      stationName: json['stationName']?.toString(),
      drawDate: json['drawDate']?.toString(),
      prizeCode: json['prizeCode']?.toString(),
      prizeDisplayName: json['prizeDisplayName']?.toString(),
      grossAmount: _parseInt(json['grossAmount']),
      taxAmount: _parseNullableInt(json['taxAmount']),
      commissionAmount: _parseNullableInt(json['commissionAmount']),
      netAmount: _parseNullableInt(json['netAmount']),
      bankName: json['bankName']?.toString(),
      bankAccountNumber: json['bankAccountNumber']?.toString(),
      accountHolderName: json['accountHolderName']?.toString(),
      status: PrizePayoutRequestStatus.fromValue(json['status']?.toString()),
      rejectCount: json['rejectCount'] as int? ?? 0,
      maxOnlineRejectRetry: json['maxOnlineRejectRetry'] as int? ?? 3,
      onlineClaimLocked: json['onlineClaimLocked'] as bool? ?? false,
      rejectReason: json['rejectReason']?.toString(),
      transferEvidenceUrl: json['transferEvidenceUrl']?.toString(),
      serialStatus: json['serialStatus']?.toString(),
      payoutState: json['payoutState']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
      completedAt: json['completedAt']?.toString(),
    );
  }
}

/// Trang danh sách yêu cầu trả thưởng kèm số đếm theo trạng thái.
class PrizePayoutPageResult {
  final List<PrizePayoutRequestResponse> records;
  final PaginationMeta pagination;
  final Map<String, int> statusCounts;

  const PrizePayoutPageResult({
    required this.records,
    required this.pagination,
    required this.statusCounts,
  });

  factory PrizePayoutPageResult.fromJson(Map<String, dynamic> json) {
    final list = json['recordList'] as List<dynamic>? ?? const [];
    return PrizePayoutPageResult(
      records: list
          .map((e) =>
              PrizePayoutRequestResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationMeta.fromJson(
        json['pagination'] as Map<String, dynamic>? ?? {},
      ),
      statusCounts: _parseCounts(json['statusCounts']),
    );
  }
}

Map<String, int> _parseCounts(dynamic value) {
  if (value is! Map) return const {};
  final result = <String, int>{};
  value.forEach((key, v) {
    result[key.toString()] = _parseInt(v);
  });
  return result;
}

int _parseInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is double) return value.toInt();
  return int.tryParse(value.toString()) ?? 0;
}

int? _parseNullableInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is double) return value.toInt();
  return int.tryParse(value.toString());
}

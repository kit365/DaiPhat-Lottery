import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/refund_service.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';

/// Kết quả chọn tham chiếu khi tạo khiếu nại.
class ComplaintRefSelection {
  final String id;
  final String displayLabel;

  const ComplaintRefSelection({required this.id, required this.displayLabel});
}

Future<ComplaintRefSelection?> showComplaintRefPicker({
  required BuildContext context,
  required TicketRefType refType,
  required OrderService orderService,
  required RefundService refundService,
  required PrizePayoutService prizePayoutService,
  String? selectedId,
}) {
  return showModalBottomSheet<ComplaintRefSelection>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surfacePrimary,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _ComplaintRefPickerSheet(
      refType: refType,
      orderService: orderService,
      refundService: refundService,
      prizePayoutService: prizePayoutService,
      selectedId: selectedId,
    ),
  );
}

class _ComplaintRefPickerSheet extends StatefulWidget {
  final TicketRefType refType;
  final OrderService orderService;
  final RefundService refundService;
  final PrizePayoutService prizePayoutService;
  final String? selectedId;

  const _ComplaintRefPickerSheet({
    required this.refType,
    required this.orderService,
    required this.refundService,
    required this.prizePayoutService,
    this.selectedId,
  });

  @override
  State<_ComplaintRefPickerSheet> createState() =>
      _ComplaintRefPickerSheetState();
}

class _ComplaintRefPickerSheetState extends State<_ComplaintRefPickerSheet> {
  bool _loading = true;
  String? _error;
  List<_PickerItem> _items = const [];

  String _money(int amount) => AppFormatters.formatCurrency(amount);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      switch (widget.refType) {
        case TicketRefType.order:
          final page = await widget.orderService.getMyOrders(
            page: 1,
            size: 100,
          );
          _items = page.records.map(_mapOrder).toList();
          break;
        case TicketRefType.refundRequest:
          final page = await widget.refundService.getMyRefunds(
            page: 1,
            limit: 100,
          );
          _items = page.records.map(_mapRefund).toList();
          break;
        case TicketRefType.prizeClaim:
          final page = await widget.prizePayoutService.getMyRequests(
            page: 1,
            limit: 100,
          );
          _items = page.records.map(_mapPrize).toList();
          break;
        case TicketRefType.paymentTransaction:
          _items = const [];
          break;
      }
      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  _PickerItem _mapOrder(OrderResponse order) {
    final eligible = _orderEligible(order);
    final shortId = order.id.length > 8
        ? order.id.substring(0, 8).toUpperCase()
        : order.id.toUpperCase();
    final status = OrderStatus.fromValue(order.status);
    return _PickerItem(
      id: order.id,
      title: '#$shortId',
      subtitle: '${_money(order.totalAmount)} · ${status.label}',
      eligible: eligible.$1,
      reason: eligible.$2,
    );
  }

  _PickerItem _mapRefund(RefundRequestResponse refund) {
    final eligible = _refundEligible(refund);
    return _PickerItem(
      id: '${refund.id}',
      title: '#${refund.id}',
      subtitle: '${_money(refund.refundAmount)} · ${refund.status.label}',
      eligible: eligible.$1,
      reason: eligible.$2,
    );
  }

  _PickerItem _mapPrize(PrizePayoutRequestResponse payout) {
    final eligible = _prizeEligible(payout);
    final amount = payout.netAmount ?? payout.grossAmount;
    return _PickerItem(
      id: '${payout.id}',
      title: payout.requestCode,
      subtitle: '${_money(amount)} · ${payout.status.label}',
      eligible: eligible.$1,
      reason: eligible.$2,
    );
  }

  (bool, String?) _orderEligible(OrderResponse order) {
    if (order.status == OrderStatus.pendingPayment.value) {
      return (false, 'Chưa thanh toán');
    }
    if (order.status == OrderStatus.cancelled.value) {
      return (false, 'Đơn đã huỷ');
    }
    return (true, null);
  }

  (bool, String?) _refundEligible(RefundRequestResponse refund) {
    const waitHours = 48;
    const graceDays = 7;
    final slow =
        refund.status == RefundRequestStatus.waitingForInfo ||
        refund.status == RefundRequestStatus.readyToPay;
    if (slow) {
      final updated = DateTime.tryParse(refund.updatedAt);
      if (updated == null ||
          DateTime.now().difference(updated).inHours < waitHours) {
        return (false, 'Chưa đến hạn');
      }
      return (true, null);
    }
    if (refund.status == RefundRequestStatus.paid ||
        refund.status == RefundRequestStatus.transferred) {
      final updated = DateTime.tryParse(refund.updatedAt);
      if (updated != null &&
          DateTime.now().difference(updated).inDays > graceDays) {
        return (false, 'Đã quá hạn');
      }
      return (true, null);
    }
    if (refund.status == RefundRequestStatus.manualResolution) {
      return (false, 'Xử lý thủ công');
    }
    return (false, 'Không hỗ trợ');
  }

  (bool, String?) _prizeEligible(PrizePayoutRequestResponse payout) {
    const waitHours = 48;
    const graceDays = 15;
    final slow =
        payout.status == PrizePayoutRequestStatus.pending ||
        payout.status == PrizePayoutRequestStatus.approved;
    if (slow) {
      final updated = DateTime.tryParse(payout.updatedAt ?? '');
      if (updated == null ||
          DateTime.now().difference(updated).inHours < waitHours) {
        return (false, 'Chưa đến hạn');
      }
      return (true, null);
    }
    if (payout.status == PrizePayoutRequestStatus.completed) {
      final anchor = DateTime.tryParse(
        payout.completedAt ?? payout.updatedAt ?? '',
      );
      if (anchor != null &&
          DateTime.now().difference(anchor).inDays > graceDays) {
        return (false, 'Đã quá hạn');
      }
      return (true, null);
    }
    if (payout.status == PrizePayoutRequestStatus.manualResolution) {
      return (false, 'Xử lý thủ công');
    }
    return (false, 'Không hỗ trợ');
  }

  String get _title {
    switch (widget.refType) {
      case TicketRefType.order:
        return 'Chọn đơn hàng';
      case TicketRefType.refundRequest:
        return 'Chọn yêu cầu hoàn tiền';
      case TicketRefType.prizeClaim:
        return 'Chọn yêu cầu trả thưởng';
      case TicketRefType.paymentTransaction:
        return 'Chọn giao dịch';
    }
  }

  String get _emptyText {
    switch (widget.refType) {
      case TicketRefType.order:
        return 'Bạn chưa có đơn hàng nào.';
      case TicketRefType.refundRequest:
        return 'Bạn chưa có yêu cầu hoàn tiền nào.';
      case TicketRefType.prizeClaim:
        return 'Bạn chưa có yêu cầu trả thưởng nào.';
      case TicketRefType.paymentTransaction:
        return 'Không có dữ liệu.';
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.75;
    return SizedBox(
      height: height,
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.borderLight,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _title,
                    style: AppTypography.mainWith(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: AppTypography.mainWith(color: AppColors.textMuted),
            ),
            TextButton(
              onPressed: _load,
              child: Text(
                'Thử lại',
                style: AppTypography.mainWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      );
    }
    if (_items.isEmpty) {
      return Center(
        child: Text(
          _emptyText,
          style: AppTypography.mainWith(
            fontSize: 14,
            color: AppColors.textMuted,
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = _items[index];
        final selected = item.id == widget.selectedId;
        return InkWell(
          onTap: item.eligible
              ? () => Navigator.pop(
                  context,
                  ComplaintRefSelection(id: item.id, displayLabel: item.title),
                )
              : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: !item.eligible
                  ? AppColors.surfaceSlate50
                  : selected
                  ? AppColors.statusErrorSurface
                  : AppColors.surfacePrimary,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected ? AppColors.primary : AppColors.borderLight,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: AppTypography.mainWith(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: item.eligible
                              ? AppColors.textMain
                              : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.subtitle,
                        style: AppTypography.mainWith(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                      if (!item.eligible && item.reason != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          item.reason!,
                          style: AppTypography.mainWith(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.error,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (item.eligible)
                  Icon(
                    selected
                        ? Icons.check_circle_rounded
                        : Icons.chevron_right_rounded,
                    color: selected
                        ? AppColors.primary
                        : AppColors.contentPlaceholderStrong,
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PickerItem {
  final String id;
  final String title;
  final String subtitle;
  final bool eligible;
  final String? reason;

  const _PickerItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.eligible,
    this.reason,
  });
}

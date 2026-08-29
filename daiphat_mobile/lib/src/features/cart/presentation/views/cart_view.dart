import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:intl/intl.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../../models/cart_item_model.dart';
import '../../providers/cart_provider.dart';
import '../../../tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';
import '../../../tickets/presentation/views/buy_ticket_view.dart';
import '../../../tickets/utils/sellable_draw_date.dart';

class CartView extends ConsumerStatefulWidget {
  const CartView({super.key});

  @override
  ConsumerState<CartView> createState() => _CartViewState();
}

class _CartViewState extends ConsumerState<CartView> {
  bool _isSelectionMode = false;
  final Set<int> _selectedIndexes = <int>{};
  final Set<int> _checkoutSelectedIndexes = <int>{};
  bool _hasNotifiedExpiredItems = false;

  @override
  void initState() {
    super.initState();
    // Rời phiên mua ngay (nếu còn) — giỏ chính phải hiển thị đầy đủ.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(buyNowItemsProvider.notifier).clear();
      _notifyExpiredItems();
    });
  }

  void _openDetail(BuildContext context, CartItemData item) {
    final listItem = LotteryTicketListItem(
      id: item.lotteryTicketId,
      displayName: item.province,
      code: item.number,
      shortName: item.logoText,
      dateLabel: item.dateLabel,
      dayFilter: item.dateLabel.contains('nay')
          ? TicketDayFilter.today
          : TicketDayFilter.tomorrow,
      drawDate: DateTime.tryParse(item.drawDateIso ?? '') ?? DateTime.now(),
      status: 'reserved',
      statusDisplayName: 'Đang giữ vé',
      stationName: item.kyHieu,
      imageUrl: item.ticketImageUrl,
    );
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TicketDetailModalSheet(ticket: listItem),
    );
  }

  void _removeItem(CartItemData item, int index) {
    ref.read(cartProvider.notifier).removeAtIndex(index);
    setState(() {
      final remainingSelections = _checkoutSelectedIndexes
          .where((selectedIndex) => selectedIndex != index)
          .map(
            (selectedIndex) =>
                selectedIndex > index ? selectedIndex - 1 : selectedIndex,
          )
          .toSet();
      _checkoutSelectedIndexes
        ..clear()
        ..addAll(remainingSelections);
    });

    AppToast.show(
      'Đã xóa vé ${item.number} khỏi giỏ hàng',
      actionLabel: 'Hoàn tác',
      onAction: () {
        ref.read(cartProvider.notifier).insertItem(index, item);
      },
    );
  }

  void _toggleSelectionMode() {
    setState(() {
      _isSelectionMode = !_isSelectionMode;
      if (!_isSelectionMode) {
        _selectedIndexes.clear();
      }
    });
  }

  void _toggleItemSelection(int index) {
    setState(() {
      if (_selectedIndexes.contains(index)) {
        _selectedIndexes.remove(index);
      } else {
        _selectedIndexes.add(index);
      }
    });
  }

  void _toggleCheckoutSelection(int index) {
    final items = ref.read(cartProvider);
    if (index < 0 || index >= items.length) return;
    if (_isPurchaseExpired(items[index])) {
      AppToast.error('Vé này đã hết hạn mua. Vui lòng xóa khỏi giỏ hàng.');
      return;
    }
    setState(() {
      if (_checkoutSelectedIndexes.contains(index)) {
        _checkoutSelectedIndexes.remove(index);
      } else {
        _checkoutSelectedIndexes.add(index);
      }
    });
  }

  void _toggleSelectAll(int itemCount) {
    setState(() {
      if (_selectedIndexes.length == itemCount) {
        _selectedIndexes.clear();
      } else {
        _selectedIndexes
          ..clear()
          ..addAll(List.generate(itemCount, (i) => i));
      }
    });
  }

  void _notifyExpiredItems() {
    if (_hasNotifiedExpiredItems) return;
    final expiredCount = ref
        .read(cartProvider)
        .where(_isPurchaseExpired)
        .length;
    if (expiredCount == 0) return;
    _hasNotifiedExpiredItems = true;
    AppToast.error(
      'Có $expiredCount vé đã hết hạn mua. Vui lòng xóa vé hết hạn trước khi thanh toán.',
    );
  }

  Future<void> _confirmRemoveExpiredItems() async {
    final items = ref.read(cartProvider);
    final expiredIndexes = <int>[];
    for (var i = 0; i < items.length; i++) {
      if (_isPurchaseExpired(items[i])) {
        expiredIndexes.add(i);
      }
    }
    if (expiredIndexes.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Xóa vé hết hạn',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Text(
          'Bạn có muốn xóa ${expiredIndexes.length} vé đã hết hạn mua khỏi giỏ hàng không?',
          style: const TextStyle(
            fontSize: 14,
            height: 1.4,
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Hủy',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Xóa',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    ref.read(cartProvider.notifier).removeAtIndexes(expiredIndexes);
    setState(() {
      _selectedIndexes.clear();
      _checkoutSelectedIndexes.clear();
    });
    AppToast.show('Đã xóa ${expiredIndexes.length} vé hết hạn khỏi giỏ hàng');
  }

  bool _isPurchaseExpired(CartItemData item) {
    final iso = item.drawDateIso?.trim();
    if (iso == null || iso.isEmpty) return false;
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return false;

    final ticketDate = DateTime(parsed.year, parsed.month, parsed.day);
    final today = SellableDrawDate.todayVn();
    return ticketDate.isBefore(today) ||
        (ticketDate == today && SellableDrawDate.isTodayDrawPassed());
  }

  Future<void> _confirmDeleteSelected() async {
    final count = _selectedIndexes.length;
    if (count == 0) return;

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Xóa sản phẩm',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Text(
          'Bạn có muốn bỏ $count sản phẩm khỏi giỏ hàng không?',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 15,
            fontWeight: FontWeight.w500,
            height: 1.4,
          ),
        ),
        actionsAlignment: MainAxisAlignment.center,
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textSecondary,
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Hủy',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Xóa',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final indexes = _selectedIndexes.toList()..sort();
    ref.read(cartProvider.notifier).removeAtIndexes(indexes);
    setState(() {
      _selectedIndexes.clear();
      _checkoutSelectedIndexes.clear();
      _isSelectionMode = false;
    });
    AppToast.show('Đã xóa $count sản phẩm khỏi giỏ hàng');
  }

  Future<void> _confirmRemoveItem(CartItemData item, int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Xác nhận xóa vé',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Text(
          'Bạn có chắc muốn xóa vé số ${item.number} (${item.province}) khỏi giỏ hàng?',
          style: const TextStyle(
            fontSize: 14,
            height: 1.4,
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Hủy',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Xóa',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      _removeItem(item, index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final ticketCount = ref.watch(cartTicketCountProvider);
    final selectedCheckoutItems = [
      for (var index = 0; index < items.length; index++)
        if (_checkoutSelectedIndexes.contains(index)) items[index],
    ];
    final selectedSubtotal = selectedCheckoutItems.fold<int>(
      0,
      (sum, item) => sum + item.subtotal,
    );
    final selectedTicketCount = selectedCheckoutItems.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );
    final expiredCount = items.where(_isPurchaseExpired).length;
    final hasExpiredItems = expiredCount > 0;
    final selectedExpiredCount = selectedCheckoutItems
        .where(_isPurchaseExpired)
        .length;
    final hasSelectedExpiredItems = selectedExpiredCount > 0;
    final canCheckout =
        selectedCheckoutItems.isNotEmpty && !hasSelectedExpiredItems;

    // Đồng bộ selection khi danh sách thay đổi ngoài chế độ xóa.
    final hasInvalidCheckoutSelection = _checkoutSelectedIndexes.any(
      (index) => index < 0 || index >= items.length,
    );
    if ((!_isSelectionMode && _selectedIndexes.isNotEmpty) ||
        hasInvalidCheckoutSelection) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() {
          if (!_isSelectionMode) _selectedIndexes.clear();
          if (hasInvalidCheckoutSelection) {
            _checkoutSelectedIndexes.removeWhere(
              (index) => index < 0 || index >= items.length,
            );
          }
        });
      });
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text(
          items.isNotEmpty ? 'Giỏ hàng ($ticketCount)' : 'Giỏ hàng',
          style: const TextStyle(
            color: AppColors.ink,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () {
            if (_isSelectionMode) {
              _toggleSelectionMode();
              return;
            }
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go(AppRoute.buyTicket.path);
            }
          },
        ),
        actions: [
          if (items.isNotEmpty)
            IconButton(
              onPressed: _toggleSelectionMode,
              icon: Icon(
                _isSelectionMode
                    ? Icons.close_rounded
                    : Icons.delete_outline_rounded,
                color: AppColors.primary,
                size: 26,
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: items.isEmpty
                ? const _EmptyCartView()
                : RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () async {
                      ref.invalidate(cartProvider);
                    },
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      children: [
                        if (hasExpiredItems) ...[
                          _ExpiredCartNotice(
                            expiredCount: expiredCount,
                            onDeleteAllExpired: _confirmRemoveExpiredItems,
                          ),
                          const SizedBox(height: 12),
                        ],
                        ...items.asMap().entries.map((entry) {
                          final index = entry.key;
                          final item = entry.value;
                          final card = _CartTicketCard(
                            item: item,
                            isExpired: _isPurchaseExpired(item),
                            isSelectionMode: _isSelectionMode,
                            isSelected: _selectedIndexes.contains(index),
                            isCheckoutSelected: _checkoutSelectedIndexes
                                .contains(index),
                            onTap: () {
                              if (_isSelectionMode) {
                                _toggleItemSelection(index);
                              } else {
                                _openDetail(context, item);
                              }
                            },
                            onToggleSelect: () => _toggleItemSelection(index),
                            onToggleCheckout: () =>
                                _toggleCheckoutSelection(index),
                            onQuantityChanged: (qty) {
                              ref
                                  .read(cartProvider.notifier)
                                  .updateQuantityAtIndex(index, qty);
                            },
                            onDelete: () => _confirmRemoveItem(item, index),
                          );
                          return Padding(
                            key: ValueKey(
                              '${item.lotteryTicketId}_${item.number}_$index',
                            ),
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _isSelectionMode
                                ? card
                                : Dismissible(
                                    key: ValueKey(
                                      'dismiss_${item.lotteryTicketId}_$index',
                                    ),
                                    direction: DismissDirection.endToStart,
                                    background: const _DeleteSwipeBackground(),
                                    onDismissed: (_) =>
                                        _removeItem(item, index),
                                    child: card,
                                  ),
                          );
                        }),
                      ],
                    ),
                  ),
          ),
          if (items.isNotEmpty)
            _isSelectionMode
                ? _SelectionBottomBar(
                    allSelected: _selectedIndexes.length == items.length,
                    selectedCount: _selectedIndexes.length,
                    onToggleSelectAll: () => _toggleSelectAll(items.length),
                    onDelete: _confirmDeleteSelected,
                  )
                : _CartBottomBar(
                    ticketCount: selectedTicketCount,
                    subtotal: selectedSubtotal,
                    total: selectedSubtotal,
                    enabled: canCheckout,
                    disabledReason: selectedCheckoutItems.isEmpty
                        ? 'Chọn ít nhất một vé để thanh toán'
                        : hasSelectedExpiredItems
                        ? 'Bỏ chọn hoặc xóa $selectedExpiredCount vé hết hạn để tiếp tục thanh toán'
                        : null,
                    onCheckout: () {
                      ref
                          .read(buyNowItemsProvider.notifier)
                          .start(selectedCheckoutItems);
                      context.pushNamed(AppRoute.checkout.name);
                    },
                  ),
        ],
      ),
    );
  }
}

class _ExpiredCartNotice extends StatelessWidget {
  const _ExpiredCartNotice({
    required this.expiredCount,
    this.onDeleteAllExpired,
  });

  final int expiredCount;
  final VoidCallback? onDeleteAllExpired;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      label: 'Có $expiredCount vé đã hết hạn mua',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF2F1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFECACA), width: 1.2),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppColors.primary, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '$expiredCount vé đã hết hạn mua. Hãy xóa để thanh toán.',
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (onDeleteAllExpired != null) ...[
              const SizedBox(width: 8),
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onDeleteAllExpired,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFFFCA5A5),
                        width: 0.8,
                      ),
                    ),
                    child: const Text(
                      'Xóa hết',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CartTicketCard extends StatelessWidget {
  const _CartTicketCard({
    required this.item,
    required this.isExpired,
    required this.isSelectionMode,
    required this.isSelected,
    required this.isCheckoutSelected,
    required this.onTap,
    required this.onToggleSelect,
    required this.onToggleCheckout,
    required this.onQuantityChanged,
    required this.onDelete,
  });

  final CartItemData item;
  final bool isExpired;
  final bool isSelectionMode;
  final bool isSelected;
  final bool isCheckoutSelected;
  final VoidCallback onTap;
  final VoidCallback onToggleSelect;
  final VoidCallback onToggleCheckout;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isExpired ? const Color(0xFFF9FAFB) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: (isSelectionMode ? isSelected : isCheckoutSelected)
                ? AppColors.primary.withValues(alpha: 0.35)
                : (isExpired ? const Color(0xFFE5E7EB) : const Color(0xFFF1E3E0)),
            width: isExpired ? 1.2 : 1.0,
          ),
          boxShadow: isExpired
              ? const [
                  BoxShadow(
                    color: Color(0x04000000),
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ]
              : const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              if (isSelectionMode) ...[
                GestureDetector(
                  onTap: onToggleSelect,
                  behavior: HitTestBehavior.opaque,
                  child: _SelectionCheckbox(checked: isSelected),
                ),
                const SizedBox(width: 12),
              ] else ...[
                Semantics(
                  button: true,
                  enabled: !isExpired,
                  checked: isCheckoutSelected,
                  label: isExpired
                      ? 'Vé ${item.number} đã hết hạn mua'
                      : 'Chọn vé ${item.number} để thanh toán',
                  child: GestureDetector(
                    onTap: onToggleCheckout,
                    behavior: HitTestBehavior.opaque,
                    child: ExcludeSemantics(
                      child: _SelectionCheckbox(
                        checked: isCheckoutSelected,
                        disabled: isExpired,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              // Left Column: Station tag, Date, 6-digit Number
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        if (isExpired) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: const Color(0xFFFCA5A5),
                                width: 0.8,
                              ),
                            ),
                            child: Text(
                              'HẾT HẠN',
                              style: AppTypography.main(
                                const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFFDC2626),
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                        ],
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2.5,
                            ),
                            decoration: BoxDecoration(
                              color: isExpired
                                  ? const Color(0xFFF3F4F6)
                                  : const Color(0xFFFDE8E5),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.province,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.main(
                                TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isExpired
                                      ? const Color(0xFF6B7280)
                                      : AppColors.primary,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.calendar_month_outlined,
                              size: 12,
                              color: isExpired
                                  ? const Color(0xFF9CA3AF)
                                  : const Color(0xFF8A6D68),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              item.dateLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isExpired
                                    ? const Color(0xFF9CA3AF)
                                    : const Color(0xFF755E59),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.number,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.number(
                        TextStyle(
                          color: isExpired
                              ? const Color(0xFF9CA3AF)
                              : const Color(0xFFC90F1D),
                          fontSize: 28,
                          height: 1,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Right Column: Price & Stepper / Delete action
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _money(item.unitPrice),
                    style: AppTypography.main(
                      TextStyle(
                        fontSize: 14,
                        color: isExpired
                            ? const Color(0xFF9CA3AF)
                            : const Color(0xFF312624),
                        fontWeight: FontWeight.w800,
                        decoration:
                            isExpired ? TextDecoration.lineThrough : null,
                        decorationColor: const Color(0xFF9CA3AF),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (isExpired) ...[
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: onDelete,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(0xFFFECACA),
                              width: 1,
                            ),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.delete_outline_rounded,
                                size: 15,
                                color: Color(0xFFDC2626),
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Xóa',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFDC2626),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ] else ...[
                    _CartQuantityStepper(
                      quantity: item.quantity,
                      maxStock: item.maxStock > 0 ? item.maxStock : 1,
                      enabled: !isSelectionMode,
                      onChanged: onQuantityChanged,
                      onDelete: onDelete,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartQuantityStepper extends StatefulWidget {
  const _CartQuantityStepper({
    required this.quantity,
    required this.maxStock,
    required this.enabled,
    required this.onChanged,
    required this.onDelete,
  });

  final int quantity;
  final int maxStock;
  final bool enabled;
  final ValueChanged<int> onChanged;
  final VoidCallback onDelete;

  @override
  State<_CartQuantityStepper> createState() => _CartQuantityStepperState();
}

class _CartQuantityStepperState extends State<_CartQuantityStepper> {
  bool _showDelete = false;
  Timer? _timer;

  @override
  void didUpdateWidget(covariant _CartQuantityStepper oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.quantity > 1 && _showDelete) {
      _resetDelete();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _resetDelete() {
    _timer?.cancel();
    if (_showDelete && mounted) {
      setState(() => _showDelete = false);
    }
  }

  void _onMinusTap() {
    if (!widget.enabled) return;

    if (widget.quantity > 1) {
      _resetDelete();
      widget.onChanged(widget.quantity - 1);
    } else {
      // Khi số lượng đang là 1:
      if (!_showDelete) {
        // Lần 1: Chuyển nút trừ thành icon xóa đỏ
        setState(() => _showDelete = true);
        _timer?.cancel();
        _timer = Timer(const Duration(seconds: 4), () {
          if (mounted) setState(() => _showDelete = false);
        });
      } else {
        // Lần 2 (khi đang hiện nút xóa): Hiện hộp thoại xác nhận xóa
        _resetDelete();
        widget.onDelete();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectiveMax = widget.maxStock > 0 ? widget.maxStock : 1;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {}, // Isolate tap events from parent card
      child: IntrinsicWidth(
        child: SizedBox(
          height: 44,
          child: Stack(
            children: [
              Positioned(
                top: 6,
                left: 0,
                right: 0,
                bottom: 6,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  decoration: BoxDecoration(
                    color: _showDelete
                        ? const Color(0xFFFFF1F0)
                        : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _showDelete
                          ? const Color(0xFFFCA5A5)
                          : const Color(0xFFCBD5E1),
                    ),
                  ),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _CartStepBtn(
                    icon: _showDelete
                        ? Icons.delete_outline_rounded
                        : Icons.remove_rounded,
                    iconColor: _showDelete
                        ? AppColors.primary
                        : const Color(0xFF1E293B),
                    disabled: !widget.enabled,
                    onTap: _onMinusTap,
                  ),
                  Container(
                    constraints: const BoxConstraints(minWidth: 26),
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    alignment: Alignment.center,
                    child: Text(
                      '${widget.quantity}',
                      style: TextStyle(
                        color: _showDelete ? AppColors.primary : AppColors.ink,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  _CartStepBtn(
                    icon: Icons.add_rounded,
                    disabled:
                        !widget.enabled || widget.quantity >= effectiveMax,
                    iconColor: const Color(0xFF1E293B),
                    onTap: (widget.enabled && widget.quantity < effectiveMax)
                        ? () {
                            _resetDelete();
                            widget.onChanged(widget.quantity + 1);
                          }
                        : null,
                    onDisabledTap: () {
                      AppToast.info(
                        'Vé này chỉ còn $effectiveMax vé trong kho',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartStepBtn extends StatelessWidget {
  const _CartStepBtn({
    required this.icon,
    required this.disabled,
    required this.onTap,
    this.iconColor,
    this.onDisabledTap,
  });

  final IconData icon;
  final bool disabled;
  final VoidCallback? onTap;
  final Color? iconColor;
  final VoidCallback? onDisabledTap;

  @override
  Widget build(BuildContext context) {
    final label = icon == Icons.add_rounded
        ? 'Tăng số lượng'
        : icon == Icons.delete_outline_rounded
        ? 'Xóa vé'
        : 'Giảm số lượng';

    return Semantics(
      button: true,
      enabled: !disabled,
      label: label,
      onTap: disabled ? null : onTap,
      child: ExcludeSemantics(
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: disabled ? onDisabledTap : onTap,
            borderRadius: BorderRadius.circular(6),
            child: SizedBox(
              width: 44,
              height: 44,
              child: Center(
                child: SizedBox(
                  width: 28,
                  height: 32,
                  child: Icon(
                    icon,
                    size: 15,
                    color: disabled
                        ? const Color(0xFF94A3B8)
                        : (iconColor ?? const Color(0xFF1E293B)),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectionCheckbox extends StatelessWidget {
  const _SelectionCheckbox({
    required this.checked,
    this.disabled = false,
  });

  final bool checked;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    if (disabled) {
      return Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFFF3F4F6),
          border: Border.all(
            color: const Color(0xFFD1D5DB),
            width: 1.5,
          ),
        ),
        child: const Icon(
          Icons.block_rounded,
          size: 13,
          color: Color(0xFF9CA3AF),
        ),
      );
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: checked ? AppColors.primary : Colors.white,
        border: Border.all(
          color: checked ? AppColors.primary : const Color(0xFFD1D5DB),
          width: 2,
        ),
      ),
      child: checked
          ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
          : null,
    );
  }
}

class _DeleteSwipeBackground extends StatelessWidget {
  const _DeleteSwipeBackground();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      alignment: Alignment.centerRight,
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Icon(Icons.delete_outline_rounded, color: Colors.white, size: 28),
          SizedBox(height: 6),
          Text(
            'Xóa',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _CartBottomBar extends StatelessWidget {
  const _CartBottomBar({
    required this.ticketCount,
    required this.subtotal,
    required this.total,
    required this.enabled,
    required this.onCheckout,
    this.disabledReason,
  });

  final int ticketCount;
  final int subtotal;
  final int total;
  final bool enabled;
  final VoidCallback onCheckout;
  final String? disabledReason;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 18,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tạm tính ($ticketCount vé)',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _money(subtotal),
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Text(
                      'Phí dịch vụ',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(
                      Icons.info_outline_rounded,
                      size: 14,
                      color: Color(0xFF94A3B8),
                    ),
                  ],
                ),
                Text(
                  _money(0),
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            CustomPaint(
              painter: _DashedLinePainter(color: const Color(0xFFE5E7EB)),
              child: const SizedBox(width: double.infinity, height: 1),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tổng cộng',
                  style: TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                Text(
                  _money(total),
                  style: AppTypography.number(
                    const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w900,
                      fontSize: 24,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (disabledReason != null) ...[
              Text(
                disabledReason!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: enabled ? onCheckout : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFF3B5B2),
                  minimumSize: const Size.fromHeight(54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Tiến hành thanh toán',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectionBottomBar extends StatelessWidget {
  const _SelectionBottomBar({
    required this.allSelected,
    required this.selectedCount,
    required this.onToggleSelectAll,
    required this.onDelete,
  });

  final bool allSelected;
  final int selectedCount;
  final VoidCallback onToggleSelectAll;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 18,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            GestureDetector(
              onTap: onToggleSelectAll,
              behavior: HitTestBehavior.opaque,
              child: Row(
                children: [
                  _SelectionCheckbox(checked: allSelected),
                  const SizedBox(width: 10),
                  const Text(
                    'Chọn tất cả',
                    style: TextStyle(
                      color: AppColors.ink,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: selectedCount > 0 ? onDelete : null,
              icon: const Icon(Icons.delete_outline_rounded, size: 20),
              label: Text(
                selectedCount > 0 ? 'Xóa ($selectedCount)' : 'Xóa',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFFF3B5B2),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  _DashedLinePainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;

    const dashWidth = 5.0;
    const dashSpace = 4.0;
    var x = 0.0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset(x + dashWidth, 0), paint);
      x += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedLinePainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

class _EmptyCartView extends StatelessWidget {
  const _EmptyCartView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: const Color(0xFFF1E3E0)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF1EF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.remove_shopping_cart_outlined,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Giỏ hàng đang trống',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Hãy quay lại danh sách vé để chọn thêm những số đẹp bạn muốn mua.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go(AppRoute.buyTicket.path),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: const Text(
                    'Quay lại mua vé',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _money(int amount) {
  final formatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );
  return formatter.format(amount);
}

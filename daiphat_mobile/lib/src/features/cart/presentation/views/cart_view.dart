import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../../models/cart_item_model.dart';
import '../../providers/cart_provider.dart';
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

  void _removeItem(CartItemData item, int index) {
    ref.read(cartProvider.notifier).removeAtIndex(index);

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
    final expiredCount = ref.read(cartProvider).where(_isPurchaseExpired).length;
    if (expiredCount == 0) return;
    _hasNotifiedExpiredItems = true;
    AppToast.error(
      'Có $expiredCount vé đã hết hạn mua. Vui lòng xóa vé hết hạn trước khi thanh toán.',
    );
  }

  bool _isPurchaseExpired(CartItemData item) {
    final drawDate = _resolveDrawDate(item);
    if (drawDate == null) return false;
    final ticketDate = DateTime(drawDate.year, drawDate.month, drawDate.day);
    final today = SellableDrawDate.todayVn();
    if (ticketDate.isBefore(today)) return true;
    if (_isSameDay(ticketDate, today)) {
      return SellableDrawDate.isTodayDrawPassed();
    }
    return false;
  }

  DateTime? _resolveDrawDate(CartItemData item) {
    final iso = item.drawDateIso?.trim();
    if (iso != null && iso.isNotEmpty) {
      final parsed = DateTime.tryParse(iso);
      if (parsed != null) return parsed;
    }

    final match = RegExp(r'(\d{2})/(\d{2})/(\d{4})').firstMatch(item.dateLabel);
    if (match == null) return null;
    final day = int.tryParse(match.group(1)!);
    final month = int.tryParse(match.group(2)!);
    final year = int.tryParse(match.group(3)!);
    if (day == null || month == null || year == null) return null;
    return DateTime(year, month, day);
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
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
      _checkoutSelectedIndexes.removeAll(indexes);
      _isSelectionMode = false;
    });
    AppToast.show('Đã xóa $count sản phẩm khỏi giỏ hàng');
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final selectedCheckoutItems = [
      for (var i = 0; i < items.length; i++)
        if (_checkoutSelectedIndexes.contains(i)) items[i],
    ];
    final subtotal =
        selectedCheckoutItems.fold<int>(0, (sum, item) => sum + item.subtotal);
    final ticketCount = selectedCheckoutItems.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );
    final total = subtotal;
    final expiredCount = items.where(_isPurchaseExpired).length;
    final hasExpiredItems = expiredCount > 0;
    final selectedExpiredCount =
        selectedCheckoutItems.where(_isPurchaseExpired).length;
    final hasSelectedExpiredItems = selectedExpiredCount > 0;
    final canCheckout =
        selectedCheckoutItems.isNotEmpty && !hasSelectedExpiredItems;

    // Đồng bộ selection khi danh sách thay đổi.
    final hasInvalidDeleteSelection =
        _selectedIndexes.any((index) => index < 0 || index >= items.length);
    final hasInvalidCheckoutSelection = _checkoutSelectedIndexes
        .any((index) => index < 0 || index >= items.length);
    if ((!_isSelectionMode && _selectedIndexes.isNotEmpty) ||
        hasInvalidDeleteSelection ||
        hasInvalidCheckoutSelection) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() {
          if (!_isSelectionMode || hasInvalidDeleteSelection) {
            _selectedIndexes.clear();
          }
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
        title: const Text(
          'Giỏ hàng',
          style: TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w900,
            fontSize: 24,
          ),
        ),
        leadingWidth: 72,
        leading: Padding(
          padding: const EdgeInsets.only(left: 16),
          child: _CartHeaderButton(
            icon: Icons.arrow_back_ios_new_rounded,
            onTap: () {
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
        ),
        actions: [
          if (items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: _CartHeaderButton(
                icon: _isSelectionMode
                    ? Icons.close_rounded
                    : Icons.delete_outline_rounded,
                onTap: _toggleSelectionMode,
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
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      children: [
                        _CartOverview(
                          itemCount: items.length,
                          ticketCount: ticketCount,
                        ),
                        const SizedBox(height: 14),
                        if (hasExpiredItems) ...[
                          _ExpiredCartNotice(expiredCount: expiredCount),
                          const SizedBox(height: 12),
                        ],
                        ...items.asMap().entries.map((entry) {
                          final index = entry.key;
                          final item = entry.value;
                          final isExpired = _isPurchaseExpired(item);
                          final card = _CartTicketCard(
                            item: item,
                            isExpired: isExpired,
                            isSelectionMode: _isSelectionMode,
                            isSelected: _isSelectionMode
                                ? _selectedIndexes.contains(index)
                                : _checkoutSelectedIndexes.contains(index),
                            onTap: () {
                              if (_isSelectionMode) {
                                _toggleItemSelection(index);
                              } else {
                                _toggleCheckoutSelection(index);
                              }
                            },
                            onToggleSelect: () => _isSelectionMode
                                ? _toggleItemSelection(index)
                                : _toggleCheckoutSelection(index),
                            onQuantityChanged: (qty) {
                              ref
                                  .read(cartProvider.notifier)
                                  .updateQuantityAtIndex(index, qty);
                            },
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
                    ticketCount: ticketCount,
                    subtotal: subtotal,
                    total: total,
                    enabled: canCheckout,
                    disabledReason: hasSelectedExpiredItems
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

class _CartOverview extends StatelessWidget {
  const _CartOverview({required this.itemCount, required this.ticketCount});

  final int itemCount;
  final int ticketCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.07),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(
            Icons.shopping_cart_rounded,
            size: 26,
            color: AppColors.primary,
          ),
          const SizedBox(width: 14),
          Text(
            'Có $itemCount vé trong giỏ',
            style: const TextStyle(
              color: AppColors.ink,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          const Spacer(),
          Text(
            '$ticketCount vé đã chọn',
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _CartHeaderButton extends StatelessWidget {
  const _CartHeaderButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      elevation: 7,
      shadowColor: Colors.black.withValues(alpha: 0.16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: SizedBox(
          width: 52,
          height: 52,
          child: Icon(icon, color: AppColors.primary, size: 27),
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
    required this.onTap,
    required this.onToggleSelect,
    required this.onQuantityChanged,
  });

  final CartItemData item;
  final bool isExpired;
  final bool isSelectionMode;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onToggleSelect;
  final ValueChanged<int> onQuantityChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isExpired
                ? const Color(0xFFD8E1EC)
                : isSelected && isSelectionMode
                    ? AppColors.primary.withValues(alpha: 0.35)
                    : const Color(0xFFF1E3E0),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0F000000),
              blurRadius: 16,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CartBadge(
                  text: item.logoText,
                  imageUrl: item.ticketImageUrl,
                  muted: isExpired,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.province,
                        style: const TextStyle(
                          color: AppColors.ink,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.calendar_today_outlined,
                            size: 13,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              item.dateLabel,
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),

                    ],
                  ),
                ),
                if (isSelectionMode)
                  GestureDetector(
                    onTap: onToggleSelect,
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8, top: 2),
                      child: _SelectionCheckbox(checked: isSelected),
                    ),
                  )
                else
                  GestureDetector(
                    onTap: onToggleSelect,
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8, top: 2),
                      child: _SelectionCheckbox(checked: isSelected),
                    ),
                  ),
              ],
            ),
            if (isExpired) ...[
              const SizedBox(height: 10),
              const _ExpiredTicketPill(),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBFA),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.primary, width: 1.4),
                    ),
                    child: Text(
                      item.number,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                _QuantityDropdown(
                  quantity: item.quantity,
                  maxStock: item.maxStock > 0 ? item.maxStock : 1,
                  enabled: !isExpired,
                  onChanged: onQuantityChanged,
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1, color: Color(0xFFF1E8E6)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _CartMeta(
                    icon: Icons.sell_outlined,
                    label: 'Đơn giá',
                    value: _money(item.unitPrice),
                  ),
                ),
                Expanded(
                  child: _CartMeta(
                    icon: Icons.account_balance_wallet_outlined,
                    label: 'Tạm tính',
                    value: _money(item.subtotal),
                    highlight: true,
                    alignEnd: true,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ExpiredCartNotice extends StatelessWidget {
  const _ExpiredCartNotice({required this.expiredCount});

  final int expiredCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 16, 18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFFFFF7ED), Color(0xFFFFFBF5)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: Color(0xFFFF7A1A),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.priority_high_rounded,
              color: Colors.white,
              size: 30,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$expiredCount vé đã hết hạn mua',
                  style: const TextStyle(
                    color: Color(0xFFEA580C),
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                const Text(
                  'Bạn có thể vuốt để xóa từng vé hoặc dùng chế độ xóa để chọn nhiều vé.',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    height: 1.32,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              Transform.rotate(
                angle: 0.18,
                child: Container(
                  width: 48,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFB347),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.confirmation_number_rounded,
                    color: Color(0xFFFFE5B7),
                    size: 32,
                  ),
                ),
              ),
              const Positioned(
                right: -11,
                bottom: -6,
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: Color(0xFFFF7A1A),
                  child: Icon(Icons.close_rounded, color: Colors.white),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExpiredTicketPill extends StatelessWidget {
  const _ExpiredTicketPill();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEDD5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        children: [
          Icon(Icons.lock_clock_rounded, color: Color(0xFFEA580C), size: 16),
          SizedBox(width: 6),
          Expanded(
            child: Text(
              'Đã hết hạn mua, chỉ có thể xóa khỏi giỏ',
              style: TextStyle(
                color: Color(0xFF9A3412),
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuantityDropdown extends StatelessWidget {
  const _QuantityDropdown({
    required this.quantity,
    required this.maxStock,
    required this.enabled,
    required this.onChanged,
  });

  final int quantity;
  final int maxStock;
  final bool enabled;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final options = maxStock < 1 ? 1 : maxStock;
    return PopupMenuButton<int>(
      enabled: enabled && options > 1,
      initialValue: quantity,
      onSelected: onChanged,
      offset: const Offset(0, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (context) => List.generate(
        options,
        (i) => PopupMenuItem<int>(
          value: i + 1,
          child: Text(
            '${i + 1}',
            style: TextStyle(
              fontWeight: quantity == i + 1
                  ? FontWeight.w800
                  : FontWeight.w600,
              color: quantity == i + 1 ? AppColors.primary : AppColors.ink,
            ),
          ),
        ),
      ),
      child: Container(
        width: 78,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7F4),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFF3DDD8)),
        ),
        child: Column(
          children: [
            const Text(
              'Số lượng',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$quantity',
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (options > 1) ...[
                  const SizedBox(width: 2),
                  const Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 18,
                    color: AppColors.primary,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectionCheckbox extends StatelessWidget {
  const _SelectionCheckbox({required this.checked});

  final bool checked;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(7),
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

class _CartMeta extends StatelessWidget {
  const _CartMeta({
    required this.label,
    required this.value,
    this.icon,
    this.highlight = false,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final IconData? icon;
  final bool highlight;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment:
              alignEnd ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            color: highlight ? AppColors.primary : AppColors.ink,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
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
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
            Container(
              width: 44,
              height: 5,
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
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
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w900,
                    fontSize: 24,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.verified_user_outlined,
                  size: 14,
                  color: Color(0xFF94A3B8),
                ),
                SizedBox(width: 6),
                Text(
                  'Thanh toán an toàn, bảo mật thông tin',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (disabledReason != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      size: 18,
                      color: Color(0xFFEA580C),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        disabledReason!,
                        style: const TextStyle(
                          color: Color(0xFF9A3412),
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: enabled ? onCheckout : null,
                icon: const Icon(Icons.credit_card_rounded, size: 20),
                label: const Text(
                  'Tiến hành thanh toán',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFF3B5B2),
                  minimumSize: const Size.fromHeight(54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
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

class _CartBadge extends StatelessWidget {
  const _CartBadge({
    required this.text,
    this.imageUrl,
    this.muted = false,
  });

  final String text;
  final String? imageUrl;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.trim().isNotEmpty;
    return Container(
      width: 52,
      height: 52,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFF6358), Color(0xFFD31010)],
        ),
      ),
      child: ColorFiltered(
        colorFilter: muted
            ? const ColorFilter.matrix(<double>[
                0.55, 0.55, 0.55, 0, 0,
                0.55, 0.55, 0.55, 0, 0,
                0.55, 0.55, 0.55, 0, 0,
                0, 0, 0, 1, 0,
              ])
            : const ColorFilter.mode(Colors.transparent, BlendMode.dst),
        child: hasImage
            ? CachedNetworkImage(
                imageUrl: imageUrl!,
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
                errorWidget: (_, _, _) => _CartBadgeFallback(text: text),
                placeholder: (_, _) => const Center(
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                ),
              )
            : _CartBadgeFallback(text: text),
      ),
    );
  }
}

class _CartBadgeFallback extends StatelessWidget {
  const _CartBadgeFallback({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: 14,
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

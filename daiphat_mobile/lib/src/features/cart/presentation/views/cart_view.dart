import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../../models/cart_item_model.dart';
import '../../providers/cart_provider.dart';
import '../../../tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';
import '../../../tickets/presentation/views/buy_ticket_view.dart';

class CartView extends ConsumerStatefulWidget {
  const CartView({super.key});

  @override
  ConsumerState<CartView> createState() => _CartViewState();
}

class _CartViewState extends ConsumerState<CartView> {
  bool _isSelectionMode = false;
  final Set<int> _selectedIndexes = <int>{};

  @override
  void initState() {
    super.initState();
    // Rời phiên mua ngay (nếu còn) — giỏ chính phải hiển thị đầy đủ.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(buyNowItemsProvider.notifier).clear();
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
      drawDate: DateTime.now(),
      status: 'reserved',
      statusDisplayName: 'Đang giữ vé',
      stationName: item.kyHieu,
    );
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => TicketDetailView(ticket: listItem),
      ),
    );
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
      _isSelectionMode = false;
    });
    AppToast.show('Đã xóa $count sản phẩm khỏi giỏ hàng');
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final ticketCount = ref.watch(cartTicketCountProvider);
    final total = ref.watch(cartTotalProvider);

    // Đồng bộ selection khi danh sách thay đổi ngoài chế độ xóa.
    if (!_isSelectionMode && _selectedIndexes.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(_selectedIndexes.clear);
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
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    children: [
                      _CartOverview(
                        itemCount: items.length,
                        ticketCount: ticketCount,
                      ),
                      const SizedBox(height: 14),
                      ...items.asMap().entries.map((entry) {
                        final index = entry.key;
                        final item = entry.value;
                        final card = _CartTicketCard(
                          item: item,
                          isSelectionMode: _isSelectionMode,
                          isSelected: _selectedIndexes.contains(index),
                          onTap: () {
                            if (_isSelectionMode) {
                              _toggleItemSelection(index);
                            } else {
                              _openDetail(context, item);
                            }
                          },
                          onToggleSelect: () => _toggleItemSelection(index),
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
                                  onDismissed: (_) => _removeItem(item, index),
                                  child: card,
                                ),
                        );
                      }),
                    ],
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
                    enabled: items.isNotEmpty,
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
    return Row(
      children: [
        const Icon(
          Icons.info_outline_rounded,
          size: 18,
          color: Color(0xFF94A3B8),
        ),
        const SizedBox(width: 6),
        Text(
          'Có $itemCount vé trong giỏ',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
        const Spacer(),
        Text(
          '$ticketCount vé đã chọn',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}

class _CartTicketCard extends StatelessWidget {
  const _CartTicketCard({
    required this.item,
    required this.isSelectionMode,
    required this.isSelected,
    required this.onTap,
    required this.onToggleSelect,
    required this.onQuantityChanged,
  });

  final CartItemData item;
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
            color: isSelected && isSelectionMode
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
                _CartBadge(text: item.logoText),
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
                      const SizedBox(height: 8),
                      const _InfoPill(
                        icon: Icons.check_circle_rounded,
                        label: 'Đang giữ vé',
                        color: Color(0xFF12985E),
                        backgroundColor: Color(0xFFE6F8EC),
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
                  ),
              ],
            ),
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
                  enabled: !isSelectionMode,
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

class _InfoPill extends StatelessWidget {
  const _InfoPill({
    required this.icon,
    required this.label,
    required this.color,
    required this.backgroundColor,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
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
  });

  final int ticketCount;
  final int subtotal;
  final int total;
  final bool enabled;

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
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: enabled
                    ? () => context.pushNamed(AppRoute.checkout.name)
                    : null,
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
  const _CartBadge({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFF6358), Color(0xFFD31010)],
        ),
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 14,
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

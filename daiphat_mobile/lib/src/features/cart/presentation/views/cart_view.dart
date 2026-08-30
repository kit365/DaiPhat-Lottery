import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';
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
    final drawDate =
        DateTime.tryParse(item.drawDateIso ?? '') ?? DateTime.now();
    final station =
        (item.province.trim().isNotEmpty && item.province != 'Đang cập nhật')
        ? item.province.trim()
        : (item.logoText.trim().isNotEmpty
              ? item.logoText.trim()
              : 'Đài Miền Nam');

    final listItem = LotteryTicketListItem(
      id: item.lotteryTicketId,
      displayName: 'Vé số $station',
      code: item.number,
      shortName: item.logoText.isNotEmpty ? item.logoText : 'VS',
      dateLabel: item.dateLabel,
      dayFilter: item.dateLabel.contains('nay')
          ? TicketDayFilter.today
          : TicketDayFilter.tomorrow,
      drawDate: drawDate,
      status: 'IN_STOCK',
      statusDisplayName: 'Còn vé',
      stationName: station,
      imageUrl: item.ticketImageUrl,
      price: item.unitPrice,
      quantity: item.maxStock > 0 ? item.maxStock : 1,
    );
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: AppColors.transparent,
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
        title: Text(
          'Xóa vé hết hạn',
          style: AppTypography.h4(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Text(
          'Bạn có muốn xóa ${expiredIndexes.length} vé đã hết hạn mua khỏi giỏ hàng không?',
          style: AppTypography.bodyMedium(
            fontSize: 14,
            height: 1.4,
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Hủy',
              style: AppTypography.buttonMedium(
                color: AppColors.contentMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Xóa',
              style: AppTypography.buttonMedium(fontWeight: FontWeight.w700),
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
        title: Text(
          'Xóa sản phẩm',
          textAlign: TextAlign.center,
          style: AppTypography.h4(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Text(
          'Bạn có muốn bỏ $count sản phẩm khỏi giỏ hàng không?',
          textAlign: TextAlign.center,
          style: AppTypography.bodyMedium(
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
                    side: const BorderSide(color: AppColors.borderDefault),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Hủy',
                    style: AppTypography.buttonMedium(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.surfacePrimary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Xóa',
                    style: AppTypography.buttonMedium(fontWeight: FontWeight.w800),
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
        title: Text(
          'Xác nhận xóa vé',
          style: AppTypography.h4(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Text(
          'Bạn có chắc muốn xóa vé số ${item.number} (${item.province}) khỏi giỏ hàng?',
          style: AppTypography.bodyMedium(
            fontSize: 14,
            height: 1.4,
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Hủy',
              style: AppTypography.buttonMedium(
                color: AppColors.contentMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Xóa',
              style: AppTypography.buttonMedium(fontWeight: FontWeight.w700),
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 320,
            child: ShaderMask(
              shaderCallback: (bounds) => LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Theme.of(context).colorScheme.surface,
                  AppColors.transparent,
                ],
                stops: const [0.4, 1.0],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset(
                'assets/images/home_bg.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                _buildAppBar(context, items, ticketCount),
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
                              if (hasExpiredItems) ...[
                                _ExpiredCartNotice(
                                  expiredCount: expiredCount,
                                  onDeleteAllExpired:
                                      _confirmRemoveExpiredItems,
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
                                  onToggleSelect: () =>
                                      _toggleItemSelection(index),
                                  onToggleCheckout: () =>
                                      _toggleCheckoutSelection(index),
                                  onQuantityChanged: (qty) {
                                    ref
                                        .read(cartProvider.notifier)
                                        .updateQuantityAtIndex(index, qty);
                                  },
                                  onDelete: () =>
                                      _confirmRemoveItem(item, index),
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
                                          direction:
                                              DismissDirection.endToStart,
                                          background:
                                              const _DeleteSwipeBackground(),
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
                          onToggleSelectAll: () =>
                              _toggleSelectAll(items.length),
                          onDelete: _confirmDeleteSelected,
                        )
                      : _CartBottomBar(
                          selectedTicketCount: selectedTicketCount,
                          totalTicketCount: ticketCount,
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
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar(
    BuildContext context,
    List<CartItemData> items,
    int ticketCount,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: AppHeaderActionButton(
              icon: Icons.arrow_back_ios_new_rounded,
              tooltip: 'Quay lại',
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 64),
            child: Center(
              child: Text(
                items.isNotEmpty ? 'Giỏ hàng ($ticketCount)' : 'Giỏ hàng',
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.pageTitle(),
              ),
            ),
          ),
          if (items.isNotEmpty)
            Align(
              alignment: Alignment.centerRight,
              child: AppHeaderActionButton(
                icon: _isSelectionMode
                    ? Icons.close_rounded
                    : Icons.delete_outline_rounded,
                tooltip: _isSelectionMode ? 'Đóng chọn' : 'Xóa nhiều',
                onTap: _toggleSelectionMode,
              ),
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
          color: AppColors.surfaceDestructiveMuted,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppColors.borderDestructiveSubtle,
            width: 1.2,
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              color: AppColors.primary,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '$expiredCount vé đã hết hạn mua. Hãy xóa để thanh toán.',
                style: AppTypography.bodyMedium(
                  color: AppColors.ink,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (onDeleteAllExpired != null) ...[
              const SizedBox(width: 8),
              Material(
                color: AppColors.transparent,
                child: InkWell(
                  onTap: onDeleteAllExpired,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDestructiveSubtle,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.borderDestructive,
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      'Xóa hết',
                      style: AppTypography.buttonSmall(
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
    final stationLabel =
        (item.province.trim().isNotEmpty &&
            item.province.trim() != 'Đang cập nhật')
        ? item.province.trim()
        : (item.logoText.trim().isNotEmpty
              ? item.logoText.trim()
              : 'Đài Miền Nam');

    Widget buildExpiredLabel() {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.surfaceDestructiveSubtle,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.borderDestructive, width: 0.8),
        ),
        child: Text(
          'HẾT HẠN',
          style: AppTypography.overline(
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
            color: AppColors.contentDestructive,
            letterSpacing: 0.3,
          ),
        ),
      );
    }

    Widget buildStationTitle() {
      return Text(
        stationLabel,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: AppTypography.subtitle2(
          fontSize: 12.5,
          fontWeight: FontWeight.w600,
          color: isExpired
              ? AppColors.contentPlaceholder
              : AppColors.contentMuted,
        ),
      );
    }

    Widget buildDateMeta() {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.calendar_month_outlined,
            size: 12,
            color: isExpired
                ? AppColors.contentPlaceholder
                : AppColors.contentMuted,
          ),
          const SizedBox(width: 3.5),
          Flexible(
            child: Text(
              item.dateLabel,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.caption(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: isExpired
                    ? AppColors.contentPlaceholder
                    : AppColors.contentMuted,
              ),
            ),
          ),
        ],
      );
    }

    Widget buildMetadata() {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (isExpired) ...[buildExpiredLabel(), const SizedBox(width: 6)],
              Flexible(child: buildStationTitle()),
            ],
          ),
          const SizedBox(height: 3),
          buildDateMeta(),
        ],
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isExpired
              ? AppColors.backgroundPrimary
              : AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: (isSelectionMode ? isSelected : isCheckoutSelected)
                ? AppColors.primary
                : (isExpired ? AppColors.borderDefault : AppColors.cardBorder),
            width: (isSelectionMode ? isSelected : isCheckoutSelected)
                ? 1.4
                : 1.0,
          ),
          boxShadow: isExpired
              ? const [
                  BoxShadow(
                    color: AppColors.shadowFaint,
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ]
              : const [
                  BoxShadow(
                    color: AppColors.shadowLight,
                    blurRadius: 8,
                    offset: Offset(0, 2),
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
                    buildMetadata(),
                    const SizedBox(height: 6),
                    Text(
                      item.number,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.lotteryDigit(
                        color: isExpired
                            ? AppColors.contentPlaceholder
                            : AppColors.contentPrimary,
                        fontSize: 25,
                        height: 1.0,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.8,
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
                    style: AppTypography.priceMedium(
                      fontSize: 13.5,
                      color: isExpired
                          ? AppColors.contentPlaceholder
                          : AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ).copyWith(
                      decoration: isExpired
                          ? TextDecoration.lineThrough
                          : null,
                      decorationColor: AppColors.contentPlaceholder,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (isExpired) ...[
                    Material(
                      color: AppColors.transparent,
                      child: InkWell(
                        onTap: onDelete,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceDestructiveSubtle,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppColors.borderDestructiveSubtle,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.delete_outline_rounded,
                                size: 15,
                                color: AppColors.contentDestructive,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Xóa',
                                style: AppTypography.buttonSmall(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.contentDestructive,
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
                        ? AppColors.surfaceDestructiveSoft
                        : AppColors.surfaceSoft,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _showDelete
                          ? AppColors.borderDestructive
                          : AppColors.borderSubtle,
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
                        : AppColors.contentNavy,
                    disabled: !widget.enabled,
                    onTap: _onMinusTap,
                  ),
                  Container(
                    constraints: const BoxConstraints(minWidth: 26),
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    alignment: Alignment.center,
                    child: Text(
                      '${widget.quantity}',
                      style: AppTypography.lotteryDigit(
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
                    iconColor: AppColors.contentNavy,
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
          color: AppColors.transparent,
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
                        ? AppColors.contentSubtle
                        : (iconColor ?? AppColors.contentNavy),
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
  const _SelectionCheckbox({required this.checked, this.disabled = false});

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
          color: AppColors.surfaceDisabled,
          border: Border.all(color: AppColors.borderDisabled, width: 1.5),
        ),
        child: const Icon(
          Icons.block_rounded,
          size: 13,
          color: AppColors.contentDisabled,
        ),
      );
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: checked ? AppColors.primary : AppColors.surfacePrimary,
        border: Border.all(
          color: checked ? AppColors.primary : AppColors.borderDisabled,
          width: 2,
        ),
      ),
      child: checked
          ? const Icon(
              Icons.check_rounded,
              size: 16,
              color: AppColors.surfacePrimary,
            )
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const Icon(
            Icons.delete_outline_rounded,
            color: AppColors.surfacePrimary,
            size: 28,
          ),
          const SizedBox(height: 6),
          Text(
            'Xóa',
            style: AppTypography.buttonSmall(
              color: AppColors.surfacePrimary,
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
    required this.selectedTicketCount,
    required this.totalTicketCount,
    required this.subtotal,
    required this.total,
    required this.enabled,
    required this.onCheckout,
    this.disabledReason,
  });

  final int selectedTicketCount;
  final int totalTicketCount;
  final int subtotal;
  final int total;
  final bool enabled;
  final VoidCallback onCheckout;
  final String? disabledReason;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label:
          'Đã chọn $selectedTicketCount trên $totalTicketCount vé, tổng cộng ${_money(total)}',
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
        decoration: const BoxDecoration(
          color: AppColors.surfacePrimary,
          boxShadow: [
            BoxShadow(
              color: AppColors.shadowElevated,
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
                    'Đã chọn $selectedTicketCount/$totalTicketCount vé',
                    style: AppTypography.subtitle2(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    _money(subtotal),
                    style: AppTypography.priceMedium(
                      color: AppColors.ink,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              CustomPaint(
                painter: _DashedLinePainter(color: AppColors.borderDefault),
                child: const SizedBox(width: double.infinity, height: 1),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tổng cộng',
                    style: AppTypography.subtitle1(
                      color: AppColors.ink,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    _money(total),
                    style: AppTypography.priceLarge(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w900,
                      fontSize: 24,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (disabledReason != null) ...[
                Text(
                  disabledReason!,
                  textAlign: TextAlign.center,
                  style: AppTypography.caption(
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
                    foregroundColor: AppColors.surfacePrimary,
                    disabledBackgroundColor: AppColors.borderDestructive,
                    minimumSize: const Size.fromHeight(54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    selectedTicketCount > 0
                        ? 'Tiến hành thanh toán ($selectedTicketCount)'
                        : 'Tiến hành thanh toán',
                    style: AppTypography.buttonLarge(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
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
        color: AppColors.surfacePrimary,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowElevated,
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
                  Text(
                    'Chọn tất cả',
                    style: AppTypography.subtitle2(
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
                style: AppTypography.buttonMedium(fontWeight: FontWeight.w800),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surfacePrimary,
                disabledBackgroundColor: AppColors.borderDestructive,
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
            color: AppColors.surfacePrimary,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: AppColors.borderWarm),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceEmptyState,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.remove_shopping_cart_outlined,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Giỏ hàng đang trống',
                style: AppTypography.h3(
                  color: AppColors.ink,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Hãy quay lại danh sách vé để chọn thêm những số đẹp bạn muốn mua.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyMedium(
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
                  child: Text(
                    'Quay lại mua vé',
                    style: AppTypography.buttonMedium(fontWeight: FontWeight.w700),
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

String _money(int amount) => AppFormatters.formatCurrency(amount);

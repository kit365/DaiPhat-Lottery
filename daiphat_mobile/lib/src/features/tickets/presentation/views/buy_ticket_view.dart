import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'package:daiphat_mobile/src/shared/utils/auth_navigation.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_filter_tab_strip.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../viewmodels/buy_ticket_viewmodel.dart';
import '../widgets/ticket_search_filter_sheet.dart';
import '../../utils/sellable_draw_date.dart';
import '../../utils/ticket_search_filter.dart';

String _compactPrice(int? price) {
  final effective = (price != null && price > 0)
      ? price
      : kDefaultLotteryTicketPrice;
  return AppFormatters.formatCurrency(effective);
}

class BuyTicketView extends ConsumerStatefulWidget {
  const BuyTicketView({
    super.key,
    this.ticketNumber,
    this.drawDate,
    this.stationName,
  });

  final String? ticketNumber;
  final String? drawDate;
  final String? stationName;

  @override
  ConsumerState<BuyTicketView> createState() => _BuyTicketViewState();
}

class _BuyTicketViewState extends ConsumerState<BuyTicketView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _applyQuery());
  }

  @override
  void didUpdateWidget(covariant BuyTicketView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ticketNumber != widget.ticketNumber ||
        oldWidget.drawDate != widget.drawDate ||
        oldWidget.stationName != widget.stationName) {
      _applyQuery();
    }
  }

  void _applyQuery() {
    final number = widget.ticketNumber?.trim() ?? '';
    final drawDate = widget.drawDate?.trim();
    final station = widget.stationName?.trim() ?? '';
    if (number.isEmpty &&
        (drawDate == null || drawDate.isEmpty) &&
        station.isEmpty) {
      return;
    }
    ref
        .read(buyTicketViewModelProvider.notifier)
        .applyQuery(
          searchQuery: number,
          drawDateIso: drawDate,
          stationName: station.isEmpty ? null : station,
        );
  }

  void _openTicketDetail(BuildContext context, LotteryTicketListItem ticket) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: AppColors.transparent,
      builder: (_) => TicketDetailModalSheet(ticket: ticket),
    );
  }

  void _addToCart(
    BuildContext context,
    LotteryTicketListItem ticket, {
    bool openCheckout = false,
  }) {
    if (!readIsAuthenticated(ref)) {
      goToLogin(
        context,
        redirectPath: openCheckout
            ? AppRoute.checkout.path
            : AppRoute.buyTicket.path,
      );
      return;
    }

    if (ticket.dayFilter == TicketDayFilter.today &&
        SellableDrawDate.isTodayDrawPassed()) {
      AppToast.error(
        'Đã quá 16:15, không thể mua vé cho hôm nay. Vui lòng chọn vé ngày mai.',
      );
      return;
    }

    final maxStock = ticket.quantity > 0 ? ticket.quantity : 1;
    final currentQty = ref
        .read(cartProvider.notifier)
        .quantityForTicket(ticket.id);

    if (!openCheckout && currentQty >= maxStock) {
      AppToast.error(
        'Vé số ${ticket.code} chỉ còn $maxStock vé (bạn đã có $currentQty vé trong giỏ)',
      );
      return;
    }

    final cartItem = CartItemData(
      lotteryTicketId: ticket.id,
      province: ticket.stationDisplayText,
      dateLabel: _detailDateLabel(ticket),
      drawTime: '',
      kyHieu: ticket.batchCode ?? '',
      number: ticket.code,
      quantity: 1,
      unitPrice: ticket.effectivePrice,
      logoText: ticket.shortName,
      ticketImageUrl: ticket.imageUrl,
      drawDateIso: SellableDrawDate.toIsoDate(ticket.drawDate),
      maxStock: maxStock,
    );

    // Mua ngay: thanh toán riêng tờ vé này, không đụng giỏ hàng chính.
    if (openCheckout) {
      ref.read(buyNowItemsProvider.notifier).start([cartItem]);
      context.pushNamed(AppRoute.checkout.name);
      return;
    }

    ref.read(cartProvider.notifier).addItem(cartItem);

    AppToast.show(
      'Đã thêm ${ticket.code} vào giỏ hàng',
      actionLabel: 'Xem giỏ hàng',
      onAction: () => requireAuthOrGoLoginWithRef(
        context,
        ref,
        redirectPath: AppRoute.cart.path,
        onAuthenticated: () => context.push(AppRoute.cart.path),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(buyTicketViewModelProvider);
    final viewModel = ref.read(buyTicketViewModelProvider.notifier);
    final data = state.asData?.value;
    final searchFilter = data?.searchFilter ?? TicketSearchFilter.empty;
    final searchQuery = data?.searchQuery ?? '';

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
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.surfacePrimary, AppColors.transparent],
                stops: [0.4, 1.0],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset(
                'assets/images/home_bg.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
          Column(
            children: [
              _BuyTicketHeader(
                onOpenCart: () => requireAuthOrGoLoginWithRef(
                  context,
                  ref,
                  redirectPath: AppRoute.cart.path,
                  onAuthenticated: () => context.push(AppRoute.cart.path),
                ),
                searchQuery: searchQuery,
                filterCount: searchFilter.count,
                isLoading: data?.isListLoading ?? false,
                onSearchChanged: viewModel.updateSearchQuery,
                onOpenFilter: () async {
                  final currentFilter =
                      ref
                          .read(buyTicketViewModelProvider)
                          .asData
                          ?.value
                          .searchFilter ??
                      TicketSearchFilter.empty;
                  final applied = await showTicketSearchFilterSheet(
                    context: context,
                    initial: currentFilter,
                  );
                  if (applied == null) return;
                  await viewModel.applySearchFilter(applied);
                },
              ),
              Expanded(
                child: state.when(
                  data: (loadedData) => _LoadedView(
                    state: loadedData,
                    viewModel: viewModel,
                    onOpenDetail: (ticket) =>
                        _openTicketDetail(context, ticket),
                    onAddToCart: (ticket) => _addToCart(context, ticket),
                    onBuyNow: (ticket) =>
                        _addToCart(context, ticket, openCheckout: true),
                  ),
                  loading: () => const _BuyTicketSkeleton(),
                  error: (error, _) => _ErrorState(
                    message: error.toString(),
                    onRetry: () {
                      viewModel.refresh();
                    },
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _detailDateLabel(LotteryTicketListItem ticket) {
  final weekday = _kVnWeekdayLabels[ticket.drawDate.weekday] ?? '';
  final label = ticket.dayFilter == TicketDayFilter.today
      ? 'Hôm nay'
      : 'Ngày mai';
  final dateFormatted = DateFormat('dd/MM/yyyy').format(ticket.drawDate);
  if (weekday.isNotEmpty) {
    return '$weekday, $dateFormatted ($label)';
  }
  return '$dateFormatted ($label)';
}

class _LoadedView extends StatefulWidget {
  const _LoadedView({
    required this.state,
    required this.viewModel,
    required this.onOpenDetail,
    required this.onAddToCart,
    required this.onBuyNow,
  });

  final BuyTicketState state;
  final BuyTicketViewModel viewModel;
  final ValueChanged<LotteryTicketListItem> onOpenDetail;
  final ValueChanged<LotteryTicketListItem> onAddToCart;
  final ValueChanged<LotteryTicketListItem> onBuyNow;

  @override
  State<_LoadedView> createState() => _LoadedViewState();
}

class _LoadedViewState extends State<_LoadedView> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      widget.viewModel.loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final viewModel = widget.viewModel;
    final tickets = state.filteredTickets;

    return BrandScrollbar(
      controller: _scrollController,
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => widget.viewModel.refresh(),
        child: ListView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 14),
          children: [
            // Section 1: Hero Banner (Standalone, no overlapping)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: _TicketHeroBanner(),
            ),
            const SizedBox(height: 14),

            // Section 2: Day Tabs (Hôm nay / Ngày mai)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _DaySegmentedControl(
                selectedDay: state.selectedDay,
                isTodaySellClosed: state.isTodaySellClosed,
                isTomorrowSellClosed: state.isTomorrowSellClosed,
                onSelectToday: () => viewModel.selectDay(TicketDayFilter.today),
                onSelectTomorrow: () {
                  viewModel.selectDay(TicketDayFilter.tomorrow);
                },
              ),
            ),
            const SizedBox(height: 14),

            // Section 3: Province Filter Strip
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _ProvinceFilterStrip(
                provinces: state.provinces,
                selectedProvince: state.selectedProvince,
                onSelectProvince: viewModel.selectProvince,
              ),
            ),
            const SizedBox(height: 14),

            // Section 4: 2-Column Ticket Grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: state.isListLoading
                  ? const _TicketListSkeleton(count: 6)
                  : AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      transitionBuilder: (child, animation) {
                        return FadeTransition(opacity: animation, child: child);
                      },
                      child: Column(
                        key: ValueKey(
                          '${state.selectedDay.name}|${state.selectedProvince}|${state.searchQuery}|${state.searchFilter.signature}',
                        ),
                        children: [
                          if (tickets.isNotEmpty)
                            LayoutBuilder(
                              builder: (context, constraints) {
                                const crossAxisSpacing = 10.0;
                                final itemWidth =
                                    (constraints.maxWidth - crossAxisSpacing) /
                                    2;
                                return Wrap(
                                  spacing: crossAxisSpacing,
                                  runSpacing: 10.0,
                                  children: tickets
                                      .map(
                                        (ticket) => SizedBox(
                                          width: itemWidth,
                                          child: _TicketCard(
                                            ticket: ticket,
                                            onTap: () =>
                                                widget.onOpenDetail(ticket),
                                            onBuyNow: () =>
                                                widget.onBuyNow(ticket),
                                          ),
                                        ),
                                      )
                                      .toList(),
                                );
                              },
                            )
                          else
                            const _EmptyState(),
                        ],
                      ),
                    ),
            ),
            if (state.isLoadingMore) ...[
              const SizedBox(height: 10),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: _TicketListSkeleton(count: 2),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatefulWidget {
  const _SearchField({
    required this.initialValue,
    required this.onChanged,
    this.filterCount = 0,
    this.onOpenFilter,
    this.isLoading = false,
  });

  final String initialValue;
  final ValueChanged<String> onChanged;
  final int filterCount;
  final VoidCallback? onOpenFilter;
  final bool isLoading;

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  late final TextEditingController _controller;
  Timer? _debounceTimer;
  bool _isDebouncing = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void didUpdateWidget(covariant _SearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue &&
        widget.initialValue != _controller.text &&
        !_isDebouncing) {
      _controller.value = TextEditingValue(
        text: widget.initialValue,
        selection: TextSelection.collapsed(offset: widget.initialValue.length),
      );
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onTextChanged(String val) {
    setState(() {
      _isDebouncing = true;
    });
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      if (mounted) {
        setState(() {
          _isDebouncing = false;
        });
        widget.onChanged(val);
      }
    });
  }

  void _onClear() {
    _debounceTimer?.cancel();
    _controller.clear();
    setState(() {
      _isDebouncing = false;
    });
    widget.onChanged('');
  }

  @override
  Widget build(BuildContext context) {
    final showLoading = _isDebouncing || widget.isLoading;

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.surfaceNeutral,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.borderSubtle, width: 1.0),
      ),
      child: Row(
        children: [
          const SizedBox(width: 12),
          const Icon(
            Icons.search_rounded,
            color: AppColors.contentSubtle,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _controller,
              onChanged: _onTextChanged,
              keyboardType: TextInputType.text,
              style: AppTypography.bodyMedium(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: AppColors.contentNavy,
              ),
              decoration: InputDecoration(
                hintText: 'Tìm số vé (VD: 6868...), tên đài...',
                hintStyle: AppTypography.bodyMedium(
                  color: AppColors.contentSubtle,
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          if (showLoading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppColors.contentSubtle,
                  ),
                ),
              ),
            )
          else if (_controller.text.isNotEmpty)
            GestureDetector(
              onTap: () {
                _controller.clear();
                _onTextChanged('');
              },
              behavior: HitTestBehavior.opaque,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6),
                child: Icon(
                  Icons.close_rounded,
                  color: AppColors.contentSubtle,
                  size: 18,
                ),
              ),
            ),
          if (widget.onOpenFilter != null)
            IconButton(
              onPressed: widget.onOpenFilter,
              tooltip: 'Lọc vé',
              icon: Badge(
                isLabelVisible: widget.filterCount > 0,
                label: Text('${widget.filterCount}'),
                backgroundColor: AppColors.primary,
                child: const Icon(
                  Icons.tune_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeroBannerSlide {
  const _HeroBannerSlide({
    required this.imageAsset,
    required this.eyebrow,
    required this.title,
    required this.subtitle,
  });

  final String imageAsset;
  final String eyebrow;
  final String title;
  final String subtitle;
}

class _TicketHeroBanner extends StatefulWidget {
  const _TicketHeroBanner();

  static const double height = 124;

  static const List<_HeroBannerSlide> slides = [
    _HeroBannerSlide(
      imageAsset: 'assets/images/hero_banner.jpg',
      eyebrow: 'ĐẠI PHÁT LOTTERY',
      title: 'Mua Vé Số Hôm Nay',
      subtitle: 'Mở thưởng 16:15 hàng ngày',
    ),
    _HeroBannerSlide(
      imageAsset: 'assets/images/lucky_girl_banner.png',
      eyebrow: 'XỔ SỐ KIẾN THIẾT',
      title: 'Chọn Số May Mắn',
      subtitle: 'Tra cứu & Đặt vé nhanh chóng',
    ),
  ];

  @override
  State<_TicketHeroBanner> createState() => _TicketHeroBannerState();
}

class _TicketHeroBannerState extends State<_TicketHeroBanner> {
  late final PageController _pageController;
  Timer? _autoPlayTimer;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _startAutoPlay();
  }

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _startAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_pageController.hasClients) return;
      final next = (_currentIndex + 1) % _TicketHeroBanner.slides.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 480),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _onPageChanged(int index) {
    setState(() => _currentIndex = index);
    _startAutoPlay();
  }

  @override
  Widget build(BuildContext context) {
    final slides = _TicketHeroBanner.slides;

    return Container(
      height: _TicketHeroBanner.height,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowMedium,
            blurRadius: 18,
            spreadRadius: -2,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: _onPageChanged,
            itemCount: slides.length,
            itemBuilder: (context, index) {
              final slide = slides[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(slide.imageAsset, fit: BoxFit.cover),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          AppColors.brandPrimaryDeep.withValues(alpha: 0.94),
                          AppColors.brandPrimaryDark.withValues(alpha: 0.72),
                          AppColors.brandPrimary.withValues(alpha: 0.12),
                          AppColors.transparent,
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          slide.eyebrow,
                          style: AppTypography.overline(
                            color: AppColors.brandAccentYellow,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          slide.title,
                          style: AppTypography.h4(
                            color: AppColors.surfacePrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            height: 1.15,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          slide.subtitle,
                          style: AppTypography.caption(
                            color: AppColors.surfacePrimary.withValues(
                              alpha: 0.85,
                            ),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
          Positioned(
            bottom: 8,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var index = 0; index < slides.length; index++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: index == _currentIndex ? 14 : 5,
                    height: 4.5,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      color: index == _currentIndex
                          ? AppColors.surfacePrimary
                          : AppColors.surfacePrimary.withValues(alpha: .5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DaySegmentedControl extends StatelessWidget {
  const _DaySegmentedControl({
    required this.selectedDay,
    required this.isTodaySellClosed,
    required this.isTomorrowSellClosed,
    required this.onSelectToday,
    required this.onSelectTomorrow,
  });

  final TicketDayFilter selectedDay;
  final bool isTodaySellClosed;
  final bool isTomorrowSellClosed;
  final VoidCallback onSelectToday;
  final VoidCallback onSelectTomorrow;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.borderSubtle, width: 1.0),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _ShopeeTabItem(
              title: isTodaySellClosed ? 'Hôm nay (Đã đóng)' : 'Hôm nay',
              selected: selectedDay == TicketDayFilter.today,
              disabled: isTodaySellClosed,
              onTap: isTodaySellClosed ? null : onSelectToday,
            ),
          ),
          Expanded(
            child: _ShopeeTabItem(
              title: isTomorrowSellClosed ? 'Ngày mai (Đã đóng)' : 'Ngày mai',
              selected: selectedDay == TicketDayFilter.tomorrow,
              disabled: isTomorrowSellClosed,
              onTap: isTomorrowSellClosed ? null : onSelectTomorrow,
            ),
          ),
        ],
      ),
    );
  }
}

class _ShopeeTabItem extends StatelessWidget {
  const _ShopeeTabItem({
    required this.title,
    required this.selected,
    required this.disabled,
    required this.onTap,
  });

  final String title;
  final bool selected;
  final bool disabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.transparent,
      child: InkWell(
        onTap: disabled ? null : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.labelLarge(
                  fontSize: 14,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: disabled
                      ? AppColors.contentSubtle
                      : selected
                      ? AppColors.primary
                      : AppColors.contentMuted,
                ),
              ),
              const SizedBox(height: 6),
              // Underline indicator
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                height: 2.5,
                width: selected ? 48 : 0,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : AppColors.transparent,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProvinceFilterStrip extends StatelessWidget {
  const _ProvinceFilterStrip({
    required this.provinces,
    required this.selectedProvince,
    required this.onSelectProvince,
  });

  final List<String> provinces;
  final String selectedProvince;
  final ValueChanged<String> onSelectProvince;

  @override
  Widget build(BuildContext context) {
    if (provinces.isEmpty) return const SizedBox.shrink();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      child: Row(
        children: [
          for (var index = 0; index < provinces.length; index++) ...[
            _ProvinceChip(
              label: provinces[index] == 'Tất cả đài'
                  ? 'Tất cả'
                  : provinces[index],
              selected: provinces[index] == selectedProvince,
              onTap: () => onSelectProvince(provinces[index]),
            ),
            if (index < provinces.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _AllTicketsPage extends ConsumerStatefulWidget {
  const _AllTicketsPage({
    required this.onOpenDetail,
    required this.onAddToCart,
  });

  final ValueChanged<LotteryTicketListItem> onOpenDetail;
  final ValueChanged<LotteryTicketListItem> onAddToCart;

  @override
  ConsumerState<_AllTicketsPage> createState() => _AllTicketsPageState();
}

class _AllTicketsPageState extends ConsumerState<_AllTicketsPage> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 300) {
      ref.read(allTicketsViewModelProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(allTicketsViewModelProvider);
    final viewModel = ref.read(allTicketsViewModelProvider.notifier);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: state.when(
          data: (data) {
            final tickets = data.filteredTickets;
            return BrandScrollbar(
              controller: _scrollController,
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: viewModel.refresh,
                child: CustomScrollView(
                  controller: _scrollController,
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverToBoxAdapter(
                      child: _AllTicketsHeader(
                        onBack: () => Navigator.of(context).pop(),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                        child: _SearchField(
                          initialValue: data.searchQuery,
                          filterCount: data.searchFilter.count,
                          isLoading: data.isListLoading,
                          onChanged: viewModel.updateSearchQuery,
                          onOpenFilter: () async {
                            final applied = await showTicketSearchFilterSheet(
                              context: context,
                              initial: data.searchFilter,
                            );
                            if (applied == null) return;
                            await viewModel.applySearchFilter(applied);
                          },
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: _ProvinceFilterStrip(
                        provinces: data.provinces,
                        selectedProvince: data.selectedProvince,
                        onSelectProvince: viewModel.selectProvince,
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 12)),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _DaySegmentedControl(
                          selectedDay: data.selectedDay,
                          isTodaySellClosed: data.isTodaySellClosed,
                          isTomorrowSellClosed: data.isTomorrowSellClosed,
                          onSelectToday: () =>
                              viewModel.selectDay(TicketDayFilter.today),
                          onSelectTomorrow: () =>
                              viewModel.selectDay(TicketDayFilter.tomorrow),
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 14)),
                    if (data.isListLoading)
                      const SliverPadding(
                        padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                        sliver: SliverToBoxAdapter(
                          child: _TicketListSkeleton(count: 6),
                        ),
                      )
                    else if (tickets.isEmpty)
                      const SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(child: _EmptyState()),
                      )
                    else
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                        sliver: SliverGrid.builder(
                          itemCount: tickets.length,
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                mainAxisSpacing: 14,
                                crossAxisSpacing: 14,
                                childAspectRatio: 0.9,
                              ),
                          itemBuilder: (_, index) {
                            final ticket = tickets[index];
                            return _AllTicketCard(
                              ticket: ticket,
                              onTap: () => widget.onOpenDetail(ticket),
                              onAddToCart: () => widget.onAddToCart(ticket),
                            );
                          },
                        ),
                      ),
                    if (data.isLoadingMore)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.only(bottom: 24),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
          error: (error, _) => _ErrorState(
            message: error.toString(),
            onRetry: viewModel.refresh,
          ),
        ),
      ),
    );
  }
}

class _AllTicketsHeader extends StatelessWidget {
  const _AllTicketsHeader({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
      child: Row(
        children: [
          AppHeaderActionButton(
            icon: Icons.arrow_back_ios_new_rounded,
            tooltip: 'Quay lại',
            onTap: onBack,
          ),
          Expanded(
            child: Text(
              'Mua vé',
              textAlign: TextAlign.center,
              style: AppTypography.h1(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: AppColors.primary,
              ),
            ),
          ),
          Consumer(
            builder: (context, ref, _) {
              final count = ref.watch(cartTicketCountProvider);
              return Row(
                children: [
                  AppHeaderActionButton(
                    icon: Icons.shopping_cart_outlined,
                    tooltip: 'Giỏ hàng',
                    badgeCount: count,
                    onTap: () => context.push(AppRoute.cart.path),
                  ),
                  const SizedBox(width: 8),
                  AppHeaderActionButton(
                    icon: Icons.chat_bubble_outline_rounded,
                    tooltip: 'Trò chuyện / Hỗ trợ',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => ChatScreen(
                            isAuthenticated: readIsAuthenticated(ref),
                            isActive: true,
                            onBack: () => Navigator.of(context).pop(),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _AllTicketCard extends StatelessWidget {
  const _AllTicketCard({
    required this.ticket,
    required this.onTap,
    required this.onAddToCart,
  });

  final LotteryTicketListItem ticket;
  final VoidCallback onTap;
  final VoidCallback onAddToCart;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfacePrimary,
      borderRadius: BorderRadius.circular(18),
      elevation: 2.5,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 96,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ticket.imageUrl != null && ticket.imageUrl!.trim().isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: ticket.imageUrl!,
                          fit: BoxFit.cover,
                          errorWidget: (_, _, _) =>
                              _TicketThumbFallback(shortName: ticket.shortName),
                        )
                      : _TicketThumbFallback(shortName: ticket.shortName),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                ticket.stationDisplayText,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.subtitle2(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.contentMuted,
                                ),
                              ),
                            ),
                            Text(
                              _compactPrice(ticket.price),
                              style: AppTypography.priceMedium(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ticket.code,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.lotteryDigit(
                            color: AppColors.contentPrimary,
                            fontSize: 25,
                            height: 1,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.8,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.calendar_month_outlined,
                          size: 12,
                          color: AppColors.contentMuted,
                        ),
                        const SizedBox(width: 3.5),
                        Expanded(
                          child: Text(
                            ticket.dateLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.caption(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.contentMuted,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Material(
                          color: AppColors.primary,
                          shape: const CircleBorder(),
                          clipBehavior: Clip.antiAlias,
                          child: InkWell(
                            onTap: onAddToCart,
                            child: const SizedBox(
                              width: 30,
                              height: 30,
                              child: Icon(
                                Icons.add_rounded,
                                color: AppColors.surfacePrimary,
                                size: 21,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({
    required this.ticket,
    required this.onTap,
    required this.onBuyNow,
  });

  final LotteryTicketListItem ticket;
  final VoidCallback onTap;
  final VoidCallback onBuyNow;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfacePrimary,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderDecorative, width: 1.0),
            boxShadow: const [
              BoxShadow(
                color: AppColors.shadowLight,
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              // 1. Station Name (Centered & Subtle)
              Text(
                ticket.stationDisplayText,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: AppTypography.subtitle2(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.contentMuted,
                ),
              ),
              const SizedBox(height: 8),

              // 2. 6-digit Lucky Number (Hero element - big & centered)
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  ticket.code,
                  textAlign: TextAlign.center,
                  style: AppTypography.lotteryDigit(
                    color: AppColors.contentPrimary,
                    fontSize: 25,
                    height: 1.0,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.8,
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // 3. Price (Centered & Bold Red)
              Text(
                _compactPrice(ticket.effectivePrice),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: AppTypography.priceMedium(
                  fontSize: 13.5,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TicketThumbFallback extends StatelessWidget {
  const _TicketThumbFallback({required this.shortName});

  final String shortName;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.surfaceEmptyState, AppColors.surfaceBrandLight],
        ),
      ),
      child: Center(
        child: Container(
          width: 54,
          height: 54,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [AppColors.brandPrimaryStrong, AppColors.brandPrimary],
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            shortName,
            style: AppTypography.h5(
              color: AppColors.surfacePrimary,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }
}

const Map<int, String> _kVnWeekdayLabels = {
  DateTime.monday: 'Thứ 2',
  DateTime.tuesday: 'Thứ 3',
  DateTime.wednesday: 'Thứ 4',
  DateTime.thursday: 'Thứ 5',
  DateTime.friday: 'Thứ 6',
  DateTime.saturday: 'Thứ 7',
  DateTime.sunday: 'Chủ nhật',
};

class TicketDetailModalSheet extends ConsumerStatefulWidget {
  const TicketDetailModalSheet({super.key, required this.ticket});

  final LotteryTicketListItem ticket;

  @override
  ConsumerState<TicketDetailModalSheet> createState() =>
      _TicketDetailModalSheetState();
}

class _TicketDetailModalSheetState
    extends ConsumerState<TicketDetailModalSheet> {
  int _quantity = 1;

  int get _maxStock => widget.ticket.quantity > 0 ? widget.ticket.quantity : 1;

  int get _unitPrice => widget.ticket.effectivePrice;

  int get _totalPrice => _unitPrice * _quantity;

  String get _formattedTotalPrice => AppFormatters.formatCurrency(_totalPrice);

  String get _dateText {
    final weekday = _kVnWeekdayLabels[widget.ticket.drawDate.weekday] ?? '';
    final label = widget.ticket.dayFilter == TicketDayFilter.today
        ? 'Hôm nay'
        : 'Ngày mai';
    final dateStr = DateFormat('dd/MM/yyyy').format(widget.ticket.drawDate);
    return '$weekday, $dateStr ($label)';
  }

  void _increase() {
    if (_quantity < _maxStock) {
      setState(() => _quantity++);
    }
  }

  void _decrease() {
    if (_quantity > 1) {
      setState(() => _quantity--);
    }
  }

  bool _blockTodaySaleIfClosed() {
    if (widget.ticket.dayFilter == TicketDayFilter.today &&
        SellableDrawDate.isTodayDrawPassed()) {
      AppToast.error(
        'Đã quá 16:15, không thể mua vé cho hôm nay. Vui lòng chọn vé ngày mai.',
      );
      return true;
    }
    return false;
  }

  CartItemData _buildCartItem() {
    return CartItemData(
      lotteryTicketId: widget.ticket.id,
      province: widget.ticket.stationDisplayText,
      dateLabel: _dateText,
      drawTime: '',
      kyHieu: widget.ticket.batchCode ?? '',
      number: widget.ticket.code,
      quantity: _quantity,
      unitPrice: _unitPrice,
      logoText: widget.ticket.shortName,
      ticketImageUrl: widget.ticket.imageUrl,
      drawDateIso: SellableDrawDate.toIsoDate(widget.ticket.drawDate),
      maxStock: _maxStock,
    );
  }

  void _addToCart() {
    if (!readIsAuthenticated(ref)) {
      Navigator.of(context).pop();
      goToLogin(context, redirectPath: AppRoute.buyTicket.path);
      return;
    }
    if (_blockTodaySaleIfClosed()) return;

    final currentQtyInCart = ref
        .read(cartProvider.notifier)
        .quantityForTicket(widget.ticket.id);
    if (currentQtyInCart + _quantity > _maxStock) {
      AppToast.error(
        'Vé số ${widget.ticket.code} chỉ còn $_maxStock vé (bạn đã có $currentQtyInCart vé trong giỏ)',
      );
      return;
    }

    ref.read(cartProvider.notifier).addItem(_buildCartItem());
    Navigator.of(context).pop();

    AppToast.show(
      'Đã thêm $_quantity vé ${widget.ticket.code} vào giỏ hàng.',
      actionLabel: 'Xem giỏ hàng',
      onAction: () => requireAuthOrGoLoginWithRef(
        context,
        ref,
        redirectPath: AppRoute.cart.path,
        onAuthenticated: () => context.push(AppRoute.cart.path),
      ),
    );
  }

  void _buyNow() {
    if (!readIsAuthenticated(ref)) {
      Navigator.of(context).pop();
      goToLogin(context, redirectPath: AppRoute.checkout.path);
      return;
    }
    if (_blockTodaySaleIfClosed()) return;

    Navigator.of(context).pop();
    ref.read(buyNowItemsProvider.notifier).start([_buildCartItem()]);
    context.pushNamed(AppRoute.checkout.name);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: AppColors.cardShadow,
            blurRadius: 28,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Drag Handle & Close Button
              Row(
                children: [
                  const SizedBox(width: 32),
                  Expanded(
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 4.5,
                        decoration: BoxDecoration(
                          color: AppColors.borderSubtle,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: AppColors.surfaceSlate100,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        size: 18,
                        color: AppColors.contentMuted,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Ticket Hero Box
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surfacePrimary,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: AppColors.borderDecorative,
                    width: 1.0,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: AppColors.shadowLight,
                      blurRadius: 10,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.ticket.productTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.subtitle1(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.contentMuted,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.calendar_month_outlined,
                              size: 13,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _dateText,
                              style: AppTypography.subtitle2(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Divider(height: 1, color: AppColors.borderSubtle),
                    const SizedBox(height: 12),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        widget.ticket.code,
                        textAlign: TextAlign.center,
                        style: AppTypography.lotteryDigit(
                          color: AppColors.contentPrimary,
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 4,
                          height: 1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 2),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Quantity Selector & Price Details
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  children: [
                    // 1. Unit price
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Đơn giá',
                          style: AppTypography.bodyMedium(
                            fontSize: 13.5,
                            color: AppColors.contentMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '${_compactPrice(_unitPrice)} / vé',
                          style: AppTypography.priceMedium(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Divider(
                        height: 1,
                        color: AppColors.borderDecorative,
                      ),
                    ),

                    // 2. Stock available
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Số lượng còn',
                          style: AppTypography.bodyMedium(
                            fontSize: 13.5,
                            color: AppColors.contentMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 3.5,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.brandPrimarySubtle,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: AppColors.brandPrimaryBorderLight,
                              width: 1,
                            ),
                          ),
                          child: Text(
                            '$_maxStock vé',
                            style: AppTypography.labelSmall(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Divider(
                        height: 1,
                        color: AppColors.borderDecorative,
                      ),
                    ),

                    // 3. Step control
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Số lượng mua',
                          style: AppTypography.bodyMedium(
                            fontSize: 13.5,
                            color: AppColors.contentMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.surfacePrimary,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppColors.borderDecorative,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              _StepButton(
                                icon: Icons.remove_rounded,
                                disabled: _quantity <= 1,
                                onTap: _decrease,
                              ),
                              Container(
                                width: 44,
                                height: 36,
                                alignment: Alignment.center,
                                decoration: const BoxDecoration(
                                  border: Border.symmetric(
                                    vertical: BorderSide(
                                      color: AppColors.borderDecorative,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  '$_quantity',
                                  style: AppTypography.subtitle1(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                              _StepButton(
                                icon: Icons.add_rounded,
                                disabled: _quantity >= _maxStock,
                                onTap: _increase,
                                onDisabledTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Đã đạt số lượng vé tối đa còn lại',
                                      ),
                                      duration: Duration(seconds: 1),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Divider(
                        height: 1,
                        color: AppColors.borderDecorative,
                      ),
                    ),

                    // 4. Total calculation
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Tổng tiền',
                          style: AppTypography.h6(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          '${_compactPrice(_totalPrice)} đ',
                          style: AppTypography.priceLarge(
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Action Buttons: Add to cart vs Buy now
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: _addToCart,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(
                            color: AppColors.primary,
                            width: 1.2,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(
                          Icons.shopping_cart_outlined,
                          size: 19,
                        ),
                        label: Text(
                          'Thêm vào giỏ',
                          style: AppTypography.buttonMedium(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _buyNow,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.surfacePrimary,
                          elevation: 1,
                          shadowColor: AppColors.shadowBrand,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          'Mua ngay',
                          style: AppTypography.buttonLarge(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
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

class _StepButton extends StatelessWidget {
  final IconData icon;
  final bool disabled;
  final VoidCallback? onTap;
  final VoidCallback? onDisabledTap;

  const _StepButton({
    required this.icon,
    required this.disabled,
    required this.onTap,
    this.onDisabledTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.transparent,
      child: InkWell(
        onTap: disabled ? onDisabledTap : onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 44,
          height: 36,
          child: Icon(
            icon,
            size: 18,
            color: disabled ? AppColors.contentSubtle : AppColors.primary,
          ),
        ),
      ),
    );
  }
}

class _BuyTicketSkeleton extends StatelessWidget {
  const _BuyTicketSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      physics: const NeverScrollableScrollPhysics(),
      children: const [
        _ShimmerBox(height: 124, radius: 16),
        SizedBox(height: 14),
        _ShimmerBox(height: 36, radius: 8),
        SizedBox(height: 14),
        _ShimmerBox(height: 36, radius: 999),
        SizedBox(height: 14),
        _TicketListSkeleton(count: 6),
      ],
    );
  }
}

class _TicketListSkeleton extends StatelessWidget {
  const _TicketListSkeleton({this.count = 6});

  final int count;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const crossAxisSpacing = 10.0;
        final itemWidth = (constraints.maxWidth - crossAxisSpacing) / 2;
        return Wrap(
          spacing: crossAxisSpacing,
          runSpacing: 10.0,
          children: List.generate(
            count,
            (index) =>
                SizedBox(width: itemWidth, child: const _TicketCardSkeleton()),
          ),
        );
      },
    );
  }
}

class _TicketCardSkeleton extends StatelessWidget {
  const _TicketCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDecorative, width: 1.0),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          _ShimmerBox(width: 58, height: 14, radius: 4),
          SizedBox(height: 10),
          _ShimmerBox(width: 105, height: 24, radius: 6),
          SizedBox(height: 10),
          _ShimmerBox(width: 52, height: 15, radius: 4),
        ],
      ),
    );
  }
}

class _ShimmerBox extends StatelessWidget {
  const _ShimmerBox({this.width, required this.height, this.radius = 12});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.surfaceDisabled,
      highlightColor: AppColors.surfaceSoft,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 44,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              'Không tải được danh sách vé',
              style: AppTypography.h4(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium(color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surfacePrimary,
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BuyTicketHeader extends StatelessWidget {
  const _BuyTicketHeader({
    required this.onOpenCart,
    required this.searchQuery,
    required this.filterCount,
    required this.onSearchChanged,
    required this.onOpenFilter,
    this.isLoading = false,
  });

  final VoidCallback onOpenCart;
  final String searchQuery;
  final int filterCount;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onOpenFilter;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.transparent,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Row 1: Title + Action buttons (Cart & Chat)
              Row(
                children: [
                  Text('Mua vé', style: AppTypography.pageTitle()),
                  const Spacer(),
                  Consumer(
                    builder: (context, ref, _) {
                      final isAuthenticated =
                          (ref.watch(apiClientProvider).accessToken ?? '')
                              .isNotEmpty;
                      if (!isAuthenticated) {
                        return const SizedBox.shrink();
                      }
                      final count = ref.watch(cartTicketCountProvider);
                      return Row(
                        children: [
                          AppHeaderActionButton(
                            icon: Icons.chat_bubble_outline_rounded,
                            tooltip: 'Trò chuyện / Hỗ trợ',
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => ChatScreen(
                                    isAuthenticated: true,
                                    isActive: true,
                                    onBack: () => Navigator.of(context).pop(),
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 8),
                          AppHeaderActionButton(
                            icon: Icons.shopping_cart_outlined,
                            tooltip: 'Giỏ hàng',
                            badgeCount: count,
                            onTap: onOpenCart,
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Row 2: Search Bar + Separate Filter Button
              Row(
                children: [
                  Expanded(
                    child: _SearchField(
                      initialValue: searchQuery,
                      onChanged: onSearchChanged,
                      isLoading: isLoading,
                    ),
                  ),
                  const SizedBox(width: 10),
                  AppHeaderActionButton(
                    icon: Icons.tune_rounded,
                    tooltip: 'Bộ lọc',
                    badgeCount: filterCount,
                    onTap: onOpenFilter,
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

class _EmptyStateCard extends StatelessWidget {
  const _EmptyStateCard({
    required this.message,
    required this.onResetFilter,
  });

  final String message;
  final VoidCallback onResetFilter;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.confirmation_number_outlined,
              size: 48,
              color: AppColors.borderMuted,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppTypography.subtitle1(
                fontSize: 14.5,
                color: AppColors.contentMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 14),
            OutlinedButton(
              onPressed: onResetFilter,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: Text(
                'Đặt lại bộ lọc',
                style: AppTypography.buttonSmall(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProvinceChip extends StatelessWidget {
  const _ProvinceChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppFilterChip(label: label, isSelected: selected, onTap: onTap);
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.borderWarm),
      ),
      child: Column(
        children: [
          const Image(
            image: AssetImage('assets/images/thantai.png'),
            height: 110,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 12),
          Text(
            'Không tìm thấy vé phù hợp',
            style: AppTypography.h5(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Hãy thử đổi ngày quay, bộ lọc hoặc từ khóa tìm kiếm.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

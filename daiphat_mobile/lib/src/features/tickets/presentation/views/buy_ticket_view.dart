import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'package:daiphat_mobile/src/shared/utils/auth_navigation.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../viewmodels/buy_ticket_viewmodel.dart';
import '../widgets/ticket_search_filter_sheet.dart';
import '../../utils/sellable_draw_date.dart';

String _formatTicketPrice(int? price) {
  if (price == null) {
    return 'Dang cap nhat';
  }

  final currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );
  return '${currencyFormatter.format(price)} / ve';
}

String _compactPrice(int? price) {
  if (price == null) {
    return 'Dang cap nhat';
  }

  final currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );
  return currencyFormatter.format(price);
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
    ref.read(buyTicketViewModelProvider.notifier).applyQuery(
      searchQuery: number,
      drawDateIso: drawDate,
      stationName: station.isEmpty ? null : station,
    );
  }

  void _openTicketDetail(BuildContext context, LotteryTicketListItem ticket) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => TicketDetailView(ticket: ticket)),
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
    final currentQty =
        ref.read(cartProvider.notifier).quantityForTicket(ticket.id);

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
      unitPrice: ticket.price ?? 0,
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

    return Scaffold(
      backgroundColor: const Color(0xFFF9F9FC),
      body: Column(
        children: [
          _BuyTicketHeader(
            onBack: () => context.go(AppRoute.home.path),
            onOpenCart: () => requireAuthOrGoLoginWithRef(
              context,
              ref,
              redirectPath: AppRoute.cart.path,
              onAuthenticated: () => context.push(AppRoute.cart.path),
            ),
          ),
          Expanded(
            child: state.when(
              data: (data) => _LoadedView(
                state: data,
                viewModel: viewModel,
                onOpenDetail: (ticket) => _openTicketDetail(context, ticket),
                onAddToCart: (ticket) =>
                    _addToCart(context, ticket, openCheckout: false),
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
    );
  }
}

String _detailDateLabel(LotteryTicketListItem ticket) {
  final label = ticket.dayFilter == TicketDayFilter.today
      ? 'Hôm nay'
      : 'Ngày mai';
  return '${DateFormat('dd/MM/yyyy').format(ticket.drawDate)} ($label)';
}

class _LoadedView extends StatefulWidget {
  const _LoadedView({
    required this.state,
    required this.viewModel,
    required this.onOpenDetail,
    required this.onAddToCart,
  });

  final BuyTicketState state;
  final BuyTicketViewModel viewModel;
  final ValueChanged<LotteryTicketListItem> onOpenDetail;
  final ValueChanged<LotteryTicketListItem> onAddToCart;

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
    final tickets = state.tickets;
    final listCount = state.isListLoading
        ? 0
        : (tickets.isNotEmpty
            ? tickets.length
            : (state.totalElements > 0 ? state.totalElements : 0));

    return BrandScrollbar(
      controller: _scrollController,
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => widget.viewModel.refresh(),
        child: ListView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          children: [
          _BuyTicketShowcase(
            initialValue: state.searchQuery,
            filterCount: state.searchFilter.count,
            onChanged: viewModel.updateSearchQuery,
            onOpenFilter: () async {
              final applied = await showTicketSearchFilterSheet(
                context: context,
                initial: state.searchFilter,
              );
              if (applied == null) return;
              await viewModel.applySearchFilter(applied);
            },
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _TicketSectionHeader(
                  title: 'Danh sách vé đang mở bán',
                  count: listCount,
                  onSeeAll: listCount > 0
                      ? () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => _AllTicketsPage(
                                onOpenDetail: widget.onOpenDetail,
                                onAddToCart: widget.onAddToCart,
                              ),
                            ),
                          );
                        }
                      : null,
                ),
                const SizedBox(height: 12),
                if (state.isListLoading)
                  const _TicketListSkeleton(count: 6)
                else ...[
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 320),
                    switchInCurve: Curves.easeOutCubic,
                    switchOutCurve: Curves.easeInCubic,
                    transitionBuilder: (child, animation) {
                      final offset = Tween<Offset>(
                        begin: const Offset(0.04, 0),
                        end: Offset.zero,
                      ).animate(animation);
                      return FadeTransition(
                        opacity: animation,
                        child: SlideTransition(position: offset, child: child),
                      );
                    },
                    child: Column(
                      key: ValueKey(
                        '${state.selectedDay.name}|${state.selectedProvince}|${state.searchQuery}|${state.searchFilter.signature}',
                      ),
                      children: [
                        ...tickets.map(
                          (ticket) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _TicketCard(
                              ticket: ticket,
                              onTap: () => widget.onOpenDetail(ticket),
                              onAddToCart: () => widget.onAddToCart(ticket),
                            ),
                          ),
                        ),
                        if (tickets.isEmpty) const _EmptyState(),
                      ],
                    ),
                  ),
                  if (state.isLoadingMore) const _TicketListSkeleton(count: 2),
                ],
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }
}

class _BuyTicketShowcase extends StatelessWidget {
  const _BuyTicketShowcase({
    required this.initialValue,
    required this.filterCount,
    required this.onChanged,
    required this.onOpenFilter,
  });

  final String initialValue;
  final int filterCount;
  final ValueChanged<String> onChanged;
  final VoidCallback onOpenFilter;

  static const double _topPadding = 8;
  static const double _searchBannerGap = 14;
  static const double _searchFieldHeight = 50;
  static const double _redTailPadding = 10;

  double get _redBackgroundHeight =>
      _topPadding +
      _searchFieldHeight +
      _searchBannerGap +
      (_TicketHeroBanner.height / 2) +
      _redTailPadding;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: _redBackgroundHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primaryDark,
                  const Color(0xFFE70F20),
                  const Color(0xFFF3272E).withValues(alpha: 0.92),
                  const Color(0xFFF9F9FC),
                ],
                stops: const [0, .45, .82, 1],
              ),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(28),
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1ACB101D),
                  blurRadius: 18,
                  spreadRadius: -6,
                  offset: Offset(0, 8),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          right: -56,
          top: 28,
          child: Container(
            width: 190,
            height: 190,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [Color(0x45FFB85C), Color(0x00FFB85C)],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, _topPadding, 16, 18),
          child: Column(
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x26000000),
                      blurRadius: 18,
                      spreadRadius: -5,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: _SearchField(
                  initialValue: initialValue,
                  filterCount: filterCount,
                  onChanged: onChanged,
                  onOpenFilter: onOpenFilter,
                ),
              ),
              const SizedBox(height: _searchBannerGap),
              const _TicketHeroBanner(),
            ],
          ),
        ),
      ],
    );
  }
}

LotteryTicketListItem _buildHardcodedTicketDetail(
  LotteryTicketListItem baseTicket,
) {
  return LotteryTicketListItem(
    id: baseTicket.id,
    displayName: 'Vé số kiến thiết Đại Phát',
    code: baseTicket.code,
    shortName: baseTicket.shortName,
    dateLabel: baseTicket.dateLabel,
    dayFilter: baseTicket.dayFilter,
    drawDate: baseTicket.drawDate,
    status: 'IN_STOCK',
    statusDisplayName: 'Sẵn sàng mở thưởng',
    stationName: 'Đài Bạc Liêu',
    serialNumber: 'DP-BL-2026-000123',
    batchCode: 'UI-DEMO-44',
    imageUrl: baseTicket.imageUrl,
    price: 10000,
  );
}

class _SearchField extends StatefulWidget {
  const _SearchField({
    required this.initialValue,
    required this.filterCount,
    required this.onChanged,
    required this.onOpenFilter,
  });

  final String initialValue;
  final int filterCount;
  final ValueChanged<String> onChanged;
  final VoidCallback onOpenFilter;

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void didUpdateWidget(covariant _SearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue &&
        widget.initialValue != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.initialValue,
        selection: TextSelection.collapsed(offset: widget.initialValue.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      onChanged: widget.onChanged,
      keyboardType: TextInputType.text,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      ),
      decoration: InputDecoration(
        hintText: 'Tìm kiếm vé theo đài, ngày, bộ số...',
        hintStyle: const TextStyle(color: Color(0x995D3F3C), fontSize: 14),
        prefixIcon: const Icon(
          Icons.search_rounded,
          color: Color(0xFF5D3F3C),
          size: 24,
        ),
        suffixIcon: IconButton(
          onPressed: widget.onOpenFilter,
          tooltip: 'Bộ lọc khoảng số',
          icon: Badge(
            isLabelVisible: widget.filterCount > 0,
            label: Text('${widget.filterCount}'),
            backgroundColor: AppColors.primary,
            child: const Icon(
              Icons.tune_rounded,
              color: Color(0xFFC51A27),
              size: 21,
            ),
          ),
        ),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(999),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(999),
          borderSide: const BorderSide(color: Color(0x33B90014), width: 2),
        ),
      ),
    );
  }
}

class _HeroBannerSlide {
  const _HeroBannerSlide({
    required this.imageAsset,
    required this.eyebrow,
    required this.title,
    required this.ctaLabel,
  });

  final String imageAsset;
  final String eyebrow;
  final String title;
  final String ctaLabel;
}

class _TicketHeroBanner extends StatefulWidget {
  const _TicketHeroBanner();

  static const double height = 194;

  static const List<_HeroBannerSlide> slides = [
    _HeroBannerSlide(
      imageAsset: 'assets/images/hero_banner.jpg',
      eyebrow: 'Mua vé ngay hôm nay',
      title: 'Nhận may mắn\nliền tay',
      ctaLabel: 'Khám phá ngay',
    ),
    _HeroBannerSlide(
      imageAsset: 'assets/images/lucky_girl_banner.png',
      eyebrow: 'Vé số Đại Phát',
      title: 'Chọn số\nyêu thích',
      ctaLabel: 'Mua vé ngay',
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
      final next =
          (_currentIndex + 1) % _TicketHeroBanner.slides.length;
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
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 36,
            spreadRadius: -4,
            offset: Offset(0, 14),
          ),
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 2),
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
                          const Color(0xFFB40716).withValues(alpha: 0.96),
                          const Color(0xFFD51C29).withValues(alpha: 0.76),
                          const Color(0xFFE43732).withValues(alpha: 0.18),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          slide.eyebrow,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 5),
                        SizedBox(
                          width: 188,
                          child: Text(
                            slide.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 25,
                              fontWeight: FontWeight.w900,
                              height: 1.12,
                              letterSpacing: -.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFD86B),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x12000000),
                                blurRadius: 10,
                                offset: Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                slide.ctaLabel,
                                style: const TextStyle(
                                  color: Color(0xFF8B1118),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(width: 5),
                              const Icon(
                                Icons.arrow_forward_ios_rounded,
                                color: Color(0xFF8B1118),
                                size: 12,
                              ),
                            ],
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
            bottom: 10,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var index = 0; index < slides.length; index++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: index == _currentIndex ? 15 : 5,
                    height: 5,
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    decoration: BoxDecoration(
                      color: index == _currentIndex
                          ? Colors.white
                          : Colors.white.withValues(alpha: .58),
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
    const selectedTextColor = Colors.white;
    const unselectedTextColor = Color(0xFF5C4A45);
    const disabledTextColor = Color(0xFFB0A5A1);
    const trackColor = Colors.white;

    return LayoutBuilder(
      builder: (context, constraints) {
        const outerPadding = 6.0;
        const thumbInset = 6.0;
        final thumbWidth =
            (constraints.maxWidth - (outerPadding * 2) - (thumbInset * 2)) / 2;
        final thumbLeft = selectedDay == TicketDayFilter.today
            ? outerPadding + thumbInset
            : constraints.maxWidth - thumbWidth - outerPadding - thumbInset;

        return Container(
          height: 54,
          padding: const EdgeInsets.all(outerPadding),
          decoration: BoxDecoration(
            color: trackColor,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFFF1E4E1), width: 1.0),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14000000),
                blurRadius: 14,
                offset: Offset(0, 5),
              ),
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Stack(
            children: [
              AnimatedPositioned(
                duration: const Duration(milliseconds: 260),
                curve: Curves.easeOutCubic,
                left: thumbLeft,
                top: 3,
                bottom: 3,
                width: thumbWidth,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [Color(0xFFC40D1C), Color(0xFFF02C32)],
                    ),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: const Color(0xFFD91D29),
                      width: 1.0,
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x22000000),
                        blurRadius: 12,
                        spreadRadius: -2,
                        offset: Offset(0, 5),
                      ),
                      BoxShadow(
                        color: Color(0x0D000000),
                        blurRadius: 3,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
              Positioned.fill(
                child: Row(
                  children: [
                    Expanded(
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: isTodaySellClosed ? null : onSelectToday,
                          hoverColor: trackColor,
                          focusColor: trackColor,
                          highlightColor: trackColor,
                          splashColor: Colors.transparent,
                          borderRadius: BorderRadius.circular(999),
                          child: Center(
                              child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 220),
                                  child: Icon(
                                    Icons.calendar_today_outlined,
                                    key: ValueKey(
                                      '${isTodaySellClosed}_${selectedDay == TicketDayFilter.today}',
                                    ),
                                    size: 15,
                                    color: isTodaySellClosed
                                        ? disabledTextColor
                                        : selectedDay == TicketDayFilter.today
                                        ? selectedTextColor
                                        : unselectedTextColor,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                AnimatedDefaultTextStyle(
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOutCubic,
                                  style: TextStyle(
                                    fontSize: isTodaySellClosed ? 12 : 14,
                                    fontWeight: FontWeight.w700,
                                    color: isTodaySellClosed
                                        ? disabledTextColor
                                        : selectedDay == TicketDayFilter.today
                                        ? selectedTextColor
                                        : unselectedTextColor,
                                  ),
                                  child: Text(
                                    isTodaySellClosed
                                        ? 'Hôm nay (đóng)'
                                        : 'Hôm nay',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: isTomorrowSellClosed ? null : onSelectTomorrow,
                          hoverColor: trackColor,
                          focusColor: trackColor,
                          highlightColor: trackColor,
                          splashColor: Colors.transparent,
                          borderRadius: BorderRadius.circular(999),
                          child: Center(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 220),
                                  child: Icon(
                                    Icons.calendar_today_outlined,
                                    key: ValueKey(
                                      '${isTomorrowSellClosed}_${selectedDay == TicketDayFilter.tomorrow}',
                                    ),
                                    size: 15,
                                    color: isTomorrowSellClosed
                                        ? disabledTextColor
                                        : selectedDay == TicketDayFilter.tomorrow
                                        ? selectedTextColor
                                        : unselectedTextColor,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                AnimatedDefaultTextStyle(
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOutCubic,
                                  style: TextStyle(
                                    fontSize: isTomorrowSellClosed ? 12 : 14,
                                    fontWeight: FontWeight.w700,
                                    color: isTomorrowSellClosed
                                        ? disabledTextColor
                                        : selectedDay == TicketDayFilter.tomorrow
                                        ? selectedTextColor
                                        : unselectedTextColor,
                                  ),
                                  child: Text(
                                    isTomorrowSellClosed
                                        ? 'Ngày mai (đóng)'
                                        : 'Ngày mai',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
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

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF2E7E4)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D71100E),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: [
            for (var index = 0; index < provinces.length; index++) ...[
              _ProvinceChip(
                label: provinces[index] == 'Tat ca dai'
                    ? 'Tất cả'
                    : provinces[index],
                selected: provinces[index] == selectedProvince,
                onTap: () => onSelectProvince(provinces[index]),
              ),
              if (index < provinces.length - 1) const SizedBox(width: 8),
            ],
          ],
        ),
      ),
    );
  }
}

class _TicketSectionHeader extends StatelessWidget {
  const _TicketSectionHeader({
    required this.title,
    required this.count,
    this.onSeeAll,
  });

  final String title;
  final int count;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 24,
          decoration: BoxDecoration(
            color: const Color(0xFFB90014),
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1C1E),
          ),
        ),
        const Spacer(),
        InkWell(
          onTap: onSeeAll,
          borderRadius: BorderRadius.circular(999),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  count > 0 ? 'Xem tất cả' : '0 vé',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFD51A26),
                  ),
                ),
                if (count > 0) ...[
                  const SizedBox(width: 3),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: Color(0xFFD51A26),
                    size: 10,
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
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
      backgroundColor: const Color(0xFFF9F9FC),
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
          Material(
            color: Colors.white,
            shape: const CircleBorder(),
            elevation: 4,
            shadowColor: Colors.black.withValues(alpha: 0.16),
            child: InkWell(
              onTap: onBack,
              customBorder: const CircleBorder(),
              child: const SizedBox(
                width: 52,
                height: 52,
                child: Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
            ),
          ),
          Expanded(
            child: Text(
              'Mua vé',
              textAlign: TextAlign.center,
              style: GoogleFonts.barlow(
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
                  _HeaderSquareButton(
                    icon: Icons.shopping_cart_outlined,
                    onTap: () => context.push(AppRoute.cart.path),
                    badgeCount: count,
                  ),
                  const SizedBox(width: 10),
                  _HeaderSquareButton(
                    icon: Icons.chat_bubble_outline_rounded,
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
      color: Colors.white,
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
                  Positioned(
                    right: 10,
                    top: 10,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.favorite_border_rounded,
                        color: Color(0xFF9B6D69),
                        size: 20,
                      ),
                    ),
                  ),
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
                                style: GoogleFonts.publicSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF6B625F),
                                ),
                              ),
                            ),
                            Text(
                              _compactPrice(ticket.price),
                              style: GoogleFonts.publicSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: Colors.black,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ticket.code,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.barlow(
                            color: const Color(0xFFC90F1D),
                            fontSize: 26,
                            height: 1,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
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
                          color: Color(0xFF8A6D68),
                        ),
                        Expanded(
                          child: Text(
                            ticket.dateLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF755E59),
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
                                color: Colors.white,
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
    required this.onAddToCart,
  });

  final LotteryTicketListItem ticket;
  final VoidCallback onTap;
  final VoidCallback onAddToCart;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      elevation: 2,
      shadowColor: const Color(0x12000000),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: 108,
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.all(9),
                child: _TicketThumb(ticket: ticket),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        ticket.stationDisplayText,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.publicSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF3C302E),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        ticket.code,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.barlow(
                          color: const Color(0xFFC90F1D),
                          fontSize: 27,
                          height: 1,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Row(
                        children: [
                          const Icon(
                            Icons.calendar_month_outlined,
                            size: 13,
                            color: Color(0xFF8A6D68),
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              ticket.dateLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF755E59),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              CustomPaint(
                size: const Size(1, 76),
                painter: _DashedLinePainter(),
              ),
              SizedBox(
                width: 96,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 12, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _compactPrice(ticket.price),
                        style: GoogleFonts.publicSans(
                          fontSize: 13,
                          color: const Color(0xFF312624),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Material(
                        color: const Color(0xFFE51B29),
                        shape: const CircleBorder(),
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: onAddToCart,
                          child: const SizedBox(
                            width: 48,
                            height: 48,
                            child: Icon(
                              Icons.add_rounded,
                              color: Colors.white,
                              size: 26,
                            ),
                          ),
                        ),
                      ),
                    ],
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

class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFE9DEDB)
      ..strokeWidth = 1;
    const dash = 4.0;
    const gap = 4.0;
    var y = 0.0;
    while (y < size.height) {
      canvas.drawLine(Offset.zero + Offset(0, y), Offset(0, y + dash), paint);
      y += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TicketThumb extends StatelessWidget {
  const _TicketThumb({required this.ticket});

  final LotteryTicketListItem ticket;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 94,
      height: 90,
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFE7BDB8).withValues(alpha: 0.35),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: ticket.imageUrl != null && ticket.imageUrl!.trim().isNotEmpty
          ? CachedNetworkImage(
              imageUrl: ticket.imageUrl!,
              fit: BoxFit.cover,
              errorWidget: (_, _, _) =>
                  _TicketThumbFallback(shortName: ticket.shortName),
            )
          : _TicketThumbFallback(shortName: ticket.shortName),
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
          colors: [Color(0xFFFFF1EF), Color(0xFFFFD5C8)],
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
              colors: [Color(0xFFFF5C4D), Color(0xFFD31010)],
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            shortName,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }
}

const Color _kDetailSoftPink = Color(0xFFFFF2F0);
const Color _kDetailBorder = Color(0xFFF6E3DF);
const Color _kDetailMuted = Color(0xFF8C8C93);

const Map<int, String> _kVnWeekdayLabels = {
  DateTime.monday: 'Thứ 2',
  DateTime.tuesday: 'Thứ 3',
  DateTime.wednesday: 'Thứ 4',
  DateTime.thursday: 'Thứ 5',
  DateTime.friday: 'Thứ 6',
  DateTime.saturday: 'Thứ 7',
  DateTime.sunday: 'Chủ nhật',
};

class TicketDetailView extends ConsumerStatefulWidget {
  const TicketDetailView({super.key, required this.ticket});

  final LotteryTicketListItem ticket;

  @override
  ConsumerState<TicketDetailView> createState() => _TicketDetailViewState();
}

class _TicketDetailViewState extends ConsumerState<TicketDetailView> {
  void _goBack() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    context.go(AppRoute.buyTicket.path);
  }


  void _openStationTickets(LotteryTicketListItem ticket) {
    final station = ticket.stationDisplayText;
    ref.read(buyTicketViewModelProvider.notifier).selectProvince(station);
    _goBack();
  }

  CartItemData _buildCartItem(LotteryTicketListItem ticket) {
    final maxStock = ticket.quantity > 0 ? ticket.quantity : 1;
    return CartItemData(
      lotteryTicketId: ticket.id,
      province: ticket.stationDisplayText,
      dateLabel: _detailDate(ticket),
      drawTime: '',
      kyHieu: ticket.batchCode ?? '',
      number: ticket.code,
      quantity: 1,
      unitPrice: ticket.price ?? 0,
      logoText: ticket.shortName,
      ticketImageUrl: ticket.imageUrl,
      drawDateIso: SellableDrawDate.toIsoDate(ticket.drawDate),
      maxStock: maxStock,
    );
  }

  bool _blockTodaySaleIfClosed(LotteryTicketListItem ticket) {
    if (ticket.dayFilter == TicketDayFilter.today &&
        SellableDrawDate.isTodayDrawPassed()) {
      AppToast.error(
        'Đã quá 16:15, không thể mua vé cho hôm nay. Vui lòng chọn vé ngày mai.',
      );
      return true;
    }
    return false;
  }

  void _addToCart(LotteryTicketListItem ticket) {
    if (!readIsAuthenticated(ref)) {
      goToLogin(context, redirectPath: AppRoute.buyTicket.path);
      return;
    }
    if (_blockTodaySaleIfClosed(ticket)) return;

    final maxStock = ticket.quantity > 0 ? ticket.quantity : 1;
    final currentQty =
        ref.read(cartProvider.notifier).quantityForTicket(ticket.id);
    if (currentQty >= maxStock) {
      AppToast.error(
        'Vé số ${ticket.code} chỉ còn $maxStock vé (bạn đã có $currentQty vé trong giỏ)',
      );
      return;
    }
    ref.read(cartProvider.notifier).addItem(_buildCartItem(ticket));
    AppToast.show(
      'Đã thêm vé ${ticket.code} vào giỏ hàng.',
      actionLabel: 'Xem giỏ hàng',
      onAction: () => requireAuthOrGoLoginWithRef(
        context,
        ref,
        redirectPath: AppRoute.cart.path,
        onAuthenticated: () => context.push(AppRoute.cart.path),
      ),
    );
  }

  void _buyNow(LotteryTicketListItem ticket) {
    if (!readIsAuthenticated(ref)) {
      goToLogin(context, redirectPath: AppRoute.checkout.path);
      return;
    }
    if (_blockTodaySaleIfClosed(ticket)) return;

    // Thanh toán riêng tờ vé đang chọn — không thêm vào / không xoá giỏ hàng.
    ref.read(buyNowItemsProvider.notifier).start([_buildCartItem(ticket)]);
    context.pushNamed(AppRoute.checkout.name);
  }

  String _detailDate(LotteryTicketListItem ticket) {
    final label = ticket.dayFilter == TicketDayFilter.today
        ? 'Hôm nay'
        : 'Ngày mai';
    return '${DateFormat('dd/MM/yyyy').format(ticket.drawDate)} ($label)';
  }

  String _detailDateWithWeekday(LotteryTicketListItem ticket) {
    final weekday = _kVnWeekdayLabels[ticket.drawDate.weekday] ?? '';
    return '$weekday, ${_detailDate(ticket)}';
  }

  @override
  Widget build(BuildContext context) {
    final isHardcodedTicket = widget.ticket.id < 0;
    final ticketDetailAsync = isHardcodedTicket
        ? AsyncValue.data(_buildHardcodedTicketDetail(widget.ticket))
        : ref.watch(lotteryTicketDetailProvider(widget.ticket.id));
    final resolvedTicket = ticketDetailAsync.asData?.value ?? widget.ticket;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Chi tiết vé số',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 20,
            color: AppColors.ink,
          ),
        ),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_rounded,
            size: 22,
            color: AppColors.primary,
          ),
          onPressed: _goBack,
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFFBF8), Color(0xFFFFF4F1)],
          ),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              Expanded(
                child: RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async {
                    if (widget.ticket.id < 0) return;
                    ref.invalidate(lotteryTicketDetailProvider(widget.ticket.id));
                    await ref.read(
                      lotteryTicketDetailProvider(widget.ticket.id).future,
                    );
                  },
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                    children: [
                      _DetailHeroCard(
                        ticket: resolvedTicket,
                        dateText: _detailDateWithWeekday(resolvedTicket),
                      ),
                      const SizedBox(height: 14),
                      _DetailSectionCard(
                        icon: Icons.confirmation_number_outlined,
                        title: 'Thông tin vé số',
                        children: [
                          _DetailInfoRow(
                            icon: Icons.storefront_outlined,
                            label: 'Sản phẩm',
                            value: resolvedTicket.titleText,
                          ),
                          _DetailInfoRow(
                            icon: Icons.location_on_outlined,
                            label: 'Đài quay',
                            value: resolvedTicket.stationDisplayText,
                            onTap: () => _openStationTickets(resolvedTicket),
                          ),
                          _DetailInfoRow(
                            icon: Icons.calendar_month_outlined,
                            label: 'Ngày quay thưởng',
                            value: _detailDate(resolvedTicket),
                          ),
                          _DetailInfoRow(
                            icon: Icons.sell_outlined,
                            label: 'Giá tiền',
                            value: _formatTicketPrice(resolvedTicket.price),
                            highlight: true,
                            isLast: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const _DetailNoteBox(),
                    ],
                  ),
                ),
              ),
              if (ticketDetailAsync.isLoading)
                const LinearProgressIndicator(
                  minHeight: 2,
                  color: AppColors.primary,
                  backgroundColor: Color(0xFFFFE1D9),
                ),
              _DetailBottomBar(
                onAddToCart: () => _addToCart(resolvedTicket),
                onBuyNow: () => _buyNow(resolvedTicket),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailHeroCard extends StatelessWidget {
  const _DetailHeroCard({required this.ticket, required this.dateText});

  final LotteryTicketListItem ticket;
  final String dateText;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFFFDDD6)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: 0,
            top: 0,
            child: Opacity(
              opacity: .14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: const [
                  Text(
                    'DP',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                      height: 1,
                    ),
                  ),
                  Text(
                    'ĐẠI PHÁT',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                      letterSpacing: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _TicketBadge(
                    shortName: ticket.shortName,
                    imageUrl: ticket.imageUrl,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          ticket.titleText,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _StatusPill(label: ticket.statusDisplayName),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  _HeroMetaLine(
                    icon: Icons.location_on_outlined,
                    text: ticket.stationDisplayText,
                  ),
                  _HeroMetaLine(
                    icon: Icons.calendar_month_outlined,
                    text: dateText,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFF3A9A2),
                    width: 1.4,
                  ),
                ),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    ticket.code,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 4,
                      height: 1,
                    ),
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


class _HeroMetaLine extends StatelessWidget {
  const _HeroMetaLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.primary),
        const SizedBox(width: 5),
        Text(
          text,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5.5),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F8EC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.check_circle_rounded,
            size: 12,
            color: Color(0xFF12985E),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF12985E),
              fontWeight: FontWeight.w700,
              fontSize: 9.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailSectionCard extends StatelessWidget {
  const _DetailSectionCard({
    required this.icon,
    required this.title,
    required this.children,
  });

  final IconData icon;
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _kDetailBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: _kDetailSoftPink,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Icon(icon, size: 16, color: AppColors.primary),
                ),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ink,
                  ),
                ),
              ],
            ),
          ),
          ...children,
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _DetailInfoRow extends StatelessWidget {
  const _DetailInfoRow({
    this.icon,
    required this.label,
    required this.value,
    this.highlight = false,
    this.isLast = false,
    this.onTap,
  });

  final IconData? icon;
  final String label;
  final String value;
  final bool highlight;
  final bool isLast;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: EdgeInsets.fromLTRB(16, 11, 16, isLast ? 13 : 11),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 17, color: AppColors.primary),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                color: _kDetailMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 14,
                color: highlight ? AppColors.primary : AppColors.ink,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return content;

    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, child: content),
    );
  }
}

class _DetailNoteBox extends StatelessWidget {
  const _DetailNoteBox();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F5F4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFEDE5E2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Row(
            children: [
              Icon(Icons.shield_outlined, size: 16, color: Color(0xFF6F6A68)),
              SizedBox(width: 8),
              Text(
                'Lưu ý',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF4A4644),
                ),
              ),
            ],
          ),
          SizedBox(height: 10),
          Text(
            'Vé đã mua chỉ hiển thị sau khi thanh toán thành công.',
            style: TextStyle(
              fontSize: 12.5,
              height: 1.55,
              color: _kDetailMuted,
            ),
          ),
          Text(
            'Vé số của bạn sẽ được giữ đến 17:00 ngày mở thưởng.',
            style: TextStyle(
              fontSize: 12.5,
              height: 1.55,
              color: _kDetailMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailBottomBar extends StatelessWidget {
  const _DetailBottomBar({required this.onAddToCart, required this.onBuyNow});

  final VoidCallback onAddToCart;
  final VoidCallback onBuyNow;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 18,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: onAddToCart,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: Color(0xFFF0B5AF)),
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: const Icon(Icons.shopping_cart_outlined, size: 18),
              label: const Text(
                'Thêm vào giỏ hàng',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: onBuyNow,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: const Icon(Icons.bolt_rounded, size: 18),
              label: const Text(
                'Mua ngay',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketBadge extends StatelessWidget {
  const _TicketBadge({required this.shortName, this.imageUrl});

  final String shortName;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.trim().isNotEmpty;
    final badgeContent = hasImage
        ? CachedNetworkImage(
            imageUrl: imageUrl!,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            errorWidget: (_, _, _) =>
                _TicketBadgeFallback(shortName: shortName),
            placeholder: (_, _) => const Center(
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
            ),
          )
        : _TicketBadgeFallback(shortName: shortName);

    return Container(
      width: 60,
      height: 60,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFFFE1D9)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12D31010),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF2CC), Color(0xFFFFB347)],
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFF6358), Color(0xFFD31010)],
          ),
        ),
        child: ClipOval(child: badgeContent),
      ),
    );
  }
}

class _TicketBadgeFallback extends StatelessWidget {
  const _TicketBadgeFallback({required this.shortName});

  final String shortName;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        shortName,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: 14,
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
      padding: EdgeInsets.zero,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
          child: Column(
            children: [
              const _ShimmerBox(height: 194, radius: 22),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const _ShimmerBox(width: 4, height: 24, radius: 999),
                  const SizedBox(width: 8),
                  const _ShimmerBox(width: 180, height: 18, radius: 8),
                  const Spacer(),
                  const _ShimmerBox(width: 64, height: 14, radius: 8),
                ],
              ),
              const SizedBox(height: 12),
              const _TicketListSkeleton(count: 5),
            ],
          ),
        ),
      ],
    );
  }
}

class _TicketListSkeleton extends StatelessWidget {
  const _TicketListSkeleton({this.count = 4});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (index) => const Padding(
          padding: EdgeInsets.only(bottom: 14),
          child: _TicketCardSkeleton(),
        ),
      ),
    );
  }
}

class _TicketCardSkeleton extends StatelessWidget {
  const _TicketCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 108,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1E3E0)),
      ),
      padding: const EdgeInsets.all(9),
      child: Row(
        children: [
          const _ShimmerBox(width: 90, height: 90, radius: 14),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ShimmerBox(width: 110, height: 12, radius: 6),
                SizedBox(height: 10),
                _ShimmerBox(width: 150, height: 24, radius: 8),
                SizedBox(height: 10),
                _ShimmerBox(width: 120, height: 12, radius: 6),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              SizedBox(height: 4),
              _ShimmerBox(width: 64, height: 14, radius: 6),
              Spacer(),
              _ShimmerBox(width: 76, height: 35, radius: 999),
            ],
          ),
        ],
      ),
    );
  }
}

class _ShimmerBox extends StatelessWidget {
  const _ShimmerBox({
    this.width,
    required this.height,
    this.radius = 12,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE9E2E1),
      highlightColor: const Color(0xFFF7F3F2),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
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
            const Text(
              'Khong tai duoc danh sach ve',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Thu lai'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BuyTicketHeader extends StatelessWidget {
  const _BuyTicketHeader({
    required this.onBack,
    required this.onOpenCart,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenCart;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 17),
          child: Row(
            children: [
              _HeaderSquareButton(
                icon: Icons.arrow_back_ios_new_rounded,
                onTap: onBack,
              ),
              Expanded(
                child: Text(
                  'Vé Đang Bán',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.barlow(
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -.2,
                  ),
                ),
              ),
              Consumer(
                builder: (context, ref, _) {
                  final isAuthenticated =
                      (ref.watch(apiClientProvider).accessToken ?? '').isNotEmpty;
                  if (!isAuthenticated) {
                    return const SizedBox(width: 42);
                  }
                  final count = ref.watch(cartTicketCountProvider);
                  return Row(
                    children: [
                      _HeaderSquareButton(
                        icon: Icons.shopping_cart_outlined,
                        onTap: onOpenCart,
                        badgeCount: count,
                      ),
                      Padding(
                        padding: const EdgeInsets.only(left: 9),
                        child: _HeaderSquareButton(
                          icon: Icons.chat_bubble_outline_rounded,
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
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderSquareButton extends StatelessWidget {
  const _HeaderSquareButton({
    required this.icon,
    required this.onTap,
    this.badgeCount = 0,
  });

  final IconData icon;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          if (badgeCount > 0)
            Positioned(
              right: -4,
              top: -4,
              child: Container(
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: AppColors.goldDark,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Center(
                  child: Text(
                    '$badgeCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
        ],
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
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.cardBorder,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : AppColors.ink,
          ),
        ),
      ),
    );
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF1E3E0)),
      ),
      child: const Column(
        children: [
          Image(
            image: AssetImage('assets/images/thantai.png'),
            height: 110,
            fit: BoxFit.contain,
          ),
          SizedBox(height: 12),
          Text(
            'Khong tim thay ve phu hop',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          SizedBox(height: 6),
          Text(
            'Hay thu doi ngay quay, bo loc hoac tu khoa tim kiem.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

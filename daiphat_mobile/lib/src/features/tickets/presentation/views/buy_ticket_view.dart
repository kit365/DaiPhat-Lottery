import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/cart/models/cart_item_model.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import '../viewmodels/buy_ticket_viewmodel.dart';

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
  const BuyTicketView({super.key});

  @override
  ConsumerState<BuyTicketView> createState() => _BuyTicketViewState();
}

class _BuyTicketViewState extends ConsumerState<BuyTicketView> {
  bool _showHardcodedTicket = false;

  void _toggleHardcodedTicket() {
    setState(() {
      _showHardcodedTicket = !_showHardcodedTicket;
    });
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
    );

    ref.read(cartProvider.notifier).addItem(cartItem);

    if (openCheckout) {
      context.pushNamed(AppRoute.checkout.name);
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Text('Da them ${ticket.code} vao gio hang'),
          action: SnackBarAction(
            label: 'Xem gio hang',
            onPressed: () => context.push('/cart'),
          ),
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
            showHardcodedTicket: _showHardcodedTicket,
            onToggleDemo: _toggleHardcodedTicket,
            onBack: () => context.go(AppRoute.home.path),
            onOpenCart: () => context.push('/cart'),
          ),
          Expanded(
            child: state.when(
              data: (data) => _LoadedView(
                state: data,
                viewModel: viewModel,
                showHardcodedTicket: _showHardcodedTicket,
                onOpenDetail: (ticket) => _openTicketDetail(context, ticket),
                onBuyNow: (ticket) =>
                    _addToCart(context, ticket, openCheckout: true),
              ),
              loading: () => const _LoadingState(),
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

class _LoadedView extends StatelessWidget {
  const _LoadedView({
    required this.state,
    required this.viewModel,
    required this.showHardcodedTicket,
    required this.onOpenDetail,
    required this.onBuyNow,
  });

  final BuyTicketState state;
  final BuyTicketViewModel viewModel;
  final bool showHardcodedTicket;
  final ValueChanged<LotteryTicketListItem> onOpenDetail;
  final ValueChanged<LotteryTicketListItem> onBuyNow;

  @override
  Widget build(BuildContext context) {
    final tickets = state.filteredTickets;
    final demoTicket = _buildHardcodedTicket(state.selectedDay);

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        _BuyTicketShowcase(
          initialValue: state.searchQuery,
          onChanged: viewModel.updateSearchQuery,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _DaySegmentedControl(
                selectedDay: state.selectedDay,
                isTodaySellClosed: state.isTodaySellClosed,
                onSelectToday: () => viewModel.selectDay(TicketDayFilter.today),
                onSelectTomorrow: () =>
                    viewModel.selectDay(TicketDayFilter.tomorrow),
              ),
              const SizedBox(height: 18),
              _ProvinceFilterStrip(
                provinces: state.provinces,
                selectedProvince: state.selectedProvince,
                onSelectProvince: viewModel.selectProvince,
              ),
              const SizedBox(height: 22),
              if (showHardcodedTicket) ...[
                const _DemoTicketBanner(),
                const SizedBox(height: 24),
              ],
              _TicketSectionHeader(
                title: 'Danh sách vé đang mở bán',
                count: tickets.length + (showHardcodedTicket ? 1 : 0),
              ),
              const SizedBox(height: 12),
              if (showHardcodedTicket)
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _TicketCard(
                    ticket: demoTicket,
                    isDemo: true,
                    onTap: () => onOpenDetail(demoTicket),
                    onBuyNow: () => onBuyNow(demoTicket),
                  ),
                ),
              ...tickets.map(
                (ticket) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _TicketCard(
                    ticket: ticket,
                    onTap: () => onOpenDetail(ticket),
                    onBuyNow: () => onBuyNow(ticket),
                  ),
                ),
              ),
              if (tickets.isEmpty) const _EmptyState(),
            ],
          ),
        ),
      ],
    );
  }
}

class _BuyTicketShowcase extends StatelessWidget {
  const _BuyTicketShowcase({
    required this.initialValue,
    required this.onChanged,
  });

  final String initialValue;
  final ValueChanged<String> onChanged;

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
                  onChanged: onChanged,
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

LotteryTicketListItem _buildHardcodedTicket(TicketDayFilter selectedDay) {
  final now = DateTime.now();
  final baseDate = DateTime(now.year, now.month, now.day);
  final drawDate = selectedDay == TicketDayFilter.today
      ? baseDate
      : baseDate.add(const Duration(days: 1));
  final dayLabel = selectedDay == TicketDayFilter.today
      ? 'Hôm nay'
      : 'Ngày mai';

  return LotteryTicketListItem(
    id: -999,
    displayName: 'Ve UI mau',
    code: '123456',
    shortName: 'UI',
    dateLabel: '$dayLabel - ${DateFormat('dd/MM/yyyy').format(drawDate)}',
    dayFilter: selectedDay,
    drawDate: drawDate,
    status: 'IN_STOCK',
    statusDisplayName: 'Demo',
    stationName: 'Ve hardcode de canh chinh UI',
    serialNumber: 'UI-000001',
    batchCode: 'DEMO',
    imageUrl: null,
    price: 10000,
  );
}

LotteryTicketListItem _buildHardcodedTicketDetail(
  LotteryTicketListItem baseTicket,
) {
  return LotteryTicketListItem(
    id: baseTicket.id,
    displayName: 'Ve so kien thiet Dai Phat',
    code: baseTicket.code,
    shortName: baseTicket.shortName,
    dateLabel: baseTicket.dateLabel,
    dayFilter: baseTicket.dayFilter,
    drawDate: baseTicket.drawDate,
    status: 'IN_STOCK',
    statusDisplayName: 'San sang mo phong UI',
    stationName: 'Dai Phat Demo Station',
    serialNumber: 'DP-UI-2026-0001',
    batchCode: 'UI-DEMO-44',
    imageUrl: baseTicket.imageUrl,
    price: 10000,
  );
}

class _DemoTicketBanner extends StatelessWidget {
  const _DemoTicketBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE27A),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE4BF44)),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline_rounded, size: 24, color: Color(0xFF161616)),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Lưu ý: Đây là vé demo trải nghiệm hệ thống.',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: Color(0xFF161616),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatefulWidget {
  const _SearchField({required this.initialValue, required this.onChanged});

  final String initialValue;
  final ValueChanged<String> onChanged;

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
    if (widget.initialValue != _controller.text) {
      _controller.text = widget.initialValue;
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
        suffixIcon: const Icon(
          Icons.tune_rounded,
          color: Color(0xFFC51A27),
          size: 21,
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

class _TicketHeroBanner extends StatelessWidget {
  const _TicketHeroBanner();

  static const double height = 194;
  static const String _bannerImageAsset = 'assets/images/hero_banner.jpg';
  static const String _bannerTitle = 'Nhận may mắn\nliền tay';
  static const String _bannerCtaLabel = 'Khám phá ngay';

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
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
          Image.asset(_bannerImageAsset, fit: BoxFit.cover),
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
                const Text(
                  'Mua vé ngay hôm nay',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 5),
                const SizedBox(
                  width: 188,
                  child: Text(
                    _bannerTitle,
                    style: TextStyle(
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
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _bannerCtaLabel,
                        style: TextStyle(
                          color: Color(0xFF8B1118),
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(width: 5),
                      Icon(
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
          Positioned(
            bottom: 10,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var index = 0; index < 5; index++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: index == 0 ? 15 : 5,
                    height: 5,
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    decoration: BoxDecoration(
                      color: index == 0
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
    required this.onSelectToday,
    required this.onSelectTomorrow,
  });

  final TicketDayFilter selectedDay;
  final bool isTodaySellClosed;
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
                                Icon(
                                  Icons.calendar_today_outlined,
                                  size: 15,
                                  color: isTodaySellClosed
                                      ? disabledTextColor
                                      : selectedDay == TicketDayFilter.today
                                      ? selectedTextColor
                                      : unselectedTextColor,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isTodaySellClosed
                                      ? 'Hôm nay (đóng)'
                                      : 'Hôm nay',
                                  style: TextStyle(
                                    fontSize: isTodaySellClosed ? 12 : 14,
                                    fontWeight: FontWeight.w700,
                                    color: isTodaySellClosed
                                        ? disabledTextColor
                                        : selectedDay == TicketDayFilter.today
                                        ? selectedTextColor
                                        : unselectedTextColor,
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
                          onTap: onSelectTomorrow,
                          hoverColor: trackColor,
                          focusColor: trackColor,
                          highlightColor: trackColor,
                          splashColor: Colors.transparent,
                          borderRadius: BorderRadius.circular(999),
                          child: Center(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.calendar_today_outlined,
                                  size: 15,
                                  color: selectedDay == TicketDayFilter.tomorrow
                                      ? selectedTextColor
                                      : unselectedTextColor,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Ngày mai',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color:
                                        selectedDay == TicketDayFilter.tomorrow
                                        ? selectedTextColor
                                        : unselectedTextColor,
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
  const _TicketSectionHeader({required this.title, required this.count});

  final String title;
  final int count;

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
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              count > 0 ? 'Xem tất cả' : '0 vé',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
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
      ],
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({
    required this.ticket,
    required this.onTap,
    required this.onBuyNow,
    this.isDemo = false,
  });

  final LotteryTicketListItem ticket;
  final VoidCallback onTap;
  final VoidCallback onBuyNow;
  final bool isDemo;

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
                child: _TicketThumb(ticket: ticket, isDemo: isDemo),
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
                  padding: const EdgeInsets.fromLTRB(8, 13, 10, 10),
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
                      SizedBox(
                        height: 35,
                        child: ElevatedButton(
                          onPressed: onBuyNow,
                          style: ElevatedButton.styleFrom(
                            elevation: 0,
                            backgroundColor: const Color(0xFFE51B29),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          child: const Text(
                            'Mua ngay',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
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
  const _TicketThumb({required this.ticket, required this.isDemo});

  final LotteryTicketListItem ticket;
  final bool isDemo;

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
              errorWidget: (_, _, _) => _TicketThumbFallback(
                shortName: ticket.shortName,
                isDemo: isDemo,
              ),
            )
          : _TicketThumbFallback(shortName: ticket.shortName, isDemo: isDemo),
    );
  }
}

class _TicketThumbFallback extends StatelessWidget {
  const _TicketThumbFallback({required this.shortName, required this.isDemo});

  final String shortName;
  final bool isDemo;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDemo
              ? const [Color(0xFFFFE4B8), Color(0xFFF8B94C)]
              : const [Color(0xFFFFF1EF), Color(0xFFFFD5C8)],
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

class TicketDetailView extends ConsumerWidget {
  const TicketDetailView({super.key, required this.ticket});

  final LotteryTicketListItem ticket;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isHardcodedTicket = ticket.id < 0;
    final ticketDetailAsync = isHardcodedTicket
        ? AsyncValue.data(_buildHardcodedTicketDetail(ticket))
        : ref.watch(lotteryTicketDetailProvider(ticket.id));
    final resolvedTicket = ticketDetailAsync.asData?.value ?? ticket;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Chi tiet ve so',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 22,
            color: AppColors.ink,
          ),
        ),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go(AppRoute.buyTicket.path);
            }
          },
        ),
        actions: const [
          _HeaderIcon(icon: Icons.favorite_border_rounded),
          SizedBox(width: 4),
          _HeaderIcon(icon: Icons.share_outlined),
          SizedBox(width: 10),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFFBF8), Color(0xFFFFF1EB)],
          ),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            child: Column(
              children: [
                Expanded(
                  child: ListView(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(26),
                          border: Border.all(color: const Color(0xFFFFD4CC)),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x12000000),
                              blurRadius: 20,
                              offset: Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _TicketBadge(
                                  shortName: resolvedTicket.shortName,
                                  imageUrl: resolvedTicket.imageUrl,
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        resolvedTicket.titleText,
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.ink,
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: _TicketMeta(
                                              label: 'Ngay quay thuong',
                                              value: _detailDate(
                                                resolvedTicket,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            width: 1,
                                            height: 36,
                                            color: const Color(0xFFF0D8D1),
                                          ),
                                          Expanded(
                                            child: _TicketMeta(
                                              label: 'Gia ve',
                                              value: _formatTicketPrice(
                                                resolvedTicket.price,
                                              ),
                                              highlight: true,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBFA),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: AppColors.primary,
                                  width: 1.6,
                                ),
                              ),
                              child: Text(
                                resolvedTicket.code,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 34,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 3,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE6F8EC),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.check_circle_rounded,
                                    size: 18,
                                    color: Color(0xFF12985E),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    resolvedTicket.statusDisplayName,
                                    style: const TextStyle(
                                      color: Color(0xFF12985E),
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFF1E3E0)),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x0F000000),
                              blurRadius: 18,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            _InfoRow(
                              icon: Icons.storefront_outlined,
                              label: 'San pham',
                              value: resolvedTicket.titleText,
                            ),
                            _InfoRow(
                              icon: Icons.location_on_outlined,
                              label: 'Dai quay',
                              value: resolvedTicket.stationDisplayText,
                            ),
                            _InfoRow(
                              icon: Icons.calendar_month_outlined,
                              label: 'Ngay quay thuong',
                              value: _detailDate(resolvedTicket),
                            ),
                            _InfoRow(
                              icon: Icons.confirmation_number_outlined,
                              label: 'Serial',
                              value: resolvedTicket.serialNumber ?? '-',
                            ),
                            _InfoRow(
                              icon: Icons.sell_outlined,
                              label: 'Gia tien',
                              value: _formatTicketPrice(resolvedTicket.price),
                              highlight: true,
                            ),
                            _InfoRow(
                              icon: Icons.pin_outlined,
                              label: 'Day so',
                              value: resolvedTicket.code,
                              highlight: true,
                            ),
                            _InfoRow(
                              icon: Icons.verified_outlined,
                              label: 'Trang thai',
                              value: resolvedTicket.statusDisplayName,
                              isLast: true,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (ticketDetailAsync.isLoading)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: LinearProgressIndicator(
                      color: AppColors.primary,
                      backgroundColor: Color(0xFFFFE1D9),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          final cartItem = CartItemData(
                            lotteryTicketId: resolvedTicket.id,
                            province: resolvedTicket.stationDisplayText,
                            dateLabel: _detailDate(resolvedTicket),
                            drawTime: '',
                            kyHieu: resolvedTicket.batchCode ?? '',
                            number: resolvedTicket.code,
                            quantity: 1,
                            unitPrice: resolvedTicket.price ?? 0,
                            logoText: resolvedTicket.shortName,
                          );
                          ref.read(cartProvider.notifier).addItem(cartItem);
                          ScaffoldMessenger.of(context)
                            ..hideCurrentSnackBar()
                            ..showSnackBar(
                              SnackBar(
                                behavior: SnackBarBehavior.floating,
                                content: Text(
                                  'Da them ${resolvedTicket.code} vao gio hang',
                                ),
                                action: SnackBarAction(
                                  label: 'Xem gio hang',
                                  onPressed: () => context.push('/cart'),
                                ),
                              ),
                            );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        icon: const Icon(Icons.shopping_cart_outlined),
                        label: const Text(
                          'Them vao gio hang',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          final cartItem = CartItemData(
                            lotteryTicketId: resolvedTicket.id,
                            province: resolvedTicket.stationDisplayText,
                            dateLabel: _detailDate(resolvedTicket),
                            drawTime: '',
                            kyHieu: resolvedTicket.batchCode ?? '',
                            number: resolvedTicket.code,
                            quantity: 1,
                            unitPrice: resolvedTicket.price ?? 0,
                            logoText: resolvedTicket.shortName,
                          );
                          ref.read(cartProvider.notifier).addItem(cartItem);
                          context.pushNamed(AppRoute.checkout.name);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        icon: const Icon(Icons.bolt_rounded),
                        label: const Text(
                          'Mua ngay',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _detailDate(LotteryTicketListItem ticket) {
    final label = ticket.dayFilter == TicketDayFilter.today
        ? 'Hom nay'
        : 'Ngay mai';
    return '${DateFormat('dd/MM/yyyy').format(ticket.drawDate)} ($label)';
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5F3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: AppColors.primary, size: 20),
    );
  }
}

class _TicketMeta extends StatelessWidget {
  const _TicketMeta({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              color: highlight ? AppColors.primary : AppColors.ink,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.highlight = false,
    this.isLast = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool highlight;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(bottom: BorderSide(color: Color(0xFFF2E7E3))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1EF),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
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
                fontSize: 15,
                color: highlight ? AppColors.primary : AppColors.ink,
                fontWeight: highlight ? FontWeight.w800 : FontWeight.w600,
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

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(color: AppColors.primary),
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
    required this.showHardcodedTicket,
    required this.onToggleDemo,
    required this.onBack,
    required this.onOpenCart,
  });

  final bool showHardcodedTicket;
  final VoidCallback onToggleDemo;
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
                  final count = ref.watch(cartTicketCountProvider);
                  return _HeaderSquareButton(
                    icon: Icons.shopping_cart_outlined,
                    onTap: onOpenCart,
                    badgeCount: count,
                  );
                },
              ),
              const SizedBox(width: 9),
              _HeaderSquareButton(
                icon: Icons.notifications_none_rounded,
                onTap: () => context.push(AppRoute.notifications.path),
                onLongPress: onToggleDemo,
                badgeCount: showHardcodedTicket ? 1 : 0,
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
    this.onLongPress,
  });

  final IconData icon;
  final VoidCallback onTap;
  final int badgeCount;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
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

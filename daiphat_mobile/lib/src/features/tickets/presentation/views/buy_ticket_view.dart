import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';

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
      backgroundColor: const Color(0xFFFFFCFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Vé Đang Bán',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 21,
            color: Colors.black,
          ),
        ),
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: _HeaderActionButton(
            icon: Icons.arrow_back_ios_new_rounded,
            iconColor: Colors.black,
            onTap: () => context.go(AppRoute.home.path),
          ),
        ),
        leadingWidth: 56,
        actions: [
          _HeaderActionButton(
            icon: Icons.shopping_cart_outlined,
            iconColor: Colors.black,
            onTap: () => context.push('/cart'),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: _showHardcodedTicket ? 'An ve demo' : 'Hien ve demo',
            onPressed: () {
              _toggleHardcodedTicket();
            },
            icon: Icon(
              _showHardcodedTicket
                  ? Icons.visibility_off_rounded
                  : Icons.visibility_rounded,
              color: const Color(0xFF5D3F3C),
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
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
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        _SearchField(
          initialValue: state.searchQuery,
          onChanged: (value) {
            viewModel.updateSearchQuery(value);
          },
        ),
        const SizedBox(height: 20),
        const _TicketHeroBanner(),
        const SizedBox(height: 20),
        _DaySegmentedControl(
          selectedDay: state.selectedDay,
          isTodaySellClosed: state.isTodaySellClosed,
          onSelectToday: () => viewModel.selectDay(TicketDayFilter.today),
          onSelectTomorrow: () => viewModel.selectDay(TicketDayFilter.tomorrow),
        ),
        const SizedBox(height: 20),
        if (showHardcodedTicket) ...[
          const _DemoTicketBanner(),
          const SizedBox(height: 22),
        ],
        const _TicketSectionHeader(title: 'Danh Sách Vé Đang Mở Bán'),
        const SizedBox(height: 16),
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
        hintStyle: const TextStyle(color: Color(0xFF9C9C9C), fontSize: 15.5),
        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF7B6F6B)),
        filled: true,
        fillColor: const Color(0xFFF5F5F5),
        contentPadding: const EdgeInsets.symmetric(vertical: 16),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: Color(0xFFF5F5F5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: Color(0xFFE4DAD6), width: 1.1),
        ),
      ),
    );
  }
}

class _TicketHeroBanner extends StatelessWidget {
  const _TicketHeroBanner();

  static const String _bannerImageAsset = 'assets/images/home_bg.png';
  static const String _bannerTitle =
      'Mua vé ngay hôm nay -\nNhận may mắn liền tay';
  static const String _bannerCtaLabel = 'Khám Phá Ngay';

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 188,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE8D9D4), width: 1.2),
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
                  const Color(0xFF8E0B10).withValues(alpha: 0.98),
                  const Color(0xFFBF1B1F).withValues(alpha: 0.84),
                  const Color(0xFFD64A3B).withValues(alpha: 0.35),
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
                const SizedBox(
                  width: 188,
                  child: Text(
                    _bannerTitle,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      height: 1.28,
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
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: const Color(0xFFF0C5C2),
                      width: 1.0,
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x12000000),
                        blurRadius: 10,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Text(
                    _bannerCtaLabel,
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
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
    const selectedTextColor = AppColors.primary;
    const unselectedTextColor = Color(0xFF5C4A45);
    const disabledTextColor = Color(0xFFB0A5A1);
    const trackColor = Color(0xFFF0F0F0);

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
          height: 58,
          padding: const EdgeInsets.all(outerPadding),
          decoration: BoxDecoration(
            color: trackColor,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFFDCDCDC), width: 1.0),
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
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.white, Color(0xFFFFF9F8)],
                    ),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: const Color(0xFFF2D0C8),
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
                            child: Text(
                              isTodaySellClosed
                                  ? 'Hôm Nay (đóng)'
                                  : 'Hôm Nay',
                              style: TextStyle(
                                fontSize: isTodaySellClosed ? 13 : 15,
                                fontWeight: FontWeight.w700,
                                color: isTodaySellClosed
                                    ? disabledTextColor
                                    : selectedDay == TicketDayFilter.today
                                    ? selectedTextColor
                                    : unselectedTextColor,
                              ),
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
                            child: Text(
                              'Ngày Mai',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: selectedDay == TicketDayFilter.tomorrow
                                    ? selectedTextColor
                                    : unselectedTextColor,
                              ),
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

class _TicketSectionHeader extends StatelessWidget {
  const _TicketSectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.black,
          ),
        ),
        const Spacer(),
        const Text(
          'Xem tất cả',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
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
    return Container(
      decoration: const BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Color(0x18000000),
            blurRadius: 20,
            spreadRadius: -8,
            offset: Offset(0, 8),
          ),
          BoxShadow(
            color: Color(0x09000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: ClipPath(
        clipper: _TicketCardClipper(),
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              color: const Color(0xFFF9F8F4),
              border: Border.all(color: const Color(0xFFE8E4DD), width: 1.1),
            ),
            child: InkWell(
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _TicketThumb(ticket: ticket, isDemo: isDemo),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            ticket.stationDisplayText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF2A2A2A),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            ticket.code,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.4,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _compactPrice(ticket.price),
                            style: const TextStyle(
                              fontSize: 17,
                              color: Color(0xFF111111),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      height: 46,
                      child: ElevatedButton(
                        onPressed: onBuyNow,
                        style: ElevatedButton.styleFrom(
                          elevation: 0,
                          shadowColor: Colors.transparent,
                          backgroundColor: const Color(0xFFD4121B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        child: const Text(
                          'Mua ngay',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TicketCardClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final outer = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          const Radius.circular(28),
        ),
      );

    final notchRadius = size.height * 0.08;
    final cutouts = Path()
      ..addOval(
        Rect.fromCircle(
          center: Offset(0, size.height * 0.5),
          radius: notchRadius,
        ),
      )
      ..addOval(
        Rect.fromCircle(
          center: Offset(size.width, size.height * 0.5),
          radius: notchRadius,
        ),
      );

    return Path.combine(PathOperation.difference, outer, cutouts);
  }

  @override
  bool shouldReclip(covariant _TicketCardClipper oldClipper) => false;
}

class _TicketThumb extends StatelessWidget {
  const _TicketThumb({required this.ticket, required this.isDemo});

  final LotteryTicketListItem ticket;
  final bool isDemo;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(18),
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

class _HeaderActionButton extends StatelessWidget {
  const _HeaderActionButton({
    required this.icon,
    required this.iconColor,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFEDEDED), width: 1.4),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
      ),
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
          Icon(
            Icons.confirmation_number_outlined,
            size: 42,
            color: Color(0xFF94A3B8),
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

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
    symbol: 'd',
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
    symbol: 'd',
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
  bool _showHardcodedTicket = true;

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
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Tickets for Sale',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 21,
            color: AppColors.primary,
          ),
        ),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: Color(0xFF5D3F3C),
          ),
          onPressed: () => context.go(AppRoute.home.path),
        ),
        actions: [
          IconButton(
            onPressed: () => context.push('/cart'),
            icon: const Icon(
              Icons.shopping_cart_outlined,
              color: AppColors.primary,
            ),
          ),
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
            onBuyNow: (ticket) => _addToCart(context, ticket, openCheckout: true),
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
      ? 'Hom nay'
      : 'Ngay mai';
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
          onSelectToday: () => viewModel.selectDay(TicketDayFilter.today),
          onSelectTomorrow: () => viewModel.selectDay(TicketDayFilter.tomorrow),
        ),
        const SizedBox(height: 20),
        if (showHardcodedTicket) ...[
          const _DemoTicketBanner(),
          const SizedBox(height: 22),
        ],
        const _TicketSectionHeader(title: 'Danh sach ve mo ban'),
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
      ? 'Hom nay'
      : 'Ngay mai';

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
          Icon(
            Icons.info_outline_rounded,
            size: 24,
            color: Color(0xFF161616),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Luu y: Day la ve demo trai nghiem he thong.',
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
        hintText: 'Tim kiem ve...',
        hintStyle: const TextStyle(
          color: Color(0xFFA78E8A),
          fontSize: 16,
        ),
        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF6B4E49)),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 16),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(999),
          borderSide: const BorderSide(color: Color(0xFFE6E8EC)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(999),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.2),
        ),
      ),
    );
  }
}

class _TicketHeroBanner extends StatelessWidget {
  const _TicketHeroBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 188,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14101828),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/images/hero_mobile.jpg', fit: BoxFit.cover),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  const Color(0xFF78000B).withValues(alpha: 0.98),
                  const Color(0xFFAE0817).withValues(alpha: 0.88),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(
                  width: 210,
                  child: Text(
                    'Mua ve ngay hom nay - Nhan may man lien tay',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      height: 1.35,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD30016),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'KHAM PHA NGAY',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
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
    required this.onSelectToday,
    required this.onSelectTomorrow,
  });

  final TicketDayFilter selectedDay;
  final VoidCallback onSelectToday;
  final VoidCallback onSelectTomorrow;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFFE7E8EC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        children: [
          Expanded(
            child: _SegmentButton(
              label: 'Hom nay',
              selected: selectedDay == TicketDayFilter.today,
              onTap: onSelectToday,
            ),
          ),
          Expanded(
            child: _SegmentButton(
              label: 'Ngay mai',
              selected: selectedDay == TicketDayFilter.tomorrow,
              onTap: onSelectTomorrow,
            ),
          ),
        ],
      ),
    );
  }
}

class _SegmentButton extends StatelessWidget {
  const _SegmentButton({
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
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 10,
                    offset: Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: selected ? AppColors.primary : const Color(0xFF5D3F3C),
          ),
        ),
      ),
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
        Container(
          width: 5,
          height: 34,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
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
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFEDEEF2)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0F101828),
                blurRadius: 14,
                offset: Offset(0, 6),
              ),
            ],
          ),
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
                    children: [
                      Text(
                        ticket.stationDisplayText,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF5D3F3C),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ticket.code,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _buildTicketMetaLine(ticket),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF5D3F3C),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _compactPrice(ticket.price),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      height: 42,
                      child: ElevatedButton(
                        onPressed: onBuyNow,
                        style: ElevatedButton.styleFrom(
                          elevation: 0,
                          backgroundColor: const Color(0xFFD30016),
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _buildTicketMetaLine(LotteryTicketListItem ticket) {
  if (ticket.id < 0) {
    return 'Ngay quay: ${DateFormat('dd-MM-yyyy').format(ticket.drawDate)}';
  }

  final serial = ticket.serialNumber?.trim();
  if (serial != null && serial.isNotEmpty) {
    return 'Serial: $serial';
  }

  final batch = ticket.batchCode?.trim();
  if (batch != null && batch.isNotEmpty) {
    return 'Ky quay #$batch';
  }

  return 'Ngay quay: ${DateFormat('dd-MM-yyyy').format(ticket.drawDate)}';
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
                if (ticketDetailAsync.hasError)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      'Khong tai duoc chi tiet moi nhat, dang hien thi du lieu tu danh sach.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
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

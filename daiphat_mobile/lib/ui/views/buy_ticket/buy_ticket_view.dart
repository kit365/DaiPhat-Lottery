import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/buy_ticket_viewmodel.dart';

class BuyTicketView extends ConsumerWidget {
  const BuyTicketView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(buyTicketViewModelProvider);
    final viewModel = ref.read(buyTicketViewModelProvider.notifier);
    final tickets = state.filteredTickets;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Vé số đang mở bán',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 22,
            color: AppColors.ink,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.go(AppRoute.home.path),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.tune_rounded, color: AppColors.primary),
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFFBF8), Color(0xFFFFF2ED)],
          ),
        ),
        child: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              _SearchField(
                initialValue: state.searchQuery,
                onChanged: viewModel.updateSearchQuery,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    flex: 11,
                    child: _ProvinceFilter(
                      provinces: state.provinces,
                      selectedProvince: state.selectedProvince,
                      onChanged: viewModel.selectProvince,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 10,
                    child: _DateChip(
                      title: 'Hôm nay',
                      date: '09/02/2025',
                      isSelected: state.selectedDay == TicketDayFilter.today,
                      onTap: () => viewModel.selectDay(TicketDayFilter.today),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 10,
                    child: _DateChip(
                      title: 'Ngày mai',
                      date: '10/02/2025',
                      isSelected:
                          state.selectedDay == TicketDayFilter.tomorrow,
                      onTap: () => viewModel.selectDay(TicketDayFilter.tomorrow),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _ResultSummary(
                visibleCount: tickets.length,
                matchedCount: tickets.length,
              ),
              const SizedBox(height: 14),
              ...tickets.map(
                (ticket) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _TicketCard(ticket: ticket),
                ),
              ),
              if (tickets.isEmpty) const _EmptyState(),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchField extends StatefulWidget {
  const _SearchField({
    required this.initialValue,
    required this.onChanged,
  });

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
      keyboardType: TextInputType.number,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      ),
      decoration: InputDecoration(
        hintText: 'Nhập dãy số (tối đa 6 chữ số)',
        hintStyle: const TextStyle(color: Color(0xFF9CA3AF)),
        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF6B7280)),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 18),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0xFFE8E8EE)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
        ),
      ),
    );
  }
}

class _ProvinceFilter extends StatelessWidget {
  const _ProvinceFilter({
    required this.provinces,
    required this.selectedProvince,
    required this.onChanged,
  });

  final List<String> provinces;
  final String selectedProvince;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE8E8EE)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selectedProvince,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded),
          borderRadius: BorderRadius.circular(18),
          style: const TextStyle(
            color: AppColors.ink,
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
          items: provinces
              .map(
                (province) => DropdownMenuItem<String>(
                  value: province,
                  child: Row(
                    children: [
                      const Icon(
                        Icons.storefront_outlined,
                        size: 18,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      Flexible(child: Text(province)),
                    ],
                  ),
                ),
              )
              .toList(),
          onChanged: (value) {
            if (value != null) {
              onChanged(value);
            }
          },
        ),
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  const _DateChip({
    required this.title,
    required this.date,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String date;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE8E8EE),
            width: isSelected ? 1.4 : 1,
          ),
          boxShadow: isSelected
              ? const [
                  BoxShadow(
                    color: Color(0x14D31010),
                    blurRadius: 16,
                    offset: Offset(0, 6),
                  ),
                ]
              : null,
        ),
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: isSelected ? AppColors.primary : AppColors.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              date,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultSummary extends StatelessWidget {
  const _ResultSummary({
    required this.visibleCount,
    required this.matchedCount,
  });

  final int visibleCount;
  final int matchedCount;

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
          'Hiển thị $visibleCount vé',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        Text(
          '$matchedCount vé phù hợp',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.ticket});

  final LotteryTicketListItem ticket;

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: 'đ',
      decimalDigits: 0,
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () {},
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFF1E3E0)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x12000000),
                blurRadius: 18,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                _TicketBadge(shortName: ticket.shortName),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.province,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        ticket.dateLabel,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${currencyFormatter.format(ticket.price)} / vé',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBFA),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppColors.primary,
                          width: 1.5,
                        ),
                      ),
                      child: Text(
                        ticket.code,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: Color(0xFF94A3B8),
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

class _TicketBadge extends StatelessWidget {
  const _TicketBadge({required this.shortName});

  final String shortName;

  @override
  Widget build(BuildContext context) {
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
        child: Center(
          child: Text(
            shortName,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 14,
            ),
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
          Icon(
            Icons.confirmation_number_outlined,
            size: 42,
            color: Color(0xFF94A3B8),
          ),
          SizedBox(height: 12),
          Text(
            'Không tìm thấy vé phù hợp',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          SizedBox(height: 6),
          Text(
            'Hãy thử đổi ngày quay thưởng, đài hoặc dãy số cần tìm.',
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

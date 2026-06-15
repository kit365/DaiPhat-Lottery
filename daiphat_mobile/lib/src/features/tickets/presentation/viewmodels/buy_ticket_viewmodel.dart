import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/models/lottery_ticket.dart';
import '../../data/repositories/lottery_ticket_repository.dart';
import '../../data/services/lottery_ticket_api_service.dart';

enum TicketDayFilter { today, tomorrow }

class LotteryTicketListItem {
  const LotteryTicketListItem({
    required this.id,
    required this.displayName,
    required this.code,
    required this.shortName,
    required this.dateLabel,
    required this.dayFilter,
    required this.drawDate,
    required this.status,
    required this.statusDisplayName,
    this.stationName,
    this.serialNumber,
    this.batchCode,
    this.imageUrl,
    this.price,
  });

  final int id;
  final String displayName;
  final String code;
  final String shortName;
  final String dateLabel;
  final TicketDayFilter dayFilter;
  final DateTime drawDate;
  final String status;
  final String statusDisplayName;
  final String? stationName;
  final String? serialNumber;
  final String? batchCode;
  final String? imageUrl;
  final int? price;

  String get stationDisplayText {
    final value = stationName?.trim();
    if (value == null || value.isEmpty) {
      return 'Dang cap nhat';
    }
    return value;
  }

  String get titleText {
    final value = displayName.trim();
    if (value.isEmpty) {
      return stationDisplayText;
    }
    return value;
  }
}

class BuyTicketState {
  const BuyTicketState({
    required this.searchQuery,
    required this.selectedProvince,
    required this.selectedDay,
    required this.onlyInStock,
    required this.tickets,
  });

  final String searchQuery;
  final String selectedProvince;
  final TicketDayFilter selectedDay;
  final bool onlyInStock;
  final List<LotteryTicketListItem> tickets;

  List<String> get provinces => <String>{
    'Tat ca dai',
    ...tickets.map((ticket) => ticket.stationDisplayText),
  }.toList();

  List<LotteryTicketListItem> get filteredTickets {
    return tickets.where((ticket) {
      final matchesDay = ticket.dayFilter == selectedDay;
      final matchesStock = !onlyInStock || ticket.status == 'IN_STOCK';
      return matchesDay && matchesStock;
    }).toList();
  }

  String get todayLabel => _formatDate(_targetDate(TicketDayFilter.today));

  String get tomorrowLabel =>
      _formatDate(_targetDate(TicketDayFilter.tomorrow));

  BuyTicketState copyWith({
    String? searchQuery,
    String? selectedProvince,
    TicketDayFilter? selectedDay,
    bool? onlyInStock,
    List<LotteryTicketListItem>? tickets,
  }) {
    return BuyTicketState(
      searchQuery: searchQuery ?? this.searchQuery,
      selectedProvince: selectedProvince ?? this.selectedProvince,
      selectedDay: selectedDay ?? this.selectedDay,
      onlyInStock: onlyInStock ?? this.onlyInStock,
      tickets: tickets ?? this.tickets,
    );
  }

  static DateTime _targetDate(TicketDayFilter filter) {
    final now = DateTime.now();
    final base = DateTime(now.year, now.month, now.day);
    return filter == TicketDayFilter.today
        ? base
        : base.add(const Duration(days: 1));
  }

  static String _formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy').format(date);
  }
}

final lotteryTicketApiServiceProvider = Provider<LotteryTicketApiService>((
  ref,
) {
  return LotteryTicketApiService(ref.watch(apiClientProvider));
});

final lotteryTicketRepositoryProvider = Provider<LotteryTicketRepository>((
  ref,
) {
  return LotteryTicketRepository(ref.watch(lotteryTicketApiServiceProvider));
});

final lotteryTicketDetailProvider =
    FutureProvider.family<LotteryTicketListItem, int>((ref, id) async {
      final repository = ref.read(lotteryTicketRepositoryProvider);
      final ticket = await repository.fetchTicketDetail(id);
      return mapLotteryTicketToListItem(ticket);
    });

final buyTicketViewModelProvider =
    AsyncNotifierProvider<BuyTicketViewModel, BuyTicketState>(
      BuyTicketViewModel.new,
    );

class BuyTicketViewModel extends AsyncNotifier<BuyTicketState> {
  @override
  FutureOr<BuyTicketState> build() async {
    return _load();
  }

  LotteryTicketRepository get _repository =>
      ref.read(lotteryTicketRepositoryProvider);

  Future<BuyTicketState> _load({
    String searchQuery = '',
    String selectedProvince = 'Tat ca dai',
    TicketDayFilter selectedDay = TicketDayFilter.today,
    bool onlyInStock = true,
  }) async {
    final tickets = await _repository.fetchOpenTickets(
      search: searchQuery.isEmpty ? null : searchQuery,
    );

    return BuyTicketState(
      searchQuery: searchQuery,
      selectedProvince: selectedProvince,
      selectedDay: selectedDay,
      onlyInStock: onlyInStock,
      tickets: tickets.map(mapLotteryTicketToListItem).toList(),
    );
  }

  Future<void> updateSearchQuery(String query) async {
    final current = state.asData?.value;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        searchQuery: query.trim(),
        selectedProvince: current?.selectedProvince ?? 'Tat ca dai',
        selectedDay: current?.selectedDay ?? TicketDayFilter.today,
        onlyInStock: current?.onlyInStock ?? true,
      ),
    );
  }

  void selectProvince(String province) {
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(selectedProvince: province));
  }

  void selectDay(TicketDayFilter day) {
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(selectedDay: day));
  }

  void toggleOnlyInStock() {
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(onlyInStock: !current.onlyInStock));
  }

  Future<void> refresh() async {
    final current = state.asData?.value;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        searchQuery: current?.searchQuery ?? '',
        selectedProvince: current?.selectedProvince ?? 'Tat ca dai',
        selectedDay: current?.selectedDay ?? TicketDayFilter.today,
        onlyInStock: current?.onlyInStock ?? true,
      ),
    );
  }
}

LotteryTicketListItem mapLotteryTicketToListItem(LotteryTicket ticket) {
  final drawDate = ticket.drawDate ?? DateTime.now();
  return LotteryTicketListItem(
    id: ticket.id,
    displayName: ticket.stationName,
    code: ticket.numbers,
    shortName: _buildShortName(ticket.stationName),
    dateLabel: _buildDateLabel(drawDate),
    dayFilter: _resolveDayFilter(drawDate),
    drawDate: drawDate,
    status: ticket.status,
    statusDisplayName: ticket.statusDisplayName,
    stationName: ticket.stationName,
    serialNumber: ticket.serialNumber,
    batchCode: ticket.batchCode,
    imageUrl: ticket.ticketImg,
    price: null,
  );
}

TicketDayFilter _resolveDayFilter(DateTime drawDate) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final tomorrow = today.add(const Duration(days: 1));
  final ticketDate = DateTime(drawDate.year, drawDate.month, drawDate.day);

  if (ticketDate == tomorrow) {
    return TicketDayFilter.tomorrow;
  }

  return TicketDayFilter.today;
}

String _buildDateLabel(DateTime drawDate) {
  final label = _resolveDayFilter(drawDate) == TicketDayFilter.today
      ? 'Hom nay'
      : 'Ngay mai';
  return '$label - ${DateFormat('dd/MM/yyyy').format(drawDate)}';
}

String _buildShortName(String input) {
  final words = input
      .trim()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty)
      .toList();

  if (words.isEmpty) return 'VS';
  if (words.length == 1) {
    final word = words.first;
    return word.substring(0, word.length < 2 ? word.length : 2).toUpperCase();
  }

  return words.take(2).map((word) => word[0]).join().toUpperCase();
}

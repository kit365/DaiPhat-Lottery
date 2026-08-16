import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/models/lottery_ticket.dart';
import '../../data/repositories/lottery_ticket_repository.dart';
import '../../data/services/lottery_ticket_api_service.dart';
import '../../utils/sellable_draw_date.dart';

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
    this.quantity = 0,
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
  final int quantity;

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
    required this.tickets,
  });

  final String searchQuery;
  final String selectedProvince;
  final TicketDayFilter selectedDay;
  final List<LotteryTicketListItem> tickets;

  bool get isTodaySellClosed => SellableDrawDate.isTodayDrawPassed();

  /// Ngày mai luôn mở bán (khớp web: sau 16:15 vẫn mua được vé ngày mai).
  bool get isTomorrowSellClosed => false;

  List<String> get provinces => <String>{
    'Tat ca dai',
    ...tickets.map((ticket) => ticket.stationDisplayText),
  }.toList();

  List<LotteryTicketListItem> get filteredTickets {
    return tickets.where((ticket) {
      final matchesProvince =
          selectedProvince == 'Tat ca dai' ||
          ticket.stationDisplayText == selectedProvince;
      return matchesProvince;
    }).toList();
  }

  String get todayLabel => _formatDate(SellableDrawDate.todayVn());

  String get tomorrowLabel => _formatDate(SellableDrawDate.tomorrowVn());

  BuyTicketState copyWith({
    String? searchQuery,
    String? selectedProvince,
    TicketDayFilter? selectedDay,
    List<LotteryTicketListItem>? tickets,
  }) {
    return BuyTicketState(
      searchQuery: searchQuery ?? this.searchQuery,
      selectedProvince: selectedProvince ?? this.selectedProvince,
      selectedDay: selectedDay ?? this.selectedDay,
      tickets: tickets ?? this.tickets,
    );
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
    return _load(selectedDay: _defaultDayFilter());
  }

  LotteryTicketRepository get _repository =>
      ref.read(lotteryTicketRepositoryProvider);

  TicketDayFilter _defaultDayFilter() {
    // Khớp web: trước 16:15 → hôm nay; sau 16:15 → ngày mai.
    return SellableDrawDate.isTodayDrawPassed()
        ? TicketDayFilter.tomorrow
        : TicketDayFilter.today;
  }

  String _drawDateIsoFor(TicketDayFilter day) {
    return day == TicketDayFilter.today
        ? SellableDrawDate.todayIsoVn()
        : SellableDrawDate.tomorrowIsoVn();
  }

  Future<BuyTicketState> _load({
    String searchQuery = '',
    String selectedProvince = 'Tat ca dai',
    TicketDayFilter selectedDay = TicketDayFilter.today,
  }) async {
    // Sau 16:15 không còn bán vé hôm nay → chuyển sang ngày mai.
    var day = selectedDay;
    if (day == TicketDayFilter.today && SellableDrawDate.isTodayDrawPassed()) {
      day = TicketDayFilter.tomorrow;
    }

    final trimmedSearch = searchQuery.trim();
    final tickets = await _repository.fetchOpenTickets(
      drawDate: _drawDateIsoFor(day),
      search: trimmedSearch.length >= 2 ? trimmedSearch : null,
    );

    return BuyTicketState(
      searchQuery: searchQuery,
      selectedProvince: selectedProvince,
      selectedDay: day,
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
        selectedDay: current?.selectedDay ?? _defaultDayFilter(),
      ),
    );
  }

  void selectProvince(String province) {
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(selectedProvince: province));
  }

  Future<void> selectDay(TicketDayFilter day) async {
    final current = state.asData?.value;
    if (current == null) return;
    // Sau 16:15 không mở bán vé hôm nay; ngày mai vẫn mua được.
    if (day == TicketDayFilter.today && SellableDrawDate.isTodayDrawPassed()) {
      return;
    }
    if (day == current.selectedDay) return;

    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        searchQuery: current.searchQuery,
        selectedProvince: current.selectedProvince,
        selectedDay: day,
      ),
    );
  }

  Future<void> applyQuery({
    String searchQuery = '',
    String? drawDateIso,
  }) async {
    var day = _defaultDayFilter();
    final iso = drawDateIso?.trim() ?? '';
    if (iso.isNotEmpty) {
      final today = SellableDrawDate.todayIsoVn();
      final tomorrow = SellableDrawDate.tomorrowIsoVn();
      if (iso.startsWith(tomorrow)) {
        day = TicketDayFilter.tomorrow;
      } else if (iso.startsWith(today) &&
          !SellableDrawDate.isTodayDrawPassed()) {
        day = TicketDayFilter.today;
      } else {
        day = TicketDayFilter.tomorrow;
      }
    }

    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        searchQuery: searchQuery.trim(),
        selectedDay: day,
      ),
    );
  }

  Future<void> refresh() async {
    final current = state.asData?.value;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(
        searchQuery: current?.searchQuery ?? '',
        selectedProvince: current?.selectedProvince ?? 'Tat ca dai',
        selectedDay: current?.selectedDay ?? _defaultDayFilter(),
      ),
    );
  }
}

LotteryTicketListItem mapLotteryTicketToListItem(LotteryTicket ticket) {
  final drawDate = ticket.drawDate ?? SellableDrawDate.todayVn();
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
    price: ticket.priceSnapshot,
    quantity: ticket.quantity,
  );
}

TicketDayFilter _resolveDayFilter(DateTime drawDate) {
  final today = SellableDrawDate.todayVn();
  final tomorrow = SellableDrawDate.tomorrowVn();
  final ticketDate = DateTime(drawDate.year, drawDate.month, drawDate.day);

  if (ticketDate == tomorrow) {
    return TicketDayFilter.tomorrow;
  }
  if (ticketDate == today) {
    return TicketDayFilter.today;
  }

  // Ngày khác: gán theo khoảng gần nhất để UI vẫn hiển thị đúng tab đang chọn.
  return ticketDate.isAfter(today)
      ? TicketDayFilter.tomorrow
      : TicketDayFilter.today;
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

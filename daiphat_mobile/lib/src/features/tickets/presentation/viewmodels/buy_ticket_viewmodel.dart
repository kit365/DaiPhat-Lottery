import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/models/lottery_ticket.dart';
export '../../data/models/lottery_ticket.dart';
import '../../data/repositories/lottery_ticket_repository.dart';
import '../../data/services/lottery_ticket_api_service.dart';
import '../../utils/sellable_draw_date.dart';
import '../../utils/ticket_search_filter.dart';

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
      return 'Đang cập nhật';
    }
    return value;
  }

  String get productTitle => buildProductTitle(stationName);

  int get effectivePrice =>
      (price != null && price! > 0) ? price! : kDefaultLotteryTicketPrice;

  String get titleText {
    final value = displayName.trim();
    if (value.isEmpty) {
      return productTitle;
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
    this.searchFilter = TicketSearchFilter.empty,
    this.availableProvinces = const [],
    this.isListLoading = false,
    this.isLoadingMore = false,
    this.hasMore = false,
    this.currentPage = 1,
    this.totalElements = 0,
  });

  final String searchQuery;
  final String selectedProvince;
  final TicketDayFilter selectedDay;
  final TicketSearchFilter searchFilter;
  final List<LotteryTicketListItem> tickets;
  final List<String> availableProvinces;
  final bool isListLoading;
  final bool isLoadingMore;
  final bool hasMore;
  final int currentPage;
  final int totalElements;

  bool get isTodaySellClosed => SellableDrawDate.isTodayDrawPassed();

  /// Ngày mai luôn mở bán (khớp web: sau 16:15 vẫn mua được vé ngày mai).
  bool get isTomorrowSellClosed => false;

  List<String> get provinces => <String>{
    'Tất cả đài',
    ...availableProvinces,
  }.toList();

  List<LotteryTicketListItem> get filteredTickets {
    return tickets.where((ticket) {
      final matchesProvince =
          selectedProvince == 'Tất cả đài' ||
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
    TicketSearchFilter? searchFilter,
    List<LotteryTicketListItem>? tickets,
    List<String>? availableProvinces,
    bool? isListLoading,
    bool? isLoadingMore,
    bool? hasMore,
    int? currentPage,
    int? totalElements,
  }) {
    return BuyTicketState(
      searchQuery: searchQuery ?? this.searchQuery,
      selectedProvince: selectedProvince ?? this.selectedProvince,
      selectedDay: selectedDay ?? this.selectedDay,
      searchFilter: searchFilter ?? this.searchFilter,
      tickets: tickets ?? this.tickets,
      availableProvinces: availableProvinces ?? this.availableProvinces,
      isListLoading: isListLoading ?? this.isListLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      totalElements: totalElements ?? this.totalElements,
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

final allTicketsViewModelProvider =
    AsyncNotifierProvider<BuyTicketViewModel, BuyTicketState>(
      BuyTicketViewModel.new,
    );

class BuyTicketViewModel extends AsyncNotifier<BuyTicketState> {
  Timer? _searchDebounce;
  int _listRequestId = 0;

  @override
  FutureOr<BuyTicketState> build() async {
    ref.onDispose(() => _searchDebounce?.cancel());
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
    String selectedProvince = 'Tất cả đài',
    TicketDayFilter selectedDay = TicketDayFilter.today,
    TicketSearchFilter searchFilter = TicketSearchFilter.empty,
    int page = 1,
    List<LotteryTicketListItem> existingTickets = const [],
    bool append = false,
    List<String> availableProvinces = const [],
    bool refreshStations = true,
  }) async {
    // Sau 16:15 không còn bán vé hôm nay → chuyển sang ngày mai.
    var day = selectedDay;
    if (day == TicketDayFilter.today && SellableDrawDate.isTodayDrawPassed()) {
      day = TicketDayFilter.tomorrow;
    }

    final trimmedSearch = searchQuery.trim();
    final drawDate = _drawDateIsoFor(day);
    final ticketsFuture = _repository.fetchOpenTickets(
      page: page,
      size: LotteryTicketRepository.defaultPageSize,
      drawDate: drawDate,
      search: trimmedSearch.length >= 2 ? trimmedSearch : null,
      tailRanges: searchFilter.tailRanges.isEmpty
          ? null
          : searchFilter.tailRanges,
      numberTypes: searchFilter.numberTypes.isEmpty
          ? null
          : searchFilter.numberTypes,
    );

    var stationNames = List<String>.from(availableProvinces);
    if (!append && (refreshStations || stationNames.isEmpty)) {
      try {
        stationNames = await _repository.fetchStationNamesForDrawDate(drawDate);
      } catch (_) {
        // Giữ danh sách đài cũ nếu API lịch lỗi.
      }
    }

    final result = await ticketsFuture;
    final mapped = result.items.map(mapLotteryTicketToListItem).toList();
    final tickets = append ? [...existingTickets, ...mapped] : mapped;

    if (stationNames.isEmpty) {
      stationNames = tickets
          .map((ticket) => ticket.stationDisplayText)
          .where((name) => name.trim().isNotEmpty)
          .toSet()
          .toList();
    }

    var province = selectedProvince;
    if (province != 'Tất cả đài' &&
        refreshStations &&
        stationNames.isNotEmpty &&
        !stationNames.contains(province)) {
      province = 'Tất cả đài';
    }

    return BuyTicketState(
      searchQuery: searchQuery,
      selectedProvince: province,
      selectedDay: day,
      searchFilter: searchFilter,
      tickets: tickets,
      availableProvinces: stationNames,
      isListLoading: false,
      isLoadingMore: false,
      hasMore: result.hasMore,
      currentPage: page,
      totalElements: result.totalElements,
    );
  }

  Future<void> _reloadList({
    required String searchQuery,
    required String selectedProvince,
    required TicketDayFilter selectedDay,
    TicketSearchFilter? searchFilter,
  }) async {
    final current = state.asData?.value;
    final filter = searchFilter ?? current?.searchFilter ?? TicketSearchFilter.empty;
    if (current != null) {
      state = AsyncData(
        current.copyWith(
          searchQuery: searchQuery,
          selectedProvince: selectedProvince,
          selectedDay: selectedDay,
          searchFilter: filter,
          isListLoading: true,
          isLoadingMore: false,
        ),
      );
    }

    final requestId = ++_listRequestId;
    final keepStations = current != null &&
        current.selectedDay == selectedDay &&
        current.availableProvinces.isNotEmpty;
    try {
      final next = await _load(
        searchQuery: searchQuery,
        selectedProvince: selectedProvince,
        selectedDay: selectedDay,
        searchFilter: filter,
        page: 1,
        availableProvinces:
            keepStations ? current.availableProvinces : const [],
        refreshStations: !keepStations,
      );
      if (requestId != _listRequestId) return;
      state = AsyncData(next);
    } catch (error, stackTrace) {
      if (requestId != _listRequestId) return;
      if (current != null) {
        state = AsyncData(
          current.copyWith(
            searchQuery: searchQuery,
            selectedProvince: selectedProvince,
            selectedDay: selectedDay,
            searchFilter: filter,
            isListLoading: false,
            isLoadingMore: false,
          ),
        );
      } else {
        state = AsyncError(error, stackTrace);
      }
    }
  }

  Future<void> updateSearchQuery(String query) async {
    final current = state.asData?.value;
    if (current == null) return;

    // Cập nhật query ngay để UI giữ trạng thái ô tìm kiếm, không full reload.
    state = AsyncData(current.copyWith(searchQuery: query));

    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () async {
      final latest = state.asData?.value;
      if (latest == null) return;
      await _reloadList(
        searchQuery: latest.searchQuery,
        selectedProvince: latest.selectedProvince,
        selectedDay: latest.selectedDay,
      );
    });
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

    await _reloadList(
      searchQuery: current.searchQuery,
      selectedProvince: current.selectedProvince,
      selectedDay: day,
    );
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null) return;
    if (!current.hasMore || current.isListLoading || current.isLoadingMore) {
      return;
    }

    state = AsyncData(current.copyWith(isLoadingMore: true));
    final requestId = _listRequestId;
    try {
      final next = await _load(
        searchQuery: current.searchQuery,
        selectedProvince: current.selectedProvince,
        selectedDay: current.selectedDay,
        searchFilter: current.searchFilter,
        page: current.currentPage + 1,
        existingTickets: current.tickets,
        append: true,
        availableProvinces: current.availableProvinces,
        refreshStations: false,
      );
      if (requestId != _listRequestId) return;
      state = AsyncData(next);
    } catch (_) {
      if (requestId != _listRequestId) return;
      final latest = state.asData?.value ?? current;
      state = AsyncData(latest.copyWith(isLoadingMore: false));
    }
  }

  Future<void> applySearchFilter(TicketSearchFilter filter) async {
    final current = state.asData?.value;
    if (current == null) return;
    await _reloadList(
      searchQuery: current.searchQuery,
      selectedProvince: current.selectedProvince,
      selectedDay: current.selectedDay,
      searchFilter: filter,
    );
  }

  Future<void> applyQuery({
    String searchQuery = '',
    String? drawDateIso,
    String? stationName,
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

    final current = state.asData?.value;
    if (current != null) {
      await _reloadList(
        searchQuery: searchQuery.trim(),
        selectedProvince: current.selectedProvince,
        selectedDay: day,
      );
    } else {
      state = const AsyncLoading();
      state = await AsyncValue.guard(
        () => _load(searchQuery: searchQuery.trim(), selectedDay: day),
      );
    }
    _selectMatchingStation(stationName);
  }

  void _selectMatchingStation(String? stationName) {
    final wanted = stationName?.trim().toLowerCase();
    if (wanted == null || wanted.isEmpty) return;
    final current = state.asData?.value;
    if (current == null) return;
    for (final province in current.provinces) {
      if (province == 'Tất cả đài') continue;
      final lower = province.toLowerCase();
      if (lower == wanted ||
          lower.contains(wanted) ||
          wanted.contains(lower)) {
        selectProvince(province);
        return;
      }
    }
  }

  Future<void> refresh() async {
    final current = state.asData?.value;
    if (current != null) {
      await _reloadList(
        searchQuery: current.searchQuery,
        selectedProvince: current.selectedProvince,
        selectedDay: current.selectedDay,
      );
      return;
    }

    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _load(selectedDay: _defaultDayFilter()),
    );
  }
}

LotteryTicketListItem mapLotteryTicketToListItem(LotteryTicket ticket) {
  final drawDate = ticket.drawDate ?? SellableDrawDate.todayVn();
  return LotteryTicketListItem(
    id: ticket.id,
    displayName: buildProductTitle(ticket.stationName),
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
    price: ticket.effectivePrice,
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

const Map<int, String> _kVnWeekdayLabels = {
  DateTime.monday: 'Thứ 2',
  DateTime.tuesday: 'Thứ 3',
  DateTime.wednesday: 'Thứ 4',
  DateTime.thursday: 'Thứ 5',
  DateTime.friday: 'Thứ 6',
  DateTime.saturday: 'Thứ 7',
  DateTime.sunday: 'Chủ nhật',
};

String _buildDateLabel(DateTime drawDate) {
  final weekday = _kVnWeekdayLabels[drawDate.weekday] ?? '';
  final dateStr = DateFormat('dd/MM/yyyy').format(drawDate);
  if (weekday.isNotEmpty) {
    return '$weekday, $dateStr';
  }
  return dateStr;
}

String buildProductTitle(String? stationName) {
  final name = stationName?.trim() ?? '';
  if (name.isEmpty || name == 'Đang cập nhật') {
    return 'Vé số kiến thiết';
  }
  final lower = name.toLowerCase();
  if (lower.startsWith('vé số')) {
    return name;
  }
  if (lower.startsWith('đài ')) {
    return 'Vé số ${name.substring(4).trim()}';
  }
  return 'Vé số $name';
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

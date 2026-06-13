import 'package:flutter_riverpod/flutter_riverpod.dart';

enum TicketDayFilter { today, tomorrow }

class LotteryTicketListItem {
  const LotteryTicketListItem({
    required this.province,
    required this.code,
    required this.shortName,
    required this.dateLabel,
    required this.dayFilter,
    this.price = 10000,
  });

  final String province;
  final String code;
  final String shortName;
  final String dateLabel;
  final TicketDayFilter dayFilter;
  final int price;
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

  List<String> get provinces => <String>{
    'Tất cả đài',
    ...tickets.map((ticket) => ticket.province),
  }.toList();

  List<LotteryTicketListItem> get filteredTickets {
    return tickets.where((ticket) {
      final matchesDay = ticket.dayFilter == selectedDay;
      final matchesProvince = selectedProvince == 'Tất cả đài' ||
          ticket.province == selectedProvince;
      final normalizedQuery = searchQuery.trim();
      final matchesQuery = normalizedQuery.isEmpty ||
          ticket.code.contains(normalizedQuery) ||
          ticket.province.toLowerCase().contains(normalizedQuery.toLowerCase());

      return matchesDay && matchesProvince && matchesQuery;
    }).toList();
  }

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
}

class BuyTicketViewModel extends Notifier<BuyTicketState> {
  @override
  BuyTicketState build() {
    return BuyTicketState(
      searchQuery: '',
      selectedProvince: 'Tất cả đài',
      selectedDay: TicketDayFilter.today,
      tickets: const [
        LotteryTicketListItem(
          province: 'TP. Hồ Chí Minh',
          code: '853911',
          shortName: 'HCM',
          dateLabel: 'Hôm nay - 09/02/2025',
          dayFilter: TicketDayFilter.today,
        ),
        LotteryTicketListItem(
          province: 'Đồng Nai',
          code: '853912',
          shortName: 'ĐN',
          dateLabel: 'Hôm nay - 09/02/2025',
          dayFilter: TicketDayFilter.today,
        ),
        LotteryTicketListItem(
          province: 'Cần Thơ',
          code: '853913',
          shortName: 'CT',
          dateLabel: 'Hôm nay - 09/02/2025',
          dayFilter: TicketDayFilter.today,
        ),
        LotteryTicketListItem(
          province: 'Đồng Tháp',
          code: '853914',
          shortName: 'ĐT',
          dateLabel: 'Hôm nay - 09/02/2025',
          dayFilter: TicketDayFilter.today,
        ),
        LotteryTicketListItem(
          province: 'Cà Mau',
          code: '853915',
          shortName: 'CM',
          dateLabel: 'Hôm nay - 09/02/2025',
          dayFilter: TicketDayFilter.today,
        ),
        LotteryTicketListItem(
          province: 'An Giang',
          code: '853916',
          shortName: 'AG',
          dateLabel: 'Hôm nay - 09/02/2025',
          dayFilter: TicketDayFilter.today,
        ),
        LotteryTicketListItem(
          province: 'Bến Tre',
          code: '910221',
          shortName: 'BT',
          dateLabel: 'Ngày mai - 10/02/2025',
          dayFilter: TicketDayFilter.tomorrow,
        ),
        LotteryTicketListItem(
          province: 'Vũng Tàu',
          code: '910222',
          shortName: 'VT',
          dateLabel: 'Ngày mai - 10/02/2025',
          dayFilter: TicketDayFilter.tomorrow,
        ),
      ],
    );
  }

  void updateSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void selectProvince(String province) {
    state = state.copyWith(selectedProvince: province);
  }

  void selectDay(TicketDayFilter day) {
    state = state.copyWith(selectedDay: day);
  }
}

final buyTicketViewModelProvider =
    NotifierProvider<BuyTicketViewModel, BuyTicketState>(
  BuyTicketViewModel.new,
);

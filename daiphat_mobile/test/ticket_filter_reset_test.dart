import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';
import 'package:daiphat_mobile/src/features/tickets/utils/sellable_draw_date.dart';
import 'package:daiphat_mobile/src/features/tickets/utils/ticket_search_filter.dart';

BuyTicketState _state({
  String searchQuery = '',
  String selectedProvince = 'Tất cả đài',
  TicketDayFilter? selectedDay,
  TicketSearchFilter searchFilter = TicketSearchFilter.empty,
}) {
  return BuyTicketState(
    searchQuery: searchQuery,
    selectedProvince: selectedProvince,
    selectedDay:
        selectedDay ??
        (SellableDrawDate.isTodayDrawPassed()
            ? TicketDayFilter.tomorrow
            : TicketDayFilter.today),
    searchFilter: searchFilter,
    tickets: const [],
  );
}

void main() {
  test('baseline ticket state has no active filters', () {
    expect(_state().hasActiveFilters, isFalse);
  });

  test('search, province, day, and advanced filters are resettable', () {
    final defaultDay = SellableDrawDate.isTodayDrawPassed()
        ? TicketDayFilter.tomorrow
        : TicketDayFilter.today;
    final otherDay = defaultDay == TicketDayFilter.today
        ? TicketDayFilter.tomorrow
        : TicketDayFilter.today;

    expect(_state(searchQuery: '6868').hasActiveFilters, isTrue);
    expect(_state(selectedProvince: 'Bến Tre').hasActiveFilters, isTrue);
    expect(_state(selectedDay: otherDay).hasActiveFilters, isTrue);
    expect(
      _state(
        searchFilter: const TicketSearchFilter(tailRanges: ['00-99']),
      ).hasActiveFilters,
      isTrue,
    );
  });
}

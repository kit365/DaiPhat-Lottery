import 'package:flutter_riverpod/flutter_riverpod.dart';

class LotteryResultsLookup {
  const LotteryResultsLookup({
    this.drawDate,
    this.stationName,
    this.stationId,
    this.search,
  });

  final DateTime? drawDate;
  final String? stationName;
  final int? stationId;
  final String? search;
}

class LotteryResultsLookupNotifier extends Notifier<LotteryResultsLookup?> {
  @override
  LotteryResultsLookup? build() => null;

  void setLookup(LotteryResultsLookup? lookup) {
    state = lookup;
  }

  void clear() {
    state = null;
  }
}

final lotteryResultsLookupProvider = NotifierProvider<
    LotteryResultsLookupNotifier, LotteryResultsLookup?>(
  LotteryResultsLookupNotifier.new,
);

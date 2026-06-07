import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/lottery_result.dart';

final homeViewModelProvider = AsyncNotifierProvider<HomeViewModel, List<LotteryResult>>(HomeViewModel.new);

class HomeViewModel extends AsyncNotifier<List<LotteryResult>> {
  @override
  FutureOr<List<LotteryResult>> build() async {
    return _fetchLatestResults();
  }

  Future<List<LotteryResult>> _fetchLatestResults() async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 2));
    return [
      LotteryResult(id: '1', date: 'Thứ Sáu, 24/05/2024', province: 'TP. Hồ Chí Minh', specialPrize: '458120'),
      LotteryResult(id: '2', date: 'Thứ Bảy, 25/05/2024', province: 'Đồng Nai', specialPrize: '678901'),
    ];
  }
}

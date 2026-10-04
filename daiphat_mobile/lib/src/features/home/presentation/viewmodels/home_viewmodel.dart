import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/lottery_result.dart';
import '../../domain/repositories/home_lottery_repository.dart';
import '../../domain/usecases/fetch_home_lottery_results.dart';

final homeLotteryRepositoryProvider = Provider<HomeLotteryRepository>((ref) {
  throw UnimplementedError(
    'homeLotteryRepositoryProvider must be overridden in bootstrap',
  );
});

final fetchHomeLotteryResultsProvider =
    Provider<FetchHomeLotteryResults>((ref) {
  return FetchHomeLotteryResults(ref.watch(homeLotteryRepositoryProvider));
});

class HomeLotteryQuery {
  const HomeLotteryQuery({
    required this.drawDate,
    this.region,
  });

  final DateTime drawDate;
  final String? region;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HomeLotteryQuery &&
          runtimeType == other.runtimeType &&
          drawDate.year == other.drawDate.year &&
          drawDate.month == other.drawDate.month &&
          drawDate.day == other.drawDate.day &&
          region == other.region;

  @override
  int get hashCode =>
      Object.hash(drawDate.year, drawDate.month, drawDate.day, region);
}

final homeLotteryProvider =
    StreamProvider.autoDispose.family<HomeLotteryData, HomeLotteryQuery>((ref, query) async* {
  const summaryRetryDelay = Duration(seconds: 5);
  const maxSummaryRetries = 24;
  const maxDetailRetries = 12;

  final normalizedDate = DateTime(query.drawDate.year, query.drawDate.month, query.drawDate.day);
  final disposed = Completer<void>();
  ref.onDispose(() {
    if (!disposed.isCompleted) {
      disposed.complete();
    }
  });

  var summaryPollCount = 0;
  var detailPollCount = 0;
  final fetchHomeLotteryResults = ref.watch(fetchHomeLotteryResultsProvider);

  while (!disposed.isCompleted) {
    final fetchResult = await fetchHomeLotteryResults(
      normalizedDate,
      region: query.region,
    );
    yield fetchResult.data;

    Duration? nextDelay;
    if (fetchResult.shouldPollSummary) {
      if (summaryPollCount >= maxSummaryRetries) {
        break;
      }
      summaryPollCount += 1;
      nextDelay = summaryRetryDelay;
    } else if ((fetchResult.nextPollAfterSeconds ?? 0) > 0) {
      summaryPollCount = 0;
      if (detailPollCount >= maxDetailRetries) {
        break;
      }
      detailPollCount += 1;
      nextDelay = Duration(seconds: fetchResult.nextPollAfterSeconds!);
    } else {
      break;
    }

    await Future.any<void>([
      Future<void>.delayed(nextDelay),
      disposed.future,
    ]);
  }
});

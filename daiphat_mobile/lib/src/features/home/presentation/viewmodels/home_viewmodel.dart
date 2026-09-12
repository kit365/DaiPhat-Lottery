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

final homeLotteryProvider =
    StreamProvider.autoDispose.family<HomeLotteryData, DateTime>((ref, drawDate) async* {
  const summaryRetryDelay = Duration(seconds: 5);
  const maxSummaryRetries = 24;
  const maxDetailRetries = 12;

  final normalizedDate = DateTime(drawDate.year, drawDate.month, drawDate.day);
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
    final fetchResult = await fetchHomeLotteryResults(normalizedDate);
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

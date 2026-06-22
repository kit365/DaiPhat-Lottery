import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/models/lottery_result.dart';
import '../../data/repositories/home_lottery_repository.dart';
import '../../data/services/home_lottery_api_service.dart';

final homeLotteryApiServiceProvider = Provider<HomeLotteryApiService>((ref) {
  return HomeLotteryApiService(ref.watch(apiClientProvider));
});

final homeLotteryRepositoryProvider = Provider<HomeLotteryRepository>((ref) {
  return HomeLotteryRepository(ref.watch(homeLotteryApiServiceProvider));
});

final homeLotteryProvider =
    StreamProvider.autoDispose.family<HomeLotteryData, DateTime>((ref, drawDate) async* {
  const summaryRetryDelay = Duration(seconds: 5);
  const maxSummaryRetries = 24;
  const maxDetailRetries = 12;

  final repository = ref.watch(homeLotteryRepositoryProvider);
  final normalizedDate = DateTime(drawDate.year, drawDate.month, drawDate.day);
  final disposed = Completer<void>();
  ref.onDispose(() {
    if (!disposed.isCompleted) {
      disposed.complete();
    }
  });

  var summaryPollCount = 0;
  var detailPollCount = 0;

  while (!disposed.isCompleted) {
    final fetchResult = await repository.fetchResults(normalizedDate);
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

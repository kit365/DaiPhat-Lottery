import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/purchased_tickets_repository.dart';
import '../../domain/usecases/get_my_tickets.dart';
import '../../domain/usecases/get_my_tickets_summary.dart';

final purchasedTicketsRepositoryProvider =
    Provider<PurchasedTicketsRepository>((ref) {
      throw UnimplementedError(
        'purchasedTicketsRepositoryProvider must be overridden in bootstrap',
      );
    });

final getMyTicketsProvider = Provider<GetMyTickets>((ref) {
  return GetMyTickets(ref.watch(purchasedTicketsRepositoryProvider));
});

final getMyTicketsSummaryProvider = Provider<GetMyTicketsSummary>((ref) {
  return GetMyTicketsSummary(ref.watch(purchasedTicketsRepositoryProvider));
});

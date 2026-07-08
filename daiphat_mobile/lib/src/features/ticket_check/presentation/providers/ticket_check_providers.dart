import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/ticket_check/data/services/ticket_check_api_service.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';

final ticketCheckApiServiceProvider = Provider<TicketCheckApiService>((ref) {
  return TicketCheckApiService(ref.watch(apiClientProvider));
});

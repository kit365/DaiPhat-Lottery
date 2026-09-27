import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/api_providers.dart';
import '../../data/services/ticket_ocr_service.dart';
import '../viewmodels/admin_scan_viewmodel.dart';

final adminScanViewModelProvider = Provider.autoDispose<AdminScanViewModel>((
  ref,
) {
  final model = AdminScanViewModel(
    TicketOcrService(ref.watch(apiClientProvider)),
  );
  ref.onDispose(model.dispose);
  return model;
});

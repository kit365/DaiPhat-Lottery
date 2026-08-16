import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import '../../data/fortune_cast_service.dart';

final fortuneCastServiceProvider = Provider<FortuneCastService>((ref) {
  return FortuneCastService(ref.watch(apiClientProvider));
});

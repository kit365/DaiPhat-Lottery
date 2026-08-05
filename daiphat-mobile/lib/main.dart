import 'package:flutter/material.dart';

import 'src/app/app.dart' as app;
import 'src/app/bootstrap.dart';

class DaiPhatMobileApp extends app.DaiPhatMobileApp {
  const DaiPhatMobileApp({
    super.key,
    required RouterConfig<Object> router,
  }) : super(router: router);
}

Future<void> main() async {
  await bootstrap();
}

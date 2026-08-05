import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_theme.dart';

class DaiPhatMobileApp extends StatelessWidget {
  final RouterConfig<Object> router;

  const DaiPhatMobileApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'DAI PHAT Mobile',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: AppTheme.lightTheme,
    );
  }
}

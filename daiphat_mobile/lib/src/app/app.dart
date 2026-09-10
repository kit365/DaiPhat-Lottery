import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';

import 'package:daiphat_mobile/src/shared/theme/app_theme.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';

class DaiPhatMobileApp extends StatelessWidget {
  final RouterConfig<Object> router;

  const DaiPhatMobileApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return ToastificationWrapper(
      config: const ToastificationConfig(
        alignment: AppToast.alignment,
        maxTitleLines: 3,
        maxDescriptionLines: 4,
      ),
      child: MaterialApp.router(
        title: 'DAI PHAT Mobile',
        debugShowCheckedModeBanner: false,
        routerConfig: router,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
      ),
    );
  }
}

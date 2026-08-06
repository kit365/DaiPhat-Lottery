import 'src/app/app.dart' as app;
import 'src/app/bootstrap.dart';

class DaiPhatMobileApp extends app.DaiPhatMobileApp {
  const DaiPhatMobileApp({
    super.key,
    required super.router,
  });
}

Future<void> main() async {
  await bootstrap();
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';

bool readIsAuthenticated(WidgetRef ref) {
  final token = ref.read(apiClientProvider).accessToken;
  return token != null && token.isNotEmpty;
}

bool isSafeRedirect(String? path) {
  if (path == null || path.isEmpty) {
    return false;
  }
  final uri = Uri.tryParse(path);
  if (uri == null) {
    return false;
  }
  return uri.scheme.isEmpty && path.startsWith('/') && !path.startsWith('//');
}

void goToLogin(BuildContext context, {String? redirectPath}) {
  final redirect = redirectPath ?? _resolveRedirectPath(context);
  final queryParameters = isSafeRedirect(redirect)
      ? <String, String>{'redirect': redirect}
      : null;

  final loginLocation = Uri(
    path: AppRoute.login.path,
    queryParameters: queryParameters,
  ).toString();

  // Ticket detail is pushed via Navigator above GoRouter — pop it first.
  final overlayNavigator = Navigator.of(context);
  if (overlayNavigator.canPop()) {
    overlayNavigator.pop();
  }

  final rootContext = rootNavigatorKey.currentContext ?? context;
  GoRouter.of(rootContext).go(loginLocation);
}

String _resolveRedirectPath(BuildContext context) {
  try {
    return GoRouterState.of(context).uri.toString();
  } catch (_) {
    return AppRoute.home.path;
  }
}

void requireAuthOrGoLoginWithRef(
  BuildContext context,
  WidgetRef ref, {
  required VoidCallback onAuthenticated,
  String? redirectPath,
}) {
  if (readIsAuthenticated(ref)) {
    onAuthenticated();
    return;
  }
  goToLogin(context, redirectPath: redirectPath);
}

void requireAuthOrGoLoginWithViewModel(
  BuildContext context,
  LoginViewModel loginViewModel, {
  required VoidCallback onAuthenticated,
  String? redirectPath,
}) {
  if (loginViewModel.isAuthenticated) {
    onAuthenticated();
    return;
  }
  goToLogin(context, redirectPath: redirectPath);
}

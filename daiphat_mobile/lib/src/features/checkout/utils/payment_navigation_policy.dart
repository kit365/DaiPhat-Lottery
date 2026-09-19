class PaymentNavigationPolicy {
  static const _payOsHost = 'pay.payos.vn';
  static const _appCallbackHost = 'payment';
  // Keep this list aligned with the domains configured as PayOS frontend
  // return URLs. Matching is exact so a lookalike host cannot terminate a
  // payment session.
  static const _webCallbackHosts = {
    'daiphat.id.vn',
    'dai-phat.vn',
  };
  static const _webCallbackPaths = {
    '/payment',
    '/payment/payos/return',
    '/payment/payos/cancel',
  };

  const PaymentNavigationPolicy({String? callbackBaseUrl})
    : _callbackBaseUrl = callbackBaseUrl;

  final String? _callbackBaseUrl;

  bool isTrustedCheckoutUrl(String url) {
    final uri = Uri.tryParse(url);
    return uri != null &&
        uri.scheme == 'https' &&
        uri.host.toLowerCase() == _payOsHost &&
        uri.path.startsWith('/web/');
  }

  bool isCallbackUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    if (uri.scheme == 'daiphat' &&
        uri.host.toLowerCase() == _appCallbackHost &&
        (uri.path.isEmpty || uri.path == '/')) {
      return true;
    }

    if (uri.scheme == 'https' &&
        _webCallbackHosts.contains(uri.host.toLowerCase()) &&
        _webCallbackPaths.contains(uri.path)) {
      return true;
    }

    final configuredCallback = Uri.tryParse(_callbackBaseUrl ?? '');
    return configuredCallback != null &&
        _matchesBaseUri(uri, configuredCallback);
  }

  bool isAllowedNavigation(String url) {
    return isTrustedCheckoutUrl(url) || isCallbackUrl(url);
  }

  bool _matchesBaseUri(Uri candidate, Uri expected) {
    if (expected.scheme != 'https' && expected.scheme != 'daiphat') {
      return false;
    }
    if (expected.scheme == 'https' &&
        !_webCallbackHosts.contains(expected.host.toLowerCase())) {
      return false;
    }
    if (expected.scheme == 'daiphat' &&
        expected.host.toLowerCase() != _appCallbackHost) {
      return false;
    }
    return candidate.scheme == expected.scheme &&
        candidate.host.toLowerCase() == expected.host.toLowerCase() &&
        candidate.port == expected.port &&
        candidate.path == expected.path;
  }
}

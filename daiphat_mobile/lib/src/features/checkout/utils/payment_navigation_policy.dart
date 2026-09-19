class PaymentNavigationPolicy {
  static const _payOsHost = 'pay.payos.vn';
  static const _appCallbackHost = 'payment';
  // Keep this list aligned with the domains configured as PayOS frontend
  // return URLs. Matching is exact or subdomain-based so lookalike hosts
  // cannot terminate a payment session.
  static const _webCallbackHosts = {
    'daiphat.id.vn',
    'dai-phat.vn',
    'daiphat.vn',
    'www.daiphat.id.vn',
    'www.dai-phat.vn',
    'www.daiphat.vn',
    'localhost',
    '127.0.0.1',
    '10.0.2.2',
  };
  static const _webCallbackPaths = {
    '/payment',
    '/payment/payos/return',
    '/payment/payos/cancel',
    '/checkout/result',
  };

  const PaymentNavigationPolicy({String? callbackBaseUrl})
    : _callbackBaseUrl = callbackBaseUrl;

  final String? _callbackBaseUrl;

  bool isTrustedCheckoutUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    final host = uri.host.toLowerCase();
    return uri.scheme == 'https' &&
        (host == _payOsHost || host.endsWith('.payos.vn')) &&
        (uri.path.startsWith('/web/') || uri.path.startsWith('/web'));
  }

  bool isCallbackUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    // Do not treat PayOS checkout pages as callbacks
    if (isTrustedCheckoutUrl(url)) return false;

    // Custom app scheme (e.g., daiphat://payment?code=00 or daiphat://app/payment)
    if (uri.scheme == 'daiphat' &&
        (uri.host.toLowerCase() == _appCallbackHost ||
            uri.host.isEmpty ||
            uri.host.toLowerCase() == 'app')) {
      return true;
    }

    final host = uri.host.toLowerCase();
    final path = uri.path;

    // Check trusted hosts & paths (supports https & http for local/dev/android emulator)
    if ((uri.scheme == 'https' || uri.scheme == 'http') &&
        _isTrustedHost(host) &&
        _isCallbackPath(path)) {
      return true;
    }

    // Configured callback base URL
    final configuredCallback = Uri.tryParse(_callbackBaseUrl ?? '');
    return configuredCallback != null &&
        _matchesBaseUri(uri, configuredCallback);
  }

  bool isAllowedNavigation(String url) {
    return isTrustedCheckoutUrl(url) || isCallbackUrl(url);
  }

  bool _isTrustedHost(String host) {
    if (_webCallbackHosts.contains(host)) return true;
    if (host.endsWith('.daiphat.id.vn') ||
        host.endsWith('.dai-phat.vn') ||
        host.endsWith('.daiphat.vn')) {
      return true;
    }
    final configured = Uri.tryParse(_callbackBaseUrl ?? '');
    if (configured != null && configured.host.toLowerCase() == host) {
      return true;
    }
    return false;
  }

  bool _isCallbackPath(String path) {
    return _webCallbackPaths.contains(path);
  }

  bool _matchesBaseUri(Uri candidate, Uri expected) {
    if (expected.scheme != 'https' &&
        expected.scheme != 'http' &&
        expected.scheme != 'daiphat') {
      return false;
    }
    if (expected.scheme == 'https' &&
        !_isTrustedHost(expected.host.toLowerCase())) {
      return false;
    }
    if (expected.scheme == 'daiphat' &&
        expected.host.toLowerCase() != _appCallbackHost &&
        expected.host.isNotEmpty) {
      return false;
    }
    return candidate.scheme == expected.scheme &&
        candidate.host.toLowerCase() == expected.host.toLowerCase() &&
        candidate.port == expected.port &&
        candidate.path == expected.path;
  }
}

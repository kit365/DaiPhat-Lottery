class PaymentNavigationPolicy {
  static const _payOsHost = 'pay.payos.vn';
  static const _appCallbackHost = 'payment';
  static const _webCallbackHost = 'dai-phat.vn';

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

    if (uri.scheme == 'daiphat' && uri.host.toLowerCase() == _appCallbackHost) {
      return true;
    }

    if (uri.scheme == 'https' &&
        uri.host.toLowerCase() == _webCallbackHost &&
        uri.path == '/payment') {
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
    return candidate.scheme == expected.scheme &&
        candidate.host.toLowerCase() == expected.host.toLowerCase() &&
        candidate.port == expected.port &&
        candidate.path == expected.path;
  }
}

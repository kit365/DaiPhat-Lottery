import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// In-app WebView for PayOS payment.
///
/// Flow:
/// 1. Opens the PayOS [checkoutUrl] inside a WebView.
/// 2. Monitors navigation – when the user is redirected to the callback URL
///    (containing payment result params), it closes the WebView and pushes
///    the checkout result screen with those params.
/// 3. If the user presses the Android back button or taps "Hủy thanh toán",
///    the WebView is popped and we navigate to checkout result with cancel=true.
class PaymentWebView extends StatefulWidget {
  final String checkoutUrl;
  final String? callbackBaseUrl;

  const PaymentWebView({
    super.key,
    required this.checkoutUrl,
    this.callbackBaseUrl,
  });

  @override
  State<PaymentWebView> createState() => _PaymentWebViewState();
}

class _PaymentWebViewState extends State<PaymentWebView> {
  late final WebViewController _controller;
  bool _isNavigatedToResult = false;
  int _loadingProgress = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _loadingProgress = progress);
          },
          onPageStarted: (_) {},
          onPageFinished: (_) {},
          onNavigationRequest: (request) {
            final url = request.url;

            // Detect PayOS callback / return URL
            if (_isPayOSCallbackUrl(url)) {
              _navigateToResult(url);
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  /// Check if the URL is the PayOS callback/return URL.
  bool _isPayOSCallbackUrl(String url) {
    // PayOS typically redirects to the cancel/return URL configured in the
    // payment link. Common patterns:
    //   - URLs containing "cancel" or "return" query params
    //   - URLs matching the app's deep link scheme
    //   - URLs containing payment status params (code, orderCode, status)

    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    // Check for deep link scheme (daiphat:// or https://daiphat.vn)
    if (uri.scheme == 'daiphat' ||
        uri.host.contains('daiphat') ||
        uri.host.contains('dai-phat')) {
      return true;
    }

    // Check for payment result query parameters
    final hasCode = uri.queryParameters.containsKey('code');
    final hasOrderCode = uri.queryParameters.containsKey('orderCode');
    final hasStatus = uri.queryParameters.containsKey('status');
    if (hasCode && (hasOrderCode || hasStatus)) {
      return true;
    }

    return false;
  }

  void _navigateToResult(String url) {
    if (_isNavigatedToResult) return;
    _isNavigatedToResult = true;

    final uri = Uri.parse(url);
    final queryParams = uri.queryParameters;

    if (!mounted) return;

    context.pushReplacementNamed(
      AppRoute.checkoutResult.name,
      queryParameters: {
        'code': queryParams['code'] ?? '',
        'orderCode': queryParams['orderCode'] ?? '',
        'internalCode': queryParams['internalCode'] ?? '',
        'status': queryParams['status'] ?? '',
        'cancel': queryParams['cancel'] ?? '',
      },
    );
  }

  void _handleCancel() {
    if (_isNavigatedToResult) return;
    _isNavigatedToResult = true;

    context.pushReplacementNamed(
      AppRoute.checkoutResult.name,
      queryParameters: {'code': '', 'cancel': 'true', 'status': 'cancelled'},
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleCancel();
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'Thanh toán PayOS',
            style: TextStyle(
              color: Color(0xFF15213B),
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF15213B),
          leading: IconButton(
            icon: const Icon(Icons.close_rounded, size: 24),
            onPressed: _handleCancel,
          ),
          actions: [
            if (_loadingProgress < 100)
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    value: _loadingProgress / 100,
                    color: AppColors.primary,
                  ),
                ),
              ),
          ],
        ),
        body: Column(
          children: [
            if (_loadingProgress < 100)
              LinearProgressIndicator(
                value: _loadingProgress / 100,
                backgroundColor: Colors.grey.shade200,
                valueColor: const AlwaysStoppedAnimation<Color>(
                  AppColors.primary,
                ),
                minHeight: 3,
              ),
            Expanded(child: WebViewWidget(controller: _controller)),
          ],
        ),
      ),
    );
  }
}

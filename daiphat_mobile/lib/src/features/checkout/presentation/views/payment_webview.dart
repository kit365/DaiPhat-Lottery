import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import '../providers/checkout_provider.dart';

/// In-app WebView for PayOS payment.
///
/// Flow:
/// 1. Opens the PayOS [checkoutUrl] inside a WebView.
/// 2. Monitors navigation – when the user is redirected to the callback URL
///    (containing payment result params), it closes the WebView and pushes
///    the checkout result screen with those params.
/// 3. If the user presses the Android back button or taps "Hủy thanh toán",
///    the WebView is popped and we navigate to checkout result with cancel=true.
/// 4. Shows a live countdown timer fetched from the payment countdown endpoint.
/// 5. Supports pull-to-refresh and an AppBar refresh button.
class PaymentWebView extends ConsumerStatefulWidget {
  final String checkoutUrl;
  final String? callbackBaseUrl;
  final String? orderId;

  const PaymentWebView({
    super.key,
    required this.checkoutUrl,
    this.callbackBaseUrl,
    this.orderId,
  });

  @override
  ConsumerState<PaymentWebView> createState() => _PaymentWebViewState();
}

class _PaymentWebViewState extends ConsumerState<PaymentWebView> {
  late final WebViewController _controller;
  bool _isNavigatedToResult = false;
  int _loadingProgress = 0;

  // Countdown
  int _remainingSeconds = 15 * 60; // default 15 min, synced from API
  bool _isExpired = false;
  Timer? _countdownTimer;

  // Pull-to-refresh
  bool _isRefreshing = false;

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
            if (_isPayOSCallbackUrl(url)) {
              _navigateToResult(url);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));

    if (widget.orderId != null) {
      // Defer to post-frame so mounted = true before starting timer/setState
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _startCountdown(_remainingSeconds); // default 15 min
        _fetchAndStartCountdown(); // sync real value from server
      });
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchAndStartCountdown() async {
    if (widget.orderId == null) return;
    try {
      final service = ref.read(transactionRepositoryProvider);
      final result =
          await service.getPendingPaymentCountdown(widget.orderId!);
      if (!mounted) return;
      _startCountdown(result.remainingSeconds, alreadyExpired: result.expired);
    } catch (_) {
      // Countdown sync failed silently — local countdown continues
    }
  }

  void _startCountdown(int seconds, {bool alreadyExpired = false}) {
    _countdownTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _remainingSeconds = seconds;
      _isExpired = alreadyExpired || seconds <= 0;
    });
    if (_isExpired) return;

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _remainingSeconds--;
        if (_remainingSeconds <= 0) {
          _remainingSeconds = 0;
          _isExpired = true;
          timer.cancel();
        }
      });
    });
  }

  Future<void> _handleRefresh() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    try {
      await _controller.reload();
      if (widget.orderId != null) {
        await _fetchAndStartCountdown();
      }
    } finally {
      await Future.delayed(const Duration(milliseconds: 400));
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  String _formatCountdown(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  /// Check if the URL is the PayOS callback/return URL.
  bool _isPayOSCallbackUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    // Deep link scheme (daiphat:// or https://daiphat.vn)
    if (uri.scheme == 'daiphat' ||
        uri.host.contains('daiphat') ||
        uri.host.contains('dai-phat')) {
      return true;
    }

    // Payment result query parameters
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
        if (widget.orderId != null) 'orderId': widget.orderId!,
      },
    );
  }

  void _handleCancel() {
    if (_isNavigatedToResult) return;
    _isNavigatedToResult = true;

    context.pushReplacementNamed(
      AppRoute.checkoutResult.name,
      queryParameters: {
        'code': '',
        'cancel': 'true',
        'status': 'cancelled',
        if (widget.orderId != null) 'orderId': widget.orderId!,
      },
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
          title: Text(
            'Thanh toán PayOS',
            style: AppTypography.h4(
              color: AppColors.contentPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          backgroundColor: AppColors.surfacePrimary,
          foregroundColor: AppColors.contentPrimary,
          elevation: 0,
          scrolledUnderElevation: 0,
          surfaceTintColor: AppColors.transparent,
          leading: IconButton(
            icon: const Icon(Icons.close_rounded, size: 24),
            onPressed: _handleCancel,
          ),
          actions: [
            if (widget.orderId != null) _buildCountdownChip(),
            const SizedBox(width: 12),
          ],
        ),
        body: Column(
          children: [
            if (_loadingProgress < 100)
              LinearProgressIndicator(
                value: _loadingProgress / 100,
                backgroundColor: AppColors.borderLight,
                valueColor: const AlwaysStoppedAnimation<Color>(
                  AppColors.primary,
                ),
                minHeight: 3,
              ),

            // WebView with pull-to-refresh
            Expanded(
              child: RefreshIndicator(
                onRefresh: _handleRefresh,
                color: AppColors.primary,
                displacement: 40,
                child: LayoutBuilder(
                  builder: (context, constraints) => ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.zero,
                    children: [
                      SizedBox(
                        height: constraints.maxHeight,
                        child: WebViewWidget(controller: _controller),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountdownChip() {
    final Color bgColor;
    final Color textColor;
    final Color iconColor;
    final String label;
    final IconData icon;

    if (_isExpired) {
      bgColor = AppColors.statusDangerSurface;
      textColor = AppColors.brandPrimaryDarkRed;
      iconColor = AppColors.statusDanger;
      label = 'Hết giờ';
      icon = Icons.timer_off_rounded;
    } else if (_remainingSeconds <= 120) {
      bgColor = AppColors.statusWarningSurface;
      textColor = AppColors.statusWarning;
      iconColor = AppColors.statusWarningForeground;
      label = _formatCountdown(_remainingSeconds);
      icon = Icons.timer_rounded;
    } else {
      bgColor = AppColors.statusSuccessSurface;
      textColor = AppColors.statusSuccessDeep;
      iconColor = AppColors.statusSuccess;
      label = _formatCountdown(_remainingSeconds);
      icon = Icons.timer_rounded;
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTypography.subtitle2(
              color: textColor,
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

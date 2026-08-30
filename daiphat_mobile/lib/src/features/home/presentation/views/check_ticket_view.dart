import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/features/home/data/models/ticket_check_models.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/providers/notification_providers.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';

class CheckTicketView extends ConsumerStatefulWidget {
  const CheckTicketView({super.key});

  @override
  ConsumerState<CheckTicketView> createState() => _CheckTicketViewState();
}

class _CheckTicketViewState extends ConsumerState<CheckTicketView> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ticketCheckViewModelProvider);
    final vm = ref.read(ticketCheckViewModelProvider.notifier);
    final winEffectKey = _winEffectKey(state);
    final animationsDisabled = MediaQuery.of(context).disableAnimations;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 320,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.surfacePrimary, AppColors.transparent],
                stops: [0.4, 1.0],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset(
                'assets/images/home_bg.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async {
                final date = state.selectedDate;
                if (date != null) {
                  await vm.loadStations(date);
                }
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    // Header Bar on top of background
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: _HeaderBar(),
                    ),

                    // Main Form Card
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                        decoration: BoxDecoration(
                          color: AppColors.surfacePrimary,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: AppColors.borderDecorative,
                            width: 1.0,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: AppColors.shadowLight,
                              blurRadius: 16,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'TRA CỨU VÉ SỐ',
                              textAlign: TextAlign.center,
                              style: AppTypography.h3(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Nhập thông tin vé để kiểm tra kết quả nhanh chóng',
                              textAlign: TextAlign.center,
                              style: AppTypography.bodySmall(
                                fontSize: 13,
                                color: AppColors.contentMuted,
                              ),
                            ),
                            const SizedBox(height: 22),
                            if (state.isChecking)
                              const _CheckingState()
                            else if (state.errorMessage != null)
                              _ErrorState(
                                message: state.errorMessage!,
                                onRetry: vm.clearErrorMessage,
                              )
                            else if (state.hasChecked &&
                                state.checkResult != null)
                              _ResultState(
                                result: state.checkResult!,
                                onReset: vm.resetCheck,
                              )
                            else ...[
                              _FormState(state: state, vm: vm),
                              const SizedBox(height: 22),
                              const _ImportantNotes(),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ),
          if (winEffectKey != null)
            _WinConfettiOverlay(
              active: !animationsDisabled,
              triggerKey: winEffectKey,
            ),
        ],
      ),
    );
  }

  String? _winEffectKey(TicketCheckState state) {
    final result = state.checkResult;
    if (!state.hasChecked || result == null || !result.winning) {
      return null;
    }

    final prizeKey = result.matchedPrizes
        .map(
          (prize) =>
              '${prize.prizeDisplayName}:${prize.winningNumber}:${prize.prizeValue}',
        )
        .join('|');
    final dateKey = state.selectedDate?.toIso8601String() ?? '';

    return [
      state.selectedStationId,
      dateKey,
      result.ticketNumber,
      prizeKey,
    ].join('|');
  }
}

class _WinConfettiOverlay extends StatefulWidget {
  const _WinConfettiOverlay({required this.active, required this.triggerKey});

  final bool active;
  final String triggerKey;

  @override
  State<_WinConfettiOverlay> createState() => _WinConfettiOverlayState();
}

class _WinConfettiOverlayState extends State<_WinConfettiOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  List<_ConfettiParticle> _particles = const [];

  static const List<Color> _palette = [
    AppColors.primary,
    AppColors.statusWarning,
    AppColors.statusSuccess,
    AppColors.brandSecondary,
    AppColors.surfacePrimary,
    AppColors.brandPrimaryCrimson,
  ];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3400),
    );

    if (widget.active) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _restart();
        }
      });
    }
  }

  @override
  void didUpdateWidget(covariant _WinConfettiOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.active) {
      _controller.stop();
      return;
    }

    if (oldWidget.triggerKey != widget.triggerKey || !oldWidget.active) {
      _restart();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _restart() {
    _particles = _buildParticles(math.Random(widget.triggerKey.hashCode));
    HapticFeedback.mediumImpact();
    _controller.forward(from: 0);
  }

  List<_ConfettiParticle> _buildParticles(math.Random random) {
    final particles = <_ConfettiParticle>[];

    void addParticle({
      required Offset start,
      required Offset velocity,
      required double gravity,
      required double size,
      required _ConfettiShape shape,
    }) {
      particles.add(
        _ConfettiParticle(
          start: start,
          velocity: velocity,
          gravity: gravity,
          size: size,
          color: _palette[random.nextInt(_palette.length)],
          rotation: random.nextDouble() * math.pi,
          rotationSpeed:
              (random.nextDouble() * 5 + 2) * (random.nextBool() ? 1 : -1),
          wobble: random.nextDouble() * math.pi * 2,
          shape: shape,
        ),
      );
    }

    for (var i = 0; i < 92; i++) {
      final fromLeft = i.isEven;
      final angle = (fromLeft ? -52 : -128) + random.nextDouble() * 34;
      final radians = angle * math.pi / 180;
      final speed = 0.58 + random.nextDouble() * 0.55;

      addParticle(
        start: Offset(
          fromLeft ? -0.04 : 1.04,
          0.78 + random.nextDouble() * 0.1,
        ),
        velocity: Offset(math.cos(radians) * speed, math.sin(radians) * speed),
        gravity: 0.72 + random.nextDouble() * 0.32,
        size: 6 + random.nextDouble() * 7,
        shape: i % 5 == 0 ? _ConfettiShape.circle : _ConfettiShape.rectangle,
      );
    }

    for (var i = 0; i < 80; i++) {
      addParticle(
        start: Offset(random.nextDouble(), -0.12 - random.nextDouble() * 0.12),
        velocity: Offset(
          (random.nextDouble() - 0.5) * 0.24,
          0.28 + random.nextDouble() * 0.3,
        ),
        gravity: 0.2 + random.nextDouble() * 0.22,
        size: 5 + random.nextDouble() * 6,
        shape: i % 4 == 0 ? _ConfettiShape.circle : _ConfettiShape.rectangle,
      );
    }

    return particles;
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) {
      return const SizedBox.shrink();
    }

    return Positioned.fill(
      child: IgnorePointer(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return CustomPaint(
              painter: _ConfettiPainter(
                particles: _particles,
                progress: Curves.easeOutCubic.transform(_controller.value),
                rawProgress: _controller.value,
              ),
            );
          },
        ),
      ),
    );
  }
}

enum _ConfettiShape { circle, rectangle }

class _ConfettiParticle {
  const _ConfettiParticle({
    required this.start,
    required this.velocity,
    required this.gravity,
    required this.size,
    required this.color,
    required this.rotation,
    required this.rotationSpeed,
    required this.wobble,
    required this.shape,
  });

  final Offset start;
  final Offset velocity;
  final double gravity;
  final double size;
  final Color color;
  final double rotation;
  final double rotationSpeed;
  final double wobble;
  final _ConfettiShape shape;
}

class _ConfettiPainter extends CustomPainter {
  const _ConfettiPainter({
    required this.particles,
    required this.progress,
    required this.rawProgress,
  });

  final List<_ConfettiParticle> particles;
  final double progress;
  final double rawProgress;

  @override
  void paint(Canvas canvas, Size size) {
    final fade = (1 - ((rawProgress - 0.74) / 0.26).clamp(0.0, 1.0));
    final paint = Paint()..style = PaintingStyle.fill;

    for (final particle in particles) {
      final travelX = particle.velocity.dx * progress;
      final travelY =
          particle.velocity.dy * progress +
          particle.gravity * progress * progress;
      final wobble = math.sin(progress * math.pi * 4 + particle.wobble) * 0.018;
      final x = (particle.start.dx + travelX + wobble) * size.width;
      final y = (particle.start.dy + travelY) * size.height;

      if (y > size.height + 32 || x < -32 || x > size.width + 32) {
        continue;
      }

      paint.color = particle.color.withValues(alpha: fade);
      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(particle.rotation + progress * particle.rotationSpeed);

      if (particle.shape == _ConfettiShape.circle) {
        canvas.drawCircle(Offset.zero, particle.size * 0.42, paint);
      } else {
        final rect = Rect.fromCenter(
          center: Offset.zero,
          width: particle.size * 0.72,
          height: particle.size * 1.28,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect, Radius.circular(particle.size * 0.18)),
          paint,
        );
      }

      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.rawProgress != rawProgress ||
        oldDelegate.particles != particles;
  }
}

class _HeaderBar extends ConsumerWidget {
  const _HeaderBar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAuthenticated =
        (ref.watch(apiClientProvider).accessToken ?? '').isNotEmpty;
    final unreadCount = isAuthenticated
        ? ref.watch(unreadNotificationCountProvider)
        : 0;
    final count = isAuthenticated ? ref.watch(cartTicketCountProvider) : 0;

    return Row(
      children: [
        Text('Dò vé', style: AppTypography.pageTitle()),
        const Spacer(),
        if (isAuthenticated) ...[
          AppHeaderActionButton(
            icon: Icons.notifications_outlined,
            tooltip: 'Thông báo',
            badgeCount: unreadCount,
            onTap: () => context.push(AppRoute.notifications.path),
          ),
          const SizedBox(width: 8),
          AppHeaderActionButton(
            icon: Icons.chat_bubble_outline_rounded,
            tooltip: 'Trò chuyện / Hỗ trợ',
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ChatScreen(
                    isAuthenticated: true,
                    isActive: true,
                    onBack: () => Navigator.of(context).pop(),
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          AppHeaderActionButton(
            icon: Icons.shopping_cart_outlined,
            tooltip: 'Giỏ hàng',
            badgeCount: count,
            onTap: () => context.push(AppRoute.cart.path),
          ),
        ],
      ],
    );
  }
}

class _ImportantNotes extends StatelessWidget {
  const _ImportantNotes();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: AppColors.statusDangerSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.brandPrimaryBorderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.statusErrorSurface,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.verified_user_outlined,
                  size: 16,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Lưu ý quan trọng',
                style: AppTypography.subtitle2(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.brandPrimaryCrimson,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _noteLine(
            'Kết quả được cập nhật ngay sau khi có kết quả chính thức từ các đài.',
          ),
          const SizedBox(height: 6),
          _noteLine(
            'Thông tin vé của bạn được bảo mật và không lưu trữ sau khi tra cứu.',
          ),
        ],
      ),
    );
  }

  Widget _noteLine(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Container(
            width: 5,
            height: 5,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AppTypography.caption(
              fontSize: 12,
              height: 1.45,
              color: AppColors.brandPrimaryCrimson,
            ),
          ),
        ),
      ],
    );
  }
}

class _CheckingState extends StatelessWidget {
  const _CheckingState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          const CircularProgressIndicator(color: AppColors.primary),
          const SizedBox(height: 14),
          Text(
            'Đang dò kết quả...',
            style: AppTypography.bodyMedium(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.contentMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: const BoxDecoration(
            color: AppColors.statusErrorSurface,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.error_outline, color: AppColors.primary),
        ),
        const SizedBox(height: 12),
        Text(
          message,
          textAlign: TextAlign.center,
          style: AppTypography.bodyMedium(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.brandPrimaryDarkRed,
          ),
        ),
        const SizedBox(height: 14),
        FilledButton(
          onPressed: onRetry,
          style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
          child: Text(
            'Thử lại',
            style: AppTypography.buttonMedium(color: AppColors.surfacePrimary),
          ),
        ),
      ],
    );
  }
}

class _ResultState extends StatelessWidget {
  const _ResultState({required this.result, required this.onReset});

  final TicketCheckResult result;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    if (result.winning) {
      return Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  AppColors.statusSuccessSurface,
                  AppColors.surfaceSuccess,
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.statusSuccessBorder),
            ),
            child: Column(
              children: [
                Text('🎉', style: AppTypography.h1(fontSize: 28)),
                const SizedBox(height: 6),
                Text(
                  'Chúc mừng bạn đã trúng!',
                  style: AppTypography.h5(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.statusSuccessDeep,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Vé số của bạn trùng khớp với kết quả:',
                  style: AppTypography.bodySmall(
                    fontSize: 11,
                    color: AppColors.statusSuccessMedium,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ...result.matchedPrizes.map(
            (prize) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceSoft,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          prize.prizeDisplayName,
                          style: AppTypography.subtitle2(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Số trúng: ${prize.winningNumber}',
                          style: AppTypography.lotteryDigit(
                            fontSize: 11,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    AppFormatters.formatCurrency(prize.prizeValue),
                    style: AppTypography.priceMedium(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (result.matchedPrizes.length > 1) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.brandPrimarySubtle,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Text(
                    'Tổng giải thưởng:',
                    style: AppTypography.subtitle2(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    AppFormatters.formatCurrency(result.totalWinningAmount),
                    style: AppTypography.priceMedium(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          OutlinedButton(
            onPressed: onReset,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.contentSlate600,
              side: const BorderSide(color: AppColors.borderSubtle),
              minimumSize: const Size.fromHeight(44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(
              'Dò vé khác',
              style: AppTypography.buttonMedium(
                color: AppColors.contentSlate600,
              ),
            ),
          ),
        ],
      );
    }

    if (!result.resultAvailable) {
      return _NeutralResult(
        emoji: '⏳',
        title: 'Chưa có kết quả',
        message:
            'Kết quả xổ số đài này ngày đã chọn chưa được cập nhật. Vui lòng quay lại sau!',
        onReset: onReset,
      );
    }

    return _NeutralResult(
      emoji: '🍀',
      title: 'Rất tiếc, chưa trúng giải',
      message:
          'Vé số của bạn không trùng với giải nào lần này. Chúc bạn may mắn lần sau!',
      onReset: onReset,
    );
  }
}

class _NeutralResult extends StatelessWidget {
  const _NeutralResult({
    required this.emoji,
    required this.title,
    required this.message,
    required this.onReset,
  });

  final String emoji;
  final String title;
  final String message;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(emoji, style: AppTypography.h1(fontSize: 28)),
        const SizedBox(height: 8),
        Text(
          title,
          style: AppTypography.h5(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppColors.contentSlate700,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: AppTypography.bodySmall(
            fontSize: 12,
            color: AppColors.contentMuted,
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: onReset,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.contentSlate600,
            side: const BorderSide(color: AppColors.borderSubtle),
            minimumSize: const Size.fromHeight(44),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: Text(
            'Dò vé khác',
            style: AppTypography.buttonMedium(color: AppColors.contentSlate600),
          ),
        ),
      ],
    );
  }
}

class _FormState extends StatefulWidget {
  const _FormState({required this.state, required this.vm});

  final TicketCheckState state;
  final TicketCheckViewModel vm;

  @override
  State<_FormState> createState() => _FormStateState();
}

class _FormStateState extends State<_FormState> {
  late final TextEditingController _numberController;

  @override
  void initState() {
    super.initState();
    _numberController = TextEditingController(text: widget.state.ticketNumber);
  }

  @override
  void didUpdateWidget(covariant _FormState oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state.ticketNumber != _numberController.text) {
      _numberController.text = widget.state.ticketNumber;
      _numberController.selection = TextSelection.collapsed(
        offset: _numberController.text.length,
      );
    }
  }

  @override
  void dispose() {
    _numberController.dispose();
    super.dispose();
  }

  TicketCheckState get state => widget.state;
  TicketCheckViewModel get vm => widget.vm;

  @override
  Widget build(BuildContext context) {
    final selectedDate = state.selectedDate;
    final dateLabel = selectedDate == null
        ? 'Chọn ngày quay'
        : DateFormat('dd/MM/yyyy').format(selectedDate);
    final canPickStation =
        selectedDate != null &&
        !state.isLoadingStations &&
        state.stations.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Chọn ngày',
          style: AppTypography.subtitle2(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: AppColors.contentSlate700,
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: () => _pickDate(context),
          borderRadius: BorderRadius.circular(14),
          child: InputDecorator(
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.surfacePrimary,
              errorText: state.dateError,
              prefixIcon: const Icon(
                Icons.calendar_month_outlined,
                color: AppColors.primary,
                size: 18,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: state.dateError != null
                      ? AppColors.statusError
                      : AppColors.borderSubtle,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            child: Text(
              dateLabel,
              style: AppTypography.bodyMedium(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selectedDate == null
                    ? AppColors.contentSubtle
                    : AppColors.contentSlate900,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Chọn đài',
          style: AppTypography.subtitle2(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: AppColors.contentSlate700,
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: canPickStation ? () => _pickStation(context) : null,
          borderRadius: BorderRadius.circular(14),
          child: InputDecorator(
            decoration: InputDecoration(
              filled: true,
              fillColor: canPickStation
                  ? AppColors.surfacePrimary
                  : AppColors.surfaceSoft,
              errorText: state.stationError,
              prefixIcon: Icon(
                Icons.place_outlined,
                color: canPickStation
                    ? AppColors.primary
                    : AppColors.borderMuted,
                size: 18,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: state.stationError != null
                      ? AppColors.statusError
                      : AppColors.borderSubtle,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            child: Text(
              selectedDate == null
                  ? 'Chọn ngày trước'
                  : state.isLoadingStations
                  ? 'Đang tải đài...'
                  : (state.selectedStation?.province ?? 'Chọn đài'),
              style: AppTypography.bodyMedium(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: !canPickStation && state.selectedStation == null
                    ? AppColors.contentSubtle
                    : AppColors.contentSlate900,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Nhập dãy số trên vé',
          style: AppTypography.subtitle2(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: AppColors.contentSlate700,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _numberController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: vm.setTicketNumber,
          style: AppTypography.lotteryDigit(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            letterSpacing: 2,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: 'Nhập dãy số (ví dụ: 123456)',
            errorText: state.numberError,
            helperText: state.numberError == null
                ? 'Nhập đúng 5 hoặc 6 chữ số trên vé của bạn'
                : null,
            prefixIcon: const Icon(
              Icons.confirmation_number_outlined,
              color: AppColors.primary,
              size: 18,
            ),
            filled: true,
            fillColor: AppColors.surfacePrimary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.borderSubtle),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: state.numberError != null
                    ? AppColors.statusError
                    : AppColors.borderSubtle,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 1.4,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: vm.check,
          icon: const Icon(Icons.search_rounded, size: 20),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            minimumSize: const Size.fromHeight(50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          label: Text(
            'Tra cứu kết quả',
            style: AppTypography.buttonMedium(
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'HOẶC CHỌN NHANH',
          textAlign: TextAlign.center,
          style: AppTypography.overline(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: AppColors.contentSubtle,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _QuickDateChip(
                label: 'Hôm nay',
                selected:
                    state.selectedDate != null &&
                    _isSameDay(state.selectedDate!, DateTime.now()),
                onTap: () {
                  final now = DateTime.now();
                  vm.loadStations(DateTime(now.year, now.month, now.day));
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _QuickDateChip(
                label: 'Hôm qua',
                selected:
                    state.selectedDate != null &&
                    _isSameDay(
                      state.selectedDate!,
                      DateTime.now().subtract(const Duration(days: 1)),
                    ),
                onTap: () {
                  final d = DateTime.now().subtract(const Duration(days: 1));
                  vm.loadStations(DateTime(d.year, d.month, d.day));
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _pickDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: state.selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: AppColors.primary),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      await vm.loadStations(DateTime(picked.year, picked.month, picked.day));
    }
  }

  Future<void> _pickStation(BuildContext context) async {
    if (state.stations.isEmpty) return;
    final selected = await showModalBottomSheet<LotteryStationDraw>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.surfacePrimary,
      builder: (context) {
        return Theme(
          data: Theme.of(context).copyWith(
            bottomSheetTheme: const BottomSheetThemeData(
              backgroundColor: AppColors.surfacePrimary,
              modalBackgroundColor: AppColors.surfacePrimary,
            ),
          ),
          child: SafeArea(
            child: ColoredBox(
              color: AppColors.surfacePrimary,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 10, 24, 22),
                    child: Text(
                      'Chọn đài vé số',
                      textAlign: TextAlign.center,
                      style: AppTypography.h4(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        color: AppColors.contentHeading,
                      ),
                    ),
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: state.stations.length,
                      separatorBuilder: (_, _) => const Divider(
                        height: 1,
                        color: AppColors.borderSubtle,
                      ),
                      itemBuilder: (context, index) {
                        final station = state.stations[index];
                        final isSelected =
                            station.id == state.selectedStationId;
                        return InkWell(
                          onTap: () => Navigator.of(context).pop(station),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 20,
                            ),
                            color: AppColors.surfacePrimary,
                            child: Text(
                              station.province,
                              style: AppTypography.bodyLarge(
                                fontSize: 18,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.contentHeading,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
    if (selected != null) {
      vm.selectStation(selected.id);
    }
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

class _QuickDateChip extends StatelessWidget {
  const _QuickDateChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.contentSlate600;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.brandPrimarySubtle
              : AppColors.surfaceSoft,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? AppColors.brandPrimaryBorder
                : AppColors.borderSubtle,
          ),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today_outlined, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTypography.buttonSmall(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

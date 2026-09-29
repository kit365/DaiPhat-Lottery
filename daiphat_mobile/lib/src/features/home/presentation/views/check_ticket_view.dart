import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/home/domain/entities/ticket_check.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/lottery_date_picker_dialog.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/ticket_check_results_card.dart';
import 'package:daiphat_mobile/src/features/schedule/domain/entities/lottery_station_schedule.dart';
import 'package:daiphat_mobile/src/features/schedule/presentation/providers/schedule_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_picker_field.dart';

class CheckTicketView extends ConsumerStatefulWidget {
  const CheckTicketView({super.key});

  @override
  ConsumerState<CheckTicketView> createState() => _CheckTicketViewState();
}

class _CheckTicketViewState extends ConsumerState<CheckTicketView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final current = ref.read(ticketCheckViewModelProvider);
      if (current.selectedDate != null) return;

      final now = DateTime.now();
      // Align with the website: before results are normally available at
      // 16:40, start from yesterday; otherwise default to today.
      final useYesterday = now.hour < 16 || (now.hour == 16 && now.minute < 40);
      final date = useYesterday ? now.subtract(const Duration(days: 1)) : now;
      ref
          .read(ticketCheckViewModelProvider.notifier)
          .loadStations(DateTime(date.year, date.month, date.day));
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ticketCheckViewModelProvider);
    final schedule = ref.watch(lotteryScheduleProvider);
    final vm = ref.read(ticketCheckViewModelProvider.notifier);
    final winEffectKey = _winEffectKey(state);
    final winTier = state.checkResult != null && state.checkResult!.winning
        ? resolveWinCelebrationTier(state.checkResult!)
        : WinCelebrationTier.standard;
    final animationsDisabled = MediaQuery.of(context).disableAnimations;
    final showSupport =
        !state.isChecking &&
        state.errorMessage == null &&
        (!state.hasChecked || state.checkResult == null);
    final isWinningResult =
        state.hasChecked && state.checkResult?.winning == true;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 380,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.surfacePrimary, AppColors.transparent],
                stops: [0.5, 1.0],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset(
                'assets/images/home_bg.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
          SafeArea(
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
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                      child: _WinningResultPopup(
                        key: ValueKey(isWinningResult ? state.checkSequence : -1),
                        active: isWinningResult,
                        child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surfacePrimary,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppColors.borderDecorative,
                            width: 1.0,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: AppColors.shadowFaint,
                              blurRadius: 12,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
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
                            else
                              _FormState(state: state, vm: vm),
                            ],
                          ),
                        ),
                      ),
                    ),

                    if (state.hasChecked && state.checkResult != null)
                      _CheckedStationResultsSection(state: state),

                    if (showSupport)
                      _CheckTicketSupportSection(schedule: schedule),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
          if (winEffectKey != null)
            _WinConfettiOverlay(
              key: ValueKey(winEffectKey),
              active: !animationsDisabled,
              triggerKey: winEffectKey,
              tier: winTier,
              prizeCode: state.checkResult != null && state.checkResult!.winning
                  ? resolveWinPrizeCode(state.checkResult!)
                  : 'G8',
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
      state.checkSequence,
      state.selectedStationId,
      dateKey,
      result.ticketNumber,
      prizeKey,
    ].join('|');
  }
}

enum WinCelebrationTier {
  /// Giải Đặc Biệt, Giải Phụ ĐB, Giải Nhất hoặc trúng từ 30.000.000đ trở lên
  jackpot,

  /// Giải Nhì, Giải Ba, Giải Tư, Giải Năm hoặc trúng từ 1.000.000đ đến dưới 30.000.000đ
  major,

  /// Giải Sáu, Giải Bảy, Giải Tám, Giải Khuyến Khích (< 1.000.000đ)
  standard,
}

WinCelebrationTier resolveWinCelebrationTier(TicketCheckResult result) {
  final hasJackpotCode = result.matchedPrizes.any((p) {
    final code = p.prizeCode?.toUpperCase().trim() ?? '';
    final name = p.prizeDisplayName.toLowerCase();
    return code == 'DB' ||
        code == 'G1' ||
        code == 'PDB' ||
        name.contains('đặc biệt') ||
        name.contains('phụ đặc biệt') ||
        name.contains('nhất');
  });

  if (hasJackpotCode || result.totalWinningAmount >= 30000000) {
    return WinCelebrationTier.jackpot;
  }

  final hasMajorCode = result.matchedPrizes.any((p) {
    final code = p.prizeCode?.toUpperCase().trim() ?? '';
    final name = p.prizeDisplayName.toLowerCase();
    return code == 'G2' ||
        code == 'G3' ||
        code == 'G4' ||
        code == 'G5' ||
        name.contains('nhì') ||
        name.contains('ba') ||
        name.contains('tư') ||
        name.contains('năm');
  });

  if (hasMajorCode || result.totalWinningAmount >= 1000000) {
    return WinCelebrationTier.major;
  }

  return WinCelebrationTier.standard;
}

String resolveWinPrizeCode(TicketCheckResult result) {
  const prizeRank = <String, int>{
    'DB': 8,
    'G1': 7,
    'G2': 6,
    'G3': 5,
    'G4': 4,
    'G5': 3,
    'G6': 2,
    'G7': 1,
    'G8': 0,
  };

  String normalizeCode(String? code, String name) {
    final upper = code?.toUpperCase().trim() ?? '';
    if (prizeRank.containsKey(upper)) return upper;
    if (upper == 'PDB') return 'DB';
    final lowerName = name.toLowerCase();
    if (lowerName.contains('đặc biệt') || lowerName.contains('phụ đặc biệt')) {
      return 'DB';
    }
    if (lowerName.contains('nhất')) return 'G1';
    if (lowerName.contains('nhì')) return 'G2';
    if (lowerName.contains('ba')) return 'G3';
    if (lowerName.contains('tư') || lowerName.contains('bốn')) return 'G4';
    if (lowerName.contains('năm')) return 'G5';
    if (lowerName.contains('sáu')) return 'G6';
    if (lowerName.contains('bảy')) return 'G7';
    if (lowerName.contains('tám')) return 'G8';
    return 'G8';
  }

  var best = 'G8';
  for (final prize in result.matchedPrizes) {
    final code = normalizeCode(prize.prizeCode, prize.prizeDisplayName);
    if ((prizeRank[code] ?? 0) > (prizeRank[best] ?? 0)) {
      best = code;
    }
  }
  return best;
}

class _WinConfettiOverlay extends StatefulWidget {
  const _WinConfettiOverlay({
    super.key,
    required this.active,
    required this.triggerKey,
    this.tier = WinCelebrationTier.standard,
    this.prizeCode = 'G8',
  });

  final bool active;
  final String triggerKey;
  final WinCelebrationTier tier;
  final String prizeCode;

  @override
  State<_WinConfettiOverlay> createState() => _WinConfettiOverlayState();
}

class _WinConfettiOverlayState extends State<_WinConfettiOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  List<_CelebrationParticle> _particles = const [];
  final List<Timer> _hapticTimers = [];

  Duration get _animationDuration => switch (widget.prizeCode) {
    'DB' => const Duration(milliseconds: 5200),
    'G1' => const Duration(milliseconds: 4400),
    'G2' => const Duration(milliseconds: 3600),
    'G3' => const Duration(milliseconds: 3000),
    'G4' => const Duration(milliseconds: 2800),
    'G5' => const Duration(milliseconds: 2500),
    'G6' => const Duration(milliseconds: 2300),
    'G7' => const Duration(milliseconds: 2100),
    'G8' => const Duration(milliseconds: 1900),
    _ => const Duration(milliseconds: 2200),
  };

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: _animationDuration,
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed && mounted) {
          setState(() {
            _particles = const [];
          });
        }
      });

    if (widget.active) {
      _particles = _buildCelebrationParticles(
        math.Random(widget.triggerKey.hashCode),
        widget.prizeCode,
        _animationDuration.inMilliseconds.toDouble(),
      );
      _scheduleHaptics();
      _controller.forward(from: 0);
    }
  }

  @override
  void didUpdateWidget(covariant _WinConfettiOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.active) {
      _controller.stop();
      _cancelHapticTimers();
      if (_particles.isNotEmpty) {
        setState(() {
          _particles = const [];
        });
      }
      return;
    }

    if (oldWidget.triggerKey != widget.triggerKey ||
        oldWidget.prizeCode != widget.prizeCode ||
        oldWidget.tier != widget.tier ||
        !oldWidget.active) {
      _controller.duration = _animationDuration;
      _restart();
    }
  }

  void _cancelHapticTimers() {
    for (final timer in _hapticTimers) {
      timer.cancel();
    }
    _hapticTimers.clear();
  }

  void _scheduleHaptic(Duration delay, VoidCallback action) {
    _hapticTimers.add(
      Timer(delay, () {
        if (mounted) action();
      }),
    );
  }

  @override
  void dispose() {
    _cancelHapticTimers();
    _controller.dispose();
    super.dispose();
  }

  void _scheduleHaptics() {
    switch (widget.prizeCode) {
      case 'DB':
        HapticFeedback.heavyImpact();
        _scheduleHaptic(
          const Duration(milliseconds: 200),
          HapticFeedback.mediumImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 450),
          HapticFeedback.heavyImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 750),
          HapticFeedback.selectionClick,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 2000),
          HapticFeedback.heavyImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 2280),
          HapticFeedback.heavyImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 2620),
          HapticFeedback.mediumImpact,
        );
        break;
      case 'G1':
        HapticFeedback.heavyImpact();
        _scheduleHaptic(
          const Duration(milliseconds: 250),
          HapticFeedback.mediumImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 1300),
          HapticFeedback.heavyImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 1540),
          HapticFeedback.mediumImpact,
        );
        break;
      case 'G2':
        HapticFeedback.mediumImpact();
        _scheduleHaptic(
          const Duration(milliseconds: 200),
          HapticFeedback.lightImpact,
        );
        _scheduleHaptic(
          const Duration(milliseconds: 650),
          HapticFeedback.heavyImpact,
        );
        break;
      case 'G3':
      case 'G4':
        HapticFeedback.mediumImpact();
        _scheduleHaptic(
          const Duration(milliseconds: 220),
          HapticFeedback.lightImpact,
        );
        break;
      case 'G5':
      case 'G6':
      case 'G7':
      case 'G8':
      default:
        HapticFeedback.lightImpact();
        break;
    }
  }

  void _restart() {
    _cancelHapticTimers();
    final particles = _buildCelebrationParticles(
      math.Random(widget.triggerKey.hashCode),
      widget.prizeCode,
      _animationDuration.inMilliseconds.toDouble(),
    );
    if (mounted) {
      setState(() {
        _particles = particles;
      });
    } else {
      _particles = particles;
    }

    _scheduleHaptics();
    _controller.forward(from: 0);
  }

  List<_CelebrationParticle> _buildCelebrationParticles(
    math.Random random,
    String prizeCode,
    double totalDurationMs,
  ) {
    final particles = <_CelebrationParticle>[];

    const dbColors = [
      Color(0xFFFFD700),
      Color(0xFFF59E0B),
      Color(0xFFEE1314),
      Color(0xFFFFF7ED),
      Color(0xFFFFFFFF),
      Color(0xFFFBBF24),
    ];

    const g1Colors = [
      Color(0xFFEE1314),
      Color(0xFFF59E0B),
      Color(0xFFFCA5A5),
      Color(0xFFFFFFFF),
      Color(0xFFFFD700),
    ];

    const g2Colors = [
      Color(0xFFF97316),
      Color(0xFFFBBF24),
      Color(0xFFFDE68A),
      Color(0xFFFFFFFF),
      Color(0xFFEE1314),
    ];

    const g3Colors = [
      Color(0xFF10B981),
      Color(0xFF34D399),
      Color(0xFFA7F3D0),
      Color(0xFFFFFFFF),
    ];

    const g4Colors = [
      Color(0xFF3B82F6),
      Color(0xFF60A5FA),
      Color(0xFFBFDBFE),
      Color(0xFFFFFFFF),
    ];

    const g5Colors = [
      Color(0xFF8B5CF6),
      Color(0xFFA78BFA),
      Color(0xFFDDD6FE),
      Color(0xFFFFFFFF),
    ];

    const g6Colors = [
      Color(0xFF06B6D4),
      Color(0xFF22D3EE),
      Color(0xFFA5F3FC),
      Color(0xFFFFFFFF),
    ];

    const g7Colors = [
      Color(0xFFEC4899),
      Color(0xFFF472B6),
      Color(0xFFFBCFE8),
      Color(0xFFFFFFFF),
    ];

    const g8Colors = [
      Color(0xFF84CC16),
      Color(0xFFA3E635),
      Color(0xFFD9F99D),
      Color(0xFFFFFFFF),
    ];

    void addRawParticle({
      required Offset origin,
      required Offset velocity,
      required double delay,
      required double lifetime,
      required double gravity,
      required double drag,
      required double size,
      required Color color,
      required _ConfettiShape shape,
      double wobbleAmp = 0.016,
    }) {
      final safeDelay = delay.clamp(0.0, 0.95);
      final safeLifetime = math.min(lifetime, 0.98 - safeDelay);
      if (safeLifetime <= 0.02) return;

      particles.add(
        _CelebrationParticle(
          origin: origin,
          velocity: velocity,
          delay: safeDelay,
          lifetime: safeLifetime,
          gravity: gravity,
          drag: drag,
          size: size,
          color: color,
          rotation: random.nextDouble() * math.pi * 2,
          rotationSpeed:
              (random.nextDouble() * 6 + 2) * (random.nextBool() ? 1 : -1),
          wobble: random.nextDouble() * math.pi * 2,
          wobbleSpeed: random.nextDouble() * 3 + 2,
          wobbleAmplitude: wobbleAmp,
          shape: shape,
          rollSpeedX: random.nextDouble() * 4 + 1.5,
          rollSpeedY: random.nextDouble() * 4 + 1.5,
        ),
      );
    }

    void fireCannons({
      required List<Color> colors,
      required double delayNorm,
      int particleCount = 8,
    }) {
      final pCount = math.max(4, particleCount);
      // Left cannon at x: 0, y: 0.72, angle: 60 (up-right), spread: 70
      for (var i = 0; i < pCount; i++) {
        final angleDeg = -60 + (random.nextDouble() - 0.5) * 70;
        final rad = angleDeg * math.pi / 180;
        final speed = 0.95 + random.nextDouble() * 0.45;
        final shapeChoice = random.nextInt(10);
        final shape = shapeChoice < 3
            ? _ConfettiShape.star
            : shapeChoice < 6
            ? _ConfettiShape.sparkle
            : (shapeChoice < 8 ? _ConfettiShape.ribbon : _ConfettiShape.rectangle);

        addRawParticle(
          origin: const Offset(-0.02, 0.72),
          velocity: Offset(math.cos(rad) * speed, math.sin(rad) * speed),
          delay: delayNorm,
          lifetime: 0.28 + random.nextDouble() * 0.12,
          gravity: 0.72 + random.nextDouble() * 0.20,
          drag: 0.95,
          size: 7 + random.nextDouble() * 6,
          color: colors[random.nextInt(colors.length)],
          shape: shape,
          wobbleAmp: 0.022,
        );
      }

      // Right cannon at x: 1, y: 0.72, angle: 120 (up-left), spread: 70
      for (var i = 0; i < pCount; i++) {
        final angleDeg = -120 + (random.nextDouble() - 0.5) * 70;
        final rad = angleDeg * math.pi / 180;
        final speed = 0.95 + random.nextDouble() * 0.45;
        final shapeChoice = random.nextInt(10);
        final shape = shapeChoice < 3
            ? _ConfettiShape.star
            : shapeChoice < 6
            ? _ConfettiShape.sparkle
            : (shapeChoice < 8 ? _ConfettiShape.ribbon : _ConfettiShape.rectangle);

        addRawParticle(
          origin: const Offset(1.02, 0.72),
          velocity: Offset(math.cos(rad) * speed, math.sin(rad) * speed),
          delay: delayNorm,
          lifetime: 0.28 + random.nextDouble() * 0.12,
          gravity: 0.72 + random.nextDouble() * 0.20,
          drag: 0.95,
          size: 7 + random.nextDouble() * 6,
          color: colors[random.nextInt(colors.length)],
          shape: shape,
          wobbleAmp: 0.022,
        );
      }
    }

    void fireRadialBurst({
      required Offset origin,
      required List<Color> colors,
      required double delayNorm,
      required int count,
      double spread = 360,
      double baseAngle = -90,
      double startVelocity = 50,
      double scalar = 1.0,
      bool shockwave = false,
    }) {
      if (shockwave) {
        addRawParticle(
          origin: origin,
          velocity: Offset.zero,
          delay: delayNorm,
          lifetime: 0.16,
          gravity: 0.0,
          drag: 0.0,
          size: 14.0 * scalar,
          color: colors.first,
          shape: _ConfettiShape.shockwaveRing,
        );
      }

      for (var i = 0; i < count; i++) {
        final angleDeg = spread >= 360
            ? (i * (360 / count) + random.nextDouble() * (360 / count))
            : (baseAngle + (random.nextDouble() - 0.5) * spread);
        final rad = angleDeg * math.pi / 180;
        final speed = (startVelocity / 65.0) * (0.45 + random.nextDouble() * 0.55);

        final shapeChoice = random.nextInt(10);
        final shape = shapeChoice < 3
            ? _ConfettiShape.star
            : shapeChoice < 5
            ? _ConfettiShape.sparkle
            : (shapeChoice < 8 ? _ConfettiShape.fireworkSpark : _ConfettiShape.circle);

        addRawParticle(
          origin: origin,
          velocity: Offset(math.cos(rad) * speed, math.sin(rad) * speed),
          delay: delayNorm,
          lifetime: 0.24 + random.nextDouble() * 0.14,
          gravity: (0.60 + random.nextDouble() * 0.25) * scalar,
          drag: 1.25,
          size: (6.0 + random.nextDouble() * 5.0) * scalar,
          color: colors[random.nextInt(colors.length)],
          shape: shape,
        );
      }
    }

    void fireMegaBoom({
      required List<Color> colors,
      required double delayNorm,
      double power = 1.0,
    }) {
      int n(int c) => math.max(8, (c * power).round());

      // Center main boom: 80 particles, spread 170, velocity 78
      fireRadialBurst(
        origin: const Offset(0.5, 0.58),
        colors: colors,
        delayNorm: delayNorm,
        count: n(80),
        spread: 170,
        baseAngle: -90,
        startVelocity: 78,
        scalar: 1.35 * math.min(1.2, power),
        shockwave: true,
      );

      // Left satellite boom: 45 particles, spread 100, velocity 64
      fireRadialBurst(
        origin: const Offset(0.18, 0.52),
        colors: colors,
        delayNorm: delayNorm,
        count: n(45),
        spread: 100,
        baseAngle: -70,
        startVelocity: 64,
        scalar: 1.15,
        shockwave: true,
      );

      // Right satellite boom: 45 particles, spread 100, velocity 64
      fireRadialBurst(
        origin: const Offset(0.82, 0.52),
        colors: colors,
        delayNorm: delayNorm,
        count: n(45),
        spread: 100,
        baseAngle: -110,
        startVelocity: 64,
        scalar: 1.15,
        shockwave: true,
      );

      // Upper sphere burst: 38 particles, spread 360, velocity 42
      fireRadialBurst(
        origin: const Offset(0.5, 0.32),
        colors: colors,
        delayNorm: delayNorm,
        count: n(38),
        spread: 360,
        startVelocity: 42,
        scalar: 1.05,
      );

      fireCannons(colors: colors, delayNorm: delayNorm, particleCount: n(10));
    }

    void fireRandomFirework({
      required List<Color> colors,
      required double delayNorm,
      double intensity = 1.0,
    }) {
      final count = math.max(12, (38 * intensity).round());
      final origin = Offset(
        0.12 + random.nextDouble() * 0.76,
        0.12 + random.nextDouble() * 0.38,
      );
      final spread = 100 + random.nextDouble() * 50;
      final startVel = 48 + random.nextDouble() * 26;
      final scalar = (1.0 + random.nextDouble() * 0.40) * math.min(1.3, intensity);

      fireRadialBurst(
        origin: origin,
        colors: colors,
        delayNorm: delayNorm,
        count: count,
        spread: spread,
        baseAngle: -90,
        startVelocity: startVel,
        scalar: scalar,
        shockwave: true,
      );
    }

    void fireChargeSpark({
      required List<Color> colors,
      required double delayNorm,
      double intensity = 1.0,
    }) {
      final count = math.max(2, (3 * intensity).round());
      for (var i = 0; i < count; i++) {
        final angleDeg = -90 + (random.nextDouble() - 0.5) * 36;
        final rad = angleDeg * math.pi / 180;
        final speed = 0.18 + intensity * 0.08;
        addRawParticle(
          origin: const Offset(0.5, 0.58),
          velocity: Offset(math.cos(rad) * speed, math.sin(rad) * speed),
          delay: delayNorm,
          lifetime: 0.14,
          gravity: 0.35,
          drag: 0.85,
          size: 4 + intensity * 2,
          color: colors[random.nextInt(colors.length)],
          shape: _ConfettiShape.circle,
        );
      }
    }

    void fireGoldRain({
      required List<Color> colors,
      required double delayNorm,
      int count = 16,
    }) {
      for (var i = 0; i < count; i++) {
        addRawParticle(
          origin: Offset(random.nextDouble(), -0.04),
          velocity: Offset(
            (random.nextDouble() - 0.5) * 0.25,
            0.28 + random.nextDouble() * 0.28,
          ),
          delay: delayNorm,
          lifetime: 0.25 + random.nextDouble() * 0.15,
          gravity: 1.15,
          drag: 0.65,
          size: 6 + random.nextDouble() * 6,
          color: colors[random.nextInt(colors.length)],
          shape: i % 3 == 0
              ? _ConfettiShape.star
              : (i % 3 == 1 ? _ConfettiShape.sparkle : _ConfettiShape.rectangle),
        );
      }
    }

    // Runner dispatch based on prizeCode (100% web parity)
    switch (prizeCode) {
      case 'DB':
        const colors = dbColors;
        final boomNorm = 2000 / totalDurationMs;

        // Charging sparks before boom
        for (var ms = 0; ms < 2000; ms += 140) {
          final intensity = ms < 750 ? 0.85 : 1.9;
          fireChargeSpark(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: intensity,
          );
        }

        // 3-wave megaBoom
        fireMegaBoom(colors: colors, delayNorm: boomNorm, power: 1.15);
        fireMegaBoom(
          colors: colors,
          delayNorm: (2000 + 280) / totalDurationMs,
          power: 1.35,
        );
        fireMegaBoom(
          colors: colors,
          delayNorm: (2000 + 620) / totalDurationMs,
          power: 1.0,
        );

        // Aerial fireworks, gold rain, and side cannons
        for (var ms = 2000; ms < 4600; ms += 520) {
          fireRandomFirework(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 1.7,
          );
        }
        for (var ms = 2000; ms < 4600; ms += 240) {
          fireGoldRain(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            count: 14,
          );
        }
        for (var ms = 2000; ms < 4600; ms += 550) {
          fireCannons(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            particleCount: 8,
          );
        }
        break;

      case 'G1':
        const colors = g1Colors;
        final boomNorm = 1300 / totalDurationMs;

        // Charging sparks
        for (var ms = 0; ms < 1300; ms += 160) {
          fireChargeSpark(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 0.95,
          );
        }

        // 2-wave megaBoom
        fireMegaBoom(colors: colors, delayNorm: boomNorm, power: 0.95);
        fireMegaBoom(
          colors: colors,
          delayNorm: (1300 + 240) / totalDurationMs,
          power: 0.80,
        );

        // Aerial fireworks & side cannons
        for (var ms = 1300; ms < 3800; ms += 700) {
          fireRandomFirework(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 1.35,
          );
        }
        for (var ms = 1300; ms < 3800; ms += 650) {
          fireCannons(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            particleCount: 6,
          );
        }
        break;

      case 'G2':
        const colors = g2Colors;
        final boomNorm = 650 / totalDurationMs;

        for (var ms = 0; ms < 650; ms += 180) {
          fireChargeSpark(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 0.70,
          );
        }

        fireMegaBoom(colors: colors, delayNorm: boomNorm, power: 0.72);

        for (var ms = 650; ms < 3200; ms += 900) {
          fireRandomFirework(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 1.10,
          );
        }
        for (var ms = 650; ms < 3200; ms += 800) {
          fireCannons(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            particleCount: 4,
          );
        }
        break;

      case 'G3':
        const colors = g3Colors;
        final delayNorm = 220 / totalDurationMs;

        fireRadialBurst(
          origin: const Offset(0.5, 0.42),
          colors: colors,
          delayNorm: delayNorm,
          count: 85,
          spread: 110,
          baseAngle: -90,
          startVelocity: 58,
          scalar: 1.1,
          shockwave: true,
        );
        fireCannons(colors: colors, delayNorm: delayNorm, particleCount: 8);

        for (var ms = 220; ms < 2600; ms += 1100) {
          fireRandomFirework(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 0.95,
          );
        }
        break;

      case 'G4':
        const colors = g4Colors;
        final delayNorm = 120 / totalDurationMs;

        fireRadialBurst(
          origin: const Offset(0.5, 0.50),
          colors: colors,
          delayNorm: delayNorm,
          count: 75,
          spread: 100,
          baseAngle: -90,
          startVelocity: 54,
          scalar: 1.0,
          shockwave: true,
        );

        for (var ms = 120; ms < 2400; ms += 1300) {
          fireRandomFirework(
            colors: colors,
            delayNorm: ms / totalDurationMs,
            intensity: 0.85,
          );
        }
        break;

      case 'G5':
        const colors = g5Colors;
        fireRadialBurst(
          origin: const Offset(0.5, 0.54),
          colors: colors,
          delayNorm: 0.0,
          count: 65,
          spread: 92,
          baseAngle: -90,
          startVelocity: 50,
          scalar: 1.0,
          shockwave: true,
        );
        fireRandomFirework(colors: colors, delayNorm: 0.50, intensity: 0.70);
        break;

      case 'G6':
        const colors = g6Colors;
        fireRadialBurst(
          origin: const Offset(0.5, 0.56),
          colors: colors,
          delayNorm: 0.0,
          count: 55,
          spread: 84,
          baseAngle: -90,
          startVelocity: 46,
          scalar: 1.0,
          shockwave: true,
        );
        fireRandomFirework(colors: colors, delayNorm: 0.55, intensity: 0.60);
        break;

      case 'G7':
        const colors = g7Colors;
        fireRadialBurst(
          origin: const Offset(0.5, 0.58),
          colors: colors,
          delayNorm: 0.0,
          count: 48,
          spread: 76,
          baseAngle: -90,
          startVelocity: 42,
          scalar: 0.95,
          shockwave: true,
        );
        fireRandomFirework(colors: colors, delayNorm: 0.60, intensity: 0.50);
        break;

      case 'G8':
      default:
        const colors = g8Colors;
        fireRadialBurst(
          origin: const Offset(0.5, 0.60),
          colors: colors,
          delayNorm: 0.0,
          count: 40,
          spread: 70,
          baseAngle: -90,
          startVelocity: 38,
          scalar: 0.90,
          shockwave: true,
        );
        fireRandomFirework(colors: colors, delayNorm: 0.65, intensity: 0.42);
        break;
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
            if (_particles.isEmpty || _controller.value >= 1.0) {
              return const SizedBox.shrink();
            }
            return CustomPaint(
              painter: _CelebrationPainter(
                particles: _particles,
                rawProgress: _controller.value,
              ),
            );
          },
        ),
      ),
    );
  }
}

enum _ConfettiShape {
  star,
  sparkle,
  ribbon,
  rectangle,
  circle,
  fireworkSpark,
  shockwaveRing,
}

class _CelebrationParticle {
  const _CelebrationParticle({
    required this.origin,
    required this.velocity,
    required this.delay,
    required this.lifetime,
    required this.gravity,
    required this.drag,
    required this.size,
    required this.color,
    required this.rotation,
    required this.rotationSpeed,
    required this.wobble,
    required this.wobbleSpeed,
    required this.wobbleAmplitude,
    required this.shape,
    required this.rollSpeedX,
    required this.rollSpeedY,
  });

  final Offset origin;
  final Offset velocity;
  final double delay;
  final double lifetime;
  final double gravity;
  final double drag;
  final double size;
  final Color color;
  final double rotation;
  final double rotationSpeed;
  final double wobble;
  final double wobbleSpeed;
  final double wobbleAmplitude;
  final _ConfettiShape shape;
  final double rollSpeedX;
  final double rollSpeedY;
}

class _CelebrationPainter extends CustomPainter {
  const _CelebrationPainter({
    required this.particles,
    required this.rawProgress,
  });

  final List<_CelebrationParticle> particles;
  final double rawProgress;

  static Path _getStarPath(double radius) {
    final path = Path();
    final double innerRadius = radius * 0.40;
    for (var i = 0; i < 10; i++) {
      final double r = i.isEven ? radius : innerRadius;
      final double angle = (i * 36 - 90) * math.pi / 180;
      final double x = r * math.cos(angle);
      final double y = r * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    return path;
  }

  static Path _getSparklePath(double radius) {
    final path = Path();
    final double inner = radius * 0.22;
    for (var i = 0; i < 8; i++) {
      final double r = i.isEven ? radius : inner;
      final double angle = (i * 45 - 90) * math.pi / 180;
      final double x = r * math.cos(angle);
      final double y = r * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (rawProgress >= 1.0) return;

    final fillPaint = Paint()..style = PaintingStyle.fill;
    final strokePaint = Paint()..style = PaintingStyle.stroke;

    for (final p in particles) {
      if (rawProgress < p.delay) continue;
      final localT = ((rawProgress - p.delay) / p.lifetime);
      if (localT < 0.0 || localT >= 1.0) continue;

      final double alpha;
      if (localT < 0.08) {
        alpha = (localT / 0.08).clamp(0.0, 1.0);
      } else if (localT > 0.65) {
        alpha = ((1.0 - localT) / 0.35).clamp(0.0, 1.0);
      } else {
        alpha = 1.0;
      }

      if (alpha <= 0.0) continue;

      if (p.shape == _ConfettiShape.shockwaveRing) {
        final ringT = Curves.easeOutCubic.transform(localT);
        final currentRadius = p.size * (1.0 + ringT * 10.0);
        strokePaint
          ..color = p.color.withValues(alpha: alpha * 0.75)
          ..strokeWidth = (2.5 * (1.0 - ringT)).clamp(0.5, 3.0);
        canvas.drawCircle(
          Offset(p.origin.dx * size.width, p.origin.dy * size.height),
          currentRadius,
          strokePaint,
        );
        continue;
      }

      final easeT = (1.0 - math.exp(-p.drag * localT * 3.2)) /
          (1.0 - math.exp(-p.drag * 3.2));
      final travelX = p.velocity.dx * easeT;
      final travelY =
          p.velocity.dy * easeT + 0.5 * p.gravity * localT * localT * 2.2;
      final wobble =
          math.sin(localT * math.pi * 4 * p.wobbleSpeed + p.wobble) *
              p.wobbleAmplitude;
      final x = (p.origin.dx + travelX + wobble) * size.width;
      final y = (p.origin.dy + travelY) * size.height;

      if (y > size.height + 40 || y < -40 || x < -40 || x > size.width + 40) {
        continue;
      }

      fillPaint.color = p.color.withValues(alpha: alpha);

      canvas.save();
      canvas.translate(x, y);

      final double currentRotation;
      if (p.shape == _ConfettiShape.fireworkSpark) {
        currentRotation =
            math.atan2(p.velocity.dy, p.velocity.dx) + math.pi / 2;
      } else {
        currentRotation =
            p.rotation + localT * p.rotationSpeed * 2 * math.pi;
      }
      canvas.rotate(currentRotation);

      switch (p.shape) {
        case _ConfettiShape.star:
          final starPath = _getStarPath(p.size);
          canvas.drawPath(starPath, fillPaint);
          break;

        case _ConfettiShape.sparkle:
          final sparklePath = _getSparklePath(p.size);
          canvas.drawPath(sparklePath, fillPaint);
          break;

        case _ConfettiShape.ribbon:
          final roll = math.cos(localT * p.rollSpeedX * 2 * math.pi);
          canvas.scale(roll.abs().clamp(0.15, 1.0), 1.0);
          final ribbonRect = Rect.fromCenter(
            center: Offset.zero,
            width: p.size * 0.40,
            height: p.size * 2.2,
          );
          canvas.drawRRect(
            RRect.fromRectAndRadius(ribbonRect, Radius.circular(p.size * 0.15)),
            fillPaint,
          );
          break;

        case _ConfettiShape.rectangle:
          final rollX = math.cos(localT * p.rollSpeedX * 2 * math.pi);
          final rollY = math.cos(localT * p.rollSpeedY * 2 * math.pi);
          canvas.scale(
            rollX.abs().clamp(0.12, 1.0),
            rollY.abs().clamp(0.12, 1.0),
          );
          final rect = Rect.fromCenter(
            center: Offset.zero,
            width: p.size * 0.72,
            height: p.size * 1.25,
          );
          canvas.drawRRect(
            RRect.fromRectAndRadius(rect, Radius.circular(p.size * 0.18)),
            fillPaint,
          );
          break;

        case _ConfettiShape.circle:
          canvas.drawCircle(Offset.zero, p.size * 0.45, fillPaint);
          break;

        case _ConfettiShape.fireworkSpark:
          strokePaint
            ..color = p.color.withValues(alpha: alpha * 0.75)
            ..strokeWidth = (p.size * 0.35).clamp(1.0, 3.5);
          final trailLen = math.min(22.0, 8.0 + (1.0 - localT) * 16.0);
          canvas.drawLine(Offset.zero, Offset(0, -trailLen), strokePaint);
          fillPaint.color = Colors.white.withValues(alpha: alpha * 0.9);
          canvas.drawCircle(Offset.zero, p.size * 0.45, fillPaint);
          fillPaint.color = p.color.withValues(alpha: alpha);
          canvas.drawCircle(Offset.zero, p.size * 0.30, fillPaint);
          break;

        case _ConfettiShape.shockwaveRing:
          break;
      }

      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _CelebrationPainter oldDelegate) {
    return oldDelegate.rawProgress != rawProgress ||
        oldDelegate.particles != particles;
  }
}

class _HeaderBar extends StatelessWidget {
  const _HeaderBar();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          tooltip: 'Quay lại',
          visualDensity: VisualDensity.compact,
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.primary,
            size: 20,
          ),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go(AppRoute.home.path);
            }
          },
        ),
        const SizedBox(width: 4),
        Text('Dò vé', style: AppTypography.pageTitle()),
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
      final tier = resolveWinCelebrationTier(result);

      final (
        bannerGradient,
        bannerBorderColor,
        emoji,
        titleText,
        titleColor,
        subtitleText,
        subtitleColor,
      ) = switch (tier) {
        WinCelebrationTier.jackpot => (
          const LinearGradient(
            colors: [
              Color(0xFFFFF8E1),
              Color(0xFFFFECB3),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          const Color(0xFFFFD54F),
          '👑',
          'Chúc mừng trúng giải lớn!',
          const Color(0xFFC62828),
          'Vé số của bạn mang lại giải thưởng vô cùng giá trị:',
          const Color(0xFF8D6E63),
        ),
        WinCelebrationTier.major => (
          const LinearGradient(
            colors: [
              Color(0xFFE8F5E9),
              Color(0xFFC8E6C9),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          const Color(0xFFA5D6A7),
          '🏆',
          'Chúc mừng bạn đã trúng thưởng!',
          const Color(0xFF2E7D32),
          'Vé số của bạn trùng khớp với giải thưởng:',
          const Color(0xFF43A047),
        ),
        WinCelebrationTier.standard => (
          const LinearGradient(
            colors: [
              AppColors.statusSuccessSurface,
              AppColors.surfaceSuccess,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          AppColors.statusSuccessBorder,
          '🎉',
          'Chúc mừng bạn đã trúng!',
          AppColors.statusSuccessDeep,
          'Vé số của bạn trùng khớp với kết quả:',
          AppColors.statusSuccessMedium,
        ),
      };

      return Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: bannerGradient,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: bannerBorderColor,
                width: tier == WinCelebrationTier.jackpot ? 1.5 : 1.0,
              ),
              boxShadow: tier == WinCelebrationTier.jackpot
                  ? const [
                      BoxShadow(
                        color: Color(0x33FFB300),
                        blurRadius: 12,
                        offset: Offset(0, 3),
                      ),
                    ]
                  : null,
            ),
            child: Column(
              children: [
                Text(
                  emoji,
                  style: AppTypography.h1(
                    fontSize: tier == WinCelebrationTier.jackpot ? 32 : 28,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  titleText,
                  textAlign: TextAlign.center,
                  style: AppTypography.h4(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitleText,
                  textAlign: TextAlign.center,
                  style: AppTypography.bodySmall(
                    color: subtitleColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ...result.matchedPrizes.map(
            (prize) {
              final isConsolationPrize = prize.prizeCode == 'KK';
              final isTopPrize = prize.prizeCode == 'DB' ||
                  prize.prizeCode == 'PDB' ||
                  prize.prizeCode == 'G1' ||
                  prize.prizeValue >= 30000000;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isTopPrize
                      ? const Color(0xFFFFFDE7)
                      : AppColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isTopPrize
                        ? const Color(0xFFFFD54F)
                        : AppColors.borderSubtle,
                    width: isTopPrize ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (isTopPrize) ...[
                                const Icon(
                                  Icons.star_rounded,
                                  color: Color(0xFFFFA000),
                                  size: 18,
                                ),
                                const SizedBox(width: 4),
                              ],
                              Expanded(
                                child: Text(
                                  prize.prizeDisplayName,
                                  style: AppTypography.labelLarge(
                                    fontWeight: FontWeight.w700,
                                    color: isTopPrize
                                        ? const Color(0xFFB71C1C)
                                        : null,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          if (isConsolationPrize) ...[
                            Text(
                              'Số vé của bạn: ${result.ticketNumber}',
                              style: AppTypography.labelMedium(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              'Đối chiếu giải đặc biệt: ${prize.winningNumber}',
                              style: AppTypography.labelMedium(
                                color: AppColors.contentMuted,
                              ),
                            ),
                          ] else
                            Text(
                              'Số trúng: ${prize.winningNumber}',
                              style: AppTypography.labelMedium(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      AppFormatters.formatCurrency(prize.prizeValue),
                      style: AppTypography.priceMedium(
                        color: AppColors.primary,
                        fontWeight: isTopPrize ? FontWeight.w800 : null,
                      ),
                    ),
                  ],
                ),
              );
            },
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
                    style: AppTypography.labelMedium(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    AppFormatters.formatCurrency(result.totalWinningAmount),
                    style: AppTypography.priceMedium(color: AppColors.primary),
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

/// Gives a winning lookup a short, celebratory entrance without making the
/// result hard to read. The sequence overshoots once, then settles in place.
class _WinningResultPopup extends StatefulWidget {
  const _WinningResultPopup({
    super.key,
    required this.active,
    required this.child,
  });

  final bool active;
  final Widget child;

  @override
  State<_WinningResultPopup> createState() => _WinningResultPopupState();
}

class _WinningResultPopupState extends State<_WinningResultPopup>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 620),
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.76, end: 1.06)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 58,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.06, end: 0.98)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 25,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.98, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 17,
      ),
    ]).animate(_controller);
    _opacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0, 0.34, curve: Curves.easeOut),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) => _playOrComplete());
  }

  @override
  void didUpdateWidget(covariant _WinningResultPopup oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _playOrComplete());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _playOrComplete() {
    if (!mounted) return;

    if (widget.active && !MediaQuery.of(context).disableAnimations) {
      _controller.forward(from: 0);
    } else {
      _controller.value = 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active || MediaQuery.of(context).disableAnimations) {
      return widget.child;
    }

    return FadeTransition(
      opacity: _opacity,
      child: ScaleTransition(
        scale: _scale,
        alignment: Alignment.center,
        child: widget.child,
      ),
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
        Text(title, style: AppTypography.h5(color: AppColors.contentSlate700)),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: AppTypography.bodySmall(color: AppColors.contentMuted),
        ),
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
        AppPickerField(
          label: 'Chọn ngày',
          value: selectedDate == null ? null : dateLabel,
          placeholder: 'Chọn ngày quay',
          errorText: state.dateError,
          prefixIcon: Icons.calendar_month_outlined,
          onTap: () => _pickDate(context),
          semanticLabel: selectedDate == null
              ? 'Chọn ngày quay'
              : 'Ngày quay: $dateLabel',
          semanticHint: 'Mở lịch kết quả xổ số',
        ),
        const SizedBox(height: 16),
        AppPickerField(
          label: 'Chọn đài',
          value: state.selectedStation?.province,
          placeholder: selectedDate == null
              ? 'Chọn ngày quay trước'
              : state.isLoadingStations
              ? 'Đang tải đài...'
              : state.stations.isEmpty
              ? 'Không có đài quay'
              : 'Chọn đài',
          errorText: state.stationError,
          prefixIcon: Icons.place_outlined,
          suffixIcon: canPickStation ? Icons.expand_more_rounded : null,
          isAvailable: canPickStation,
          onTap: selectedDate == null
              ? () => _pickDate(context)
              : canPickStation
              ? () => _pickStation(context)
              : null,
          semanticLabel: state.selectedStation == null
              ? 'Chọn đài quay'
              : 'Đài quay: ${state.selectedStation!.province}',
          semanticHint: selectedDate == null
              ? 'Chọn ngày quay trước để tải danh sách đài'
              : state.isLoadingStations
              ? 'Đang tải danh sách đài'
              : null,
        ),
        const SizedBox(height: 14),
        Text(
          'Nhập dãy số trên vé',
          style: AppTypography.labelMedium(color: AppColors.contentSlate700),
        ),
        const SizedBox(height: 6),
        Semantics(
          textField: true,
          label: 'Dãy số trên vé',
          hint: 'Nhập 5 hoặc 6 chữ số để tra cứu',
          child: TextField(
            controller: _numberController,
            keyboardType: TextInputType.number,
            textInputAction: TextInputAction.done,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            onChanged: vm.setTicketNumber,
            onSubmitted: (_) => vm.check(),
            textAlignVertical: TextAlignVertical.center,
            style: AppTypography.lotteryDigit(letterSpacing: 3),
            decoration: InputDecoration(
              isDense: true,
              constraints: const BoxConstraints(minHeight: 48),
              counterText: '',
              hintText: 'Ví dụ: 123456',
              hintStyle: AppTypography.bodyMedium(
                color: AppColors.contentPlaceholder,
              ),
              errorText: state.numberError,
              helperText: state.numberError == null
                  ? 'Nhập đúng 5 hoặc 6 chữ số trên vé của bạn'
                  : null,
              helperStyle: AppTypography.bodySmall(
                color: AppColors.contentMuted,
              ),
              prefixIcon: const Icon(
                Icons.confirmation_number_outlined,
                color: AppColors.contentMuted,
                size: 20,
              ),
              filled: true,
              fillColor: AppColors.surfacePrimary,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: state.numberError != null
                      ? AppColors.statusError
                      : AppColors.borderSubtle,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: AppColors.primary,
                  width: 1.4,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
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
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          label: Text('Tra cứu kết quả', style: AppTypography.buttonLarge()),
        ),
      ],
    );
  }

  Future<void> _pickDate(BuildContext context) async {
    final picked = await LotteryDatePickerDialog.show(
      context,
      state.selectedDate ?? DateTime.now(),
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
                      style: AppTypography.h4(color: AppColors.contentHeading),
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
}

class _CheckedStationResultsSection extends StatelessWidget {
  const _CheckedStationResultsSection({required this.state});

  final TicketCheckState state;

  @override
  Widget build(BuildContext context) {
    if (state.isLoadingCheckedStationResult) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.borderDecorative),
          ),
          child: Column(
            children: [
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
              const SizedBox(height: 12),
              Text(
                'Đang tải kết quả đầy đủ của đài...',
                textAlign: TextAlign.center,
                style: AppTypography.bodyMedium(color: AppColors.contentMuted),
              ),
            ],
          ),
        ),
      );
    }

    final result = state.checkedStationResult;
    if (result != null) {
      return TicketCheckResultsCard(result: result);
    }

    final stationName = state.checkResult?.stationName.trim();
    final date = state.selectedDate;
    final dateLabel = date == null ? '' : DateFormat('dd/MM/yyyy').format(date);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surfacePrimary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.borderDecorative),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.hourglass_empty_rounded,
              color: AppColors.contentMuted,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              'Kết quả đài ${stationName?.isEmpty ?? true ? 'đã chọn' : stationName}',
              textAlign: TextAlign.center,
              style: AppTypography.h6(color: AppColors.contentHeading),
            ),
            const SizedBox(height: 5),
            Text(
              dateLabel.isEmpty
                  ? 'Chưa thể tải bảng kết quả đầy đủ lúc này.'
                  : 'Chưa thể tải bảng kết quả ngày $dateLabel. Vui lòng thử lại sau.',
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall(color: AppColors.contentMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckTicketSupportSection extends StatelessWidget {
  const _CheckTicketSupportSection({required this.schedule});

  final AsyncValue<List<LotteryStationSchedule>> schedule;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Semantics(
        button: true,
        label: 'Xem lịch mở thưởng',
        hint: 'Mở lịch quay thưởng theo đài',
        child: Material(
          color: AppColors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: () => context.push(AppRoute.schedule.path),
            borderRadius: BorderRadius.circular(16),
            child: Ink(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              decoration: BoxDecoration(
                color: AppColors.surfaceSoft,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_month_outlined,
                        color: AppColors.primary,
                        size: 22,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Lịch mở thưởng',
                          style: AppTypography.labelLarge(
                            color: AppColors.contentHeading,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: AppColors.contentMuted,
                        size: 24,
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Divider(height: 1, color: AppColors.borderSubtle),
                  ),
                  _ScheduleRegionSummary(schedule: schedule),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScheduleRegionSummary extends StatelessWidget {
  const _ScheduleRegionSummary({required this.schedule});

  final AsyncValue<List<LotteryStationSchedule>> schedule;

  @override
  Widget build(BuildContext context) {
    return schedule.when(
      loading: () => _buildStatus('Đang cập nhật lịch mở thưởng...'),
      error: (_, _) => _buildStatus('Xem lịch chi tiết theo khu vực'),
      data: (stations) {
        final regions = availableScheduleRegions(stations);
        if (regions.isEmpty) {
          return _buildStatus('Chưa có dữ liệu lịch mở thưởng');
        }

        final drawTimes = scheduleRegionDrawTimes(stations, regions);
        if (regions.length == 1) {
          final region = regions.first;
          return _DrawTimeSummary(
            region: scheduleRegionLabels[region] ?? region,
            time: _displayDrawTime(drawTimes[region]),
            color: _regionColor(region),
            expanded: true,
          );
        }

        return Row(
          children: [
            for (final region in regions)
              Expanded(
                child: _DrawTimeSummary(
                  region: scheduleRegionLabels[region] ?? region,
                  time: _displayDrawTime(drawTimes[region]),
                  color: _regionColor(region),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildStatus(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        message,
        style: AppTypography.bodySmall(color: AppColors.contentMuted),
      ),
    );
  }

  String _displayDrawTime(String? time) {
    if (time == null || time.isEmpty || time == '--:--') {
      return 'Chưa cập nhật';
    }
    return time;
  }

  Color _regionColor(String region) {
    switch (region) {
      case 'MIEN_TRUNG':
        return AppColors.brandSecondary;
      case 'MIEN_BAC':
        return AppColors.goldDark;
      default:
        return AppColors.primary;
    }
  }
}

class _DrawTimeSummary extends StatelessWidget {
  const _DrawTimeSummary({
    required this.region,
    required this.time,
    required this.color,
    this.expanded = false,
  });

  final String region;
  final String time;
  final Color color;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final regionStyle = AppTypography.caption(
      color: AppColors.contentMuted,
      fontWeight: FontWeight.w600,
    );
    final timeStyle = AppTypography.labelLarge(
      color: color,
      fontWeight: FontWeight.w700,
    );

    if (expanded) {
      return Row(
        children: [
          Expanded(
            child: Text(
              region,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: regionStyle,
            ),
          ),
          const SizedBox(width: 8),
          Text(time, style: timeStyle),
        ],
      );
    }

    return Column(
      children: [
        Text(
          region,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: regionStyle,
        ),
        const SizedBox(height: 2),
        Text(time, style: timeStyle),
      ],
    );
  }
}

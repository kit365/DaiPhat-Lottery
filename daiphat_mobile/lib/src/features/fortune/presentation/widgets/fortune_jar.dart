import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import '../../utils/fortune_ui.dart';
import '../viewmodels/fortune_cast_viewmodel.dart';

class FortuneJar extends StatefulWidget {
  const FortuneJar({
    super.key,
    required this.phase,
    required this.luckyTail,
    required this.enabled,
    required this.onShake,
  });

  final FortuneAnimPhase phase;
  final String? luckyTail;
  final bool enabled;
  final VoidCallback onShake;

  @override
  State<FortuneJar> createState() => _FortuneJarState();
}

class _FortuneJarState extends State<FortuneJar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: kFortuneShakeDuration,
    );
    _syncPhase();
  }

  @override
  void didUpdateWidget(covariant FortuneJar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.phase != widget.phase) {
      _syncPhase();
    }
  }

  void _syncPhase() {
    if (widget.phase == FortuneAnimPhase.shaking) {
      _controller.repeat();
      HapticFeedback.heavyImpact();
    } else {
      _controller.stop();
      _controller.reset();
      if (widget.phase == FortuneAnimPhase.ejecting) {
        HapticFeedback.mediumImpact();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ejecting = widget.phase == FortuneAnimPhase.ejecting;
    return Center(
      child: GestureDetector(
        onTap: widget.enabled ? widget.onShake : null,
        child: SizedBox(
          width: 280,
          height: 330,
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              Positioned(
                bottom: 24,
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    final value = _controller.value;
                    final angle = widget.phase == FortuneAnimPhase.shaking
                        ? math.sin(value * math.pi * 8) * 0.08
                        : 0.0;
                    final offsetY = widget.phase == FortuneAnimPhase.shaking
                        ? (math.cos(value * math.pi * 8) * 4).abs()
                        : 0.0;
                    return Transform.translate(
                      offset: Offset(0, -offsetY),
                      child: Transform.rotate(
                        angle: angle,
                        alignment: const Alignment(0, 0.7),
                        child: child,
                      ),
                    );
                  },
                  child: Container(
                    width: 140,
                    height: 18,
                    decoration: BoxDecoration(
                      color: AppColors.fortuneBackgroundDeep.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 36,
                child: CustomPaint(
                  size: const Size(168, 188),
                  painter: _JarPainter(),
                ),
              ),
              ...List.generate(9, (index) {
                final offset = (index - 4) * 9.0;
                return Positioned(
                  bottom: 108,
                  left: 102 + offset,
                  child: Transform.rotate(
                    angle: (index - 4) * 0.08,
                    child: Container(
                      width: 8,
                      height: 78 + (index % 3) * 6,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        gradient: const LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [AppColors.fortuneCreamLight, AppColors.fortuneGoldWarm],
                        ),
                        border: Border.all(color: AppColors.fortuneCrimson, width: 0.6),
                      ),
                    ),
                  ),
                );
              }),
              AnimatedPositioned(
                duration: kFortuneEjectDuration,
                curve: Curves.easeOutBack,
                bottom: ejecting ? 210 : 118,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 280),
                  opacity: ejecting ? 1 : 0,
                  child: Container(
                    width: 18,
                    height: 92,
                    alignment: Alignment.topCenter,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(6),
                      gradient: const LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [AppColors.fortuneCreamLight, AppColors.fortuneGold],
                      ),
                      border: Border.all(color: AppColors.fortuneCrimson, width: 1),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        widget.luckyTail ?? '?',
                        style: AppTypography.lotteryDigit(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: AppColors.fortuneWoodDark,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (widget.enabled)
                Positioned(
                  bottom: 44,
                  child: Text(
                    'Chạm để lắc',
                    style: AppTypography.caption(
                      color: AppColors.fortuneCream.withValues(alpha: 0.8),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _JarPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final body = Path()
      ..moveTo(size.width * 0.22, size.height * 0.18)
      ..quadraticBezierTo(
        size.width * 0.08,
        size.height * 0.55,
        size.width * 0.18,
        size.height * 0.92,
      )
      ..lineTo(size.width * 0.82, size.height * 0.92)
      ..quadraticBezierTo(
        size.width * 0.92,
        size.height * 0.55,
        size.width * 0.78,
        size.height * 0.18,
      )
      ..close();

    final fill = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          AppColors.fortuneCrimsonBright,
          AppColors.fortuneCrimsonDark,
          AppColors.fortuneBackgroundDark,
        ],
      ).createShader(Offset.zero & size);
    canvas.drawPath(body, fill);

    final rim = Paint()
      ..color = AppColors.fortuneGold
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8;
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width / 2, size.height * 0.16),
        width: size.width * 0.62,
        height: 22,
      ),
      rim,
    );

    final mouth = Paint()..color = AppColors.fortuneBackgroundDeep;
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width / 2, size.height * 0.16),
        width: size.width * 0.5,
        height: 14,
      ),
      mouth,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

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
      duration: const Duration(milliseconds: 600),
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
    final isShaking = widget.phase == FortuneAnimPhase.shaking;

    return Center(
      child: GestureDetector(
        onTap: widget.enabled ? widget.onShake : null,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 300,
          height: 330,
          child: Stack(
            alignment: Alignment.bottomCenter,
            clipBehavior: Clip.none,
            children: [
              // 1. Background Arch, Aura Pulse & Golden Sparkles
              Positioned.fill(
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) {
                    return CustomPaint(
                      painter: _BackdropPainter(
                        isShaking: isShaking,
                        ejecting: ejecting,
                        animValue: _controller.value,
                      ),
                    );
                  },
                ),
              ),

              // 2. Wooden Pedestal (Đế gỗ tròn đa tầng)
              Positioned(
                bottom: 12,
                child: CustomPaint(
                  size: const Size(220, 52),
                  painter: _PedestalPainter(),
                ),
              ),

              // 3. Shake animated wrapper for Sticks & Cylinder
              Positioned(
                bottom: 38,
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    final value = _controller.value;
                    final t = value * 2 * math.pi;

                    // Multi-harmonic physical shaking motion (Fast, realistic wooden shaker oscillation)
                    final angle = isShaking
                        ? (math.sin(t * 3) * 0.11 + math.sin(t * 6) * 0.025)
                        : 0.0;
                    final offsetX = isShaking ? math.sin(t * 3) * 8.0 : 0.0;
                    final offsetY = isShaking ? (math.sin(t * 6).abs() * 5.5) : 0.0;

                    return Transform.translate(
                      offset: Offset(offsetX, -offsetY),
                      child: Transform.rotate(
                        angle: angle,
                        alignment: const Alignment(0, 0.92),
                        child: child,
                      ),
                    );
                  },
                  child: SizedBox(
                    width: 170,
                    height: 230,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      clipBehavior: Clip.none,
                      children: [
                        // Sticks Fan Bundle with independent micro-rattling
                        ...List.generate(13, (index) {
                          final norm = (index - 6) / 6.0; // -1.0 to 1.0
                          final baseAngle = norm * 0.16;
                          final baseOffsetX = norm * 42.0;
                          final baseHeight =
                              100.0 - (norm.abs() * 16.0) + (index % 3) * 4;

                          return AnimatedBuilder(
                            animation: _controller,
                            builder: (context, _) {
                              final value = _controller.value;
                              final t = value * 2 * math.pi;

                              final stickAngleJitter = isShaking
                                  ? math.sin(t * 5 + index * 1.3) * 0.045
                                  : 0.0;
                              final stickHeightJitter = isShaking
                                  ? (math.sin(t * 6 + index * 1.7)).abs() * 8.0
                                  : 0.0;
                              final stickOffsetXJitter = isShaking
                                  ? math.sin(t * 4 + index * 0.9) * 2.5
                                  : 0.0;

                              return Positioned(
                                bottom: 84 + stickHeightJitter,
                                left: 81 + baseOffsetX + stickOffsetXJitter,
                                child: Transform.rotate(
                                  angle: baseAngle + stickAngleJitter,
                                  alignment: const Alignment(0, 1.0),
                                  child: _FortuneStick(height: baseHeight),
                                ),
                              );
                            },
                          );
                        }),

                        // Ejecting Lucky Stick
                        AnimatedPositioned(
                          duration: kFortuneEjectDuration,
                          curve: Curves.easeOutBack,
                          bottom: ejecting ? 152 : 90,
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 250),
                            opacity: ejecting ? 1.0 : 0.0,
                            child: _EjectingStick(luckyTail: widget.luckyTail),
                          ),
                        ),

                        // The Red Lotus Cylinder Pot
                        Positioned(
                          bottom: 0,
                          child: CustomPaint(
                            size: const Size(120, 126),
                            painter: _LotusCylinderPainter(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 4. Subtle prompt at the bottom if enabled
              if (widget.enabled && !isShaking && !ejecting)
                Positioned(
                  bottom: -2,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.fortuneBackgroundOverlay
                          .withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppColors.fortuneGold.withValues(alpha: 0.25),
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.touch_app_rounded,
                          size: 13,
                          color: AppColors.fortuneGoldLight
                              .withValues(alpha: 0.9),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Chạm ống để lắc quẻ',
                          style: AppTypography.caption(
                            color: AppColors.fortuneGoldLight
                                .withValues(alpha: 0.9),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
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

/// A wooden stick with traditional lacquer red tip
class _FortuneStick extends StatelessWidget {
  const _FortuneStick({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 7.5,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(3),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            offset: const Offset(1, 1),
            blurRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          // Lacquer Red Tip
          Container(
            height: 14,
            decoration: const BoxDecoration(
              color: Color(0xFFC52222),
              borderRadius: BorderRadius.vertical(top: Radius.circular(3)),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFE53935), Color(0xFFB71C1C)],
              ),
            ),
          ),
          // Bamboo wood shaft
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(2)),
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFFDE8C4),
                    Color(0xFFE2B77A),
                    Color(0xFFC79858),
                  ],
                ),
                border: Border.all(
                  color: const Color(0xFF8D5B28),
                  width: 0.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The winning stick that rises up
class _EjectingStick extends StatelessWidget {
  const _EjectingStick({this.luckyTail});

  final String? luckyTail;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 116,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: AppColors.fortuneGoldLight.withValues(alpha: 0.75),
            blurRadius: 18,
            spreadRadius: 3,
          ),
          BoxShadow(
            color: const Color(0xFFFF9800).withValues(alpha: 0.45),
            blurRadius: 30,
            spreadRadius: 6,
          ),
        ],
      ),
      child: Column(
        children: [
          // Red top
          Container(
            height: 18,
            decoration: const BoxDecoration(
              borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
              gradient: LinearGradient(
                colors: [Color(0xFFFF4D4F), Color(0xFFB71C1C)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          // Body
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                borderRadius:
                    const BorderRadius.vertical(bottom: Radius.circular(5)),
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFFFF7EA),
                    Color(0xFFF0CB82),
                    Color(0xFFDFAC53),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                border:
                    Border.all(color: AppColors.fortuneGoldLight, width: 1.4),
              ),
              alignment: Alignment.center,
              child: RotatedBox(
                quarterTurns: 1,
                child: Text(
                  luckyTail ?? '★',
                  style: AppTypography.lotteryDigit(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w900,
                    color: AppColors.fortuneWoodDark,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Paints the red cylindrical pot with gold rims and stylized lotus emblem
class _LotusCylinderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Body rectangle / cylinder
    final bodyRect = RRect.fromRectAndCorners(
      Rect.fromLTWH(0, 6, w, h - 8),
      topLeft: const Radius.circular(8),
      topRight: const Radius.circular(8),
      bottomLeft: const Radius.circular(10),
      bottomRight: const Radius.circular(10),
    );

    // Deep rich lacquer red gradient with 3D cylindrical lighting
    final redGradient = LinearGradient(
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
      colors: const [
        Color(0xFF500608),
        Color(0xFF8B0D11),
        Color(0xFFB91D22),
        Color(0xFFD4282D),
        Color(0xFF9E1216),
        Color(0xFF550608),
      ],
      stops: const [0.0, 0.2, 0.45, 0.6, 0.85, 1.0],
    );

    final bodyPaint = Paint()
      ..shader = redGradient.createShader(Offset.zero & size);
    canvas.drawRRect(bodyRect, bodyPaint);

    // Gold Top Rim
    final goldTopPaint = Paint()
      ..shader = const LinearGradient(
        colors: [
          Color(0xFFC89A3E),
          Color(0xFFFEE799),
          Color(0xFFE2B24C),
          Color(0xFF885E16),
        ],
      ).createShader(Rect.fromLTWH(0, 0, w, 10));
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(-2, 3, w + 4, 8), const Radius.circular(4)),
      goldTopPaint,
    );

    // Inner rim shadow / opening
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w / 2, 4), width: w - 8, height: 6),
      Paint()..color = const Color(0xFF260405),
    );

    // Gold Bottom Base Ring
    final goldBottomPaint = Paint()
      ..shader = const LinearGradient(
        colors: [
          Color(0xFFC89A3E),
          Color(0xFFFEE799),
          Color(0xFFE2B24C),
          Color(0xFF885E16),
        ],
      ).createShader(Rect.fromLTWH(0, h - 8, w, 8));
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(-2, h - 7, w + 4, 7), const Radius.circular(4)),
      goldBottomPaint,
    );

    // Lotus Motif in the center
    _drawLotus(canvas, Offset(w / 2, h * 0.52), 1.0);
  }

  void _drawLotus(Canvas canvas, Offset center, double scale) {
    final lotusPaint = Paint()
      ..color = const Color(0xFFFFDF7D)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // Center petal
    final pCenter = Path()
      ..moveTo(center.dx, center.dy - 19 * scale)
      ..quadraticBezierTo(center.dx + 7 * scale, center.dy - 4 * scale, center.dx, center.dy + 12 * scale)
      ..quadraticBezierTo(center.dx - 7 * scale, center.dy - 4 * scale, center.dx, center.dy - 19 * scale);
    canvas.drawPath(pCenter, lotusPaint);

    // Inner petals
    final pLeftInner = Path()
      ..moveTo(center.dx - 2 * scale, center.dy + 8 * scale)
      ..quadraticBezierTo(center.dx - 16 * scale, center.dy - 1 * scale, center.dx - 13 * scale, center.dy - 15 * scale)
      ..quadraticBezierTo(center.dx - 7 * scale, center.dy - 8 * scale, center.dx, center.dy - 2 * scale);
    canvas.drawPath(pLeftInner, lotusPaint);

    final pRightInner = Path()
      ..moveTo(center.dx + 2 * scale, center.dy + 8 * scale)
      ..quadraticBezierTo(center.dx + 16 * scale, center.dy - 1 * scale, center.dx + 13 * scale, center.dy - 15 * scale)
      ..quadraticBezierTo(center.dx + 7 * scale, center.dy - 8 * scale, center.dx, center.dy - 2 * scale);
    canvas.drawPath(pRightInner, lotusPaint);

    // Outer petals
    final pLeftOuter = Path()
      ..moveTo(center.dx - 5 * scale, center.dy + 10 * scale)
      ..quadraticBezierTo(center.dx - 24 * scale, center.dy + 4 * scale, center.dx - 22 * scale, center.dy - 6 * scale)
      ..quadraticBezierTo(center.dx - 14 * scale, center.dy - 2 * scale, center.dx - 3 * scale, center.dy + 4 * scale);
    canvas.drawPath(pLeftOuter, lotusPaint);

    final pRightOuter = Path()
      ..moveTo(center.dx + 5 * scale, center.dy + 10 * scale)
      ..quadraticBezierTo(center.dx + 24 * scale, center.dy + 4 * scale, center.dx + 22 * scale, center.dy - 6 * scale)
      ..quadraticBezierTo(center.dx + 14 * scale, center.dy - 2 * scale, center.dx + 3 * scale, center.dy + 4 * scale);
    canvas.drawPath(pRightOuter, lotusPaint);

    // Base calyx curve
    final pBase = Path()
      ..moveTo(center.dx - 14 * scale, center.dy + 12 * scale)
      ..quadraticBezierTo(center.dx, center.dy + 16 * scale, center.dx + 14 * scale, center.dy + 12 * scale);
    canvas.drawPath(pBase, lotusPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Paints the multi-tiered circular wooden pedestal
class _PedestalPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;

    // Drop shadow under pedestal
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, h * 0.7), width: w * 0.95, height: h * 0.45),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.6)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );

    // Lower tier base
    final baseRect = Rect.fromCenter(center: Offset(cx, h * 0.62), width: w * 0.9, height: h * 0.45);
    final baseGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: const [Color(0xFF3E1A0E), Color(0xFF1E0B06), Color(0xFF120503)],
    );
    canvas.drawOval(baseRect, Paint()..shader = baseGradient.createShader(baseRect));

    // Top tier face (Warm polished wood grain)
    final topFaceRect = Rect.fromCenter(center: Offset(cx, h * 0.42), width: w * 0.78, height: h * 0.38);
    final topFaceGradient = RadialGradient(
      center: Alignment.center,
      radius: 0.8,
      colors: const [
        Color(0xFF7A3E20),
        Color(0xFF532412),
        Color(0xFF331308),
      ],
    );
    canvas.drawOval(topFaceRect, Paint()..shader = topFaceGradient.createShader(topFaceRect));

    // Warm golden rim highlight on edge of top face
    final rimPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..shader = const LinearGradient(
        colors: [
          Color(0x00D4A24A),
          Color(0x88D4A24A),
          Color(0xFFFDE68A),
          Color(0x88D4A24A),
          Color(0x00D4A24A),
        ],
      ).createShader(topFaceRect);
    canvas.drawOval(topFaceRect, rimPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Paints the decorative arch, pulsing aura and golden sparkle dots in the background
class _BackdropPainter extends CustomPainter {
  const _BackdropPainter({
    this.isShaking = false,
    this.ejecting = false,
    this.animValue = 0.0,
  });

  final bool isShaking;
  final bool ejecting;
  final double animValue;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height * 0.48;

    // 1. Shaking / Ejection glowing golden radiance aura behind jar
    if (isShaking) {
      final pulse = 0.5 + 0.5 * math.sin(animValue * 2 * math.pi * 3);
      final auraPaint = Paint()
        ..color = const Color(0xFFE5A93C).withValues(alpha: 0.14 + pulse * 0.12)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 28);
      canvas.drawCircle(Offset(cx, cy + 18), 70 + pulse * 14, auraPaint);
    } else if (ejecting) {
      final auraPaint = Paint()
        ..color = const Color(0xFFFFD54F).withValues(alpha: 0.32)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 36);
      canvas.drawCircle(Offset(cx, cy - 20), 84, auraPaint);
    }

    // 2. Background circular arch line
    final archPaint = Paint()
      ..color = const Color(0xFFD4A24A).withValues(alpha: 0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final archRect =
        Rect.fromCenter(center: Offset(cx, cy), width: 210, height: 230);
    canvas.drawArc(archRect, math.pi * 0.85, math.pi * 1.3, false, archPaint);

    // 3. Cloud swirls hints on left & right
    _drawCloudHint(canvas, Offset(cx - 95, cy + 30), false);
    _drawCloudHint(canvas, Offset(cx + 95, cy + 30), true);

    // 4. Floating sparkle stars with subtle twinkle animation
    final t = animValue * 2 * math.pi;
    final tw1 = (0.5 + 0.5 * math.sin(t * 2 + 0.5)).clamp(0.0, 1.0);
    final tw2 = (0.5 + 0.5 * math.cos(t * 2 + 1.2)).clamp(0.0, 1.0);
    final tw3 = (0.5 + 0.5 * math.sin(t * 3 + 2.1)).clamp(0.0, 1.0);

    _drawSparkle(canvas, Offset(cx - 72, cy - 54), 3.5 + tw1 * 0.8,
        (0.65 + tw1 * 0.35).clamp(0.0, 1.0));
    _drawSparkle(canvas, Offset(cx + 68, cy - 62), 4.2 + tw2 * 0.8,
        (0.75 + tw2 * 0.25).clamp(0.0, 1.0));
    _drawSparkle(canvas, Offset(cx - 86, cy + 4), 2.8 + tw3 * 0.6,
        (0.5 + tw3 * 0.4).clamp(0.0, 1.0));
    _drawSparkle(canvas, Offset(cx + 78, cy + 18), 3.2 + tw1 * 0.6,
        (0.6 + tw1 * 0.35).clamp(0.0, 1.0));
  }

  void _drawSparkle(Canvas canvas, Offset center, double size, double opacity) {
    final p = Paint()
      ..color = const Color(0xFFFFE082).withValues(alpha: opacity)
      ..style = PaintingStyle.fill;

    // Center glow
    canvas.drawCircle(
      center,
      size * 0.7,
      Paint()
        ..color = const Color(0xFFFFD54F).withValues(alpha: opacity * 0.6)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );

    // 4-point star path
    final star = Path()
      ..moveTo(center.dx, center.dy - size)
      ..quadraticBezierTo(center.dx, center.dy, center.dx + size, center.dy)
      ..quadraticBezierTo(center.dx, center.dy, center.dx, center.dy + size)
      ..quadraticBezierTo(center.dx, center.dy, center.dx - size, center.dy)
      ..quadraticBezierTo(center.dx, center.dy, center.dx, center.dy - size);
    canvas.drawPath(star, p);
  }

  void _drawCloudHint(Canvas canvas, Offset pos, bool flip) {
    final p = Paint()
      ..color = const Color(0xFFD4A24A).withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final dir = flip ? -1.0 : 1.0;
    final cloud = Path()
      ..moveTo(pos.dx, pos.dy)
      ..cubicTo(
        pos.dx + 12 * dir,
        pos.dy - 10,
        pos.dx + 26 * dir,
        pos.dy - 6,
        pos.dx + 22 * dir,
        pos.dy + 4,
      )
      ..cubicTo(
        pos.dx + 16 * dir,
        pos.dy + 10,
        pos.dx + 6 * dir,
        pos.dy + 8,
        pos.dx,
        pos.dy,
      );
    canvas.drawPath(cloud, p);
  }

  @override
  bool shouldRepaint(covariant _BackdropPainter oldDelegate) =>
      oldDelegate.isShaking != isShaking ||
      oldDelegate.ejecting != ejecting ||
      oldDelegate.animValue != animValue;
}

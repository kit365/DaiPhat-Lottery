import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/home/data/models/ticket_check_models.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/presentation/views/widgets/lottery_date_picker_dialog.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
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
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
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

                    // Helpful Guide Section
                    const _CheckTicketGuideSection(),

                    // Draw Schedule & Utilities Section
                    const _DrawScheduleAndUtilitiesSection(),

                    const SizedBox(height: 16),
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

class _HeaderBar extends StatelessWidget {
  const _HeaderBar();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Dò vé', style: AppTypography.pageTitle()),
          const SizedBox(height: 4),
          Text(
            'Tra cứu kết quả xổ số kiến thiết 3 miền nhanh chóng',
            style: AppTypography.caption(color: AppColors.contentMuted),
          ),
        ],
      ),
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
                  style: AppTypography.h5(color: AppColors.statusSuccessDeep),
                ),
                const SizedBox(height: 4),
                Text(
                  'Vé số của bạn trùng khớp với kết quả:',
                  style: AppTypography.bodySmall(
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
                          style: AppTypography.labelLarge(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
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
                  Text(
                    AppFormatters.formatCurrency(prize.prizeValue),
                    style: AppTypography.priceMedium(color: AppColors.primary),
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
        AppPickerField(
          label: 'Chọn ngày',
          value: selectedDate == null ? null : dateLabel,
          placeholder: 'Chọn ngày quay',
          errorText: state.dateError,
          prefixIcon: Icons.calendar_month_rounded,
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
          prefixIcon: Icons.location_on_outlined,
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
        const SizedBox(height: 16),
        Text(
          'Nhập dãy số trên vé',
          style: AppTypography.labelLarge(color: AppColors.contentSlate700),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _numberController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: vm.setTicketNumber,
          textAlignVertical: TextAlignVertical.center,
          style: AppTypography.lotteryDigit(letterSpacing: 2),
          decoration: InputDecoration(
            counterText: '',
            hintText: 'Ví dụ: 123456',
            hintStyle: AppTypography.bodyMedium(
              color: AppColors.contentPlaceholder,
            ),
            errorText: state.numberError,
            helperText: state.numberError == null
                ? 'Nhập đúng 5 hoặc 6 chữ số trên vé của bạn'
                : null,
            prefixIcon: const Icon(
              ProfileIconography.ticket,
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
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
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

class _CheckTicketGuideSection extends StatelessWidget {
  const _CheckTicketGuideSection();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
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
              color: AppColors.shadowLight,
              blurRadius: 12,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.brandPrimarySubtle,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.help_outline_rounded,
                    size: 16,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Hướng dẫn dò vé',
                  style: AppTypography.subtitle2(
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildStepRow(
              stepNumber: '1',
              title: 'Chọn ngày quay thưởng',
              desc: 'Chọn đúng ngày in trên tờ vé số của bạn.',
            ),
            const SizedBox(height: 10),
            _buildStepRow(
              stepNumber: '2',
              title: 'Chọn đài / tỉnh phát hành',
              desc: 'Chọn đài mở thưởng của kỳ vé số cần kiểm tra.',
            ),
            const SizedBox(height: 10),
            _buildStepRow(
              stepNumber: '3',
              title: 'Nhập dãy số & Tra cứu',
              desc: 'Nhập dãy 5 hoặc 6 chữ số và nhấn "Tra cứu kết quả".',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepRow({
    required String stepNumber,
    required String title,
    required String desc,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 22,
          height: 22,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: AppColors.brandPrimarySubtle,
            shape: BoxShape.circle,
          ),
          child: Text(
            stepNumber,
            style: AppTypography.caption(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTypography.bodySmall(
                  fontWeight: FontWeight.w700,
                  color: AppColors.contentHeading,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: AppTypography.caption(
                  color: AppColors.contentMuted,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DrawScheduleAndUtilitiesSection extends StatelessWidget {
  const _DrawScheduleAndUtilitiesSection();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
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
              color: AppColors.shadowLight,
              blurRadius: 12,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.brandPrimarySubtle,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.access_time_rounded,
                    size: 16,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Khung giờ mở thưởng 3 miền',
                  style: AppTypography.subtitle2(
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildRegionTimeCard(
                    region: 'Miền Nam',
                    time: '16:15',
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildRegionTimeCard(
                    region: 'Miền Trung',
                    time: '17:15',
                    color: AppColors.brandSecondary,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildRegionTimeCard(
                    region: 'Miền Bắc',
                    time: '18:15',
                    color: AppColors.goldDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1, color: AppColors.borderSubtle),
            const SizedBox(height: 4),
            _buildActionTile(
              context: context,
              icon: Icons.calendar_month_outlined,
              title: 'Xem lịch mở thưởng chi tiết',
              subtitle: 'Tra cứu lịch quay thưởng các tỉnh theo thứ',
              onTap: () => context.push(AppRoute.schedule.path),
            ),
            const Divider(height: 1, color: AppColors.borderSubtle),
            _buildActionTile(
              context: context,
              icon: Icons.confirmation_number_outlined,
              title: 'Mua vé số may mắn',
              subtitle: 'Khám phá các bộ số đẹp đang mở bán',
              onTap: () => context.go(AppRoute.buyTicket.path),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRegionTimeCard({
    required String region,
    required String time,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        children: [
          Text(
            region,
            style: AppTypography.caption(
              color: AppColors.contentMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            time,
            style: AppTypography.subtitle2(
              color: color,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Hàng ngày',
            style: AppTypography.overline(
              color: AppColors.contentDisabled,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.surfaceSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.bodySmall(
                      fontWeight: FontWeight.w700,
                      color: AppColors.contentHeading,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTypography.caption(
                      color: AppColors.contentMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 14,
              color: AppColors.contentMuted,
            ),
          ],
        ),
      ),
    );
  }
}


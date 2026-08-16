import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/providers/fortune_providers.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/viewmodels/fortune_cast_viewmodel.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/widgets/fortune_jar.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/widgets/fortune_prose_text.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/widgets/fortune_stick_card.dart';
import 'package:daiphat_mobile/src/features/fortune/utils/fortune_ui.dart';
import 'package:daiphat_mobile/src/features/tickets/utils/sellable_draw_date.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/auth_navigation.dart';

class FortuneCastView extends ConsumerStatefulWidget {
  const FortuneCastView({super.key, required this.profileViewModel});

  final ProfileViewModel profileViewModel;

  @override
  ConsumerState<FortuneCastView> createState() => _FortuneCastViewState();
}

class _FortuneCastViewState extends ConsumerState<FortuneCastView>
    with WidgetsBindingObserver {
  late final FortuneCastViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _viewModel = FortuneCastViewModel(ref.read(fortuneCastServiceProvider));
    _viewModel.addListener(_onChanged);
    widget.profileViewModel.addListener(_syncProfile);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncProfile();
      if (readIsAuthenticated(ref)) {
        _viewModel.loadToday();
      }
    });
  }

  void _onChanged() {
    if (mounted) setState(() {});
  }

  void _syncProfile() {
    _viewModel.attachProfileDob(widget.profileViewModel.user?.dob);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && readIsAuthenticated(ref)) {
      _viewModel.loadToday(silent: true);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.profileViewModel.removeListener(_syncProfile);
    _viewModel.removeListener(_onChanged);
    _viewModel.dispose();
    super.dispose();
  }

  Future<void> _onShake() async {
    final authed = readIsAuthenticated(ref);
    if (!authed) {
      goToLogin(context, redirectPath: AppRoute.fortune.path);
      return;
    }
    await _viewModel.cast(isAuthenticated: true);
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final iso = buildBirthDateIso(
      _viewModel.birthDay,
      _viewModel.birthMonth,
      _viewModel.birthYear,
    );
    final initial = iso != null
        ? DateTime.parse(iso)
        : DateTime(now.year - 25, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(now) ? now : initial,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Chọn ngày sinh',
      cancelText: 'Huỷ',
      confirmText: 'Xong',
    );
    if (picked == null) return;
    _viewModel.setBirthDate(
      day: picked.day.toString(),
      month: picked.month.toString(),
      year: picked.year.toString(),
    );
  }

  void _buyLuckyTail() {
    final result = _viewModel.result;
    if (result == null) return;
    final parsed = parseFortuneBuyPath(result.buyPath);
    final ticketNumber =
        parsed.ticketNumber.isNotEmpty ? parsed.ticketNumber : result.luckyTail;
    final drawDate = parsed.drawDate?.isNotEmpty == true
        ? parsed.drawDate!
        : (result.sellableDrawDate.isNotEmpty
            ? result.sellableDrawDate.split('T').first
            : SellableDrawDate.defaultSellableDrawDateIso());
    context.go(
      Uri(
        path: AppRoute.buyTicket.path,
        queryParameters: {
          'ticketNumber': ticketNumber,
          'drawDate': drawDate,
        },
      ).toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = _viewModel;
    final authed = readIsAuthenticated(ref);
    final showJar =
        vm.phase == FortuneAnimPhase.idle ||
        vm.phase == FortuneAnimPhase.error ||
        vm.phase == FortuneAnimPhase.shaking ||
        vm.phase == FortuneAnimPhase.ejecting;

    return Scaffold(
      backgroundColor: const Color(0xFF3D0A0C),
      appBar: AppBar(
        backgroundColor: const Color(0xFF4A0E10),
        surfaceTintColor: Colors.transparent,
        foregroundColor: const Color(0xFFFDE68A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Column(
          children: [
            Text(
              'Mỗi ngày một quẻ · Đón vận may',
              style: GoogleFonts.publicSans(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: const Color(0xCCFDE68A),
              ),
            ),
            Text(
              'Gieo quẻ tài lộc',
              style: GoogleFonts.publicSans(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF4A0E10), Color(0xFF2A0C0E), Color(0xFF1A0808)],
          ),
        ),
        child: SafeArea(
          top: false,
          child: vm.loadingToday && vm.phase == FortuneAnimPhase.idle
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: Color(0xFFE8C872)),
                      SizedBox(height: 12),
                      Text(
                        'Đang chuẩn bị ống quẻ…',
                        style: TextStyle(color: Color(0xFFFDE68A)),
                      ),
                    ],
                  ),
                )
              : AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  child: vm.phase == FortuneAnimPhase.result && vm.result != null
                      ? _ResultPane(
                          key: const ValueKey('result'),
                          viewModel: vm,
                          onBuy: _buyLuckyTail,
                          onBackToJar: vm.backToJar,
                        )
                      : showJar
                      ? _JarPane(
                          key: ValueKey('jar-${vm.sceneKey}'),
                          viewModel: vm,
                          isAuthenticated: authed,
                          onShake: _onShake,
                          onPickDob: _pickDob,
                          onLogin: () => goToLogin(
                            context,
                            redirectPath: AppRoute.fortune.path,
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
        ),
      ),
    );
  }
}

class _JarPane extends StatelessWidget {
  const _JarPane({
    super.key,
    required this.viewModel,
    required this.isAuthenticated,
    required this.onShake,
    required this.onPickDob,
    required this.onLogin,
  });

  final FortuneCastViewModel viewModel;
  final bool isAuthenticated;
  final VoidCallback onShake;
  final VoidCallback onPickDob;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    final shaking = viewModel.phase == FortuneAnimPhase.shaking ||
        viewModel.phase == FortuneAnimPhase.ejecting;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        if (!isAuthenticated)
          _Banner(
            text: 'Đăng nhập để gieo quẻ và lưu kết quả trong ngày.',
            actionLabel: 'Đăng nhập',
            onAction: onLogin,
          ),
        if (viewModel.showCastSetup && isAuthenticated) ...[
          Text(
            'CHỌN CÁCH GIEO',
            textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.8,
              color: const Color(0xCCFDE68A),
            ),
          ),
          const SizedBox(height: 10),
          _ModeCard(
            selected: viewModel.castMode == FortuneCastMode.random,
            icon: Icons.shuffle_rounded,
            title: 'Gieo ngẫu nhiên',
            subtitle: 'Để vận khí hôm nay chọn bản mệnh giúp bạn.',
            onTap: () => viewModel.selectCastMode(FortuneCastMode.random),
          ),
          const SizedBox(height: 10),
          _ModeCard(
            selected: viewModel.castMode == FortuneCastMode.birthdate,
            icon: Icons.cake_outlined,
            title: 'Gieo theo ngày sinh',
            subtitle: 'Luận quẻ đúng bản mệnh của bạn.',
            onTap: () => viewModel.selectCastMode(FortuneCastMode.birthdate),
            child: _DobButton(
              day: viewModel.birthDay,
              month: viewModel.birthMonth,
              year: viewModel.birthYear,
              onTap: onPickDob,
            ),
          ),
        ],
        if (viewModel.errorMessage != null) ...[
          const SizedBox(height: 10),
          _Banner(text: viewModel.errorMessage!, isError: true),
        ],
        const SizedBox(height: 16),
        Text(
          'THẦN TÀI',
          textAlign: TextAlign.center,
          style: GoogleFonts.publicSans(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 2.4,
            color: const Color(0x99FCA5A5),
          ),
        ),
        Text(
          'Ống quẻ tài lộc',
          textAlign: TextAlign.center,
          style: GoogleFonts.publicSans(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: const Color(0xFFFFF7ED),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Lắc ống — số trên que là đuôi may mắn hôm nay.',
          textAlign: TextAlign.center,
          style: GoogleFonts.publicSans(
            fontSize: 13,
            color: const Color(0xCCFDE68A),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: FortuneJar(
            phase: viewModel.phase,
            luckyTail: viewModel.result?.luckyTail,
            enabled: !viewModel.busy && !viewModel.isLocked,
            onShake: onShake,
          ),
        ),
        if (shaking)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xCC2A0C0E),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0x40E8C872)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFFE8C872),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      viewModel.phase == FortuneAnimPhase.shaking
                          ? 'Đang lắc ống quẻ…'
                          : 'Một que đang bay ra…',
                      style: GoogleFonts.publicSans(
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  viewModel.phase == FortuneAnimPhase.shaking
                      ? 'Que xăm đang nhảy trong ống — giữ vững tâm thế.'
                      : 'Que may mắn sắp chạm đất.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.publicSans(
                    fontSize: 13,
                    color: const Color(0xA6FFF7ED),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _ResultPane extends StatelessWidget {
  const _ResultPane({
    super.key,
    required this.viewModel,
    required this.onBuy,
    required this.onBackToJar,
  });

  final FortuneCastViewModel viewModel;
  final VoidCallback onBuy;
  final VoidCallback onBackToJar;

  @override
  Widget build(BuildContext context) {
    final result = viewModel.result!;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            children: [
              Text(
                'QUẺ XĂM TÀI LỘC HÔM NAY',
                textAlign: TextAlign.center,
                style: GoogleFonts.publicSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.6,
                  color: const Color(0xCCE8C872),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Thẻ may mắn của bạn',
                textAlign: TextAlign.center,
                style: GoogleFonts.publicSans(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 14),
              FortuneStickCard(luckyTail: result.luckyTail),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _ElementPill(
                      title: 'Bản mệnh',
                      value: fortuneElementLabel(result.userElement),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ElementPill(
                      title: 'Hành ngày',
                      value: fortuneElementLabel(result.dayElement),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Lời luận quẻ',
                style: GoogleFonts.publicSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0x991A0808),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0x33E8C872)),
                ),
                child: FortuneProseText(
                  prose: result.prose,
                  luckyTail: result.luckyTail,
                ),
              ),
              if (viewModel.isLocked) ...[
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0x991A0808),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33E8C872)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'THỜI GIAN CHỜ GIỮA CÁC LẦN GIEO',
                        style: GoogleFonts.publicSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                          color: const Color(0x99FDE68A),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Lượt tiếp theo',
                        style: GoogleFonts.publicSans(
                          fontSize: 12,
                          color: const Color(0x99FDE68A),
                        ),
                      ),
                      Text(
                        formatCountdownHms(viewModel.nextCastCountdown),
                        style: GoogleFonts.publicSans(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFFFCD34D),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: onBackToJar,
                  icon: const Icon(Icons.arrow_back_rounded),
                  label: const Text('Về ống quẻ'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF6B1012),
                    backgroundColor: const Color(0xFFFDE68A),
                    side: BorderSide.none,
                    minimumSize: const Size.fromHeight(48),
                    textStyle: GoogleFonts.publicSans(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
              ],
              if (result.previousCastSummary != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0x991A0808),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33E8C872)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'QUẺ GẦN NHẤT',
                        style: GoogleFonts.publicSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: const Color(0x99FDE68A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đuôi may mắn ${result.previousCastSummary!.luckyTail}',
                        style: GoogleFonts.publicSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        '${formatFortuneDisplayDate(result.previousCastSummary!.castDate)}'
                        '${result.previousCastSummary!.userElement.isNotEmpty ? ' · Mệnh ${fortuneElementLabel(result.previousCastSummary!.userElement)}' : ''}',
                        style: GoogleFonts.publicSans(
                          fontSize: 13,
                          color: const Color(0x99FFF7ED),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton.icon(
              onPressed: onBuy,
              icon: const Icon(Icons.shopping_cart_outlined),
              label: Text('Mua vé đuôi ${result.luckyTail}'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                textStyle: GoogleFonts.publicSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.child,
  });

  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFF8B1A1C) : const Color(0xB32A0C0E),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? const Color(0xFFE8C872)
                  : const Color(0x40E8C872),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected
                          ? const Color(0xFFE8C872)
                          : const Color(0x33E8C872),
                    ),
                    child: Icon(
                      icon,
                      color: selected
                          ? const Color(0xFF6B1012)
                          : const Color(0xFFE8C872),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.publicSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: GoogleFonts.publicSans(
                            fontSize: 12,
                            color: const Color(0xB3FFF7ED),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (selected)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8C872),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'CHỌN',
                        style: GoogleFonts.publicSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF5A1012),
                        ),
                      ),
                    ),
                ],
              ),
              if (child != null) ...[const SizedBox(height: 12), child!],
            ],
          ),
        ),
      ),
    );
  }
}

class _DobButton extends StatelessWidget {
  const _DobButton({
    required this.day,
    required this.month,
    required this.year,
    required this.onTap,
  });

  final String day;
  final String month;
  final String year;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final iso = buildBirthDateIso(day, month, year);
    final label = iso == null
        ? 'Chọn ngày / tháng / năm sinh'
        : formatFortuneDisplayDate(iso);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xCC1A0808),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x59E8C872)),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_month_outlined, color: Color(0xFFE8C872)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.publicSans(
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
            const Icon(Icons.expand_more_rounded, color: Color(0xFFE8C872)),
          ],
        ),
      ),
    );
  }
}

class _ElementPill extends StatelessWidget {
  const _ElementPill({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xCC2A0C0E),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x4DE8C872)),
      ),
      child: Column(
        children: [
          Text(
            title,
            style: GoogleFonts.publicSans(
              fontSize: 11,
              color: const Color(0x99FDE68A),
            ),
          ),
          Text(
            value,
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.text,
    this.isError = false,
    this.actionLabel,
    this.onAction,
  });

  final String text;
  final bool isError;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? const Color(0xCC5A1012) : const Color(0xB32A0C0E),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x4DE8C872)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.publicSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFFFDE68A),
              ),
            ),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              child: Text(
                actionLabel!,
                style: GoogleFonts.publicSans(
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

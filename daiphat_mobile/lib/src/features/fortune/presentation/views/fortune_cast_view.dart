import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/providers/fortune_providers.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/viewmodels/fortune_cast_viewmodel.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/widgets/fortune_jar.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/widgets/fortune_prose_text.dart';
import 'package:daiphat_mobile/src/features/fortune/presentation/widgets/fortune_stick_card.dart';
import 'package:daiphat_mobile/src/features/fortune/utils/fortune_ui.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/buy_ticket_viewmodel.dart';
import 'package:daiphat_mobile/src/features/tickets/utils/sellable_draw_date.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/auth_navigation.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_date_picker_dialog.dart';

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
    _viewModel = FortuneCastViewModel(
      ref.read(castFortuneProvider),
      ref.read(getTodayFortuneCastProvider),
    );
    _viewModel.addListener(_onChanged);
    widget.profileViewModel.addListener(_syncProfile);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncProfile();
      // Default to random mode if not yet specified
      if (_viewModel.castMode == null) {
        _viewModel.selectCastMode(FortuneCastMode.random);
      }
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
    final picked = await AppDatePickerDialog.show(
      context,
      initial.isAfter(now) ? now : initial,
      firstDate: DateTime(1900),
      lastDate: now,
      title: 'Chọn ngày sinh',
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
    final ticketNumber = parsed.ticketNumber.isNotEmpty
        ? parsed.ticketNumber
        : result.luckyTail;
    final drawDate = parsed.drawDate?.isNotEmpty == true
        ? parsed.drawDate!
        : (result.sellableDrawDate.isNotEmpty
              ? result.sellableDrawDate.split('T').first
              : SellableDrawDate.defaultSellableDrawDateIso());

    ref.read(buyTicketViewModelProvider.notifier).applyQuery(
          searchQuery: ticketNumber,
          drawDateIso: drawDate,
        );

    context.go(
      Uri(
        path: AppRoute.buyTicket.path,
        queryParameters: {'ticketNumber': ticketNumber, 'drawDate': drawDate},
      ).toString(),
    );
  }

  void _showFortuneInfoSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.fortuneBackgroundDark,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(
          color: AppColors.fortuneGoldWarm.withValues(alpha: 0.35),
          width: 1,
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.fortuneGold.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome,
                      color: AppColors.fortuneGold,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Ý Nghĩa & Thể Lệ Gieo Quẻ',
                      style: AppTypography.h4(
                        color: AppColors.fortuneCream,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  '• Mỗi ngày, mỗi quý khách được gieo một lá quẻ đón nhận thông điệp cát lành và đuôi số may mắn.',
                  style: AppTypography.bodyMedium(
                    color: AppColors.fortuneCream.withValues(alpha: 0.9),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '• Gieo ngẫu nhiên: Để năng lượng tự nhiên tương hợp, lựa chọn ngẫu nhiên một lá quẻ ứng với vận trình hôm nay.',
                  style: AppTypography.bodyMedium(
                    color: AppColors.fortuneCream.withValues(alpha: 0.9),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '• Theo ngày sinh: Kết hợp ngũ hành ngày với bản mệnh của bạn để luận giải chính xác và sâu sắc hơn.',
                  style: AppTypography.bodyMedium(
                    color: AppColors.fortuneCream.withValues(alpha: 0.9),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '• Thông tin ngày sinh của quý khách được mã hoá và hoàn toàn bảo mật.',
                  style: AppTypography.bodySmall(
                    color: AppColors.fortuneGoldLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        );
      },
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
      backgroundColor: const Color(0xFF1B0305),
      body: Stack(
        children: [
          // 1. Wallpaper texture from web
          Positioned.fill(
            child: Opacity(
              opacity: 0.12,
              child: Image.asset(
                'assets/images/home_bg.png',
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
              ),
            ),
          ),

          // 2. Imperial Lacquer Crimson Stage linear gradient
          Positioned.fill(
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF420B0E), // Imperial Velvet Wine
                    Color(0xFF2B0608), // Lacquer Crimson
                    Color(0xFF190304), // Deep Obsidian Red
                  ],
                  stops: [0.0, 0.45, 1.0],
                ),
              ),
            ),
          ),

          // 3. Ambient Golden Spotlight at top center
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0.0, -0.75),
                  radius: 0.95,
                  colors: [
                    const Color(0x38FFDF7D),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.70],
                ),
              ),
            ),
          ),

          // 4. Content Area inside SafeArea
          SafeArea(
            child: Column(
              children: [
                // Top Navigation Row
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _CircularNavButton(
                        icon: Icons.chevron_left_rounded,
                        onTap: () => context.pop(),
                      ),
                      _CircularNavButton(
                        icon: Icons.info_outline_rounded,
                        onTap: _showFortuneInfoSheet,
                      ),
                    ],
                  ),
                ),

                // Content Area
                Expanded(
                  child: vm.loadingToday && vm.phase == FortuneAnimPhase.idle
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircularProgressIndicator(
                              color: AppColors.fortuneGold,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Đang chuẩn bị ống quẻ…',
                              style: AppTypography.bodyMedium(
                                color: AppColors.fortuneGoldLight,
                              ),
                            ),
                          ],
                        ),
                      )
                    : AnimatedSwitcher(
                        duration: const Duration(milliseconds: 280),
                        child:
                            vm.phase == FortuneAnimPhase.result &&
                                    vm.result != null
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
            ],
          ),
        ),
      ],
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
    final shaking =
        viewModel.phase == FortuneAnimPhase.shaking ||
        viewModel.phase == FortuneAnimPhase.ejecting;

    return RefreshIndicator(
      color: AppColors.fortuneGold,
      onRefresh: () => viewModel.loadToday(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 32),
        children: [
          // Header Section: Title, Subtitle, and Traditional Accents
          _ScreenHeader(),
          const SizedBox(height: 18),

          // Banner for unauthenticated users
          if (!isAuthenticated)
            _Banner(
              text: 'Đăng nhập để gieo quẻ và lưu kết quả trong ngày.',
              actionLabel: 'Đăng nhập',
              onAction: onLogin,
            ),

          // Selection Box Card ("CHỌN CÁC THÔNG TIN")
          if (viewModel.showCastSetup && isAuthenticated) ...[
            _SelectionCard(
              viewModel: viewModel,
              onPickDob: onPickDob,
            ),
            const SizedBox(height: 16),

            // Primary Call-To-Action Button ("Xem quẻ ngay ->")
            _PrimaryCtaButton(
              onTap: onShake,
              isBusy: viewModel.busy || viewModel.isLocked,
            ),
            const SizedBox(height: 20),
          ],

          // Error Message Banner
          if (viewModel.errorMessage != null) ...[
            _Banner(text: viewModel.errorMessage!, isError: true),
            const SizedBox(height: 14),
          ],

          // Section 2: Cylinder / Jar of Fortune Sticks ("Ống quẻ tài lộc")
          const _JarSectionHeader(),
          const SizedBox(height: 4),

          // The Interactive Fortune Jar with Lotus and Pedestal
          Center(
            child: FortuneJar(
              phase: viewModel.phase,
              luckyTail: viewModel.result?.luckyTail,
              enabled: !viewModel.busy && !viewModel.isLocked,
              onShake: onShake,
            ),
          ),

          // Shaking feedback animation box
          if (shaking)
            Container(
              margin: const EdgeInsets.only(top: 14),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.fortuneBackgroundDeep.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.fortuneGold.withValues(alpha: 0.35),
                ),
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
                          color: AppColors.fortuneGold,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        viewModel.phase == FortuneAnimPhase.shaking
                            ? 'Đang lắc ống quẻ…'
                            : 'Một que đang bay ra…',
                        style: AppTypography.subtitle2(
                          fontWeight: FontWeight.w800,
                          color: AppColors.surfacePrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    viewModel.phase == FortuneAnimPhase.shaking
                        ? 'Que xăm đang chuyển động — giữ tâm thế thành kính.'
                        : 'Que may mắn sắp chạm đất.',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodySmall(
                      fontSize: 12,
                      color: AppColors.fortuneCream.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),

          // Section 3: Bottom Wisdom Quote Card
          const _BottomQuoteCard(),
        ],
      ),
    );
  }
}

/// Circular Glassmorphic Navigation Button
class _CircularNavButton extends StatelessWidget {
  const _CircularNavButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0x45000000),
            border: Border.all(
              color: AppColors.fortuneGoldWarm.withValues(alpha: 0.45),
              width: 1.0,
            ),
          ),
          child: Icon(
            icon,
            size: 20,
            color: AppColors.fortuneGoldLight,
          ),
        ),
      ),
    );
  }
}

/// Top Screen Title and Oriental Cloud Decor
class _ScreenHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // "—— XIN QUẺ ——" decorative row
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 28,
              height: 1.2,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    AppColors.fortuneGoldWarm.withValues(alpha: 0.7),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'XIN QUẺ',
              style: AppTypography.overline(
                letterSpacing: 2.2,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: AppColors.fortuneGoldLight,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 28,
              height: 1.2,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.fortuneGoldWarm.withValues(alpha: 0.7),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),

        // Main Title
        Text(
          'Gieo quẻ tài lộc',
          textAlign: TextAlign.center,
          style: AppTypography.h2(
            fontSize: 27,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.3,
            color: AppColors.surfacePrimary,
          ).copyWith(
            shadows: const [
              Shadow(
                color: Color(0x60000000),
                blurRadius: 12,
              ),
            ],
          ),
        ),
        const SizedBox(height: 5),

        // Slogan / Subtitle
        Text(
          'THÀNH TÂM – ĐÓN MAY – AN TÂM HƠN',
          textAlign: TextAlign.center,
          style: AppTypography.overline(
            letterSpacing: 1.8,
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: AppColors.fortuneGoldLight.withValues(alpha: 0.85),
          ),
        ),
      ],
    );
  }
}

/// The unified 2-Tab Segmented Selection card
class _SelectionCard extends StatelessWidget {
  const _SelectionCard({
    required this.viewModel,
    required this.onPickDob,
  });

  final FortuneCastViewModel viewModel;
  final VoidCallback onPickDob;

  @override
  Widget build(BuildContext context) {
    final isRandom = viewModel.castMode != FortuneCastMode.birthdate;
    final isBirthdate = viewModel.castMode == FortuneCastMode.birthdate;

    final iso = buildBirthDateIso(
      viewModel.birthDay,
      viewModel.birthMonth,
      viewModel.birthYear,
    );
    final dobLabel = iso != null ? formatFortuneDisplayDate(iso) : null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: const Color(0xD0180406),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.fortuneGoldWarm.withValues(alpha: 0.5),
          width: 1.2,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x60000000),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header of the card
          Text(
            'CHỌN CÁCH GIEO',
            style: AppTypography.overline(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
              color: AppColors.fortuneGoldLight,
            ),
          ),
          const SizedBox(height: 10),

          // 2-Tab Segmented Control Bar
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0x60000000),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.fortuneGoldWarm.withValues(alpha: 0.3),
                width: 0.8,
              ),
            ),
            child: Row(
              children: [
                // Tab 1: Gieo ngẫu nhiên
                Expanded(
                  child: _ModeTabButton(
                    title: 'Gieo ngẫu nhiên',
                    icon: Icons.shuffle_rounded,
                    isSelected: isRandom,
                    onTap: () =>
                        viewModel.selectCastMode(FortuneCastMode.random),
                  ),
                ),
                const SizedBox(width: 4),

                // Tab 2: Theo ngày sinh
                Expanded(
                  child: _ModeTabButton(
                    title: 'Theo ngày sinh',
                    icon: Icons.cake_outlined,
                    isSelected: isBirthdate,
                    onTap: () =>
                        viewModel.selectCastMode(FortuneCastMode.birthdate),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Dynamic Tab Content with AnimatedSwitcher
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: isRandom
                ? const _RandomModeContent(key: ValueKey('random_content'))
                : _BirthdateModeContent(
                    key: const ValueKey('birthdate_content'),
                    dobLabel: dobLabel,
                    onPickDob: onPickDob,
                  ),
          ),
        ],
      ),
    );
  }
}

/// Tab button within the segmented switcher
class _ModeTabButton extends StatelessWidget {
  const _ModeTabButton({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: isSelected
                ? const LinearGradient(
                    colors: [
                      AppColors.fortuneGoldLight,
                      AppColors.fortuneGold,
                      AppColors.fortuneGoldWarm,
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  )
                : null,
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.fortuneGold.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected
                    ? AppColors.fortuneMahoganyDark
                    : AppColors.fortuneCream.withValues(alpha: 0.85),
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.subtitle2(
                    fontSize: 12.5,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected
                        ? AppColors.fortuneMahoganyDark
                        : AppColors.fortuneCream.withValues(alpha: 0.85),
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

/// Info card displayed when "Gieo ngẫu nhiên" tab is active
class _RandomModeContent extends StatelessWidget {
  const _RandomModeContent({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0x30000000),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.fortuneGoldWarm.withValues(alpha: 0.25),
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.fortuneCrimsonDeep.withValues(alpha: 0.6),
              border: Border.all(
                color: AppColors.fortuneWoodDark.withValues(alpha: 0.5),
                width: 0.8,
              ),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 18,
              color: AppColors.fortuneGoldLight,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tùy duyên đón vận khí',
                  style: AppTypography.subtitle1(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.fortuneCream,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Vũ trụ tự chọn lá quẻ cát lành tương hợp với bạn hôm nay.',
                  style: AppTypography.bodySmall(
                    fontSize: 11.5,
                    color: AppColors.fortuneCream.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Interactive date selector displayed when "Theo ngày sinh" tab is active
class _BirthdateModeContent extends StatelessWidget {
  const _BirthdateModeContent({
    super.key,
    required this.dobLabel,
    required this.onPickDob,
  });

  final String? dobLabel;
  final VoidCallback onPickDob;

  @override
  Widget build(BuildContext context) {
    final hasDate = dobLabel != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onPickDob,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.fortuneCrimsonDeep.withValues(alpha: 0.40),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.fortuneGoldWarm.withValues(alpha: 0.6),
                  width: 1.0,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.fortuneCrimsonDeep.withValues(alpha: 0.6),
                      border: Border.all(
                        color: AppColors.fortuneGoldWarm.withValues(alpha: 0.6),
                        width: 0.8,
                      ),
                    ),
                    child: const Icon(
                      Icons.calendar_month_rounded,
                      size: 18,
                      color: AppColors.fortuneGoldLight,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hasDate
                              ? 'Ngày sinh: $dobLabel'
                              : 'Chạm để chọn ngày sinh',
                          style: AppTypography.subtitle1(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: hasDate
                                ? AppColors.fortuneGoldLight
                                : AppColors.fortuneCream,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          hasDate
                              ? 'Đã khớp Can Chi bản mệnh với ngũ hành ngày.'
                              : 'Giúp quẻ giải mã chuẩn xác theo mệnh số của bạn.',
                          style: AppTypography.bodySmall(
                            fontSize: 11.5,
                            color: AppColors.fortuneCream.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.fortuneGoldWarm.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.edit_calendar_rounded,
                      size: 16,
                      color: AppColors.fortuneGoldLight,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Subtle, elegant privacy note contextual to birthdate entry
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.lock_outline_rounded,
                size: 12,
                color: AppColors.fortuneGoldLight.withValues(alpha: 0.75),
              ),
              const SizedBox(width: 5),
              Text(
                'Thông tin ngày sinh được bảo mật tuyệt đối',
                style: AppTypography.caption(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.fortuneCream.withValues(alpha: 0.75),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Primary Call-To-Action Button ("Xem quẻ ngay ->")
class _PrimaryCtaButton extends StatelessWidget {
  const _PrimaryCtaButton({required this.onTap, required this.isBusy});

  final VoidCallback onTap;
  final bool isBusy;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            colors: [
              Color(0xFFFFF1C2),
              Color(0xFFFDE68A),
              Color(0xFFF59E0B),
              Color(0xFFD97706),
            ],
            stops: [0.0, 0.3, 0.75, 1.0],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          border: Border.all(
            color: const Color(0xFFFFDF7D),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
              blurRadius: 18,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(28),
            onTap: isBusy ? null : onTap,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Xem quẻ ngay',
                  style: AppTypography.buttonLarge(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF4A0A0D),
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.arrow_forward_rounded,
                  color: Color(0xFF4A0A0D),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Section Header above the Fortune Jar
class _JarSectionHeader extends StatelessWidget {
  const _JarSectionHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'THIỀN TÂM',
          style: AppTypography.overline(
            fontSize: 11,
            letterSpacing: 2.2,
            fontWeight: FontWeight.w800,
            color: AppColors.fortuneGoldLight,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          'Ống quẻ tài lộc',
          style: AppTypography.h3(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.3,
            color: AppColors.surfacePrimary,
          ).copyWith(
            shadows: const [
              Shadow(
                color: Color(0x60000000),
                blurRadius: 8,
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Lắc nhẹ – Để vũ trụ gửi lời nhắn may mắn đến bạn',
          style: AppTypography.bodySmall(
            fontSize: 12.5,
            color: AppColors.fortuneCream.withValues(alpha: 0.9),
          ),
        ),
      ],
    );
  }
}

/// Bottom Quote / Wisdom Card
class _BottomQuoteCard extends StatelessWidget {
  const _BottomQuoteCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 24, bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.fortuneBackgroundDeep.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.fortuneGold.withValues(alpha: 0.25),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '“',
            style: AppTypography.traditional(
              fontSize: 28,
              height: 1.0,
              fontWeight: FontWeight.w900,
              color: AppColors.fortuneGold.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                'Quẻ chỉ là lời gợi mở,\nmay mắn vẫn nằm trong chính hành động của bạn.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyMedium(
                  fontSize: 12.5,
                  fontStyle: FontStyle.italic,
                  height: 1.45,
                  color: AppColors.fortuneCream.withValues(alpha: 0.95),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '”',
            style: AppTypography.traditional(
              fontSize: 28,
              height: 1.0,
              fontWeight: FontWeight.w900,
              color: AppColors.fortuneGold.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
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
          child: RefreshIndicator(
            color: AppColors.fortuneGold,
            onRefresh: () => viewModel.loadToday(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              children: [
                Text(
                  'QUẺ XĂM TÀI LỘC HÔM NAY',
                  textAlign: TextAlign.center,
                  style: AppTypography.overline(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2.0,
                    color: AppColors.fortuneGoldLight,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Thẻ may mắn của bạn',
                  textAlign: TextAlign.center,
                  style: AppTypography.h3(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.3,
                    color: AppColors.surfacePrimary,
                  ).copyWith(
                    shadows: const [
                      Shadow(
                        color: Color(0x60000000),
                        blurRadius: 10,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FortuneStickCard(luckyTail: result.luckyTail),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: _ElementPill(
                        title: 'Bản mệnh',
                        value: fortuneElementLabel(result.userElement),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ElementPill(
                        title: 'Hành ngày',
                        value: fortuneElementLabel(result.dayElement),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  'Lời luận quẻ',
                  style: AppTypography.h4(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.surfacePrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0x65000000),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: AppColors.fortuneGoldWarm.withValues(alpha: 0.4),
                      width: 1.0,
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x40000000),
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      ),
                    ],
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
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 16),
                    decoration: BoxDecoration(
                      color: const Color(0x65000000),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: AppColors.fortuneGoldWarm.withValues(alpha: 0.4),
                        width: 1.0,
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Text(
                          'THỜI GIAN CHỜ GIỮA CÁC LẦN GIEO',
                          style: AppTypography.overline(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.4,
                            color: AppColors.fortuneGoldLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Lượt tiếp theo',
                          style: AppTypography.caption(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                            color: AppColors.fortuneCream.withValues(alpha: 0.85),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          formatCountdownHms(viewModel.nextCastCountdown),
                          style: AppTypography.lotteryDigit(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFFFFDF7D),
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 14),
                  OutlinedButton.icon(
                    onPressed: onBackToJar,
                    icon: const Icon(Icons.arrow_back_rounded),
                    label: Text(
                      'Về ống quẻ',
                      style: AppTypography.buttonLarge(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: AppColors.fortuneCrimsonDark,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.fortuneCrimsonDark,
                      backgroundColor: AppColors.fortuneGoldLight,
                      side: BorderSide.none,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ],
                if (result.previousCastSummary != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0x65000000),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: AppColors.fortuneGoldWarm.withValues(alpha: 0.4),
                        width: 1.0,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'QUẺ GẦN NHẤT',
                          style: AppTypography.overline(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                            color: AppColors.fortuneGoldLight,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Đuôi may mắn ${result.previousCastSummary!.luckyTail}',
                          style: AppTypography.h5(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                            color: AppColors.surfacePrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${formatFortuneDisplayDate(result.previousCastSummary!.castDate)}'
                          '${result.previousCastSummary!.userElement.isNotEmpty ? ' · Mệnh ${fortuneElementLabel(result.previousCastSummary!.userElement)}' : ''}',
                          style: AppTypography.bodySmall(
                            fontSize: 13,
                            color: AppColors.fortuneCream.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: const LinearGradient(
                  colors: [Color(0xFFE5252A), Color(0xFFB71C1C)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                border: Border.all(
                  color: AppColors.fortuneGoldLight.withValues(alpha: 0.4),
                  width: 1.0,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFE5252A).withValues(alpha: 0.4),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: onBuy,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.shopping_cart_outlined,
                        color: AppColors.surfacePrimary,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Mua vé đuôi ${result.luckyTail}',
                        style: AppTypography.buttonLarge(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.surfacePrimary,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
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
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0x65000000),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.fortuneGoldWarm.withValues(alpha: 0.45),
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x40000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            title,
            style: AppTypography.caption(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.fortuneCream.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTypography.h5(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: const Color(0xFFFFDF7D),
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
        color: isError
            ? AppColors.fortuneCrimsonDeep.withValues(alpha: 0.8)
            : AppColors.fortuneBackgroundDeep.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.fortuneGold.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              style: AppTypography.bodySmall(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.fortuneGoldLight,
              ),
            ),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              child: Text(
                actionLabel!,
                style: AppTypography.buttonSmall(
                  fontWeight: FontWeight.w800,
                  color: AppColors.surfacePrimary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

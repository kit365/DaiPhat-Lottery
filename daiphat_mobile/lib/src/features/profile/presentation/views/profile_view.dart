import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import '../viewmodels/profile_viewmodel.dart';
import '../viewmodels/profile_tickets_summary_viewmodel.dart';

class ProfileView extends ConsumerStatefulWidget {
  final ProfileViewModel viewModel;
  final NotificationViewModel notificationViewModel;

  const ProfileView({
    super.key,
    required this.viewModel,
    required this.notificationViewModel,
  });

  @override
  ConsumerState<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends ConsumerState<ProfileView> {
  ProfileTicketsSummaryViewModel? _ticketsSummaryViewModel;

  @override
  void initState() {
    super.initState();
    _ticketsSummaryViewModel = ProfileTicketsSummaryViewModel(
      ref.read(orderServiceProvider),
    );
  }

  @override
  void dispose() {
    _ticketsSummaryViewModel?.dispose();
    super.dispose();
  }

  ProfileViewModel get viewModel => widget.viewModel;
  NotificationViewModel get notificationViewModel =>
      widget.notificationViewModel;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: viewModel,
      builder: (context, _) {
        if (!viewModel.isLoading && viewModel.user == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) {
              viewModel.logout();
              context.go(AppRoute.login.path);
            }
          });
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFFFFBFA),
          body: RefreshIndicator(
            onRefresh: () async {
              await viewModel.loadUser();
              await _ticketsSummaryViewModel?.loadSummary();
            },
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  _buildHeaderAndProfileCard(context),
                  const SizedBox(height: 16),
                  _buildMyTicketsSection(),
                  const SizedBox(height: 16),
                  _buildMyAccountSection(context),
                  const SizedBox(height: 16),
                  _buildUtilitiesSection(context),
                  const SizedBox(height: 16),
                  _buildSettingsSection(context),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeaderAndProfileCard(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    return SizedBox(
      height: 204 + topPadding,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 156 + topPadding,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.white, Colors.white, Colors.transparent],
                stops: [0, .72, 1],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset(
                'assets/images/profile_cherry_bg.png',
                fit: BoxFit.cover,
                alignment: Alignment.topLeft,
              ),
            ),
          ),

          Positioned(
            top: topPadding + 9,
            right: 16,
            child: Row(
              children: [
                _buildHeaderAction(
                  icon: Icons.settings_outlined,
                  onTap: () => context.push(AppRoute.profileDetail.path),
                ),
                const SizedBox(width: 10),
                _buildHeaderAction(
                  icon: Icons.chat_bubble_outline_rounded,
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
              ],
            ),
          ),

          Positioned(
            left: 16,
            right: 16,
            top: topPadding + 70,
            height: 124,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .97),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFFFEEEE)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x147B1820),
                    blurRadius: 24,
                    spreadRadius: -6,
                    offset: Offset(0, 9),
                  ),
                ],
              ),
              child: ListenableBuilder(
                listenable: viewModel,
                builder: (context, _) {
                  final user = viewModel.user;
                  final rawName = user?.fullName?.trim();
                  final username = user?.username.trim();
                  final name = rawName?.isNotEmpty == true
                      ? rawName!
                      : username?.isNotEmpty == true
                      ? username!
                      : 'Member Default';

                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 18, 106, 16),
                        child: Row(
                          children: [
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 72,
                                  height: 72,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF6F6),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: const Color(0xFFF5D8DA),
                                    ),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: user?.avatarUrl?.isNotEmpty == true
                                      ? Image.network(
                                          user!.avatarUrl!,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => const Icon(
                                            Icons.person_rounded,
                                            color: Color(0xFF8D9AA8),
                                            size: 43,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.person_rounded,
                                          color: Color(0xFF8D9AA8),
                                          size: 43,
                                        ),
                                ),
                                Positioned(
                                  right: -3,
                                  bottom: 0,
                                  child: GestureDetector(
                                    onTap: () =>
                                        context.push(AppRoute.profileEdit.path),
                                    child: Container(
                                      width: 25,
                                      height: 25,
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: const Color(0xFFF1E5E5),
                                        ),
                                        boxShadow: const [
                                          BoxShadow(
                                            color: Color(0x19000000),
                                            blurRadius: 6,
                                            offset: Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: const Icon(
                                        Icons.photo_camera_rounded,
                                        size: 13,
                                        color: Color(0xFF78828D),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 18),
                            Expanded(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.publicSans(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF202124),
                                    ),
                                  ),
                                  const SizedBox(height: 11),
                                  InkWell(
                                    borderRadius: BorderRadius.circular(999),
                                    onTap: () =>
                                        context.push(AppRoute.profileEdit.path),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 7,
                                      ),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFF8F8),
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                        border: Border.all(
                                          color: const Color(0xFFF5CBCD),
                                        ),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons.edit_outlined,
                                            size: 14,
                                            color: AppColors.primary,
                                          ),
                                          SizedBox(width: 6),
                                          Flexible(
                                            child: Text(
                                              'Chỉnh sửa hồ sơ',
                                              maxLines: 1,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ),
                                          SizedBox(width: 3),
                                          Icon(
                                            Icons.chevron_right_rounded,
                                            size: 15,
                                            color: AppColors.primary,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Positioned(
                        right: -2,
                        bottom: 0,
                        width: 112,
                        height: 116,
                        child: Image.asset(
                          'assets/images/thantai.png',
                          fit: BoxFit.contain,
                          alignment: Alignment.bottomRight,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderAction({
    required IconData icon,
    required VoidCallback onTap,
    int badge = 0,
  }) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: Colors.white,
          shape: const CircleBorder(),
          elevation: 2,
          shadowColor: const Color(0x26000000),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(
              width: 39,
              height: 39,
              child: Icon(icon, color: const Color(0xFF222222), size: 21),
            ),
          ),
        ),
        if (badge > 0)
          Positioned(
            right: -2,
            top: -3,
            child: Container(
              constraints: const BoxConstraints(minWidth: 17, minHeight: 17),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                badge > 9 ? '9+' : '$badge',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  height: 1,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMyTicketsSection() {
    final summaryVm = _ticketsSummaryViewModel;
    if (summaryVm == null) {
      return _buildCard(child: const SizedBox.shrink());
    }

    return ListenableBuilder(
      listenable: summaryVm,
      builder: (context, _) {
        final stats = summaryVm.stats;
        final pending = summaryVm.isLoading ? '—' : '${stats.pendingCount}';
        final drawn = summaryVm.isLoading ? '—' : '${stats.drawnCount}';
        final won = summaryVm.isLoading ? '—' : '${stats.wonCount}';

        return _buildCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Vé của tôi',
                      style: GoogleFonts.publicSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => context.push(AppRoute.myTickets.path),
                    child: Text(
                      'Xem tất cả',
                      style: GoogleFonts.publicSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildTicketStatItemAsset(
                    'assets/images/icons/icon_ve_cho_quay.png',
                    const Color(0xFFFBC02D),
                    pending,
                    'Chờ quay',
                    onTap: () => context.push(AppRoute.myTickets.path),
                  ),
                  _buildVerticalDivider(),
                  _buildTicketStatItemAsset(
                    'assets/images/icons/icon_ve_da_quay.png',
                    const Color(0xFFE91E63),
                    drawn,
                    'Đã quay',
                    onTap: () => context.push(AppRoute.myTickets.path),
                  ),
                  _buildVerticalDivider(),
                  _buildTicketStatItemIcon(
                    Icons.emoji_events_outlined,
                    const Color(0xFFF57F17),
                    won,
                    'Trúng thưởng',
                    onTap: () => context.push(AppRoute.myTickets.path),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTicketStatItemIcon(
    IconData icon,
    Color color,
    String count,
    String label, {
    VoidCallback? onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 25),
            ),
            const SizedBox(height: 8),
            Text(
              count,
              style: GoogleFonts.publicSans(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.publicSans(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketStatItemAsset(
    String assetPath,
    Color color,
    String count,
    String label, {
    VoidCallback? onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Transform.scale(
                scale: 1.55,
                child: Image.asset(
                  assetPath,
                  width: 34,
                  height: 34,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              count,
              style: GoogleFonts.publicSans(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.publicSans(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerticalDivider() {
    return Container(height: 42, width: 1, color: const Color(0xFFF1E7E5));
  }

  Widget _buildMyAccountSection(BuildContext context) {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tài khoản của tôi',
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 8),
          _buildListItem(
            Icons.dashboard_outlined,
            'Tổng quan tài khoản',
            onTap: () => context.push(AppRoute.profileOverview.path),
          ),
          _buildListItem(
            Icons.person_outline,
            'Thông tin cá nhân',
            onTap: () {
              context.push(AppRoute.profileDetail.path);
            },
          ),
          _buildListItem(
            Icons.confirmation_number_outlined,
            'Vé của tôi',
            onTap: () => context.push(AppRoute.myTickets.path),
          ),
          _buildListItem(
            Icons.receipt_long_outlined,
            'Đơn hàng của tôi',
            onTap: () => context.push(AppRoute.myOrders.path),
          ),
          _buildListItem(
            Icons.rotate_left_rounded,
            'Yêu cầu hoàn tiền',
            onTap: () => context.push(AppRoute.refunds.path),
          ),
          _buildListItem(
            Icons.emoji_events_outlined,
            'Yêu cầu trả thưởng',
            onTap: () => context.push(AppRoute.prizePayouts.path),
          ),
          _buildListItem(
            Icons.account_balance_outlined,
            'Tài khoản ngân hàng',
            onTap: () => context.push(AppRoute.bankAccounts.path),
            showDivider: false,
          ),
        ],
      ),
    );
  }

  Widget _buildUtilitiesSection(BuildContext context) {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tiện ích',
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildUtilityItemIcon(
                Icons.notifications_active_outlined,
                'Thông báo',
                onTap: () => context.push(AppRoute.notifications.path),
              ),
              const SizedBox(width: 10),
              _buildUtilityItemIcon(Icons.auto_fix_high, 'Gieo quẻ'),
              const SizedBox(width: 10),
              _buildUtilityItemIcon(
                Icons.calendar_month_outlined,
                'Lịch mở thưởng',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUtilityItemIcon(
    IconData icon,
    String label, {
    VoidCallback? onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 11),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFF0E6E4)),
          ),
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF2F3),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.primary, size: 23),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: GoogleFonts.publicSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textMain,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Cài đặt & hỗ trợ',
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 8),
          _buildListItem(
            Icons.notifications_outlined,
            'Cài đặt thông báo',
            iconColor: const Color(0xFF242424),
            onTap: () => context.push(AppRoute.notificationSettings.path),
          ),
          _buildListItem(
            Icons.security_outlined,
            'Bảo mật',
            iconColor: const Color(0xFF242424),
          ),
          _buildListItem(
            Icons.headset_mic_outlined,
            'Khiếu nại / Hỗ trợ',
            iconColor: const Color(0xFF242424),
            onTap: () => context.push(AppRoute.complaints.path),
          ),
          _buildListItem(
            Icons.help_outline,
            'Trung tâm hỗ trợ',
            iconColor: const Color(0xFF242424),
          ),
          _buildListItem(
            Icons.info_outline,
            'Giới thiệu về Đại Phát',
            iconColor: const Color(0xFF242424),
          ),
          _buildListItem(
            Icons.logout,
            'Đăng xuất',
            showDivider: false,
            iconColor: const Color(0xFF242424),
            onTap: () async {
              await viewModel.logout();
              if (context.mounted) {
                context.go(AppRoute.login.path);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildListItem(
    IconData icon,
    String title, {
    bool showDivider = true,
    VoidCallback? onTap,
    Color iconColor = AppColors.primary,
  }) {
    return Column(
      children: [
        ListTile(
          dense: true,
          visualDensity: const VisualDensity(vertical: -2),
          contentPadding: EdgeInsets.zero,
          minLeadingWidth: 24,
          leading: Icon(icon, color: iconColor, size: 20),
          title: Text(
            title,
            style: GoogleFonts.publicSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textMain,
            ),
          ),
          trailing: const Icon(
            Icons.chevron_right_rounded,
            color: Color(0xFF9A9A9A),
            size: 19,
          ),
          onTap: onTap ?? () {},
        ),
        if (showDivider) const Divider(height: 1, color: Color(0xFFF2EAE8)),
      ],
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFFF1EF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F6D1F20),
            blurRadius: 18,
            spreadRadius: -5,
            offset: Offset(0, 7),
          ),
        ],
      ),
      child: child,
    );
  }
}

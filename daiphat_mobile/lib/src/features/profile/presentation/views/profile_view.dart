import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/providers/purchased_tickets_providers.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
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
      ref.read(getMyTicketsSummaryProvider),
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
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: RefreshIndicator(
            onRefresh: () async {
              await viewModel.loadUser();
              await _ticketsSummaryViewModel?.loadSummary();
            },
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                children: [
                  _buildHeaderAndProfileCard(context),
                  if (viewModel.user?.isAdmin == true) ...[
                    const SizedBox(height: 16),
                    _buildAdminSection(context),
                  ],
                  const SizedBox(height: 12),
                  _buildMyTicketsSection(),
                  const SizedBox(height: 12),
                  _buildMyAccountSection(context),
                  const SizedBox(height: 12),
                  _buildUtilitiesSection(context),
                  const SizedBox(height: 12),
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
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final profileCardHeight = 114.0 + ((textScale - 1) * 24).clamp(0, 18);
    return SizedBox(
      height: 72 + profileCardHeight + topPadding,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 132 + topPadding,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.surfacePrimary,
                  AppColors.surfacePrimary,
                  AppColors.transparent,
                ],
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
                ListenableBuilder(
                  listenable: widget.notificationViewModel,
                  builder: (context, _) => AppHeaderActionButton(
                    icon: ProfileIconography.notifications,
                    tooltip: 'Thông báo',
                    badgeCount: widget.notificationViewModel.unreadCount,
                    variant: AppHeaderActionVariant.bare,
                    onTap: () => context.push(AppRoute.notifications.path),
                  ),
                ),
                const SizedBox(width: 8),
                AppHeaderActionButton(
                  icon: ProfileIconography.chat,
                  tooltip: 'Chat hỗ trợ',
                  variant: AppHeaderActionVariant.bare,
                  onTap: () => context.push(AppRoute.chat.path),
                ),
              ],
            ),
          ),

          Positioned(
            left: 16,
            right: 16,
            top: topPadding + 62,
            height: profileCardHeight,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surfacePrimary.withValues(alpha: .97),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.brandPrimaryBorderLight),
                boxShadow: const [
                  BoxShadow(
                    color: AppColors.shadowBrandFaint,
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
                  final name = (rawName != null && rawName.isNotEmpty)
                      ? rawName
                      : (username != null && username.isNotEmpty)
                      ? username
                      : 'Member Default';
                  final avatarUrl = user?.avatarUrl;

                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 16,
                        ),
                        child: Row(
                          children: [
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  width: 64,
                                  height: 64,
                                  decoration: BoxDecoration(
                                    color: AppColors.brandPrimarySubtle,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppColors.brandPrimaryBorder,
                                    ),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child:
                                      avatarUrl != null && avatarUrl.isNotEmpty
                                      ? Image.network(
                                          avatarUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => const Icon(
                                            Icons.person_rounded,
                                            color: AppColors.contentMuted,
                                            size: 38,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.person_rounded,
                                          color: AppColors.contentMuted,
                                          size: 38,
                                        ),
                                ),
                                Positioned(
                                  right: -10,
                                  bottom: -8,
                                  child: Semantics(
                                    button: true,
                                    label: 'Đổi ảnh đại diện',
                                    child: InkResponse(
                                      onTap: () => context.push(
                                        AppRoute.profileEdit.path,
                                      ),
                                      radius: 24,
                                      child: SizedBox(
                                        width: 44,
                                        height: 44,
                                        child: Center(
                                          child: Container(
                                            width: 26,
                                            height: 26,
                                            decoration: BoxDecoration(
                                              color: AppColors.surfacePrimary,
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color: AppColors.borderWarm,
                                              ),
                                              boxShadow: const [
                                                BoxShadow(
                                                  color: AppColors.shadowMedium,
                                                  blurRadius: 6,
                                                  offset: Offset(0, 2),
                                                ),
                                              ],
                                            ),
                                            child: const Icon(
                                              Icons.photo_camera_rounded,
                                              size: 13,
                                              color: AppColors.contentSlate600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.h4(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.contentPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  InkWell(
                                    borderRadius: BorderRadius.circular(999),
                                    onTap: () =>
                                        context.push(AppRoute.profileEdit.path),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 11,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.surfaceBrandWarm,
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                        border: Border.all(
                                          color: AppColors.brandPrimaryBorder,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            ProfileIconography.edit,
                                            size: 14,
                                            color: AppColors.primary,
                                          ),
                                          const SizedBox(width: 6),
                                          Flexible(
                                            child: Text(
                                              'Chỉnh sửa hồ sơ',
                                              maxLines: 1,
                                              style: AppTypography.caption(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 3),
                                          const Icon(
                                            ProfileIconography.chevron,
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

  Widget _buildAdminSection(BuildContext context) {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.admin_panel_settings_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bảng điều khiển Admin',
                    style: AppTypography.h4(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain,
                    ),
                  ),
                  Text(
                    'Quyền Quản trị viên & Nhân viên',
                    style: AppTypography.caption(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: () => context.push(AppRoute.adminScan.path),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.brandPrimary, AppColors.brandPrimaryDark],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(
                    color: AppColors.shadowBrand,
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.white.withValues(alpha: 0.24),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.qr_code_scanner_rounded,
                      color: AppColors.surfacePrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Quét vé số OCR (Trang Admin)',
                          style: AppTypography.subtitle2(
                            color: AppColors.surfacePrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Kết nối Real-time với màn hình Web Admin',
                          style: AppTypography.caption(
                            color: AppColors.white.withValues(alpha: 0.70),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: AppColors.surfacePrimary,
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
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
              _buildSectionHeader(
                'Vé của tôi',
                actionLabel: 'Xem tất cả',
                onAction: () => context.push(AppRoute.myTickets.path),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildTicketStatItemIcon(
                    ProfileIconography.pendingTicket,
                    AppColors.ticketPendingForeground,
                    pending,
                    'Chờ quay',
                    onTap: () => context.push(AppRoute.myTickets.path),
                  ),
                  _buildVerticalDivider(),
                  _buildTicketStatItemIcon(
                    ProfileIconography.drawnTicket,
                    ProfileIconTone.drawn,
                    drawn,
                    'Đã quay',
                    onTap: () => context.push(AppRoute.myTickets.path),
                  ),
                  _buildVerticalDivider(),
                  _buildTicketStatItemIcon(
                    ProfileIconography.prize,
                    ProfileIconTone.prize,
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
            SizedBox(
              width: 46,
              height: 46,
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              count,
              style: AppTypography.h4(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTypography.caption(
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
    return Container(height: 42, width: 1, color: AppColors.borderDecorative);
  }

  Widget _buildMyAccountSection(BuildContext context) {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Quản lý tài khoản'),
          const SizedBox(height: 4),
          _buildListItem(
            ProfileIconography.identity,
            'Thông tin cá nhân',
            onTap: () {
              context.push(AppRoute.profileDetail.path);
            },
          ),
          _buildListItem(
            ProfileIconography.spending,
            'Tổng quan vé số',
            onTap: () => context.push(AppRoute.profileOverview.path),
          ),
          _buildListItem(
            ProfileIconography.ticket,
            'Vé của tôi',
            onTap: () => context.push(AppRoute.myTickets.path),
          ),
          _buildListItem(
            ProfileIconography.order,
            'Đơn hàng của tôi',
            onTap: () => context.push(AppRoute.myOrders.path),
          ),
          _buildListItem(
            ProfileIconography.refund,
            'Yêu cầu hoàn tiền',
            onTap: () => context.push(AppRoute.refunds.path),
          ),
          _buildListItem(
            ProfileIconography.prize,
            'Yêu cầu trả thưởng',
            onTap: () => context.push(AppRoute.prizePayouts.path),
          ),
          _buildListItem(
            ProfileIconography.bankAccount,
            'Tài khoản ngân hàng',
            onTap: () => context.push(AppRoute.bankAccounts.path),
            showDivider: false,
          ),
        ],
      ),
    );
  }

  Widget _buildUtilitiesSection(BuildContext context) {
    final showOcrScan = viewModel.user?.isAdmin == true;

    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Tiện ích của tôi'),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (showOcrScan) ...[
                  _buildUtilityItemIcon(
                    Icons.qr_code_scanner_rounded,
                    'Quét vé OCR',
                    onTap: () => context.push(AppRoute.adminScan.path),
                  ),
                  const SizedBox(width: 10),
                ],
                _buildUtilityItemIcon(
                  ProfileIconography.notifications,
                  'Thông báo',
                  onTap: () => context.push(AppRoute.notifications.path),
                ),
                const SizedBox(width: 10),
                _buildUtilityItemIcon(
                  Icons.auto_fix_high,
                  'Gieo quẻ',
                  onTap: () => context.push(AppRoute.fortune.path),
                ),
                const SizedBox(width: 10),
                _buildUtilityItemIcon(
                  Icons.calendar_month_outlined,
                  'Lịch mở thưởng',
                  onTap: () => context.push(AppRoute.schedule.path),
                ),
              ],
            ),
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
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 11),
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderDecorative),
          ),
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceBrandWarm,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.primary, size: 23),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 28,
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.caption(
                    fontSize: 11,
                    height: 1.25,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMain,
                  ),
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
          _buildSectionHeader('Cài đặt & hỗ trợ'),
          const SizedBox(height: 4),
          _buildListItem(
            ProfileIconography.notifications,
            'Cài đặt thông báo',
            onTap: () => context.push(AppRoute.notificationSettings.path),
          ),
          _buildListItem(
            Icons.security_outlined,
            'Bảo mật',
            onTap: () => context.pushNamed(AppRoute.security.name),
          ),
          _buildListItem(
            ProfileIconography.support,
            'Khiếu nại / Hỗ trợ',
            onTap: () => context.push(AppRoute.complaints.path),
          ),
          _buildListItem(
            Icons.logout,
            'Đăng xuất',
            iconColor: AppColors.contentDestructive,
            showDivider: false,
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
          minTileHeight: 52,
          dense: true,
          visualDensity: const VisualDensity(vertical: -1),
          contentPadding: EdgeInsets.zero,
          minLeadingWidth: 32,
          leading: SizedBox(
            width: 32,
            height: 32,
            child: Icon(icon, color: iconColor, size: 22),
          ),
          title: Text(
            title,
            style: AppTypography.bodySmall(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textMain,
            ),
          ),
          trailing: const Icon(
            ProfileIconography.chevron,
            color: AppColors.contentDisabled,
            size: 19,
          ),
          onTap: onTap ?? () {},
        ),
        if (showDivider)
          const Divider(
            height: 1,
            indent: 44,
            color: AppColors.borderDecorative,
          ),
      ],
    );
  }

  Widget _buildSectionHeader(
    String title, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: AppTypography.subtitle2(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
        ),
        if (actionLabel != null)
          InkWell(
            onTap: onAction,
            borderRadius: BorderRadius.circular(8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 44),
              child: Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      actionLabel,
                      style: AppTypography.caption(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 2),
                    const Icon(
                      ProfileIconography.chevron,
                      size: 18,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 14),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDecorative),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 14,
            spreadRadius: -4,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: child,
    );
  }
}

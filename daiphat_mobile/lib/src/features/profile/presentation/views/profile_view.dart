import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import '../viewmodels/profile_viewmodel.dart';

class ProfileView extends StatelessWidget {
  final ProfileViewModel viewModel;

  const ProfileView({super.key, required this.viewModel});

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
            body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FA),
          body: RefreshIndicator(
            onRefresh: () async {
              await viewModel.loadUser();
            },
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 30),
              child: Column(
                children: [
                  _buildHeaderAndProfileCard(context),
                  const SizedBox(height: 16),
                  _buildMyTicketsSection(),
                  const SizedBox(height: 16),
                  _buildMyAccountSection(context),
                  const SizedBox(height: 16),
                  _buildUtilitiesSection(),
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
      height: 220 + topPadding,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Background Image
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            child: Image.asset(
              'assets/images/home_bg.png',
              fit: BoxFit.cover,
            ),
          ),
          
          // AppBar
          Positioned(
            top: topPadding + 10,
            left: 0,
            right: 0,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(width: 48), // Balance for centering
                  Text(
                    'Tài khoản',
                    style: GoogleFonts.publicSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.settings_outlined, color: Colors.white),
                        onPressed: () {},
                      ),
                      IconButton(
                        icon: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Profile Card
          Positioned(
            left: 16,
            right: 16,
            top: topPadding + 80,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.95), // Slight transparency to blend
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: ListenableBuilder(
                listenable: viewModel,
                builder: (context, _) {
                  final user = viewModel.user;
                  final name = user?.fullName ?? user?.username ?? 'Đang tải...';
                  final phone = user?.phone ?? 'Chưa cập nhật';
                  final displayPhone = viewModel.showPhone 
                      ? phone 
                      : (phone.length > 6 ? '${phone.substring(0, 4)} *** ***' : '*** ***');

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Avatar
                      Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFEBEE),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.primary, width: 2),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty
                            ? Image.network(user.avatarUrl!, fit: BoxFit.cover)
                            : const Icon(Icons.person, color: AppColors.primary, size: 40),
                      ),
                      const SizedBox(width: 16),
                      
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: GoogleFonts.publicSans(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textMain,
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (phone.isNotEmpty && phone != 'Chưa cập nhật') ...[
                              Row(
                                children: [
                                  Text(
                                    displayPhone,
                                    style: GoogleFonts.publicSans(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textMain,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  GestureDetector(
                                    onTap: viewModel.togglePhoneVisibility,
                                    behavior: HitTestBehavior.opaque,
                                    child: Padding(
                                      padding: const EdgeInsets.all(8.0),
                                      child: Icon(
                                        viewModel.showPhone ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                        size: 18,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                            ],
                            GestureDetector(
                              onTap: () {
                                context.push(AppRoute.profileEdit.path);
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: AppColors.primary),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Chỉnh sửa hồ sơ',
                                      style: GoogleFonts.publicSans(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // Empty space to not overlap with Than Tai too much text
                      const SizedBox(width: 100), 
                    ],
                  );
                },
              ),
            ),
          ),

          // Than Tai Image - Positioned after card to overlap it
          Positioned(
            right: -25,
            top: topPadding + 85,
            height: 140,
            child: Image.asset(
              'assets/images/thantai.png',
              fit: BoxFit.fitHeight,
              alignment: Alignment.centerRight,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMyTicketsSection() {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Vé của tôi',
            style: GoogleFonts.publicSans(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildTicketStatItemAsset('assets/images/icons/icon_ve_cho_quay.png', const Color(0xFFFBC02D), '2', 'Chờ quay'),
              _buildVerticalDivider(),
              _buildTicketStatItemAsset('assets/images/icons/icon_ve_da_quay.png', const Color(0xFFE91E63), '12', 'Đã quay'),
              _buildVerticalDivider(),
              _buildTicketStatItemIcon(Icons.emoji_events_outlined, const Color(0xFFF57F17), '3', 'Trúng thưởng'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTicketStatItemIcon(IconData icon, Color color, String count, String label) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 32),
          ),
          const SizedBox(height: 8),
          Text(
            count,
            style: GoogleFonts.publicSans(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.publicSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketStatItemAsset(String assetPath, Color color, String count, String label) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Transform.scale(
              scale: 1.6,
              child: Image.asset(assetPath, width: 40, height: 40, fit: BoxFit.contain),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            count,
            style: GoogleFonts.publicSans(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textMain,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.publicSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerticalDivider() {
    return Container(
      height: 40,
      width: 1,
      color: Colors.grey[200],
    );
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
            Icons.person_outline, 
            'Thông tin cá nhân',
            onTap: () {
              context.push(AppRoute.profileDetail.path);
            },
          ),
          _buildListItem(Icons.star_outline, 'Số yêu thích'),
          _buildListItem(
            Icons.history,
            'Lịch sử mua vé',
            onTap: () => context.push(AppRoute.myOrders.path),
          ),
          _buildListItem(Icons.favorite_outline, 'Giới thiệu bạn bè', showDivider: false),
        ],
      ),
    );
  }

  Widget _buildUtilitiesSection() {
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
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildUtilityItemIcon(Icons.notifications_active_outlined, 'Thông báo'),
              _buildUtilityItemAsset('assets/images/icons/icon_tui_than_tai.png', 'Gieo quẻ'),
              _buildUtilityItemIcon(Icons.calendar_month_outlined, 'Lịch mở thưởng'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUtilityItemIcon(IconData icon, String label) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFFFFEBEE),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textMain,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUtilityItemAsset(String assetPath, String label) {
    return Expanded(
      child: Column(
        children: [
          Image.asset(assetPath, width: 50, height: 50),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textMain,
            ),
          ),
        ],
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
          _buildListItem(Icons.security_outlined, 'Bảo mật'),
          _buildListItem(Icons.help_outline, 'Trung tâm hỗ trợ'),
          _buildListItem(Icons.info_outline, 'Giới thiệu về Đại Phát'),
          _buildListItem(
            Icons.logout, 
            'Đăng xuất', 
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

  Widget _buildListItem(IconData icon, String title, {bool showDivider = true, VoidCallback? onTap}) {
    return Column(
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(icon, color: AppColors.primary, size: 22),
          title: Text(
            title,
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textMain,
            ),
          ),
          trailing: const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
          onTap: onTap ?? () {},
        ),
        if (showDivider)
          const Divider(height: 1, color: Color(0xFFEEEEEE)),
      ],
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}


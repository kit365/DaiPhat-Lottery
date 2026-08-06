import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';

class ProfileDetailView extends StatelessWidget {
  final ProfileViewModel viewModel;

  const ProfileDetailView({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: Stack(
        children: [
          // Top Background Image
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 300,
            child: Image.asset(
              'assets/images/home_bg.png',
              fit: BoxFit.cover,
            ),
          ),
          
          SafeArea(
            child: Column(
              children: [
                // Custom AppBar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                        child: IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new, size: 22, color: AppColors.primary),
                          onPressed: () => context.pop(),
                        ),
                      ),
                      Text(
                        'Thông tin cá nhân',
                        style: GoogleFonts.publicSans(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                        child: IconButton(
                          icon: const Icon(Icons.edit, size: 24, color: AppColors.primary),
                          onPressed: () => context.push(AppRoute.profileEdit.path),
                        ),
                      ),
                    ],
                  ),
                ),
                
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: ListenableBuilder(
          listenable: viewModel,
          builder: (context, _) {
            final user = viewModel.user;
            if (viewModel.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (user == null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                    const SizedBox(height: 16),
                    Text(
                      viewModel.errorMessage ?? 'Phiên đăng nhập hết hạn.',
                      style: GoogleFonts.publicSans(fontSize: 16, color: AppColors.textMain),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () async {
                        await viewModel.logout();
                        if (context.mounted) {
                          context.go(AppRoute.login.path);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                      ),
                      child: const Text('Đăng nhập lại', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );
            }

            return Column(
              children: [
                // Avatar
                Center(
                  child: Stack(
                    children: [
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.grey[200],
                          border: Border.all(color: Colors.white, width: 4),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 5),
                            )
                          ]
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: user.avatarUrl != null && user.avatarUrl!.isNotEmpty
                            ? Image.network(user.avatarUrl!, fit: BoxFit.cover)
                            : const Icon(Icons.person, size: 60, color: AppColors.textMuted),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.camera_alt, color: Colors.white, size: 22),
                        ),
                      )
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Info list
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      _buildInfoRow(Icons.person, 'Tên đăng nhập', user.username),
                      const Divider(height: 1, color: Color(0xFFF0F0F0), indent: 16, endIndent: 16),
                      _buildInfoRow(Icons.person, 'Họ và tên', user.fullName ?? 'Chưa cập nhật'),
                      const Divider(height: 1, color: Color(0xFFF0F0F0), indent: 16, endIndent: 16),
                      _buildInfoRow(Icons.phone, 'Số điện thoại', user.phone ?? 'Chưa cập nhật'),
                      const Divider(height: 1, color: Color(0xFFF0F0F0), indent: 16, endIndent: 16),
                      _buildInfoRow(Icons.email, 'Email', user.email ?? 'Chưa cập nhật'),
                      const Divider(height: 1, color: Color(0xFFF0F0F0), indent: 16, endIndent: 16),
                      _buildInfoRow(Icons.calendar_today, 'Ngày sinh', user.dob ?? 'Chưa cập nhật'),
                      const Divider(height: 1, color: Color(0xFFF0F0F0), indent: 16, endIndent: 16),
                      _buildInfoRow(Icons.transgender, 'Giới tính', user.gender ?? 'Chưa cập nhật'),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      context.push(AppRoute.profileEdit.path);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      'Chỉnh sửa hồ sơ',
                      style: GoogleFonts.publicSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
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
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 26, color: AppColors.primary.withValues(alpha: 0.8)),
          ),
          const SizedBox(width: 16),
          Text(
            label,
            style: GoogleFonts.publicSans(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.publicSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textMain,
              ),
            ),
          ),
        ],
      ),
    );
  }
}


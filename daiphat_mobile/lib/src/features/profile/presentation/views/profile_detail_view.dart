import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:go_router/go_router.dart';
import '../viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';

class ProfileDetailView extends StatelessWidget {
  final ProfileViewModel viewModel;

  const ProfileDetailView({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: Stack(
        children: [
          // Top Background Image
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 300,
            child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
          ),

          SafeArea(
            child: Column(
              children: [
                // Custom AppBar
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.surfacePrimary,
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new,
                            size: 22,
                            color: AppColors.primary,
                          ),
                          onPressed: () => context.pop(),
                        ),
                      ),
                      Text(
                        'Thông tin cá nhân',
                        style: AppTypography.h3(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.surfacePrimary,
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.edit,
                            size: 24,
                            color: AppColors.primary,
                          ),
                          onPressed: () {
                            context.push(AppRoute.profileEdit.path);
                          },
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: ListenableBuilder(
                        listenable: viewModel,
                        builder: (context, _) {
                          final user = viewModel.user;

                          if (user == null) {
                            return Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const SizedBox(height: 40),
                                  Text(
                                    viewModel.errorMessage ??
                                        'Phiên đăng nhập hết hạn.',
                                    style: AppTypography.bodyLarge(
                                      fontSize: 16,
                                      color: AppColors.textMain,
                                    ),
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
                                    child: Text(
                                      'Đăng nhập lại',
                                      style: AppTypography.buttonMedium(
                                        color: AppColors.surfacePrimary,
                                      ),
                                    ),
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
                                        color: AppColors.surfaceNeutral,
                                        border: Border.all(
                                          color: AppColors.surfacePrimary,
                                          width: 4,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppColors.primary.withValues(
                                              alpha: 0.1,
                                            ),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: ClipOval(
                                        child:
                                            user.avatarUrl != null &&
                                                user.avatarUrl!.isNotEmpty
                                            ? Image.network(
                                                user.avatarUrl!,
                                                fit: BoxFit.cover,
                                                errorBuilder:
                                                    (
                                                      context,
                                                      error,
                                                      stackTrace,
                                                    ) => const Icon(
                                                      Icons.person,
                                                      size: 60,
                                                      color: AppColors
                                                          .contentPlaceholder,
                                                    ),
                                              )
                                            : const Icon(
                                                Icons.person,
                                                size: 60,
                                                color: AppColors
                                                    .contentPlaceholder,
                                              ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 32),

                              // Info Container
                              Container(
                                decoration: BoxDecoration(
                                  color: AppColors.surfacePrimary,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: AppColors.shadowLight,
                                      blurRadius: 10,
                                      offset: Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    _buildInfoRow(
                                      ProfileIconography.identity,
                                      'Họ và tên',
                                      (user.fullName != null &&
                                              user.fullName!.isNotEmpty)
                                          ? user.fullName!
                                          : 'Chưa cập nhật',
                                    ),
                                    const Divider(
                                      height: 1,
                                      color: AppColors.borderLight,
                                    ),
                                    _buildInfoRow(
                                      Icons.phone_outlined,
                                      'Số điện thoại',
                                      (user.phone != null &&
                                              user.phone!.isNotEmpty)
                                          ? user.phone!
                                          : 'Chưa cập nhật',
                                    ),
                                    const Divider(
                                      height: 1,
                                      color: AppColors.borderLight,
                                    ),
                                    _buildInfoRow(
                                      Icons.email_outlined,
                                      'Email',
                                      (user.email != null &&
                                              user.email!.isNotEmpty)
                                          ? user.email!
                                          : 'Chưa cập nhật',
                                    ),
                                    const Divider(
                                      height: 1,
                                      color: AppColors.borderLight,
                                    ),
                                    _buildInfoRow(
                                      Icons.cake_outlined,
                                      'Ngày sinh',
                                      (user.dob != null && user.dob!.isNotEmpty)
                                          ? user.dob!
                                          : 'Chưa cập nhật',
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 32),

                              // Edit Button
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: () {
                                    context.push(AppRoute.profileEdit.path);
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 16,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: Text(
                                    'Chỉnh sửa hồ sơ',
                                    style: AppTypography.buttonLarge(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.surfacePrimary,
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
            child: Icon(
              icon,
              size: 26,
              color: AppColors.primary.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(width: 16),
          Text(
            label,
            style: AppTypography.bodyMedium(
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
              style: AppTypography.bodyMedium(
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

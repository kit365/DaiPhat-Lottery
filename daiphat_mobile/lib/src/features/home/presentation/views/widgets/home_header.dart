import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/profile_iconography.dart';

class HomeHeader extends StatelessWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;

  const HomeHeader({
    super.key,
    required this.loginViewModel,
    required this.notificationViewModel,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: loginViewModel,
      builder: (context, _) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              SizedBox(
                width: 46,
                height: 46,
                child: Transform.scale(
                  scale: 1.15,
                  child: Image.asset(
                    'assets/images/logoApp.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'ĐẠI PHÁT',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.h3(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primaryDark,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'XỔ SỐ - MAY MẮN - THỊNH VƯỢNG',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.overline(
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.goldDark,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              if (loginViewModel.isAuthenticated) ...[
                ListenableBuilder(
                  listenable: notificationViewModel,
                  builder: (context, _) => AppHeaderActionButton(
                    icon: ProfileIconography.notifications,
                    tooltip: 'Thông báo',
                    badgeCount: notificationViewModel.unreadCount,
                    variant: AppHeaderActionVariant.bare,
                    onTap: () => context.pushNamed(AppRoute.notifications.name),
                  ),
                ),
                const SizedBox(width: 8),
                Consumer(
                  builder: (context, ref, child) {
                    final cartItemCount = ref.watch(cartTicketCountProvider);
                    return AppHeaderActionButton(
                      icon: Icons.shopping_cart_outlined,
                      tooltip: 'Giỏ hàng',
                      badgeCount: cartItemCount,
                      variant: AppHeaderActionVariant.bare,
                      onTap: () => context.pushNamed(AppRoute.cart.name),
                    );
                  },
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

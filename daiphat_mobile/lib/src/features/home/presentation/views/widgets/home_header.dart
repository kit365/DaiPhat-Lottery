import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/views/chat_screen.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';

class HomeHeader extends StatelessWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;

  const HomeHeader({
    super.key,
    required this.loginViewModel,
    required this.notificationViewModel,
  });

  void _openChat(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChatScreen(
          isAuthenticated: loginViewModel.isAuthenticated,
          isActive: true,
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

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
                width: 52,
                height: 52,
                child: Transform.scale(
                  scale: 1.2,
                  child: Image.asset(
                    'assets/images/logoApp.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'ĐẠI PHÁT',
                    style: AppTypography.h3(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryDark,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'XỔ SỐ - MAY MẮN - THỊNH VƯỢNG',
                    style: AppTypography.overline(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: AppColors.goldDark,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              if (loginViewModel.isAuthenticated) ...[
                const SizedBox(width: 8),
                AppHeaderActionButton(
                  icon: Icons.chat_bubble_outline_rounded,
                  tooltip: 'Trò chuyện / Hỗ trợ',
                  onTap: () => _openChat(context),
                ),
                const SizedBox(width: 8),
                Consumer(
                  builder: (context, ref, child) {
                    final cartItemCount = ref.watch(cartTicketCountProvider);
                    return AppHeaderActionButton(
                      icon: Icons.shopping_cart_outlined,
                      tooltip: 'Giỏ hàng',
                      badgeCount: cartItemCount,
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

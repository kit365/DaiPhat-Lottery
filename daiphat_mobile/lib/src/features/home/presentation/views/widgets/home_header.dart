import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
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
                    style: AppTypography.display(
                      const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primaryDark,
                        height: 1.1,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'XỔ SỐ - MAY MẮN - THỊNH VƯỢNG',
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: AppColors.goldDark,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              if (loginViewModel.isAuthenticated) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _openChat(context),
                  child: _iconBtn(Icons.chat_bubble_outline_rounded),
                ),
                const SizedBox(width: 8),
                Consumer(
                  builder: (context, ref, child) {
                    final cartItemCount = ref.watch(cartTicketCountProvider);
                    return GestureDetector(
                      onTap: () => context.pushNamed(AppRoute.cart.name),
                      child: Stack(
                        children: [
                          _iconBtn(Icons.shopping_cart_outlined),
                          if (cartItemCount > 0)
                            Positioned(
                              right: 2,
                              top: 2,
                              child: Container(
                                constraints: const BoxConstraints(
                                  minWidth: 18,
                                  minHeight: 18,
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(color: Colors.white, width: 1.5),
                                ),
                                child: Center(
                                  child: Text(
                                    '$cartItemCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
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

  Widget _iconBtn(IconData icon) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .9),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Icon(icon, color: AppColors.primary, size: 22),
    );
  }
}

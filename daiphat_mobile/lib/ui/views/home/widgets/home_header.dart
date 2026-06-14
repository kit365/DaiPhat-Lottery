import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../viewmodels/login_viewmodel.dart';
import '../../../viewmodels/notification_viewmodel.dart';

class HomeHeader extends StatelessWidget {
  static const int _cartItemCount = 3;

  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;

  const HomeHeader({
    super.key,
    required this.loginViewModel,
    required this.notificationViewModel,
  });

  @override
  Widget build(BuildContext context) {
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
                style: GoogleFonts.barlow(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primaryDark,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'XỔ SỐ - MAY MẮN - THỊNH VƯỢNG',
                style: GoogleFonts.publicSans(
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
            GestureDetector(
              onTap: () => context.pushNamed(AppRoute.notifications.name),
              child: Stack(
                children: [
                  _iconBtn(Icons.notifications_outlined),
                  ListenableBuilder(
                    listenable: notificationViewModel,
                    builder: (context, _) {
                      if (notificationViewModel.unreadCount == 0) {
                        return const SizedBox.shrink();
                      }
                      return Positioned(
                        right: 6,
                        top: 6,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => context.pushNamed(AppRoute.cart.name),
            child: Stack(
              children: [
                _iconBtn(Icons.shopping_cart_outlined),
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
                        '$_cartItemCount',
                        style: TextStyle(
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
          ),
        ],
      ),
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

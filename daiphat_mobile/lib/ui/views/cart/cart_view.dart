import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';

class CartView extends StatelessWidget {
  const CartView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Giỏ hàng', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(100)),
            child: Row(
              children: [
                const Text('1.250.000đ', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                const SizedBox(width: 4),
                Icon(Icons.account_balance_wallet_outlined, color: AppColors.primary, size: 20),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Túi của bạn (2)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const Text('Xóa tất cả', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 16),
                _buildCartItem(
                  province: 'Kiên Giang',
                  time: '16:10 • Chủ nhật',
                  number: '853913',
                  quantity: 1,
                  price: '10.000 đ',
                ),
                const SizedBox(height: 16),
                _buildCartItem(
                  province: 'TP. Hồ Chí Minh',
                  time: '16:15 • Thứ hai',
                  number: '123456',
                  quantity: 1,
                  price: '10.000 đ',
                ),
                const SizedBox(height: 24),
                _buildBanner(),
              ],
            ),
          ),
          _buildBottomSection(context),
        ],
      ),
    );
  }

  Widget _buildCartItem({required String province, required String time, required String number, required int quantity, required String price}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE8E8)),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48, height: 48,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.background),
                child: const Icon(Icons.location_city, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(province, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(time, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.delete_outline, color: AppColors.textSecondary),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SỐ VÉ CHỌN', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                  Text(number, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryDark, letterSpacing: 2)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('x$quantity', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  Text(price, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBanner() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.primaryDark,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Nhận Lộc Đầu Năm!', style: TextStyle(color: AppColors.surface, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Nạp thêm 500k để nhận ngay lượt quay may mắn miễn phí.',
            style: TextStyle(color: AppColors.surface),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: AppColors.ink,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
            ),
            child: const Text('Nạp ngay'),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
      ),
      child: SafeArea(
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tổng cộng:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const Text('20.000 đ', style: TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.bold, fontSize: 24)),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  flex: 1,
                  child: OutlinedButton(
                    onPressed: () => context.pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primaryDark,
                      side: const BorderSide(color: AppColors.primaryDark),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Tiếp tục mua'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryDark,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Thanh toán ngay'),
                        SizedBox(width: 8),
                        Icon(Icons.payment),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

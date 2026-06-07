import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/home_viewmodel.dart';
import '../../../data/models/lottery_result.dart';

class HomeView extends ConsumerWidget {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeState = ref.watch(homeViewModelProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.monetization_on, color: AppColors.accent, size: 24),
            ),
            const SizedBox(width: 8),
            const Text('ĐẠI PHÁT', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(100),
            ),
            child: Row(
              children: [
                const Text('1.250.000đ', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                const SizedBox(width: 4),
                Icon(Icons.add_circle_outline, color: AppColors.primary, size: 20),
              ],
            ),
          ),
        ],
      ),
      body: homeState.when(
        data: (results) => _buildContent(context, results),
        loading: () => _buildSkeletonLoading(),
        error: (error, stack) => Center(child: Text('Lỗi: $error')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<LotteryResult> results) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        _buildBanner(context),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Dịch vụ phổ biến', style: Theme.of(context).textTheme.titleLarge),
            Text('Xem tất cả', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildServiceCard(context, 'Xổ số\nKIẾN THIẾT\n3 MIỀN', isPrimary: true)),
            const SizedBox(width: 16),
            Expanded(child: _buildServiceCard(context, 'Vietlott\nMEGA 6/45\nJackpot: 32 Tỷ', isPrimary: false)),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.emoji_events, color: AppColors.primary),
                const SizedBox(width: 8),
                Text('Kết quả mới nhất', style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            Row(
              children: [
                Icon(Icons.chevron_left, color: AppColors.textSecondary),
                Icon(Icons.chevron_right, color: AppColors.ink),
              ],
            )
          ],
        ),
        const SizedBox(height: 16),
        if (results.isNotEmpty) _buildResultCard(context, results.first),
      ],
    );
  }

  Widget _buildServiceCard(BuildContext context, String title, {required bool isPrimary}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isPrimary ? AppColors.primary : AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: isPrimary ? null : Border.all(color: AppColors.background, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isPrimary) const Icon(Icons.stars, color: AppColors.accent, size: 32),
          SizedBox(height: isPrimary ? 32 : 8),
          Text(
            title,
            style: TextStyle(
              color: isPrimary ? AppColors.surface : AppColors.ink,
              fontWeight: FontWeight.bold,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Icon(Icons.arrow_forward, color: isPrimary ? AppColors.surface : Colors.transparent),
        ],
      ),
    );
  }

  Widget _buildBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primaryDark, AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        image: const DecorationImage(
          image: NetworkImage('https://via.placeholder.com/400x200?text=Banner+Tet'), // Fallback placeholder
          fit: BoxFit.cover,
          opacity: 0.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(4)),
            child: const Text('ƯU ĐÃI MỚI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 8),
          Text(
            'Săn Lộc Vàng - Trúng Lớn\nCùng Đại Phát',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: AppColors.surface, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Nạp tiền nhận ngay voucher 20%',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.surface),
          ),
        ],
      ),
    );
  }

  Widget _buildResultCard(BuildContext context, LotteryResult result) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFFDE8E8), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(result.province, style: Theme.of(context).textTheme.titleMedium),
                    Text(result.date, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFFDE8E8), borderRadius: BorderRadius.circular(4)),
                  child: const Text('ĐẶC BIỆT', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: result.specialPrize.split('').map((digit) => _buildNumberCircle(digit)).toList(),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('GIẢI NHẤT', style: TextStyle(color: AppColors.textSecondary)),
                Text('99312', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(height: 24, color: Color(0xFFFDE8E8)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('GIẢI NHÌ', style: TextStyle(color: AppColors.textSecondary)),
                Text('45102', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: Color(0xFFFDE8E8)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Chi tiết bảng kết quả'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNumberCircle(String digit) {
    return Container(
      width: 40,
      height: 40,
      decoration: const BoxDecoration(
        color: AppColors.primaryDark,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(digit, style: const TextStyle(color: AppColors.surface, fontSize: 20, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildSkeletonLoading() {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Container(
            height: 160,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 24),
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Container(height: 24, width: 150, color: Colors.white),
        ),
        const SizedBox(height: 16),
        ...List.generate(3, (index) => Padding(
          padding: const EdgeInsets.only(bottom: 16.0),
          child: Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Container(
              height: 100,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
            ),
          ),
        )),
      ],
    );
  }
}

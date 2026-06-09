import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/buy_ticket_viewmodel.dart';
import 'package:intl/intl.dart';

class BuyTicketView extends ConsumerWidget {
  const BuyTicketView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(buyTicketViewModelProvider);
    final viewModel = ref.read(buyTicketViewModelProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mua vé số', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
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
                _buildBreadcrumb(context),
                const SizedBox(height: 16),
                _buildStep(context, '1', 'Chọn ngày mở thưởng', [
                  _buildOptionCard(
                    title: 'Hôm nay',
                    subtitle: '09/02/2025 (Chủ nhật)',
                    isSelected: state.selectedDate == 'Hôm nay',
                    onTap: () => viewModel.selectDate('Hôm nay', '09/02/2025 (Chủ nhật)'),
                  ),
                  _buildOptionCard(
                    title: 'Ngày mai',
                    subtitle: '10/02/2025 (Thứ hai)',
                    isSelected: state.selectedDate == 'Ngày mai',
                    onTap: () => viewModel.selectDate('Ngày mai', '10/02/2025 (Thứ hai)'),
                  ),
                ]),
                const SizedBox(height: 16),
                _buildStep(context, '2', 'Chọn đài mở thưởng', [
                  _buildOptionCard(
                    title: 'TP. Hồ Chí Minh',
                    subtitle: '16:15 • Hôm nay',
                    isSelected: state.selectedProvince == 'TP. Hồ Chí Minh',
                    icon: Icons.location_city,
                    onTap: () => viewModel.selectProvince('TP. Hồ Chí Minh', '16:15 • Hôm nay'),
                  ),
                  _buildOptionCard(
                    title: 'Đồng Nai',
                    subtitle: '16:20 • Hôm nay',
                    isSelected: state.selectedProvince == 'Đồng Nai',
                    icon: Icons.map,
                    onTap: () => viewModel.selectProvince('Đồng Nai', '16:20 • Hôm nay'),
                  ),
                ]),
                const SizedBox(height: 16),
                _buildNumberSelection(context, ref, state, viewModel),
              ],
            ),
          ),
          _buildBottomSection(context, state, viewModel),
        ],
      ),
    );
  }

  Widget _buildBreadcrumb(BuildContext context) {
    return Row(
      children: [
        const Text('Trang chủ', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        const Icon(Icons.chevron_right, size: 16, color: AppColors.textSecondary),
        const Text('Mua vé số', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildStep(BuildContext context, String step, String title, List<Widget> options) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE8E8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24, height: 24,
                decoration: const BoxDecoration(color: AppColors.primaryDark, shape: BoxShape.circle),
                child: Center(child: Text(step, style: const TextStyle(color: AppColors.surface, fontWeight: FontWeight.bold))),
              ),
              const SizedBox(width: 8),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 16),
          Row(children: options.map((e) => Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: e))).toList()),
        ],
      ),
    );
  }

  Widget _buildOptionCard({required String title, required String subtitle, required bool isSelected, IconData? icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB), width: isSelected ? 2 : 1),
        ),
        child: Column(
          children: [
            if (icon != null) Icon(icon, color: isSelected ? AppColors.primary : AppColors.textSecondary),
            if (icon != null) const SizedBox(height: 8),
            Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.ink)),
            Text(subtitle, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildNumberSelection(BuildContext context, WidgetRef ref, BuyTicketState state, BuyTicketViewModel viewModel) {
    final numbers = [
      {'num': '853911', 'left': 'Còn 12 vé'},
      {'num': '122456', 'left': 'Còn 05 vé'},
      {'num': '456789', 'left': 'Còn 08 vé'},
      {'num': '777888', 'left': 'Còn 02 vé'},
      {'num': '000000', 'left': 'Còn 15 vé'},
      {'num': '111111', 'left': 'Còn 10 vé'},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE8E8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24, height: 24,
                decoration: const BoxDecoration(color: AppColors.primaryDark, shape: BoxShape.circle),
                child: const Center(child: Text('3', style: TextStyle(color: AppColors.surface, fontWeight: FontWeight.bold))),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: Theme.of(context).textTheme.titleMedium,
                    children: [
                      const TextSpan(text: 'Chọn số • '),
                      TextSpan(
                        text: '${state.selectedProvince} • ${state.provinceDetail.split(' • ')[0]}',
                        style: const TextStyle(color: AppColors.primary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            decoration: InputDecoration(
              hintText: 'Tìm số (VD: 12345)',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: AppColors.primaryDark, borderRadius: BorderRadius.circular(8)),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text('Tìm ngay', style: TextStyle(color: AppColors.surface, fontWeight: FontWeight.bold)),
                ),
              ),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
            ),
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 2.5,
            ),
            itemCount: numbers.length,
            itemBuilder: (context, index) {
              final item = numbers[index];
              final String numberStr = item['num']!;
              final bool isSelected = state.selectedNumber == numberStr;
              return GestureDetector(
                onTap: () => viewModel.selectNumber(numberStr),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB)),
                    color: isSelected ? const Color(0xFFFEF2F2) : AppColors.surface,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(numberStr, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2, color: isSelected ? AppColors.primary : AppColors.ink)),
                      Text(isSelected ? 'Đã chọn' : item['left']!, style: TextStyle(fontSize: 10, color: isSelected ? AppColors.primary : AppColors.textSecondary)),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBottomSection(BuildContext context, BuyTicketState state, BuyTicketViewModel viewModel) {
    final NumberFormat currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    final int ticketPrice = 10000;
    final int totalAmount = state.selectedNumber != null ? ticketPrice * state.quantity : 0;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.primaryDark,
            child: Row(
              children: [
                const Icon(Icons.receipt_long, color: AppColors.surface),
                const SizedBox(width: 8),
                const Text('Chi tiết vé', style: TextStyle(color: AppColors.surface, fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                const Icon(Icons.keyboard_arrow_up, color: AppColors.surface),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                if (state.selectedNumber != null) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.location_city, color: AppColors.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Vé số ${state.selectedProvince}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('Mở thưởng: ${state.provinceDetail.split(' • ')[0]} • ${state.dateDetail}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('SỐ ĐÃ CHỌN', style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                      GestureDetector(
                        onTap: () => viewModel.clearSelection(),
                        child: const Text('Xóa tất cả', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(state.selectedNumber!, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primaryDark, letterSpacing: 2)),
                      const Spacer(),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          children: [
                            InkWell(onTap: () => viewModel.updateQuantity(-1), child: const Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4), child: Icon(Icons.remove, size: 16))),
                            Text('${state.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            InkWell(onTap: () => viewModel.updateQuantity(1), child: const Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4), child: Icon(Icons.add, size: 16))),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(currencyFormat.format(ticketPrice), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
                    ],
                  ),
                  const Divider(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Tổng số lượng vé:', style: TextStyle(color: AppColors.textSecondary)),
                      Text('${state.quantity.toString().padLeft(2, '0')} vé', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Thành tiền (10k/vé):', style: TextStyle(color: AppColors.textSecondary)),
                      Text(currencyFormat.format(totalAmount), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                ] else ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: Text('Vui lòng chọn số vé để mua', style: TextStyle(color: AppColors.textSecondary))),
                  ),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Tổng thanh toán', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(currencyFormat.format(totalAmount), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 20)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: state.selectedNumber != null ? () {} : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryDark,
                          disabledBackgroundColor: AppColors.primaryDark.withValues(alpha: 0.5),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Text('MUA NGAY'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: state.selectedNumber != null ? () => context.push('/cart') : null,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primaryDark,
                          side: BorderSide(color: state.selectedNumber != null ? AppColors.primaryDark : AppColors.textSecondary),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.shopping_cart_outlined),
                            SizedBox(width: 8),
                            Text('THÊM VÀO GIỎ HÀNG'),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/cart/providers/cart_provider.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class CheckoutView extends StatefulWidget {
  const CheckoutView({super.key});

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  int _selectedDeliveryIndex = 0;
  int _selectedPaymentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F8),
      appBar: AppBar(
        title: const Text(
          'Checkout',
          style: TextStyle(
            color: Color(0xFF15213B),
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF15213B),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
              children: [
                const _CheckoutSectionTitle('THONG TIN NHAN VE', italic: false),
                const SizedBox(height: 12),
                const _CheckoutUserCard(),
                const SizedBox(height: 28),
                const _CheckoutSectionTitle('Phuong thuc nhan ve'),
                const SizedBox(height: 12),
                _CheckoutDeliveryCard(
                  selectedIndex: _selectedDeliveryIndex,
                  onSelected: (index) {
                    setState(() {
                      _selectedDeliveryIndex = index;
                    });
                  },
                ),
                const SizedBox(height: 28),
                const _CheckoutSectionTitle('Phuong thuc thanh toan'),
                const SizedBox(height: 12),
                _CheckoutPaymentCard(
                  selectedIndex: _selectedPaymentIndex,
                  onSelected: (index) {
                    setState(() {
                      _selectedPaymentIndex = index;
                    });
                  },
                ),
                const SizedBox(height: 28),
                const _CheckoutSectionTitle('Tom tat don hang'),
                const SizedBox(height: 12),
                const _CheckoutSummaryCard(),
                const SizedBox(height: 18),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.verified_user_rounded,
                      color: Color(0xFF22C55E),
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Giao dich duoc bao mat va ma hoa an toan',
                      style: TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFF1F3F5))),
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF12016),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Xac nhan thanh toan',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckoutSectionTitle extends StatelessWidget {
  final String text;
  final bool italic;

  const _CheckoutSectionTitle(this.text, {this.italic = true});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        color: const Color(0xFF6B7280),
        fontSize: italic ? 18 : 16,
        fontWeight: FontWeight.w800,
        fontStyle: italic ? FontStyle.italic : FontStyle.normal,
      ),
    );
  }
}

class _CheckoutUserCard extends StatelessWidget {
  const _CheckoutUserCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: const Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Color(0xFFF3F4F6),
            child: Icon(Icons.person, color: Color(0xFF9CA3AF), size: 30),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nguyen Van An',
                  style: TextStyle(
                    color: Color(0xFF15213B),
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  '0901 234 567',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 28),
        ],
      ),
    );
  }
}

class _CheckoutDeliveryCard extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _CheckoutDeliveryCard({
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _SelectionTile(
            title: 'Ve dien tu (khuyen khich)',
            subtitle: 'Nhan ve nhanh qua ung dung',
            leadingIcon: Icons.smartphone_rounded,
            selected: selectedIndex == 0,
            titleColor: selectedIndex == 0 ? const Color(0xFFF12016) : null,
            onTap: () => onSelected(0),
          ),
          const Divider(height: 1, color: Color(0xFFF1F3F5)),
          _SelectionTile(
            title: 'Ve giay - Giao tan tay',
            subtitle: 'Giao ve den dia chi cua ban',
            leadingIcon: Icons.local_shipping_outlined,
            selected: selectedIndex == 1,
            titleColor: selectedIndex == 1 ? const Color(0xFFF12016) : null,
            onTap: () => onSelected(1),
          ),
        ],
      ),
    );
  }
}

class _CheckoutPaymentCard extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _CheckoutPaymentCard({
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _PaymentTile(
            title: 'Vi MoMo',
            subtitle: 'So du: 1.250.000d',
            leadingLabel: 'Mo',
            selected: selectedIndex == 0,
            onTap: () => onSelected(0),
          ),
          const Divider(height: 1, color: Color(0xFFF1F3F5)),
          _PaymentTile(
            title: 'The ngan hang',
            subtitle: 'Visa, MasterCard, JCB...',
            leadingLabel: 'V1',
            selected: selectedIndex == 1,
            onTap: () => onSelected(1),
          ),
          const Divider(height: 1, color: Color(0xFFF1F3F5)),
          _PaymentTile(
            title: 'Chuyen khoan ngan hang',
            subtitle: 'Noi dung chuyen khoan tu dong',
            leadingLabel: 'CK',
            selected: selectedIndex == 2,
            onTap: () => onSelected(2),
          ),
        ],
      ),
    );
  }
}

class _CheckoutSummaryCard extends ConsumerWidget {
  const _CheckoutSummaryCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartTicketCount = ref.watch(cartTicketCountProvider);
    final cartSubtotal = ref.watch(cartSubtotalProvider);
    final cartTotal = ref.watch(cartTotalProvider);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _summaryRow('So luong ve', '$cartTicketCount ve'),
          const SizedBox(height: 16),
          _summaryRow('Tam tinh', _money(cartSubtotal)),
          const SizedBox(height: 16),
          _summaryRow('Phi xu ly', _money(cartHandlingFee)),
          const Divider(height: 28, color: Color(0xFFF1F3F5)),
          _summaryRow('Tong cong', _money(cartTotal), highlight: true),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool highlight = false}) {
    return Row(
      children: [
        Text(
          label,
          style: TextStyle(
            color: const Color(0xFF374151),
            fontSize: highlight ? 18 : 16,
            fontWeight: highlight ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            color: highlight
                ? const Color(0xFFF12016)
                : const Color(0xFF111827),
            fontSize: highlight ? 18 : 16,
            fontWeight: highlight ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _SelectionTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData leadingIcon;
  final bool selected;
  final Color? titleColor;
  final VoidCallback onTap;

  const _SelectionTile({
    required this.title,
    required this.subtitle,
    required this.leadingIcon,
    required this.onTap,
    this.selected = false,
    this.titleColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFFFF1F1) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected
                      ? const Color(0xFFF8B4B4)
                      : const Color(0xFFE5E7EB),
                ),
              ),
              child: Icon(
                leadingIcon,
                color: selected
                    ? const Color(0xFFF12016)
                    : const Color(0xFFD1D5DB),
                size: 26,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: titleColor ?? const Color(0xFF15213B),
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            _radio(selected),
          ],
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final String leadingLabel;
  final bool selected;
  final VoidCallback onTap;

  const _PaymentTile({
    required this.title,
    required this.subtitle,
    required this.leadingLabel,
    required this.onTap,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFFFF7F7) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected
                      ? const Color(0xFFF8B4B4)
                      : const Color(0xFFE5E7EB),
                ),
              ),
              child: Center(
                child: Text(
                  leadingLabel,
                  style: TextStyle(
                    color: selected
                        ? AppColors.primary
                        : const Color(0xFF2563EB),
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: selected
                          ? AppColors.primary
                          : const Color(0xFF15213B),
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Color(0xFF9CA3AF),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            _radio(selected),
          ],
        ),
      ),
    );
  }
}

Widget _radio(bool selected) {
  return AnimatedContainer(
    duration: const Duration(milliseconds: 180),
    width: 28,
    height: 28,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: selected ? const Color(0xFFF12016) : Colors.white,
      border: Border.all(
        color: selected ? const Color(0xFFF12016) : const Color(0xFFD1D5DB),
        width: 1.5,
      ),
    ),
    child: selected
        ? const Icon(Icons.check, color: Colors.white, size: 18)
        : null,
  );
}

BoxDecoration _cardDecoration() {
  return BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: const Color(0xFFF1F3F5)),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.03),
        blurRadius: 10,
        offset: const Offset(0, 4),
      ),
    ],
  );
}

String _money(int amount) {
  final value = amount.toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]}.',
  );
  return '${value}d';
}


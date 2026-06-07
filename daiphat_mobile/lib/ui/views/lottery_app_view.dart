import 'package:flutter/material.dart';

const _red = Color(0xFFE90000);
const _softRed = Color(0xFFFFF0F0);
const _ink = Color(0xFF181818);
const _muted = Color(0xFF757575);

class LotteryTicket {
  final String province;
  final String drawTime;
  final String date;
  final String number;
  final int price;
  final bool paid;

  const LotteryTicket({
    required this.province,
    required this.drawTime,
    required this.date,
    required this.number,
    required this.price,
    this.paid = false,
  });
}

class AppNotification {
  final String title;
  final String description;
  final String time;
  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final bool unread;

  const AppNotification({
    required this.title,
    required this.description,
    required this.time,
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    this.unread = false,
  });

  AppNotification copyWith({
    String? title,
    String? description,
    String? time,
    IconData? icon,
    Color? iconColor,
    Color? iconBackground,
    bool? unread,
  }) {
    return AppNotification(
      title: title ?? this.title,
      description: description ?? this.description,
      time: time ?? this.time,
      icon: icon ?? this.icon,
      iconColor: iconColor ?? this.iconColor,
      iconBackground: iconBackground ?? this.iconBackground,
      unread: unread ?? this.unread,
    );
  }
}

const _tickets = [
  LotteryTicket(
    province: 'Kiên Giang',
    drawTime: '16:10 - Chủ nhật',
    date: '24/05/2024',
    number: '853913',
    price: 10000,
  ),
  LotteryTicket(
    province: 'TP. Hồ Chí Minh',
    drawTime: '16:15 - Thứ hai',
    date: '24/05/2024',
    number: '123456',
    price: 10000,
  ),
  LotteryTicket(
    province: 'Đồng Nai',
    drawTime: '16:20 - Thứ hai',
    date: '24/05/2024',
    number: '345678',
    price: 10000,
  ),
  LotteryTicket(
    province: 'Cần Thơ',
    drawTime: '16:30 - Thứ hai',
    date: '24/05/2024',
    number: '789012',
    price: 10000,
  ),
];

const _notifications = [
  AppNotification(
    title: 'Kết quả xổ số TP. Hồ Chí Minh đã có',
    description: 'Vé 123456 của bạn đã có kết quả. Nhấn để xem chi tiết.',
    time: '2 phút trước',
    icon: Icons.emoji_events_outlined,
    iconColor: _red,
    iconBackground: Color(0xFFFFF1F1),
    unread: true,
  ),
  AppNotification(
    title: 'Nhắc giờ mở thưởng',
    description: 'Kỳ quay TP. Hồ Chí Minh sẽ bắt đầu lúc 16:15.',
    time: '10 phút trước',
    icon: Icons.alarm,
    iconColor: _red,
    iconBackground: Color(0xFFFFF1F1),
    unread: true,
  ),
  AppNotification(
    title: 'Đơn hàng đã thanh toán',
    description: 'Đơn hàng DP24052400123 đã thanh toán thành công.',
    time: 'Hôm nay, 09:30',
    icon: Icons.receipt_long_outlined,
    iconColor: Color(0xFF32A852),
    iconBackground: Color(0xFFEFFAF2),
  ),
  AppNotification(
    title: 'Ưu đãi mua vé',
    description: 'Nhập mã MAYMAN để nhận ưu đãi.',
    time: 'Hôm qua',
    icon: Icons.card_giftcard_outlined,
    iconColor: Color(0xFFFF8A00),
    iconBackground: Color(0xFFFFF4E8),
  ),
  AppNotification(
    title: 'Thanh toán thành công',
    description: 'Giao dịch 300.000đ đã được thanh toán thành công.',
    time: '23/05/2024, 14:20',
    icon: Icons.account_balance_wallet_outlined,
    iconColor: Color(0xFF2892FF),
    iconBackground: Color(0xFFEDF5FF),
  ),
];

class LotteryAppView extends StatefulWidget {
  const LotteryAppView({super.key});

  @override
  State<LotteryAppView> createState() => _LotteryAppViewState();
}

class _LotteryAppViewState extends State<LotteryAppView> {
  int _index = 0;

  void _openTab(int index) => setState(() => _index = index);

  void _openNotifications() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => NotificationScreen(
          currentIndex: _index,
          onSelectTab: (index) {
            Navigator.of(context).pop();
            _openTab(index);
          },
        ),
      ),
    );
  }

  void _openTicket(LotteryTicket ticket) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TicketDetailScreen(
          ticket: ticket,
          onOpenCart: () {
            Navigator.of(context).pop();
            _openTab(3);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        onTabSelected: _openTab,
        onOpenResults: () => _openTab(2),
        onOpenNotifications: _openNotifications,
      ),
      TicketListScreen(
        onTicketTap: _openTicket,
        onOpenCart: () => _openTab(3),
        onBack: () => _openTab(0),
      ),
      ResultListScreen(onBack: () => _openTab(0)),
      CartScreen(onContinueBuying: () => _openTab(1)),
      const AccountScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 10,
        height: 70,
        selectedIndex: _index,
        onDestinationSelected: _openTab,
        indicatorColor: _softRed,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: _red),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront, color: _red),
            label: 'Mua vé số',
          ),
          NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined),
            selectedIcon: Icon(Icons.confirmation_number, color: _red),
            label: 'Dò vé',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('4'),
              child: Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              label: Text('4'),
              child: Icon(Icons.shopping_cart, color: _red),
            ),
            label: 'Giỏ hàng',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: _red),
            label: 'Tài khoản',
          ),
        ],
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  final ValueChanged<int> onTabSelected;
  final VoidCallback onOpenResults;
  final VoidCallback onOpenNotifications;

  const HomeScreen({
    super.key,
    required this.onTabSelected,
    required this.onOpenResults,
    required this.onOpenNotifications,
  });

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
        children: [
          Row(
            children: [
              const BrandMark(size: 46),
              const SizedBox(width: 10),
              const Expanded(child: BrandText()),
              IconButton(
                tooltip: 'Thông báo',
                onPressed: onOpenNotifications,
                icon: const Icon(Icons.notifications_none),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            constraints: const BoxConstraints(minHeight: 172),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              boxShadow: _shadow,
            ),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.network(
                    'https://i.ibb.co/FbsnQfjR/28d77182-45b0-40bf-9aaf-58136bc87741.png',
                    fit: BoxFit.cover,
                    alignment: Alignment.centerRight,
                    errorBuilder: (_, _, _) => const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFFE00000), Color(0xFFFF7A00)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          _red,
                          _red.withValues(alpha: .88),
                          _red.withValues(alpha: .08),
                        ],
                        stops: const [.0, .48, 1],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'MUA VÉ SỐ ONLINE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'SĂN LỘC VÀNG\nTRÚNG LỚN',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          height: 1.1,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 10),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFFFD13B),
                          foregroundColor: _red,
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          visualDensity: VisualDensity.compact,
                        ),
                        onPressed: () => onTabSelected(1),
                        child: const Text('Mua vé ngay'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ActionGrid(onTabSelected: onTabSelected),
          const SizedBox(height: 14),
          ResultHomeCard(onOpenAll: onOpenResults),
          const SizedBox(height: 14),
          LuckyNumbersCard(),
        ],
      ),
    );
  }
}

class ActionGrid extends StatelessWidget {
  final ValueChanged<int> onTabSelected;

  const ActionGrid({super.key, required this.onTabSelected});

  @override
  Widget build(BuildContext context) {
    final items = [
      _ActionItem(Icons.today_outlined, 'Mua vé số', () => onTabSelected(1)),
      _ActionItem(Icons.bar_chart, 'Kết quả', () => onTabSelected(2)),
      _ActionItem(
        Icons.confirmation_number_outlined,
        'Vé của tôi',
        () => onTabSelected(2),
      ),
      _ActionItem(Icons.calendar_month_outlined, 'Lịch mở thưởng', () {}),
      _ActionItem(Icons.store_outlined, 'Đại lý', () {}),
      _ActionItem(Icons.help_outline, 'Hướng dẫn', () {}),
      _ActionItem(Icons.card_giftcard, 'Ưu đãi', () {}),
      _ActionItem(Icons.support_agent, 'Hỗ trợ', () {}),
    ];

    return Surface(
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          mainAxisExtent: 76,
        ),
        itemBuilder: (context, index) {
          final item = items[index];
          return InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: item.onTap,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: _softRed,
                  child: Icon(item.icon, color: _red, size: 20),
                ),
                const SizedBox(height: 8),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ActionItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionItem(this.icon, this.label, this.onTap);
}

class TicketListScreen extends StatelessWidget {
  final ValueChanged<LotteryTicket> onTicketTap;
  final VoidCallback onOpenCart;
  final VoidCallback onBack;

  const TicketListScreen({
    super.key,
    required this.onTicketTap,
    required this.onOpenCart,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(
        title: const Text('Vé của tôi'),
        leading: IconButton(
          tooltip: 'Quay lại',
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: onBack,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
              children: [
                const SegmentedTabs(),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: FilterChipLike(
                        icon: Icons.calendar_today_outlined,
                        label: '24/05/2024',
                      ),
                    ),
                    const SizedBox(width: 10),
                    const FilterChipLike(icon: Icons.tune, label: 'Bộ lọc'),
                  ],
                ),
                const SizedBox(height: 16),
                const ProvinceChips(),
                const SizedBox(height: 12),
                for (final ticket in _tickets) ...[
                  TicketCard(ticket: ticket, onTap: () => onTicketTap(ticket)),
                  const SizedBox(height: 12),
                ],
              ],
            ),
          ),
          TotalCheckoutBar(
            buttonText: 'Xem giỏ hàng (4)',
            onPressed: onOpenCart,
          ),
        ],
      ),
    );
  }
}

class ResultListScreen extends StatelessWidget {
  final VoidCallback onBack;

  const ResultListScreen({super.key, required this.onBack});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Quay lại',
                icon: const Icon(Icons.arrow_back, size: 24),
                onPressed: onBack,
              ),
              const Expanded(
                child: Column(
                  children: [
                    Text(
                      'Kết quả xổ số',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Xem đầy đủ kết quả theo ngày và khu vực',
                      style: TextStyle(color: _muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Chia sẻ',
                icon: const Icon(Icons.share_outlined),
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Row(
            children: [
              Expanded(
                child: FilterChipLike(
                  icon: Icons.calendar_today_outlined,
                  label: '24/05/2024',
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: FilterChipLike(
                  icon: Icons.location_on_outlined,
                  label: 'Tất cả khu vực',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const ResultTypeTabs(),
          const SizedBox(height: 12),
          const DrawStatusLine(),
          const SizedBox(height: 14),
          const LotteryRegionTable(title: 'Miền Nam', columns: _southColumns),
          const SizedBox(height: 12),
          const LotoSection(compact: false),
        ],
      ),
    );
  }
}

class TicketDetailScreen extends StatelessWidget {
  final LotteryTicket ticket;
  final VoidCallback onOpenCart;

  const TicketDetailScreen({
    super.key,
    required this.ticket,
    required this.onOpenCart,
  });

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(
        title: const Text('Chi tiết vé'),
        leading: IconButton(
          tooltip: 'Quay lại',
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(18),
              children: [
                Surface(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const TicketLogo(),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ticket.province,
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Thứ hai, ${ticket.date}',
                                  style: const TextStyle(color: _muted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Text(
                            ticket.number,
                            style: const TextStyle(
                              color: _red,
                              fontSize: 30,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const Spacer(),
                          const Text(
                            'x 1 vé',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Align(
                        alignment: Alignment.centerRight,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: const Color(0xFFE3FFF7),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            child: Text(
                              'Chưa thanh toán',
                              style: TextStyle(
                                color: Color(0xFF009B77),
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const SectionTitle('Thông tin vé'),
                Surface(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      InfoRow('Ngày mở thưởng', ticket.date),
                      const InfoRow('Thứ', 'Thứ hai'),
                      InfoRow('Giá vé', money(ticket.price)),
                      const InfoRow('Số lượng', '1 vé'),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                const SectionTitle('Kết quả'),
                const ResultDots(),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _red,
                      side: const BorderSide(color: _red),
                      minimumSize: const Size.fromHeight(52),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Xóa vé'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: _red,
                      minimumSize: const Size.fromHeight(52),
                    ),
                    onPressed: onOpenCart,
                    child: const Text('Thanh toán ngay'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CartScreen extends StatelessWidget {
  final VoidCallback onContinueBuying;

  const CartScreen({super.key, required this.onContinueBuying});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(
        title: const Text('Giỏ hàng (4)'),
        leading: IconButton(
          tooltip: 'Quay lại',
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: onContinueBuying,
        ),
        actions: [
          TextButton(
            onPressed: () {},
            child: const Text('Sửa', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      child: Column(
        children: [
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(18),
              itemCount: _tickets.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) => TicketCard(
                ticket: _tickets[index],
                dense: true,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => TicketDetailScreen(
                        ticket: _tickets[index],
                        onOpenCart: () => Navigator.of(context).pop(),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          TotalCheckoutBar(
            buttonText: 'Thanh toán',
            secondaryText: 'Tiếp tục mua',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Đã tạo yêu cầu thanh toán')),
              );
            },
            onSecondaryPressed: onContinueBuying,
          ),
        ],
      ),
    );
  }
}

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScaffold(
      child: Center(
        child: Text(
          'Tài khoản',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
        ),
      ),
    );
  }
}

class NotificationScreen extends StatefulWidget {
  final int currentIndex;
  final ValueChanged<int> onSelectTab;

  const NotificationScreen({
    super.key,
    required this.currentIndex,
    required this.onSelectTab,
  });

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  late List<AppNotification> _items;
  bool _selectionMode = false;
  final Set<int> _selectedIndexes = <int>{};

  @override
  void initState() {
    super.initState();
    _items = List<AppNotification>.from(_notifications);
  }

  void _markAllAsRead() {
    setState(() {
      _items = [for (final item in _items) item.copyWith(unread: false)];
      _selectionMode = false;
      _selectedIndexes.clear();
    });
  }

  void _handleDeleteAction() {
    if (!_selectionMode) {
      setState(() {
        _selectionMode = true;
      });
      return;
    }

    if (_selectedIndexes.isEmpty) {
      return;
    }

    setState(() {
      _items = [
        for (var i = 0; i < _items.length; i++)
          if (!_selectedIndexes.contains(i)) _items[i],
      ];
      _selectionMode = false;
      _selectedIndexes.clear();
    });
  }

  void _toggleSelection(int index) {
    if (!_selectionMode) {
      return;
    }

    setState(() {
      if (_selectedIndexes.contains(index)) {
        _selectedIndexes.remove(index);
      } else {
        _selectedIndexes.add(index);
      }
    });
  }

  void _deleteSingle(int index) {
    setState(() {
      _items.removeAt(index);
      _selectedIndexes
        ..remove(index)
        ..removeWhere((value) => value >= _items.length);
    });
  }

  void _markRead(int index) {
    setState(() {
      _items[index] = _items[index].copyWith(unread: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F6F7),
      appBar: AppBar(
        title: const Text('Thông báo'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            onPressed: _markAllAsRead,
            icon: const Icon(Icons.notifications_none),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Expanded(
                  child: _TopActionButton(
                    icon: Icons.mark_email_read_outlined,
                    label: 'Đọc tất cả',
                    onPressed: _markAllAsRead,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _TopActionButton(
                    icon: Icons.delete_outline,
                    label: _selectionMode ? 'Xóa đã chọn' : 'Chọn để xóa',
                    filled: true,
                    onPressed: _handleDeleteAction,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: _items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = _items[index];
                final selected = _selectedIndexes.contains(index);
                return _NotificationCard(
                  item: item,
                  showCheckbox: _selectionMode,
                  selected: selected,
                  onTapCheckbox: () => _toggleSelection(index),
                  onTapDelete: () => _deleteSingle(index),
                  onTapMarkRead: () => _markRead(index),
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 10,
        height: 70,
        selectedIndex: widget.currentIndex,
        onDestinationSelected: widget.onSelectTab,
        indicatorColor: _softRed,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: _red),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront, color: _red),
            label: 'Mua vé số',
          ),
          NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined),
            selectedIcon: Icon(Icons.confirmation_number, color: _red),
            label: 'Dò vé',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('4'),
              child: Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              label: Text('4'),
              child: Icon(Icons.shopping_cart, color: _red),
            ),
            label: 'Giỏ hàng',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: _red),
            label: 'Tài khoản',
          ),
        ],
      ),
    );
  }
}

class _TopActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool filled;

  const _TopActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.filled = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: filled
          ? FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: _red,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: onPressed,
              icon: Icon(icon, size: 18),
              label: Text(label),
            )
          : OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: _red,
                side: const BorderSide(color: _red),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: onPressed,
              icon: Icon(icon, size: 18),
              label: Text(label),
            ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final AppNotification item;
  final bool showCheckbox;
  final bool selected;
  final VoidCallback onTapCheckbox;
  final VoidCallback onTapDelete;
  final VoidCallback onTapMarkRead;

  const _NotificationCard({
    required this.item,
    required this.showCheckbox,
    required this.selected,
    required this.onTapCheckbox,
    required this.onTapDelete,
    required this.onTapMarkRead,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF0E8E8)),
        boxShadow: _shadow,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 110,
            decoration: BoxDecoration(
              color: item.unread ? _red : Colors.transparent,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                bottomLeft: Radius.circular(18),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 12, 10, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (showCheckbox) ...[
                    GestureDetector(
                      onTap: onTapCheckbox,
                      child: Container(
                        width: 22,
                        height: 22,
                        margin: const EdgeInsets.only(top: 8, right: 10),
                        decoration: BoxDecoration(
                          color: selected ? _red : Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: selected ? _red : const Color(0xFFC9C9C9),
                            width: 1.5,
                          ),
                        ),
                        child: selected
                            ? const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 15,
                              )
                            : null,
                      ),
                    ),
                  ],
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: item.iconBackground,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(item.icon, color: item.iconColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                item.title,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: item.unread
                                      ? FontWeight.w900
                                      : FontWeight.w800,
                                  color: item.unread
                                      ? _ink
                                      : const Color(0xFF3B3B3B),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (item.unread)
                              Container(
                                width: 8,
                                height: 8,
                                margin: const EdgeInsets.only(top: 5),
                                decoration: const BoxDecoration(
                                  color: _red,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.description,
                          style: const TextStyle(
                            color: Color(0xFF555555),
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.time,
                          style: const TextStyle(
                            color: Color(0xFF8F8F8F),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      Icons.more_vert,
                      color: item.unread ? _ink : const Color(0xFFAAAAAA),
                    ),
                    onSelected: (value) {
                      if (value == 'read') {
                        onTapMarkRead();
                      }
                      if (value == 'delete') {
                        onTapDelete();
                      }
                    },
                    itemBuilder: (context) => [
                      if (item.unread)
                        const PopupMenuItem<String>(
                          value: 'read',
                          child: Text('Đánh dấu đã đọc'),
                        ),
                      const PopupMenuItem<String>(
                        value: 'delete',
                        child: Text('Xóa thông báo'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AppScaffold extends StatelessWidget {
  final Widget child;
  final PreferredSizeWidget? appBar;

  const AppScaffold({super.key, required this.child, this.appBar});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      body: SafeArea(top: appBar == null, child: child),
    );
  }
}

class Surface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const Surface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(12),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1E7E7)),
        boxShadow: _shadow,
      ),
      child: child,
    );
  }
}

class BrandMark extends StatelessWidget {
  final double size;

  const BrandMark({super.key, this.size = 42});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(colors: [_red, Color(0xFFFFC400)]),
      ),
      child: Center(
        child: Text(
          'ĐP',
          style: TextStyle(
            color: Colors.white,
            fontSize: size * .36,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class BrandText extends StatelessWidget {
  const BrandText({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ĐẠI PHÁT',
          style: TextStyle(
            color: _red,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          'DaiPhat-Lottery-Platform',
          style: TextStyle(
            color: Color(0xFFFF6B00),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class TicketLogo extends StatelessWidget {
  const TicketLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return const CircleAvatar(
      radius: 20,
      backgroundColor: _softRed,
      child: Icon(Icons.confirmation_number, color: _red),
    );
  }
}

class TicketCard extends StatelessWidget {
  final LotteryTicket ticket;
  final VoidCallback onTap;
  final bool dense;

  const TicketCard({
    super.key,
    required this.ticket,
    required this.onTap,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: ValueKey('ticket-${ticket.number}'),
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Surface(
        padding: EdgeInsets.all(dense ? 14 : 16),
        child: Row(
          children: [
            const TicketLogo(),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ticket.province,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    ticket.drawTime,
                    style: const TextStyle(color: _muted, fontSize: 12),
                  ),
                  const SizedBox(height: 9),
                  Text(
                    ticket.number,
                    style: const TextStyle(
                      color: _red,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            const Text('x 1', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(width: 18),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  tooltip: 'Xóa vé',
                  visualDensity: VisualDensity.compact,
                  onPressed: () {},
                  icon: const Icon(
                    Icons.delete_outline,
                    size: 19,
                    color: _muted,
                  ),
                ),
                Text(
                  money(ticket.price),
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                if (!dense)
                  const Text(
                    'Chưa thanh toán',
                    style: TextStyle(fontSize: 11, color: _muted),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class TotalCheckoutBar extends StatelessWidget {
  final String buttonText;
  final VoidCallback onPressed;
  final String? secondaryText;
  final VoidCallback? onSecondaryPressed;

  const TotalCheckoutBar({
    super.key,
    required this.buttonText,
    required this.onPressed,
    this.secondaryText,
    this.onSecondaryPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF0E6E6))),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Text(
                  'Tổng tiền',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
                const Spacer(),
                Text(
                  money(_tickets.fold(0, (sum, ticket) => sum + ticket.price)),
                  style: const TextStyle(
                    color: _red,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _red,
                minimumSize: const Size.fromHeight(52),
              ),
              onPressed: onPressed,
              child: Text(buttonText),
            ),
            if (secondaryText != null) ...[
              const SizedBox(height: 10),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: _ink,
                  side: const BorderSide(color: _red),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: onSecondaryPressed,
                child: Text(secondaryText!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class SegmentedTabs extends StatelessWidget {
  const SegmentedTabs({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        Expanded(child: _TabLabel('Vé số', active: true)),
        Expanded(child: _TabLabel('Vé đã thanh toán')),
        Expanded(child: _TabLabel('Vé chưa thanh toán')),
      ],
    );
  }
}

class _TabLabel extends StatelessWidget {
  final String text;
  final bool active;

  const _TabLabel(this.text, {this.active = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: active ? _red : _muted,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 8),
        Container(height: 2, color: active ? _red : const Color(0xFFEDEDED)),
      ],
    );
  }
}

class FilterChipLike extends StatelessWidget {
  final IconData icon;
  final String label;

  const FilterChipLike({super.key, required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEFE3E3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 17),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class ProvinceChips extends StatelessWidget {
  const ProvinceChips({super.key});

  @override
  Widget build(BuildContext context) {
    final provinces = ['Tất cả', 'TP. Hồ Chí Minh', 'Đồng Nai', 'Cần Thơ'];
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: provinces.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final active = index == 0;
          return DecoratedBox(
            decoration: BoxDecoration(
              color: active ? _red : const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              child: Text(
                provinces[index],
                style: TextStyle(
                  color: active ? Colors.white : _ink,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class PrizeRow {
  final String label;
  final List<String> values;
  final bool highlight;

  const PrizeRow(this.label, this.values, {this.highlight = false});
}

class LotteryColumn {
  final String name;
  final String time;
  final List<PrizeRow> rows;

  const LotteryColumn({
    required this.name,
    required this.time,
    required this.rows,
  });
}

const _southColumns = [
  LotteryColumn(
    name: 'TP. Hồ Chí Minh',
    time: '16:15 · Hôm nay',
    rows: [
      PrizeRow('Đặc biệt', ['458120'], highlight: true),
      PrizeRow('Giải 1', ['99312']),
      PrizeRow('Giải 2', ['45102']),
      PrizeRow('Giải 3', ['45102', '99321']),
      PrizeRow('Giải 4', ['45821', '90123', '77124', '09541']),
      PrizeRow('Giải 5', ['1204']),
      PrizeRow('Giải 6', ['4582', '9012', '3341']),
      PrizeRow('Giải 7', ['468']),
      PrizeRow('Giải 8', ['35'], highlight: true),
    ],
  ),
  LotteryColumn(
    name: 'Đồng Tháp',
    time: '16:20 · Hôm nay',
    rows: [
      PrizeRow('Đặc biệt', ['654321'], highlight: true),
      PrizeRow('Giải 1', ['12345']),
      PrizeRow('Giải 2', ['67890']),
      PrizeRow('Giải 3', ['54321', '09876']),
      PrizeRow('Giải 4', ['11122', '33344', '55566', '77788']),
      PrizeRow('Giải 5', ['1234']),
      PrizeRow('Giải 6', ['5678', '9012', '3456']),
      PrizeRow('Giải 7', ['789']),
      PrizeRow('Giải 8', ['01'], highlight: true),
    ],
  ),
  LotteryColumn(
    name: 'Cà Mau',
    time: '16:25 · Hôm nay',
    rows: [
      PrizeRow('Đặc biệt', ['135790'], highlight: true),
      PrizeRow('Giải 1', ['24680']),
      PrizeRow('Giải 2', ['13579']),
      PrizeRow('Giải 3', ['98765', '43210']),
      PrizeRow('Giải 4', ['12345', '67890', '09876', '11223']),
      PrizeRow('Giải 5', ['9900']),
      PrizeRow('Giải 6', ['1122', '3344', '5566']),
      PrizeRow('Giải 7', ['778']),
      PrizeRow('Giải 8', ['99'], highlight: true),
    ],
  ),
];

const _lotoRows = [
  ('0', '2, 1, 2, 8, 9'),
  ('1', '0, 2, 3, 4'),
  ('2', '1, 6, 2, 3, 2, 4, 0'),
  ('3', '1, 2, 3, 4, 5'),
];

class ResultHomeCard extends StatelessWidget {
  final VoidCallback onOpenAll;

  const ResultHomeCard({super.key, required this.onOpenAll});

  @override
  Widget build(BuildContext context) {
    return Surface(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.emoji_events_outlined, color: _red, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: SectionTitle(
                  'Kết quả xổ số kiến thiết hôm nay 24/05/2024',
                ),
              ),
              TextButton(
                onPressed: onOpenAll,
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Xem tất cả'),
                    Icon(Icons.chevron_right, size: 18),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          const DrawStatusLine(),
          const SizedBox(height: 14),
          const ResultCardsRow(),
          const SizedBox(height: 16),
          const LotoSection(compact: true),
          const SizedBox(height: 16),
          RecentResultsSection(onOpenAll: onOpenAll),
        ],
      ),
    );
  }
}

class DrawStatusLine extends StatelessWidget {
  const DrawStatusLine({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Icon(Icons.circle, color: Color(0xFFFF6B73), size: 9),
        SizedBox(width: 8),
        Expanded(
          child: Text(
            'Đang chờ xổ số lúc 16:15 · Còn ',
            style: TextStyle(color: _muted, fontSize: 12),
          ),
        ),
        Text(
          '15:58:36',
          style: TextStyle(
            color: _red,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(' nữa', style: TextStyle(color: _muted, fontSize: 12)),
      ],
    );
  }
}

class ResultTypeTabs extends StatelessWidget {
  const ResultTypeTabs({super.key});

  @override
  Widget build(BuildContext context) {
    final tabs = ['Đầy đủ', '2 số', '3 số'];
    return Container(
      height: 40,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFEDEDED)),
        color: Colors.white,
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: i == 0 ? _red : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  tabs[i],
                  style: TextStyle(
                    color: i == 0 ? Colors.white : _ink,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ResultCardsRow extends StatelessWidget {
  const ResultCardsRow({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 620;
        final cards = _southColumns
            .map((column) => LotteryResultMiniCard(column: column))
            .toList();
        if (!isWide) {
          return SizedBox(
            height: 370,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: cards.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (_, index) =>
                  SizedBox(width: 220, child: cards[index]),
            ),
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < cards.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              Expanded(child: cards[i]),
            ],
          ],
        );
      },
    );
  }
}

class LotteryResultMiniCard extends StatelessWidget {
  final LotteryColumn column;

  const LotteryResultMiniCard({super.key, required this.column});

  @override
  Widget build(BuildContext context) {
    final rows = column.rows.take(8).toList();
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFEDEDED)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 12, 10, 8),
            child: Column(
              children: [
                Text(
                  column.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: _red,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  column.time,
                  style: const TextStyle(color: _muted, fontSize: 12),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF8ED),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'Miền Nam',
                    style: TextStyle(
                      color: Color(0xFF239342),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          for (final row in rows)
            _MiniPrizeRow(
              label: row.label,
              values: row.values,
              highlight: row.highlight,
            ),
          TextButton(
            onPressed: () {},
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Xem chi tiết'),
                Icon(Icons.chevron_right, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniPrizeRow extends StatelessWidget {
  final String label;
  final List<String> values;
  final bool highlight;

  const _MiniPrizeRow({
    required this.label,
    required this.values,
    required this.highlight,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFEFEFEF))),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 58,
            child: Text(label, style: const TextStyle(fontSize: 12)),
          ),
          Expanded(
            child: Wrap(
              alignment: WrapAlignment.end,
              spacing: 10,
              runSpacing: 2,
              children: [
                for (final value in values.take(2))
                  Text(
                    value,
                    style: TextStyle(
                      color: highlight ? _red : _ink,
                      fontSize: highlight ? 19 : 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LotteryRegionTable extends StatelessWidget {
  final String title;
  final List<LotteryColumn> columns;

  const LotteryRegionTable({
    super.key,
    required this.title,
    required this.columns,
  });

  @override
  Widget build(BuildContext context) {
    final labels = columns.first.rows.map((row) => row.label).toList();
    return Surface(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
            child: Text(
              title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
          ),
          Table(
            border: TableBorder.all(color: const Color(0xFFEDEDED)),
            columnWidths: const {0: FixedColumnWidth(88)},
            defaultVerticalAlignment: TableCellVerticalAlignment.middle,
            children: [
              TableRow(
                decoration: const BoxDecoration(color: Color(0xFFF7F7F7)),
                children: [
                  const _TableCell('Giải', bold: true),
                  for (final column in columns)
                    _TableCell(column.name, red: true, bold: true),
                ],
              ),
              for (var i = 0; i < labels.length; i++)
                TableRow(
                  children: [
                    _TableCell(labels[i], red: true, bold: true),
                    for (final column in columns)
                      _TableCell(
                        column.rows[i].values.join('\n'),
                        red: column.rows[i].highlight,
                        bold: true,
                        large: column.rows[i].highlight,
                      ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TableCell extends StatelessWidget {
  final String text;
  final bool red;
  final bool bold;
  final bool large;

  const _TableCell(
    this.text, {
    this.red = false,
    this.bold = false,
    this.large = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: red ? _red : _ink,
          fontSize: large ? 19 : 12,
          height: 1.25,
          fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
        ),
      ),
    );
  }
}

class LotoSection extends StatelessWidget {
  final bool compact;

  const LotoSection({super.key, required this.compact});

  @override
  Widget build(BuildContext context) {
    final table = LotoTable(compact: compact);
    if (compact) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.calendar_month_outlined, color: _red, size: 20),
              SizedBox(width: 8),
              SectionTitle('Bảng loto'),
              Spacer(),
              Text(
                'Xem chi tiết',
                style: TextStyle(color: _red, fontWeight: FontWeight.w800),
              ),
              Icon(Icons.chevron_right, color: _red, size: 18),
            ],
          ),
          const SizedBox(height: 10),
          table,
        ],
      );
    }
    return Surface(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.calendar_month_outlined, color: _red, size: 20),
              SizedBox(width: 8),
              SectionTitle('Bảng loto'),
            ],
          ),
          const SizedBox(height: 10),
          table,
        ],
      ),
    );
  }
}

class LotoTable extends StatelessWidget {
  final bool compact;

  const LotoTable({super.key, required this.compact});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = constraints.maxWidth >= 640 ? 3 : 1;
        final cards = [
          'Miền Nam',
        ].map((title) => _LotoCard(title: title)).toList();
        if (count == 1) return cards.first;
        return Row(children: [for (final card in cards) Expanded(child: card)]);
      },
    );
  }
}

class _LotoCard extends StatelessWidget {
  final String title;

  const _LotoCard({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFEDEDED)),
      ),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8),
            color: const Color(0xFFF7F7F7),
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF239342),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const Row(
            children: [
              Expanded(child: _LotoHeader('CHỤC')),
              Expanded(flex: 2, child: _LotoHeader('SỐ')),
            ],
          ),
          for (final row in _lotoRows)
            Row(
              children: [
                Expanded(child: _LotoValue(row.$1, red: true)),
                Expanded(flex: 2, child: _LotoValue(row.$2)),
              ],
            ),
        ],
      ),
    );
  }
}

class _LotoHeader extends StatelessWidget {
  final String text;

  const _LotoHeader(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 7),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFEDEDED))),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 11),
      ),
    );
  }
}

class _LotoValue extends StatelessWidget {
  final String text;
  final bool red;

  const _LotoValue(this.text, {this.red = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 8),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFEDEDED))),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: red ? _red : _ink,
          fontSize: 12,
          fontWeight: red ? FontWeight.w900 : FontWeight.w600,
        ),
      ),
    );
  }
}

class RecentResultsSection extends StatelessWidget {
  final VoidCallback onOpenAll;

  const RecentResultsSection({super.key, required this.onOpenAll});

  @override
  Widget build(BuildContext context) {
    return Surface(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          const Icon(Icons.history, color: _red, size: 20),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionTitle('Kết quả gần đây'),
                SizedBox(height: 8),
                Text(
                  '23/05/2024 · Thứ Năm',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                SizedBox(height: 2),
                Text('Miền Nam', style: TextStyle(color: _muted, fontSize: 12)),
              ],
            ),
          ),
          TextButton(
            onPressed: onOpenAll,
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Xem tất cả'),
                Icon(Icons.chevron_right, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ResultCard extends StatelessWidget {
  const ResultCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              SectionTitle('KẾT QUẢ XỔ SỐ KIẾN THIẾT HÔM NAY'),
              Spacer(),
              Icon(Icons.chevron_right),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Thứ sáu, 24/05/2024',
            style: TextStyle(color: _muted, fontSize: 12),
          ),
          const Divider(height: 24),
          const Row(
            children: [
              Icon(Icons.article_outlined, color: _red, size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'TP. Hồ Chí Minh',
                  style: TextStyle(color: _red, fontWeight: FontWeight.w900),
                ),
              ),
              Text(
                'Đổi tỉnh',
                style: TextStyle(color: _red, fontWeight: FontWeight.w800),
              ),
              Icon(Icons.chevron_right, color: _red, size: 18),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 22,
            runSpacing: 12,
            children: const [
              ResultNumber('Đặc biệt', '458120', large: true),
              ResultNumber('Giải 1', '96312'),
              ResultNumber('Giải 2', '45102'),
              ResultNumber('Giải 3', '89321'),
            ],
          ),
        ],
      ),
    );
  }
}

class ResultNumber extends StatelessWidget {
  final String label;
  final String number;
  final bool large;

  const ResultNumber(this.label, this.number, {super.key, this.large = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: large ? 118 : 88,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: _muted, fontSize: 12)),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              number,
              style: TextStyle(
                color: large ? _red : _ink,
                fontSize: large ? 20 : 16,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LuckyNumbersCard extends StatelessWidget {
  const LuckyNumbersCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              SectionTitle('VÉ SỐ MAY MẮN'),
              Spacer(),
              Text('Xem tất cả', style: TextStyle(fontSize: 12, color: _muted)),
              Icon(Icons.chevron_right, size: 18),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 6,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final number = [
                  '00000',
                  '11111',
                  '22222',
                  '33333',
                  '33221',
                  '88668',
                ][index];
                return Container(
                  alignment: Alignment.center,
                  width: 76,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEFE3E3)),
                  ),
                  child: Text(
                    number,
                    style: const TextStyle(
                      color: _red,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class ResultDots extends StatelessWidget {
  const ResultDots({super.key});

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('Đặc biệt', 6),
      ('Giải 1', 3),
      ('Giải 2', 6),
      ('Giải 3', 12),
      ('Giải 4', 18),
      ('Giải 5', 18),
      ('Giải 6', 9),
      ('Giải 8', 3),
    ];

    return Surface(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: Row(
                children: [
                  SizedBox(
                    width: 70,
                    child: Text(
                      row.$1,
                      style: const TextStyle(fontSize: 12, color: _muted),
                    ),
                  ),
                  Expanded(
                    child: Wrap(
                      spacing: 7,
                      runSpacing: 7,
                      children: List.generate(
                        row.$2,
                        (_) => Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: Color(0xFFEDEDED),
                            shape: BoxShape.circle,
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
}

class InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const InfoRow(this.label, this.value, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(color: _muted)),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String text;

  const SectionTitle(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w900,
        color: _ink,
      ),
    );
  }
}

String money(int amount) {
  final value = amount.toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]}.',
  );
  return '$value đ';
}

const _shadow = [
  BoxShadow(color: Color(0x12000000), blurRadius: 18, offset: Offset(0, 8)),
];

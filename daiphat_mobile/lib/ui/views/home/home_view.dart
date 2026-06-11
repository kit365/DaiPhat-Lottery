import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/home_viewmodel.dart';
import '../../../data/models/lottery_result.dart';
import '../../viewmodels/login_viewmodel.dart';
import '../../viewmodels/notification_viewmodel.dart';
import '../../../core/services/notification_service.dart';

import 'widgets/home_header.dart';
import 'widgets/home_title_date.dart';
import 'widgets/province_chips.dart';
import 'widgets/results_card.dart';
import 'widgets/loto_card.dart';

// ═══════════════════════════════════════════════════════════
//  ROOT WIDGET
// ═══════════════════════════════════════════════════════════
class HomeView extends ConsumerWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;
  
  const HomeView({
    super.key,
    required this.loginViewModel,
    required this.notificationViewModel,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeState = ref.watch(homeViewModelProvider);
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: homeState.when(
        data: (results) => _HomeContent(
          results: results,
          loginViewModel: loginViewModel,
          notificationViewModel: notificationViewModel,
        ),
        loading: _buildSkeleton,
        error: (e, _) => Center(child: Text('Lỗi: $e')),
      ),
    );
  }

  static Widget _buildSkeleton() => ListView(
        padding: EdgeInsets.zero,
        children: [
          Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Container(height: 120, color: Colors.white),
          ),
          const SizedBox(height: 20),
          ...List.generate(
              3,
              (_) => Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Shimmer.fromColors(
                      baseColor: Colors.grey[300]!,
                      highlightColor: Colors.grey[100]!,
                      child: Container(
                          height: 100,
                          decoration: BoxDecoration(
                              color: Colors.white, borderRadius: BorderRadius.circular(12))),
                    ),
                  )),
        ],
      );
}

// ═══════════════════════════════════════════════════════════
//  PAGE STATE
// ═══════════════════════════════════════════════════════════
class _HomeContent extends StatefulWidget {
  final List<LotteryResult> results;
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;
  const _HomeContent(
      {required this.results,
      required this.loginViewModel,
      required this.notificationViewModel});
  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> with WidgetsBindingObserver {
  // Empty set = "Đầy đủ" (all). Non-empty = selected subset.
  final Set<String> _selProvinces = {};
  DateTime _date = DateTime.now();
  final _allProvinces = const ['TP. HCM', 'Đồng Tháp', 'Cà Mau', 'Bình Phước'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.loginViewModel.isAuthenticated) {
        widget.notificationViewModel.fetchNotifications(refresh: true);
      }
      // Xin quyền Notification khi vào Home
      NotificationService().requestPermission();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (widget.loginViewModel.isAuthenticated) {
        widget.notificationViewModel.fetchNotifications(refresh: true);
      }
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.primaryDark,
            onPrimary: Colors.white,
            onSurface: AppColors.textMain,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _date = picked);
  }

  List<String> get _displayProvinces => _selProvinces.isEmpty
      ? _allProvinces
      : _allProvinces.where(_selProvinces.contains).toList();

  @override
  Widget build(BuildContext context) {
    final displayProvinces = _displayProvinces;
    return Stack(
      children: [
        // Background fade
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 320,
          child: ShaderMask(
            shaderCallback: (r) => const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white, Colors.transparent],
              stops: [0.4, 1.0],
            ).createShader(r),
            blendMode: BlendMode.dstIn,
            child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
          ),
        ),

        SafeArea(
            child: CustomScrollView(slivers: [
          SliverToBoxAdapter(
              child: HomeHeader(
            loginViewModel: widget.loginViewModel,
            notificationViewModel: widget.notificationViewModel,
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          SliverToBoxAdapter(
              child: HomeTitleDate(
            date: _date,
            onPickDate: _pickDate,
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 20)),
          SliverToBoxAdapter(
              child: ProvinceChips(
            allProvinces: _allProvinces,
            selectedProvinces: _selProvinces,
            onToggleProvince: (val) {
              setState(() {
                if (val == null) {
                  _selProvinces.clear();
                } else {
                  if (_selProvinces.contains(val)) {
                    _selProvinces.remove(val);
                  } else {
                    _selProvinces.add(val);
                  }
                }
              });
            },
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 28)),
          SliverToBoxAdapter(
              child: ResultsCard(
            displayProvinces: displayProvinces,
            isSingleSel: _selProvinces.length == 1,
            selLabel: _selProvinces.length == 1 ? _selProvinces.first : null,
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          SliverToBoxAdapter(
              child: LotoCard(
            provinces: _allProvinces,
            globalSel: _selProvinces.length == 1 ? _selProvinces.first : null,
          )),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ])),
      ],
    );
  }
}

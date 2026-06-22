import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/data/models/lottery_result.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/services/notification_service.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import '../viewmodels/home_viewmodel.dart';
import 'widgets/home_header.dart';
import 'widgets/home_title_date.dart';
import 'widgets/loto_card.dart';
import 'widgets/province_chips.dart';
import 'widgets/results_card.dart';

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
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: _HomeContent(
        loginViewModel: loginViewModel,
        notificationViewModel: notificationViewModel,
      ),
    );
  }

  static Widget buildSkeleton() => ListView(
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
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
}

class _HomeContent extends StatefulWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;

  const _HomeContent({
    required this.loginViewModel,
    required this.notificationViewModel,
  });

  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> with WidgetsBindingObserver {
  final Set<String> _selectedProvinces = <String>{};
  DateTime _date = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.loginViewModel.isAuthenticated) {
        widget.notificationViewModel.fetchNotifications(refresh: true);
      }
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
    if (state == AppLifecycleState.resumed &&
        widget.loginViewModel.isAuthenticated) {
      widget.notificationViewModel.fetchNotifications(refresh: true);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.primaryDark,
            onPrimary: Colors.white,
            onSurface: AppColors.textMain,
          ),
        ),
        child: child!,
      ),
    );

    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalizedDate = DateTime(_date.year, _date.month, _date.day);

    return Consumer(
      builder: (context, ref, _) {
        final homeState = ref.watch(homeLotteryProvider(normalizedDate));
        return homeState.when(
          loading: HomeView.buildSkeleton,
          error: (error, _) => Center(child: Text('Loi: $error')),
          data: (data) => _buildLoadedState(data),
        );
      },
    );
  }

  Widget _buildLoadedState(HomeLotteryData data) {
    final allProvinces = data.availableProvinces;
    final invalidSelections = _selectedProvinces
        .where((province) => !allProvinces.contains(province))
        .toList();

    if (invalidSelections.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }
        setState(() => _selectedProvinces.removeAll(invalidSelections));
      });
    }

    final displayProvinces = _selectedProvinces.isEmpty
        ? allProvinces
        : allProvinces.where(_selectedProvinces.contains).toList();

    final displayResults = data.results
        .where((result) => displayProvinces.contains(result.province))
        .toList();

    return Stack(
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 320,
          child: ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white, Colors.transparent],
              stops: [0.4, 1.0],
            ).createShader(bounds),
            blendMode: BlendMode.dstIn,
            child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
          ),
        ),
        SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: HomeHeader(
                  loginViewModel: widget.loginViewModel,
                  notificationViewModel: widget.notificationViewModel,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
              SliverToBoxAdapter(
                child: HomeTitleDate(
                  date: _date,
                  onPickDate: _pickDate,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              SliverToBoxAdapter(
                child: ProvinceChips(
                  allProvinces: allProvinces,
                  selectedProvinces: _selectedProvinces,
                  onToggleProvince: (value) {
                    setState(() {
                      if (value == null) {
                        _selectedProvinces.clear();
                      } else if (_selectedProvinces.contains(value)) {
                        _selectedProvinces.remove(value);
                      } else {
                        _selectedProvinces.add(value);
                      }
                    });
                  },
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 28)),
              SliverToBoxAdapter(
                child: ResultsCard(
                  results: displayResults,
                  displayProvinces: displayProvinces,
                  isSingleSel: _selectedProvinces.length == 1,
                  selLabel: _selectedProvinces.length == 1
                      ? _selectedProvinces.first
                      : null,
                  isWaitingForResults: data.isWaitingForResults,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
              SliverToBoxAdapter(
                child: LotoCard(
                  provinces: allProvinces,
                  globalSel: _selectedProvinces.length == 1
                      ? _selectedProvinces.first
                      : null,
                  results: data.results,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 40)),
            ],
          ),
        ),
      ],
    );
  }
}

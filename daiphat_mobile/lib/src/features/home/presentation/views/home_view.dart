import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/home/data/models/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/presentation/providers/lottery_results_lookup_provider.dart';
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

class _HomeContent extends ConsumerStatefulWidget {
  final LoginViewModel loginViewModel;
  final NotificationViewModel notificationViewModel;

  const _HomeContent({
    required this.loginViewModel,
    required this.notificationViewModel,
  });

  @override
  ConsumerState<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends ConsumerState<_HomeContent>
    with WidgetsBindingObserver {
  final Set<String> _selectedProvinces = <String>{};
  DateTime _date = DateTime.now();
  String? _pendingStationName;
  int? _pendingStationId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _consumeLookupIntent();
      if (widget.loginViewModel.isAuthenticated) {
        widget.notificationViewModel.fetchNotifications(refresh: true);
      }
      NotificationService().requestPermission();
    });
  }

  void _consumeLookupIntent() {
    final lookup = ref.read(lotteryResultsLookupProvider);
    if (lookup == null) return;

    ref.read(lotteryResultsLookupProvider.notifier).clear();

    setState(() {
      if (lookup.drawDate != null) {
        _date = DateTime(
          lookup.drawDate!.year,
          lookup.drawDate!.month,
          lookup.drawDate!.day,
        );
      }
      _pendingStationName = lookup.stationName?.trim();
      _pendingStationId = lookup.stationId;
      _selectedProvinces.clear();
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
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final lastDate = _date.isAfter(today) ? _date : today;
    final initialDate = _date.isAfter(lastDate) ? lastDate : _date;

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2000),
      lastDate: lastDate,
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

  String _normalizeProvinceLabel(String value) {
    final trimmed = value.trim();
    if (trimmed == 'Hồ Chí Minh') return 'TP. Hồ Chí Minh';
    return trimmed;
  }

  String _normalizeForMatch(String value) {
    const accents = {
      'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
      'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
      'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
      'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
      'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
      'đ': 'd',
    };
    final lower = value.toLowerCase().trim();
    final buf = StringBuffer();
    for (final rune in lower.runes) {
      final ch = String.fromCharCode(rune);
      buf.write(accents[ch] ?? ch);
    }
    return buf.toString().replaceAll(RegExp(r'\s+'), ' ');
  }

  void _applyPendingStationLookup(HomeLotteryData data) {
    final hasPending = (_pendingStationName != null &&
            _pendingStationName!.isNotEmpty) ||
        _pendingStationId != null;
    if (!hasPending) return;

    String? matchedProvince;

    if (_pendingStationId != null) {
      for (final result in data.results) {
        if (result.stationId == _pendingStationId) {
          matchedProvince = result.province;
          break;
        }
      }
    }

    if (matchedProvince == null &&
        _pendingStationName != null &&
        _pendingStationName!.isNotEmpty) {
      final wanted =
          _normalizeForMatch(_normalizeProvinceLabel(_pendingStationName!));
      for (final province in data.availableProvinces) {
        if (_normalizeForMatch(province) == wanted) {
          matchedProvince = province;
          break;
        }
      }
      if (matchedProvince == null) {
        for (final result in data.results) {
          if (_normalizeForMatch(result.province) == wanted) {
            matchedProvince = result.province;
            break;
          }
        }
      }
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() {
        _pendingStationName = null;
        _pendingStationId = null;
        if (matchedProvince != null) {
          _selectedProvinces
            ..clear()
            ..add(matchedProvince);
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    // Re-apply when returning to Home with a new lookup intent while State lives.
    ref.listen<LotteryResultsLookup?>(lotteryResultsLookupProvider, (prev, next) {
      if (next != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _consumeLookupIntent();
        });
      }
    });

    final normalizedDate = DateTime(_date.year, _date.month, _date.day);
    final homeState = ref.watch(homeLotteryProvider(normalizedDate));

    return homeState.when(
      loading: () => _buildLoadedState(
        const HomeLotteryData(
          results: [],
          availableProvinces: [],
          isWaitingForResults: true,
        ),
        normalizedDate: normalizedDate,
        isContentLoading: true,
      ),
      error: (error, _) => _buildLoadedState(
        const HomeLotteryData(
          results: [],
          availableProvinces: [],
        ),
        normalizedDate: normalizedDate,
        errorMessage: error.toString(),
      ),
      data: (data) => _buildLoadedState(
        data,
        normalizedDate: normalizedDate,
      ),
    );
  }

  Widget _buildLoadedState(
    HomeLotteryData data, {
    required DateTime normalizedDate,
    bool isContentLoading = false,
    String? errorMessage,
  }) {
    if ((_pendingStationName != null && _pendingStationName!.isNotEmpty) ||
        _pendingStationId != null) {
      _applyPendingStationLookup(data);
    }

    final allProvinces = data.availableProvinces;
    final invalidSelections = _selectedProvinces
        .where((province) => !allProvinces.contains(province))
        .toList();

    if (invalidSelections.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
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
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              ref.invalidate(homeLotteryProvider(normalizedDate));
              await ref.read(homeLotteryProvider(normalizedDate).future);
              if (widget.loginViewModel.isAuthenticated) {
                await widget.notificationViewModel
                    .fetchNotifications(refresh: true);
              }
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
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
              if (isContentLoading)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Shimmer.fromColors(
                      baseColor: Colors.grey[300]!,
                      highlightColor: Colors.grey[100]!,
                      child: Container(
                        height: 220,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                )
              else if (errorMessage != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Text(
                        'Không tải được kết quả xổ số.\n$errorMessage',
                        style: const TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                  ),
                )
              else ...[
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
                    results: data.results,
                  ),
                ),
              ],
              const SliverToBoxAdapter(child: SizedBox(height: 40)),
            ],
            ),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/shared/services/notification_service.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../providers/notification_providers.dart';
import '../viewmodels/notification_settings_viewmodel.dart';

class NotificationSettingsView extends ConsumerStatefulWidget {
  const NotificationSettingsView({super.key});

  @override
  ConsumerState<NotificationSettingsView> createState() =>
      _NotificationSettingsViewState();
}

class _NotificationSettingsViewState
    extends ConsumerState<NotificationSettingsView> {
  late final NotificationSettingsViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = NotificationSettingsViewModel(
      ref.read(notificationSettingServiceProvider),
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Future<void> _onToggle(NotificationSettingOption option) async {
    final err = await _viewModel.toggle(option);
    if (!mounted) return;
    if (err == null) {
      AppToast.success('Đã cập nhật cài đặt thông báo.');
    } else {
      AppToast.error(err);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
        surfaceTintColor: AppColors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Cài đặt thông báo',
          style: AppTypography.h3(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          if (_viewModel.error != null) return _buildError();

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _viewModel.load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                _buildOptInBanner(),
                const SizedBox(height: 16),
                _buildIntro(),
                const SizedBox(height: 16),
                _buildSectionTitle('Thông báo trong ứng dụng'),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfacePrimary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Column(
                    children: [
                      for (
                        var i = 0;
                        i < NotificationSettingsViewModel.options.length;
                        i++
                      ) ...[
                        if (i > 0)
                          const Divider(
                            height: 1,
                            indent: 16,
                            endIndent: 16,
                            color: AppColors.borderLight,
                          ),
                        _buildToggleTile(
                          NotificationSettingsViewModel.options[i],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _buildHint(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildOptInBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: AppColors.statusErrorSurface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.notifications_active_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Quyền thông báo thiết bị',
                  style: AppTypography.subtitle1(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Bật thông báo để nhận kết quả xổ số và trạng thái đơn hàng nhanh chóng nhất.',
            style: AppTypography.bodySmall(
              fontSize: 13,
              height: 1.45,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () async {
                await NotificationService().requestPermission();
                if (mounted) {
                  AppToast.success('Đã gửi yêu cầu cấp quyền thông báo.');
                }
              },
              icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
              label: Text(
                'Bật thông báo thiết bị',
                style: AppTypography.buttonMedium(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.surfacePrimary,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIntro() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.statusErrorSurface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.notifications_active_outlined,
            color: AppColors.primary,
            size: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Chọn những thông báo bạn muốn nhận từ Đại Phát. '
              'Thay đổi được lưu ngay lập tức.',
              style: AppTypography.bodySmall(
                fontSize: 13,
                height: 1.45,
                color: AppColors.textMain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: AppTypography.labelLarge(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textMuted,
      ),
    );
  }

  Widget _buildToggleTile(NotificationSettingOption option) {
    final enabled = _viewModel.isEnabled(option);
    final updating = _viewModel.isUpdating(option);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  option.title,
                  style: AppTypography.subtitle2(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMain,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  option.description,
                  style: AppTypography.caption(
                    fontSize: 12,
                    height: 1.4,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  enabled ? 'Đang bật' : 'Đang tắt',
                  style: AppTypography.caption(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: enabled
                        ? AppColors.success
                        : AppColors.contentNeutral,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          if (updating)
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            )
          else
            Switch.adaptive(
              value: enabled,
              activeThumbColor: AppColors.surfacePrimary,
              activeTrackColor: AppColors.success,
              onChanged: (_) => _onToggle(option),
            ),
        ],
      ),
    );
  }

  Widget _buildHint() {
    return Text(
      'Lưu ý: thông báo quan trọng về bảo mật, đơn hàng và hoàn tiền luôn '
      'được gửi để đảm bảo quyền lợi của bạn.',
      style: AppTypography.caption(
        fontSize: 12,
        height: 1.5,
        color: AppColors.textMuted,
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            _viewModel.error ?? 'Đã xảy ra lỗi',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _viewModel.load,
            child: Text(
              'Thử lại',
              style: AppTypography.buttonMedium(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

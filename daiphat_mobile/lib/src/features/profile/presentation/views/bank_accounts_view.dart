import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/bank_account_form_page.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'package:daiphat_mobile/src/shared/widgets/brand_scrollbar.dart';
import '../viewmodels/bank_accounts_viewmodel.dart';

class BankAccountsView extends ConsumerStatefulWidget {
  const BankAccountsView({super.key});

  @override
  ConsumerState<BankAccountsView> createState() => _BankAccountsViewState();
}

class _BankAccountsViewState extends ConsumerState<BankAccountsView> {
  late final BankAccountsViewModel _viewModel;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _viewModel = BankAccountsViewModel(ref.read(bankAccountServiceProvider));
  }

  @override
  void dispose() {
    _viewModel.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _openForm({UserBankAccountResponse? account}) async {
    final result = await Navigator.of(context, rootNavigator: true)
        .push<UserBankAccountResponse>(
          MaterialPageRoute(
            builder: (_) => BankAccountFormPage(
              service: ref.read(bankAccountServiceProvider),
              banks: _viewModel.banks,
              account: account,
            ),
          ),
        );
    if (result == null) return;
    await _viewModel.load(silent: true);
    AppToast.success(
      account == null
          ? 'Đã thêm tài khoản ngân hàng.'
          : 'Đã cập nhật tài khoản ngân hàng.',
    );
  }

  Future<void> _setDefault(UserBankAccountResponse account) async {
    final err = await _viewModel.setDefault(account.id);
    if (err != null) {
      AppToast.error(err);
    } else {
      AppToast.success('Đã đặt làm tài khoản mặc định.');
    }
  }

  Future<void> _confirmDelete(UserBankAccountResponse account) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Xoá tài khoản',
          style: AppTypography.mainWith(fontWeight: FontWeight.w800),
        ),
        content: Text(
          'Bạn có chắc muốn xoá tài khoản ${account.bankName} - '
          '${account.bankAccountNo}?',
          style: AppTypography.mainWith(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Không', style: AppTypography.mainWith()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surfacePrimary,
            ),
            child: Text(
              'Xoá',
              style: AppTypography.mainWith(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await _viewModel.delete(account.id);
    if (err != null) {
      AppToast.error(err);
    } else {
      AppToast.success('Đã xoá tài khoản ngân hàng.');
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
          'Tài khoản ngân hàng',
          style: AppTypography.mainWith(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      floatingActionButton: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading || _viewModel.accounts.isEmpty) {
            return const SizedBox.shrink();
          }
          return FloatingActionButton.extended(
            onPressed: () => _openForm(),
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.surfacePrimary,
            icon: const Icon(Icons.add_rounded),
            label: Text(
              'Thêm tài khoản',
              style: AppTypography.mainWith(fontWeight: FontWeight.w700),
            ),
          );
        },
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          if (_viewModel.error != null && _viewModel.accounts.isEmpty) {
            return _buildError();
          }
          if (_viewModel.accounts.isEmpty) return _buildEmpty();

          return BrandScrollbar(
            controller: _scrollController,
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _viewModel.load,
              child: ListView.builder(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
                itemCount: _viewModel.accounts.length,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildCard(_viewModel.accounts[index]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCard(UserBankAccountResponse account) {
    final isMutating = _viewModel.mutatingId == account.id;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: account.isDefault
              ? AppColors.primary.withValues(alpha: 0.35)
              : AppColors.borderDecorative,
        ),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _BankLogo(logoUrl: account.bankLogo, label: account.bankName),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            account.bankName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.mainWith(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textMain,
                            ),
                          ),
                        ),
                        if (account.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceBrandWarm,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Mặc định',
                              style: AppTypography.mainWith(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      account.bankAccountNo,
                      style: AppTypography.mainWith(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.6,
                        color: AppColors.textMain,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      account.bankAccountName,
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 22, color: AppColors.borderDecorative),
          if (isMutating)
            const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              ),
            )
          else
            Row(
              children: [
                if (!account.isDefault)
                  _buildAction(
                    icon: Icons.star_border_rounded,
                    label: 'Đặt mặc định',
                    onTap: () => _setDefault(account),
                  ),
                const Spacer(),
                _buildAction(
                  icon: Icons.edit_outlined,
                  label: 'Sửa',
                  onTap: () => _openForm(account: account),
                ),
                const SizedBox(width: 4),
                _buildAction(
                  icon: Icons.delete_outline_rounded,
                  label: 'Xoá',
                  color: AppColors.error,
                  onTap: () => _confirmDelete(account),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color color = AppColors.primary,
  }) {
    return TextButton.icon(
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        minimumSize: const Size(0, 32),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: Icon(icon, size: 17),
      label: Text(
        label,
        style: AppTypography.mainWith(
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
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
            style: AppTypography.mainWith(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _viewModel.load,
            child: Text(
              'Thử lại',
              style: AppTypography.mainWith(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 110),
        Center(
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: AppColors.statusErrorSurface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.account_balance_rounded,
                  size: 34,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Chưa có tài khoản ngân hàng',
                style: AppTypography.mainWith(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Text(
                  'Thêm tài khoản để nhận hoàn tiền và trả thưởng nhanh chóng.',
                  textAlign: TextAlign.center,
                  style: AppTypography.mainWith(
                    fontSize: 13,
                    height: 1.45,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: () => _openForm(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.surfacePrimary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.add_rounded, size: 20),
                label: Text(
                  'Thêm tài khoản',
                  style: AppTypography.mainWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BankLogo extends StatelessWidget {
  final String? logoUrl;
  final String label;

  const _BankLogo({required this.logoUrl, required this.label});

  @override
  Widget build(BuildContext context) {
    final initial = label.isNotEmpty ? label[0].toUpperCase() : 'B';
    final fallback = Center(
      child: Text(
        initial,
        style: AppTypography.mainWith(
          fontWeight: FontWeight.w800,
          color: AppColors.primary,
        ),
      ),
    );

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.borderLight),
      ),
      clipBehavior: Clip.antiAlias,
      padding: const EdgeInsets.all(4),
      child: logoUrl == null || logoUrl!.isEmpty
          ? fallback
          : CachedNetworkImage(
              imageUrl: logoUrl!,
              fit: BoxFit.contain,
              placeholder: (_, _) => fallback,
              errorWidget: (_, _, _) => fallback,
            ),
    );
  }
}

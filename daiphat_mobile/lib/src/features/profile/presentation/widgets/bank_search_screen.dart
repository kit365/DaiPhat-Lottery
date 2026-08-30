import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class BankSearchScreen extends StatefulWidget {
  final List<VietQrBankResponse> banks;

  const BankSearchScreen({super.key, required this.banks});

  @override
  State<BankSearchScreen> createState() => _BankSearchScreenState();
}

class _BankSearchScreenState extends State<BankSearchScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<VietQrBankResponse> get _filteredBanks {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return widget.banks;
    return widget.banks.where((bank) {
      return bank.shortName.toLowerCase().contains(q) ||
          bank.name.toLowerCase().contains(q) ||
          bank.code.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredBanks;

    return Scaffold(
      backgroundColor: AppColors.surfacePrimary,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
        surfaceTintColor: AppColors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: const SizedBox.shrink(),
        leadingWidth: 0,
        title: Text(
          'Tìm ngân hàng',
          style: AppTypography.mainWith(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close_rounded, color: AppColors.contentPlaceholderStrong),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              onChanged: (value) => setState(() => _query = value),
              style: AppTypography.mainWith(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Nhập tên Ngân hàng cần tìm kiếm',
                hintStyle: AppTypography.mainWith(
                  fontSize: 14,
                  color: AppColors.contentPlaceholderStrong,
                ),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: AppColors.contentPlaceholderStrong,
                  size: 22,
                ),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                        icon: const Icon(
                          Icons.cancel_rounded,
                          color: AppColors.contentPlaceholderStrong,
                          size: 20,
                        ),
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                filled: true,
                fillColor: AppColors.surfaceNeutral,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Text(
                      'Không tìm thấy ngân hàng',
                      style: AppTypography.mainWith(
                        fontSize: 14,
                        color: AppColors.contentPlaceholderStrong,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.only(bottom: 24),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const Divider(
                      height: 1,
                      indent: 72,
                      color: AppColors.surfaceNeutral,
                    ),
                    itemBuilder: (context, index) {
                      final bank = filtered[index];
                      return _BankListTile(
                        bank: bank,
                        onTap: () => Navigator.of(context).pop(bank),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _BankListTile extends StatelessWidget {
  final VietQrBankResponse bank;
  final VoidCallback onTap;

  const _BankListTile({required this.bank, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final logoUrl = bank.logo?.trim();

    return Material(
      color: AppColors.surfacePrimary,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              _BankLogo(logoUrl: logoUrl, label: bank.shortName),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bank.shortName,
                      style: AppTypography.mainWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMain,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      bank.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.mainWith(
                        fontSize: 12,
                        color: AppColors.contentPlaceholderStrong,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
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
    final resolvedLogoUrl = logoUrl?.trim();
    final hasLogo = resolvedLogoUrl != null && resolvedLogoUrl.isNotEmpty;

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.borderLight),
      ),
      clipBehavior: Clip.antiAlias,
      child: hasLogo
          ? CachedNetworkImage(
              imageUrl: resolvedLogoUrl,
              fit: BoxFit.contain,
              placeholder: (_, _) => Center(
                child: Text(
                  initial,
                  style: AppTypography.mainWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
              errorWidget: (_, _, _) => Center(
                child: Text(
                  initial,
                  style: AppTypography.mainWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
            )
          : Center(
              child: Text(
                initial,
                style: AppTypography.mainWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ),
    );
  }
}

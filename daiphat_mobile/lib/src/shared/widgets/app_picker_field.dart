import 'package:flutter/material.dart';

import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

enum AppPickerFieldVariant { outlined, embedded }

/// Shared presentation shell for picker-style form fields.
///
/// Features own their picker dialogs/sheets and business constraints; this
/// widget keeps label, value, state, spacing, and touch affordance consistent.
class AppPickerField extends StatelessWidget {
  const AppPickerField({
    super.key,
    this.label,
    required this.placeholder,
    this.value,
    this.errorText,
    required this.prefixIcon,
    this.suffixIcon = Icons.expand_more_rounded,
    this.isAvailable = true,
    this.variant = AppPickerFieldVariant.outlined,
    this.onTap,
    this.semanticLabel,
    this.semanticHint,
  });

  final String? label;
  final String placeholder;
  final String? value;
  final String? errorText;
  final IconData prefixIcon;
  final IconData? suffixIcon;
  final bool isAvailable;
  final AppPickerFieldVariant variant;
  final VoidCallback? onTap;
  final String? semanticLabel;
  final String? semanticHint;

  @override
  Widget build(BuildContext context) {
    final hasValue = value != null && value!.trim().isNotEmpty;
    final displayedValue = hasValue ? value!.trim() : placeholder;
    final isInteractive = onTap != null;
    final hasError = errorText != null;

    if (variant == AppPickerFieldVariant.embedded) {
      return _buildEmbedded(
        displayedValue: displayedValue,
        hasValue: hasValue,
        isInteractive: isInteractive,
        hasError: hasError,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: AppTypography.labelMedium(color: AppColors.contentSlate700),
          ),
          const SizedBox(height: 6),
        ],
        Semantics(
          button: isInteractive,
          enabled: isInteractive,
          label:
              semanticLabel ??
              (hasValue
                  ? '${label ?? 'Lựa chọn'}: $displayedValue'
                  : placeholder),
          hint: semanticHint ?? (hasError ? errorText : 'Mở bộ chọn'),
          onTap: onTap,
          child: ExcludeSemantics(
            child: Material(
              color: AppColors.transparent,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(12),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 48),
                  child: InputDecorator(
                    decoration: InputDecoration(
                      isDense: true,
                      filled: true,
                      fillColor: isAvailable
                          ? AppColors.surfacePrimary
                          : AppColors.surfaceSoft,
                      errorText: errorText,
                      prefixIcon: Icon(
                        prefixIcon,
                        color: isAvailable
                            ? AppColors.contentMuted
                            : AppColors.borderMuted,
                        size: 20,
                      ),
                      suffixIcon: suffixIcon == null
                          ? null
                          : Icon(
                              suffixIcon,
                              color: isAvailable
                                  ? AppColors.contentMuted
                                  : AppColors.contentDisabled,
                              size: 20,
                            ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: AppColors.borderSubtle,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: hasError
                              ? AppColors.statusError
                              : AppColors.borderSubtle,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: hasError
                              ? AppColors.statusError
                              : AppColors.primary,
                          width: 1.4,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),
                    child: Text(
                      displayedValue,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.bodyMedium(
                        fontWeight: hasValue
                            ? FontWeight.w500
                            : FontWeight.w400,
                        color: hasValue && isAvailable
                            ? AppColors.contentSlate900
                            : AppColors.contentPlaceholder,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmbedded({
    required String displayedValue,
    required bool hasValue,
    required bool isInteractive,
    required bool hasError,
  }) {
    final valueColor = hasValue && isAvailable
        ? AppColors.contentPrimary
        : AppColors.contentPlaceholder;

    return Semantics(
      button: isInteractive,
      enabled: isInteractive,
      label:
          semanticLabel ??
          (hasValue ? '${label ?? 'Lựa chọn'}: $displayedValue' : placeholder),
      hint: semanticHint ?? (hasError ? errorText : 'Mở bộ chọn'),
      onTap: onTap,
      child: ExcludeSemantics(
        child: Material(
          color: AppColors.transparent,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      SizedBox(
                        width: 48,
                        child: Icon(
                          prefixIcon,
                          color: isAvailable
                              ? AppColors.contentPrimary
                              : AppColors.contentDisabled,
                          size: 26,
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (label != null)
                              Text(
                                label!,
                                style: AppTypography.labelLarge(
                                  color: hasError
                                      ? AppColors.statusError
                                      : AppColors.contentMuted,
                                ),
                              ),
                            const SizedBox(height: 4),
                            Text(
                              displayedValue,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.bodyMedium(
                                fontWeight: hasValue
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: valueColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (suffixIcon != null)
                        Icon(
                          suffixIcon,
                          color: AppColors.contentPrimary,
                          size: 28,
                        ),
                    ],
                  ),
                  if (hasError)
                    Padding(
                      padding: const EdgeInsets.only(left: 48, top: 6),
                      child: Text(
                        errorText!,
                        style: AppTypography.caption(
                          color: AppColors.statusError,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

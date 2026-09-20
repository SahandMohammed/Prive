import 'package:flutter/material.dart';

import '../../../../shared/ui/theme/app_colors.dart';

class HomeSectionLabel extends StatelessWidget {
  const HomeSectionLabel({
    required this.number,
    required this.title,
    super.key,
  });

  final String number;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 56, left: 24, right: 24),
      child: Row(
        children: [
          Text(
            number,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              letterSpacing: 1.05,
              fontWeight: FontWeight.w400,
              color: AppColors.olive,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Divider(color: AppColors.navBorder, thickness: 1, height: 1),
          ),
          const SizedBox(width: 12),
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              letterSpacing: 2.31,
              fontWeight: FontWeight.w400,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

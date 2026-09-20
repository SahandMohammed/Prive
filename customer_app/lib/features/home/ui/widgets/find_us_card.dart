import 'package:flutter/material.dart';

import '../../../../shared/ui/theme/app_colors.dart';
import '../fixtures/home_fixtures.dart';

class FindUsCard extends StatelessWidget {
  const FindUsCard({required this.location, this.onGetDirections, super.key});

  final LoungeLocationFixture location;
  final VoidCallback? onGetDirections;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 48, left: 24, right: 24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surfaceWarm,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.oliveLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'FIND US',
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 10.5,
                letterSpacing: 2.31,
                fontWeight: FontWeight.w400,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              location.address,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w600,
                color: AppColors.navActive,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              location.city,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w400,
                color: AppColors.textBodyMuted,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(
                  Icons.access_time_outlined,
                  size: 14,
                  color: AppColors.olive,
                ),
                const SizedBox(width: 8),
                Text(
                  location.hours,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11.5,
                    color: AppColors.olive,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            InkWell(
              onTap: onGetDirections,
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.location_on_outlined,
                    size: 14,
                    color: AppColors.oliveLink,
                  ),
                  SizedBox(width: 6),
                  Text(
                    'Get directions',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.oliveLink,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

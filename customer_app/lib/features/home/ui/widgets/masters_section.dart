import 'package:flutter/material.dart';

import '../../../../shared/ui/theme/app_colors.dart';
import '../fixtures/home_fixtures.dart';

class MastersSection extends StatelessWidget {
  const MastersSection({
    required this.masters,
    this.onViewAll,
    this.onSelectMaster,
    super.key,
  });

  final List<MasterPreviewFixture> masters;
  final VoidCallback? onViewAll;
  final ValueChanged<MasterPreviewFixture>? onSelectMaster;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 20, left: 24, right: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'Choose your hands',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: AppColors.navActive,
                  letterSpacing: -0.2,
                ),
              ),
              InkWell(
                onTap: onViewAll,
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'All',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.oliveLink,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 11,
                      color: AppColors.oliveLink,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 298,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: masters.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final master = masters[index];
              return _MasterCard(
                master: master,
                onTap: () => onSelectMaster?.call(master),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _MasterCard extends StatelessWidget {
  const _MasterCard({required this.master, required this.onTap});

  final MasterPreviewFixture master;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: 152,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 196,
              width: 152,
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                borderRadius: BorderRadius.circular(12),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.network(
                master.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: AppColors.darkSurface,
                  child: const Center(
                    child: Icon(
                      Icons.person_outline,
                      color: AppColors.textMuted,
                      size: 36,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              master.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.navActive,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              master.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              master.nextAvailable,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 10.5,
                fontWeight: FontWeight.w400,
                color: AppColors.olive,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

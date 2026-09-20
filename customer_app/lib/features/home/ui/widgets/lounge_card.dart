import 'package:flutter/material.dart';

import '../../../../shared/ui/theme/app_colors.dart';
import '../fixtures/home_fixtures.dart';

class LoungeCard extends StatelessWidget {
  const LoungeCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, left: 24, right: 24),
      child: Container(
        height: 360,
        decoration: BoxDecoration(
          color: AppColors.darkSurface,
          borderRadius: BorderRadius.circular(14),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              HomeFixtures.loungeCardImage,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                color: AppColors.darkSurface,
                child: const Center(
                  child: Icon(
                    Icons.weekend_outlined,
                    color: AppColors.textMuted,
                    size: 48,
                  ),
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: const [0.0, 0.45, 1.0],
                  colors: [
                    const Color(0xFF141210).withValues(alpha: 0.1),
                    const Color(0xFF141210).withValues(alpha: 0.15),
                    const Color(0xFF12100E).withValues(alpha: 0.9),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 24,
              right: 24,
              bottom: 24,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'A quiet room,\nkept for you.',
                    style: TextStyle(
                      fontSize: 26,
                      height: 1.12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.26,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Icon(
                        Icons.access_time_outlined,
                        size: 14,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '09:00 — 20:00 · Daily',
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11.5,
                          letterSpacing: 0.28,
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
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

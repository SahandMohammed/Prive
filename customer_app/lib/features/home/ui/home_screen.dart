import 'package:flutter/material.dart';

import '../../../shared/ui/theme/app_colors.dart';
import '../../../shared/ui/theme/app_radius.dart';
import '../../../shared/ui/theme/app_spacing.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'PRIVÉ',
          semanticsLabel: 'Privé Lounge',
          style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 2.4),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: AppSpacing.xl),
                  Text('Welcome to Privé', style: textTheme.displaySmall),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'A calm, considered way to plan your next grooming '
                    'experience.',
                    style: textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.calendar_month_outlined,
                            color: AppColors.primary,
                            semanticLabel: 'Appointments',
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Your experience, in one place',
                                  style: textTheme.titleMedium,
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Booking, appointments, visits, and your '
                                  'profile will be available here.',
                                  style: textTheme.bodyMedium?.copyWith(
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
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

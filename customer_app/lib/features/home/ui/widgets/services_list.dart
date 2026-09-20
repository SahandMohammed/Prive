import 'package:flutter/material.dart';

import '../../../../shared/ui/theme/app_colors.dart';
import '../fixtures/home_fixtures.dart';

class ServicesList extends StatelessWidget {
  const ServicesList({required this.services, this.onSelectService, super.key});

  final List<ServiceItemFixture> services;
  final ValueChanged<ServiceItemFixture>? onSelectService;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, left: 24, right: 24),
      child: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.navBorder, width: 1)),
        ),
        child: Column(
          children: [
            for (final service in services)
              InkWell(
                onTap: () => onSelectService?.call(service),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: const BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: AppColors.borderLight,
                        width: 1,
                      ),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        service.title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w400,
                          color: AppColors.darkSurface,
                        ),
                      ),
                      const Icon(
                        Icons.arrow_forward_ios_rounded,
                        size: 13,
                        color: AppColors.textMuted,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

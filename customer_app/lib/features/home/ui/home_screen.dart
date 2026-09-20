import 'package:flutter/material.dart';

import '../../../shared/ui/theme/app_colors.dart';
import 'fixtures/home_fixtures.dart';
import 'widgets/find_us_card.dart';
import 'widgets/inside_prive_gallery.dart';
import 'widgets/lounge_card.dart';
import 'widgets/masters_section.dart';
import 'widgets/next_visit_card.dart';
import 'widgets/section_label.dart';
import 'widgets/services_list.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        top: true,
        bottom: false,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar / Header
              _buildTopBar(),

              // Greeting Section
              _buildGreeting(),

              // Your Next Visit Card
              const NextVisitCard(visit: HomeFixtures.upcomingVisit),

              // Primary CTA Button
              _buildBookAppointmentButton(),

              // Section 01: The Lounge
              const HomeSectionLabel(number: '01', title: 'The lounge'),
              const LoungeCard(),

              // Section 02: The Masters
              const HomeSectionLabel(number: '02', title: 'The masters'),
              MastersSection(masters: HomeFixtures.masters),

              // Section 03: Inside Privé
              const HomeSectionLabel(number: '03', title: 'Inside Privé'),
              const InsidePriveGallery(items: HomeFixtures.gallery),

              // Section 04: Services
              const HomeSectionLabel(number: '04', title: 'Services'),
              ServicesList(services: HomeFixtures.services),

              // Find us card
              const FindUsCard(location: HomeFixtures.location),

              // Footer
              _buildFooter(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 8, left: 24, right: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Privé',
            style: TextStyle(
              fontFamily: 'serif',
              fontSize: 26,
              fontStyle: FontStyle.italic,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.65,
              color: AppColors.navActive,
            ),
          ),
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: AppColors.oliveLight,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text(
                'S',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.olive,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGreeting() {
    return const Padding(
      padding: EdgeInsets.only(top: 32, left: 24, right: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'WEDNESDAY · 14 SEPTEMBER',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 10.5,
              letterSpacing: 2.31,
              fontWeight: FontWeight.w400,
              color: AppColors.textMuted,
            ),
          ),
          SizedBox(height: 12),
          Text(
            'Good afternoon,\nSahand',
            style: TextStyle(
              fontSize: 34,
              height: 1.05,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.68,
              color: AppColors.navActive,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookAppointmentButton() {
    return Padding(
      padding: const EdgeInsets.only(top: 32, left: 24, right: 24),
      child: SizedBox(
        height: 56,
        width: double.infinity,
        child: FilledButton(
          onPressed: () {},
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.navActive,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(11),
            ),
            elevation: 0,
          ),
          child: const Text(
            'Book appointment',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              letterSpacing: -0.375,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return const Padding(
      padding: EdgeInsets.only(top: 56, bottom: 40, left: 24, right: 24),
      child: Center(
        child: Column(
          children: [
            Text(
              'Privé',
              style: TextStyle(
                fontFamily: 'serif',
                fontSize: 22,
                fontStyle: FontStyle.italic,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.55,
                color: AppColors.navActive,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Your master. Your time. Your Privé.',
              style: TextStyle(
                fontFamily: 'serif',
                fontSize: 14,
                fontStyle: FontStyle.italic,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

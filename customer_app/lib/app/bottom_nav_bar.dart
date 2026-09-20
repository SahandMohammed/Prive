import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../shared/ui/theme/app_colors.dart';
import '../shared/ui/theme/app_typography.dart';

/// Available primary navigation destinations in the Privé customer app.
enum PriveNavDestination {
  home(label: 'Home'),
  appointments(label: 'Appointments'),
  prive(label: 'Privé'),
  profile(label: 'Profile');

  const PriveNavDestination({required this.label});

  final String label;
}

/// The bottom navigation bar matching the Figma design specifications.
///
/// Features:
/// - Frosted glass translucent background with 12px blur
/// - 1px top border
/// - 4 destinations: Home, Appointments, Privé, and Profile
/// - Pixel-accurate vector icon painters derived from Figma design assets
/// - Accessible semantics and touch targets
class PriveBottomNavBar extends StatelessWidget {
  const PriveBottomNavBar({
    required this.currentIndex,
    required this.onTap,
    super.key,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            color: AppColors.navBackground,
            border: Border(
              top: BorderSide(color: AppColors.navBorder, width: 1),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 74,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    for (var i = 0; i < PriveNavDestination.values.length; i++)
                      Expanded(
                        child: _NavBarItem(
                          destination: PriveNavDestination.values[i],
                          isSelected: currentIndex == i,
                          onTap: () => onTap(i),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavBarItem extends StatelessWidget {
  const _NavBarItem({
    required this.destination,
    required this.isSelected,
    required this.onTap,
  });

  final PriveNavDestination destination;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = isSelected ? AppColors.navActive : AppColors.navInactive;
    final fontWeight = isSelected ? FontWeight.w500 : FontWeight.w400;

    return Semantics(
      button: true,
      selected: isSelected,
      label: destination.label,
      child: InkResponse(
        onTap: onTap,
        radius: 36,
        highlightColor: Colors.transparent,
        splashColor: AppColors.navActive.withValues(alpha: 0.08),
        child: SizedBox(
          height: double.infinity,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 22,
                height: 22,
                child: CustomPaint(
                  size: const Size(22, 22),
                  painter: _buildIconPainter(destination, color),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                destination.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.navLabel.copyWith(
                  color: color,
                  fontWeight: fontWeight,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  CustomPainter _buildIconPainter(
    PriveNavDestination destination,
    Color color,
  ) {
    return switch (destination) {
      PriveNavDestination.home => _HomeIconPainter(color: color),
      PriveNavDestination.appointments => _CalendarIconPainter(color: color),
      PriveNavDestination.prive => _PriveStarIconPainter(color: color),
      PriveNavDestination.profile => _ProfileIconPainter(color: color),
    };
  }
}

/// Hosts the navigation shell and the persistent [PriveBottomNavBar].
class ScaffoldWithNavBar extends StatelessWidget {
  const ScaffoldWithNavBar({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: PriveBottomNavBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}

// Vector painters reproducing Figma SVG assets with 1:1 precision.

class _HomeIconPainter extends CustomPainter {
  const _HomeIconPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 22.0;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.28333 * scale
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final roof = Path()
      ..moveTo(3.66667 * scale, 9.625 * scale)
      ..lineTo(11.0 * scale, 3.66667 * scale)
      ..lineTo(18.3333 * scale, 9.625 * scale);
    canvas.drawPath(roof, paint);

    final walls = Path()
      ..moveTo(5.5 * scale, 8.70833 * scale)
      ..lineTo(5.5 * scale, 18.3333 * scale)
      ..lineTo(16.5 * scale, 18.3333 * scale)
      ..lineTo(16.5 * scale, 8.70833 * scale);
    canvas.drawPath(walls, paint);
  }

  @override
  bool shouldRepaint(_HomeIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _CalendarIconPainter extends CustomPainter {
  const _CalendarIconPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 22.0;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.28333 * scale
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final rect = RRect.fromRectAndRadius(
      Rect.fromLTRB(
        3.66667 * scale,
        5.04167 * scale,
        18.3333 * scale,
        18.3333 * scale,
      ),
      Radius.circular(1.375 * scale),
    );
    canvas.drawRRect(rect, paint);

    final lines = Path()
      ..moveTo(3.66667 * scale, 8.70833 * scale)
      ..lineTo(18.3333 * scale, 8.70833 * scale)
      ..moveTo(7.33333 * scale, 3.20833 * scale)
      ..lineTo(7.33333 * scale, 6.875 * scale)
      ..moveTo(14.6667 * scale, 3.20833 * scale)
      ..lineTo(14.6667 * scale, 6.875 * scale);
    canvas.drawPath(lines, paint);
  }

  @override
  bool shouldRepaint(_CalendarIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _PriveStarIconPainter extends CustomPainter {
  const _PriveStarIconPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 22.0;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.28333 * scale
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path()
      ..moveTo(11.0 * scale, 3.20833 * scale)
      ..lineTo(12.7417 * scale, 8.25 * scale)
      ..lineTo(17.875 * scale, 8.25 * scale)
      ..lineTo(13.75 * scale, 11.3667 * scale)
      ..lineTo(15.3083 * scale, 16.5 * scale)
      ..lineTo(11.0 * scale, 13.3833 * scale)
      ..lineTo(6.69167 * scale, 16.5 * scale)
      ..lineTo(8.25 * scale, 11.3667 * scale)
      ..lineTo(4.125 * scale, 8.25 * scale)
      ..lineTo(9.25833 * scale, 8.25 * scale)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_PriveStarIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _ProfileIconPainter extends CustomPainter {
  const _ProfileIconPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 22.0;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.28333 * scale
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawCircle(
      Offset(11.0 * scale, 7.33333 * scale),
      3.66667 * scale,
      paint,
    );

    final shoulders = Path()
      ..moveTo(4.125 * scale, 18.3333 * scale)
      ..cubicTo(
        5.225 * scale,
        14.9417 * scale,
        7.79167 * scale,
        13.2917 * scale,
        11.0 * scale,
        13.2917 * scale,
      )
      ..cubicTo(
        14.2083 * scale,
        13.2917 * scale,
        16.775 * scale,
        14.9417 * scale,
        17.875 * scale,
        18.3333 * scale,
      );
    canvas.drawPath(shoulders, paint);
  }

  @override
  bool shouldRepaint(_ProfileIconPainter oldDelegate) =>
      oldDelegate.color != color;
}

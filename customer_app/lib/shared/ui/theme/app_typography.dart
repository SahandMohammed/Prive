import 'package:flutter/material.dart';

abstract final class AppTypography {
  static const textTheme = TextTheme(
    displaySmall: TextStyle(
      fontSize: 36,
      height: 1.12,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.8,
    ),
    headlineSmall: TextStyle(
      fontSize: 24,
      height: 1.25,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.2,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      height: 1.3,
      fontWeight: FontWeight.w600,
    ),
    titleMedium: TextStyle(
      fontSize: 16,
      height: 1.4,
      fontWeight: FontWeight.w600,
    ),
    bodyLarge: TextStyle(fontSize: 17, height: 1.55),
    bodyMedium: TextStyle(fontSize: 15, height: 1.5),
    labelLarge: TextStyle(
      fontSize: 15,
      height: 1.25,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prive_customer/app/app.dart';
import 'package:prive_customer/app/bottom_nav_bar.dart';

void main() {
  testWidgets(
    'boots the customer application and displays home screen and bottom nav',
    (tester) async {
      await tester.pumpWidget(const ProviderScope(child: PriveCustomerApp()));
      await tester.pumpAndSettle();

      // Verify Home Screen elements from Figma
      expect(find.text('Privé'), findsWidgets);
      expect(find.text('Good afternoon,\nSahand'), findsOneWidget);
      expect(find.text('YOUR NEXT VISIT'), findsOneWidget);
      expect(find.text('Master Daban'), findsOneWidget);
      expect(find.text('Book appointment'), findsOneWidget);

      // Verify section labels
      expect(find.text('THE LOUNGE'), findsOneWidget);
      expect(find.text('THE MASTERS'), findsOneWidget);
      expect(find.text('INSIDE PRIVÉ'), findsOneWidget);
      expect(find.text('SERVICES'), findsOneWidget);

      // Verify all bottom navigation items
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Appointments'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
    },
  );

  testWidgets('navigates between bottom navigation bar tabs', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PriveCustomerApp()));
    await tester.pumpAndSettle();

    // Tap Appointments tab
    await tester.tap(find.text('Appointments'));
    await tester.pumpAndSettle();
    expect(find.text('APPOINTMENTS'), findsOneWidget);
    expect(find.text('Your Appointments'), findsOneWidget);

    // Tap Privé tab in bottom nav
    await tester.tap(
      find.descendant(
        of: find.byType(PriveBottomNavBar),
        matching: find.text('Privé'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('PRIVÉ LOUNGE'), findsOneWidget);
    expect(find.text('The Privé Experience'), findsOneWidget);

    // Tap Profile tab
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('PROFILE'), findsOneWidget);
    expect(find.text('Account & Preferences'), findsOneWidget);

    // Return to Home tab
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    expect(find.text('Good afternoon,\nSahand'), findsOneWidget);
  });

  testWidgets('PriveBottomNavBar invokes callback with tapped index', (
    tester,
  ) async {
    int? selectedIndex;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: PriveBottomNavBar(
            currentIndex: 0,
            onTap: (index) => selectedIndex = index,
          ),
        ),
      ),
    );

    expect(find.byType(PriveBottomNavBar), findsOneWidget);

    await tester.tap(find.text('Appointments'));
    await tester.pump();
    expect(selectedIndex, equals(1));

    await tester.tap(find.text('Privé'));
    await tester.pump();
    expect(selectedIndex, equals(2));

    await tester.tap(find.text('Profile'));
    await tester.pump();
    expect(selectedIndex, equals(3));
  });
}

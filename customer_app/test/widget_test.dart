import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prive_customer/app/app.dart';

void main() {
  testWidgets('boots the customer application', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PriveCustomerApp()));
    await tester.pumpAndSettle();

    expect(find.text('PRIVÉ'), findsOneWidget);
    expect(find.text('Welcome to Privé'), findsOneWidget);
  });
}

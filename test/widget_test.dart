// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:levelup/main.dart';

void main() {
  testWidgets('Splash screen leads to onboarding then home via skip',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const LevelUpApp(
        logoImage: AssetImage('assets/logo.png'),
      ),
    );

    expect(find.text('Home goes here'), findsNothing);

    await tester.pump(const Duration(seconds: 3));
    await tester.pump();

    expect(find.text('Online Learning'), findsOneWidget);

    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    expect(find.text('Home goes here'), findsOneWidget);
  });
}

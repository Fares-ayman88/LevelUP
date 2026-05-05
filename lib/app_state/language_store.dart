import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageOption {
  const LanguageOption({
    required this.code,
    required this.label,
    required this.locale,
  });

  final String code;
  final String label;
  final Locale locale;
}

class LanguageStore {
  static const String _prefKey = 'language_selected_v1';

  static const List<LanguageOption> subCategories = [
    LanguageOption(code: 'en_us', label: 'English (US)', locale: Locale('en', 'US')),
    LanguageOption(code: 'en_uk', label: 'English (UK)', locale: Locale('en', 'GB')),
  ];

  static const List<LanguageOption> allLanguages = [
    LanguageOption(code: 'en_us', label: 'English (US)', locale: Locale('en', 'US')),
    LanguageOption(code: 'ar', label: 'Arabic', locale: Locale('ar')),
    LanguageOption(code: 'hi', label: 'Hindi', locale: Locale('hi')),
    LanguageOption(code: 'bn', label: 'Bengali', locale: Locale('bn')),
    LanguageOption(code: 'de', label: 'Deutsch', locale: Locale('de')),
    LanguageOption(code: 'it', label: 'Italian', locale: Locale('it')),
    LanguageOption(code: 'ko', label: 'Korean', locale: Locale('ko')),
    LanguageOption(code: 'fr', label: 'Francais', locale: Locale('fr')),
    LanguageOption(code: 'ru', label: 'Russian', locale: Locale('ru')),
    LanguageOption(code: 'pl', label: 'Polish', locale: Locale('pl')),
    LanguageOption(code: 'es', label: 'Spanish', locale: Locale('es')),
    LanguageOption(code: 'zh', label: 'Mandarin', locale: Locale('zh')),
  ];

  static final ValueNotifier<LanguageOption> current =
      ValueNotifier<LanguageOption>(_byCode('en_us'));

  static List<Locale> get supportedLocales =>
      allLanguages.map((option) => option.locale).toSet().toList();

  static LanguageOption _byCode(String code) {
    return allLanguages.firstWhere(
      (option) => option.code == code,
      orElse: () => allLanguages.first,
    );
  }

  static Future<void> init() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? saved = prefs.getString(_prefKey);
    if (saved == null || saved.trim().isEmpty) return;
    final LanguageOption option = _byCode(saved);
    if (option.code != current.value.code) {
      current.value = option;
    }
  }

  static Future<void> setLanguage(String code) async {
    final LanguageOption option = _byCode(code);
    current.value = option;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, option.code);
  }
}

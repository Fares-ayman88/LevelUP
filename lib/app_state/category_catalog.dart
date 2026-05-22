import 'package:flutter/foundation.dart';

class CategoryCatalog {
  static final ValueNotifier<List<String>> categories =
      ValueNotifier<List<String>>(_seedCategories);

  static List<String> get items => categories.value;

  static bool hasCategory(String value) {
    final String normalized = value.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    return categories.value
        .any((category) => category.toLowerCase() == normalized);
  }

  static void addCategory(String value) {
    final String trimmed = value.trim();
    if (trimmed.isEmpty) return;
    if (hasCategory(trimmed)) return;
    categories.value = [...categories.value, trimmed];
  }

  static const List<String> _seedCategories = [
    '3D Design',
    'Graphic Design',
    'SEO & Marketing',
    'Finance & Accounting',
    'Personal Development',
    'Office Productivity',
    'HR Management',
    'Programming',
    'Web Development',
    'Arts & Humanities',
    'Business',
    'Photography',
  ];
}

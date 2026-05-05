import 'package:pocketbase/pocketbase.dart';

import 'pocketbase_config.dart';

class PocketBaseService {
  PocketBaseService._();

  static PocketBase? _client;

  static PocketBase get client =>
      _client ??= PocketBase(PocketBaseConfig.endpoint);

  static void reset() {
    _client = PocketBase(PocketBaseConfig.endpoint);
  }

  static const String coursesCollection = 'courses';
  static const String mentorsCollection = 'mentors';
}

class StaticAdmins {
  StaticAdmins._();

  static const List<String> _domains = [
    'levelup.admin',
    'levelup.app',
  ];
  static const Map<String, String> _aliases = {
    'sa3doon': 'sa3doon',
    'fares': 'fares',
    'mahmoud': 'mahmoud',
  };
  static const String _shortPasswordSuffix = '123';

  static bool isAlias(String input) {
    final String key = input.trim().toLowerCase();
    return _aliases.containsKey(key);
  }

  static String? passwordForAlias(String input) {
    final String key = input.trim().toLowerCase();
    return _aliases[key];
  }

  // Firebase email/password requires at least 6 chars.
  // Keep typed admin password simple (alias), but use a stable compliant
  // password internally for auth when alias is shorter.
  static String? authPasswordForAlias(String input) {
    final String? raw = passwordForAlias(input);
    if (raw == null) return null;
    if (raw.length >= 6) return raw;
    return '$raw$_shortPasswordSuffix';
  }

  static List<String> emailsForAlias(String alias) {
    final String key = alias.trim().toLowerCase();
    return _domains.map((domain) => '$key@$domain').toList();
  }

  static String emailForAlias(String alias) {
    final String key = alias.trim().toLowerCase();
    return '$key@${_domains.first}';
  }

  static bool isAdminEmail(String email) {
    final String normalized = email.trim().toLowerCase();
    final int at = normalized.lastIndexOf('@');
    if (at <= 0) return false;
    final String local = normalized.substring(0, at);
    final String domain = normalized.substring(at + 1);
    if (!_domains.contains(domain)) return false;
    return _aliases.containsKey(local);
  }
}

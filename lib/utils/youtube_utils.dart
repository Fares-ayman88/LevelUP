import 'package:youtube_player_iframe/youtube_player_iframe.dart';

String? extractYoutubeId(String input) {
  final String trimmed = input.trim();
  if (trimmed.isEmpty) return null;

  final String? converted = YoutubePlayerController.convertUrlToId(
    trimmed,
    trimWhitespaces: true,
  );
  if (converted != null && _isValidYoutubeId(converted)) {
    return converted;
  }

  final Uri? uri = Uri.tryParse(trimmed);
  if (uri == null || uri.host.isEmpty) return null;
  if (uri.pathSegments.isEmpty) return null;

  final String last = uri.pathSegments.last;
  if (_isValidYoutubeId(last)) {
    return last;
  }
  return null;
}

bool _isValidYoutubeId(String value) {
  return RegExp(r'^[A-Za-z0-9_-]{11}$').hasMatch(value);
}

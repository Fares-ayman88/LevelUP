import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

ImageProvider? resolveImageProvider(String? path) {
  final String trimmed = (path ?? '').trim();
  if (trimmed.isEmpty) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return NetworkImage(trimmed);
  }
  if (kIsWeb) {
    return NetworkImage(trimmed);
  }
  return FileImage(File(trimmed));
}

DecorationImage? resolveDecorationImage(
  String? path, {
  BoxFit fit = BoxFit.cover,
}) {
  final ImageProvider? provider = resolveImageProvider(path);
  if (provider == null) return null;
  return DecorationImage(image: provider, fit: fit);
}

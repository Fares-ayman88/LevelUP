import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:pocketbase/pocketbase.dart';

import 'pocketbase_service.dart';

class ProfileImageService {
  ProfileImageService._();

  static const String _profileCategory = '__profile__';
  static const String _subtitlePrefix = 'profile:';
  static const String _sourceCustom = 'custom';
  static const String _sourceAuth = 'auth';

  static PocketBase get _pb => PocketBaseService.client;

  static Future<String> uploadAvatar({
    required User user,
    required File imageFile,
    required String displayName,
  }) async {
    final DocumentReference<Map<String, dynamic>> userRef = FirebaseFirestore
        .instance
        .collection('users')
        .doc(user.uid);
    final DocumentSnapshot<Map<String, dynamic>> userSnap = await userRef.get();
    final Map<String, dynamic> data = userSnap.data() ?? <String, dynamic>{};

    String recordId = (data['pbProfileId'] ?? '').toString().trim();
    if (recordId.isEmpty) {
      final String filterValue = _escapeFilter('$_subtitlePrefix${user.uid}');
      final ResultList<RecordModel> existing = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .getList(page: 1, perPage: 1, filter: 'subtitle="$filterValue"');
      if (existing.items.isNotEmpty) {
        recordId = existing.items.first.id;
      }
    }

    final String resolvedName = displayName.trim().isNotEmpty
        ? displayName.trim()
        : (user.displayName ?? '').trim().isNotEmpty
        ? (user.displayName ?? '').trim()
        : (user.email ?? 'User').split('@').first;

    final Map<String, dynamic> body = <String, dynamic>{
      'name': resolvedName,
      'category': _profileCategory,
      'subtitle': '$_subtitlePrefix${user.uid}',
      'courses': '0',
      'students': '0',
      'ratings': '0',
      'updatedAt': DateTime.now().toIso8601String(),
    };
    final List<http.MultipartFile> files = <http.MultipartFile>[
      await http.MultipartFile.fromPath('image', imageFile.path),
    ];

    RecordModel saved;
    if (recordId.isNotEmpty) {
      try {
        saved = await _pb
            .collection(PocketBaseService.mentorsCollection)
            .update(recordId, body: body, files: files);
      } catch (_) {
        saved = await _pb
            .collection(PocketBaseService.mentorsCollection)
            .create(body: body, files: files);
      }
    } else {
      saved = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .create(body: body, files: files);
    }

    final String avatarUrl = _resolveImageUrl(saved);
    if (avatarUrl.isEmpty) {
      throw Exception('Could not resolve uploaded avatar URL.');
    }

    await userRef.set(<String, dynamic>{
      'photoUrl': avatarUrl,
      'avatarUrl': avatarUrl,
      'imageUrl': avatarUrl,
      'pbProfileId': saved.id,
      'photoSource': _sourceCustom,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    return avatarUrl;
  }

  static Future<void> syncFromAuthUser(User user, {String? displayName}) async {
    final DocumentReference<Map<String, dynamic>> userRef = FirebaseFirestore
        .instance
        .collection('users')
        .doc(user.uid);
    final DocumentSnapshot<Map<String, dynamic>> snap = await userRef.get();
    final Map<String, dynamic> data = snap.data() ?? <String, dynamic>{};

    final String recordId = await _ensureProfileRecord(
      user: user,
      userData: data,
      displayName: displayName,
      imageUrl: _authImageUrl(user),
    );

    final String source = (data['photoSource'] ?? '').toString().trim();
    final String currentPhoto = (data['photoUrl'] ?? '').toString().trim();
    final String authPhoto = _authImageUrl(user);
    final bool hasCustomPhoto =
        source == _sourceCustom && currentPhoto.isNotEmpty;
    final bool needsPocketBaseBackfill =
        recordId.isNotEmpty &&
        (currentPhoto.isEmpty || !_isWebUrl(currentPhoto));
    String pocketBasePhoto = needsPocketBaseBackfill
        ? await _resolveProfilePhotoFromRecord(recordId)
        : '';
    if (pocketBasePhoto.isEmpty && currentPhoto.isEmpty) {
      final String fallbackMentorPhoto = await _resolveLegacyMentorPhoto(
        user: user,
        displayName: displayName,
      );
      if (fallbackMentorPhoto.isNotEmpty) {
        pocketBasePhoto = fallbackMentorPhoto;
        await _savePhotoToProfileRecord(
          user: user,
          recordId: recordId,
          imageUrl: fallbackMentorPhoto,
          displayName: displayName,
        );
      }
    }

    if (hasCustomPhoto) {
      if (pocketBasePhoto.isNotEmpty && pocketBasePhoto != currentPhoto) {
        await userRef.set(<String, dynamic>{
          'photoUrl': pocketBasePhoto,
          'avatarUrl': pocketBasePhoto,
          'imageUrl': pocketBasePhoto,
          'pbProfileId': recordId,
          'photoSource': _sourceCustom,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
        return;
      }

      if (recordId.isNotEmpty &&
          (data['pbProfileId'] ?? '').toString() != recordId) {
        await userRef.set(<String, dynamic>{
          'pbProfileId': recordId,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }
      return;
    }

    if (authPhoto.isEmpty) {
      if (pocketBasePhoto.isNotEmpty) {
        await userRef.set(<String, dynamic>{
          'photoUrl': pocketBasePhoto,
          'avatarUrl': pocketBasePhoto,
          'imageUrl': pocketBasePhoto,
          'photoSource': _sourceCustom,
          'pbProfileId': recordId,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
        return;
      }

      if (recordId.isNotEmpty &&
          (data['pbProfileId'] ?? '').toString() != recordId) {
        await userRef.set(<String, dynamic>{
          'pbProfileId': recordId,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }
      return;
    }

    await userRef.set(<String, dynamic>{
      'photoUrl': authPhoto,
      'avatarUrl': authPhoto,
      'imageUrl': authPhoto,
      'photoSource': _sourceAuth,
      'pbProfileId': recordId,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  static Future<String> _ensureProfileRecord({
    required User user,
    required Map<String, dynamic> userData,
    required String? displayName,
    required String imageUrl,
  }) async {
    String recordId = (userData['pbProfileId'] ?? '').toString().trim();
    if (recordId.isEmpty) {
      final String filterValue = _escapeFilter('$_subtitlePrefix${user.uid}');
      final ResultList<RecordModel> existing = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .getList(page: 1, perPage: 1, filter: 'subtitle="$filterValue"');
      if (existing.items.isNotEmpty) {
        recordId = existing.items.first.id;
      }
    }

    final String resolvedName =
        displayName != null && displayName.trim().isNotEmpty
        ? displayName.trim()
        : (user.displayName ?? '').trim().isNotEmpty
        ? (user.displayName ?? '').trim()
        : (user.email ?? 'User').split('@').first;

    final Map<String, dynamic> body = <String, dynamic>{
      'name': resolvedName,
      'category': _profileCategory,
      'subtitle': '$_subtitlePrefix${user.uid}',
      'courses': '0',
      'students': '0',
      'ratings': '0',
    };
    if (imageUrl.isNotEmpty) {
      body['imageUrl'] = imageUrl;
    }

    RecordModel saved;
    if (recordId.isNotEmpty) {
      try {
        saved = await _pb
            .collection(PocketBaseService.mentorsCollection)
            .update(recordId, body: body);
      } catch (_) {
        saved = await _pb
            .collection(PocketBaseService.mentorsCollection)
            .create(body: body);
      }
    } else {
      saved = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .create(body: body);
    }
    return saved.id;
  }

  static String _authImageUrl(User user) {
    return (user.photoURL ?? '').trim();
  }

  static Future<void> _savePhotoToProfileRecord({
    required User user,
    required String recordId,
    required String imageUrl,
    String? displayName,
  }) async {
    if (recordId.trim().isEmpty || imageUrl.trim().isEmpty) return;
    final String resolvedName =
        displayName != null && displayName.trim().isNotEmpty
        ? displayName.trim()
        : (user.displayName ?? '').trim().isNotEmpty
        ? (user.displayName ?? '').trim()
        : (user.email ?? 'User').split('@').first;
    final Map<String, dynamic> body = <String, dynamic>{
      'name': resolvedName,
      'category': _profileCategory,
      'subtitle': '$_subtitlePrefix${user.uid}',
      'courses': '0',
      'students': '0',
      'ratings': '0',
      'imageUrl': imageUrl,
      'updatedAt': DateTime.now().toIso8601String(),
    };
    try {
      await _pb
          .collection(PocketBaseService.mentorsCollection)
          .update(recordId, body: body);
    } catch (_) {}
  }

  static Future<String> _resolveLegacyMentorPhoto({
    required User user,
    String? displayName,
  }) async {
    final Set<String> keys = <String>{};
    void addKey(String? value) {
      final String normalized = (value ?? '').trim().toLowerCase();
      if (normalized.isNotEmpty) keys.add(normalized);
    }

    addKey(displayName);
    addKey(user.displayName);
    final String email = (user.email ?? '').trim().toLowerCase();
    if (email.contains('@')) {
      addKey(email.split('@').first);
    } else {
      addKey(email);
    }
    if (keys.isEmpty) return '';

    for (final String key in keys) {
      final String escaped = _escapeFilter(key);
      try {
        final ResultList<RecordModel> matches = await _pb
            .collection(PocketBaseService.mentorsCollection)
            .getList(page: 1, perPage: 12, filter: 'name~"$escaped"');
        final String matched = _resolveBestMatchingRecord(matches.items, keys);
        if (matched.isNotEmpty) return matched;
      } catch (_) {}
    }

    try {
      final ResultList<RecordModel> all = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .getList(page: 1, perPage: 200);
      return _resolveBestMatchingRecord(all.items, keys);
    } catch (_) {
      return '';
    }
  }

  static String _resolveBestMatchingRecord(
    List<RecordModel> records,
    Set<String> keys,
  ) {
    for (final RecordModel record in records) {
      final String category = (record.data['category'] ?? '').toString().trim();
      if (category == _profileCategory) continue;
      final String name = (record.data['name'] ?? '')
          .toString()
          .trim()
          .toLowerCase();
      if (name.isEmpty) continue;
      final bool matches = keys.any(
        (key) => name == key || name.contains(key) || key.contains(name),
      );
      if (!matches) continue;
      final String image = _resolveImageUrl(record);
      if (image.isNotEmpty) return image;
    }
    return '';
  }

  static Future<String> _resolveProfilePhotoFromRecord(String recordId) async {
    if (recordId.trim().isEmpty) return '';
    try {
      final RecordModel record = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .getOne(recordId);
      return _resolveImageUrl(record);
    } catch (_) {
      return '';
    }
  }

  static String _resolveImageUrl(RecordModel record) {
    final Object? value = record.data['image'];
    if (value is String && value.trim().isNotEmpty) {
      return _pb.files.getUrl(record, value.trim()).toString();
    }
    if (value is List) {
      for (final Object? entry in value) {
        if (entry is String && entry.trim().isNotEmpty) {
          return _pb.files.getUrl(record, entry.trim()).toString();
        }
      }
    }
    final String direct = (record.data['imageUrl'] ?? '').toString().trim();
    return direct;
  }

  static String _escapeFilter(String value) {
    return value.replaceAll('"', '\\"');
  }

  static bool _isWebUrl(String value) {
    final String trimmed = value.trim().toLowerCase();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  }
}

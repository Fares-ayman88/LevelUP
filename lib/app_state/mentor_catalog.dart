import 'dart:async';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:pocketbase/pocketbase.dart';

import '../services/pocketbase_service.dart';

class MentorItem {
  const MentorItem({
    required this.id,
    required this.name,
    required this.category,
    required this.subtitle,
    required this.courses,
    required this.students,
    required this.ratings,
    this.imagePath,
    this.featuredRank,
    this.bio = '',
  });

  final String id;
  final String name;
  final String category;
  final String subtitle;
  final String courses;
  final String students;
  final String ratings;
  final String? imagePath;
  final int? featuredRank;
  final String bio;

  MentorItem copyWith({
    String? id,
    String? name,
    String? category,
    String? subtitle,
    String? courses,
    String? students,
    String? ratings,
    String? imagePath,
    int? featuredRank,
    String? bio,
  }) {
    return MentorItem(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      subtitle: subtitle ?? this.subtitle,
      courses: courses ?? this.courses,
      students: students ?? this.students,
      ratings: ratings ?? this.ratings,
      imagePath: imagePath ?? this.imagePath,
      featuredRank: featuredRank ?? this.featuredRank,
      bio: bio ?? this.bio,
    );
  }

  factory MentorItem.fromMap(String id, Map<String, dynamic> data) {
    return MentorItem(
      id: id,
      name: (data['name'] ?? '').toString(),
      category: (data['category'] ?? '').toString(),
      subtitle: (data['subtitle'] ?? '').toString(),
      courses: (data['courses'] ?? '0').toString(),
      students: (data['students'] ?? '0').toString(),
      ratings: (data['ratings'] ?? '0').toString(),
      imagePath: (data['imageUrl'] ?? data['imagePath'] ?? '').toString(),
      bio: (data['bio'] ?? '').toString(),
      featuredRank: _toNullableInt(
        data['featuredRank'] ??
            data['featured_rank'] ??
            data['homeRank'] ??
            data['home_rank'] ??
            data['topRank'] ??
            data['top_rank'],
      ),
    );
  }

  Map<String, dynamic> toMap() {
    final Map<String, dynamic> data = {
      'name': name,
      'category': category,
      'subtitle': subtitle,
      'courses': courses,
      'students': students,
      'ratings': ratings,
      'imageUrl': imagePath ?? '',
      'bio': bio,
    };
    if (featuredRank != null) {
      data['featuredRank'] = featuredRank;
    }
    return data;
  }

  static int? _toNullableInt(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.round();
    if (value is String) {
      final String trimmed = value.trim();
      if (trimmed.isEmpty) return null;
      return int.tryParse(trimmed);
    }
    return null;
  }
}

class MentorCatalog {
  static final ValueNotifier<List<MentorItem>> mentors =
      ValueNotifier<List<MentorItem>>(_seedMentors);

  static List<MentorItem> get items => mentors.value;

  static bool _bound = false;
  static const Duration _writeTimeout = Duration(seconds: 20);

  static PocketBase get _pb => PocketBaseService.client;

  static Future<void> bind() async {
    if (_bound) return;
    _bound = true;
    try {
      await refresh();
    } catch (_) {
      mentors.value = _seedMentors;
    }
  }

  static Future<void> refresh() async {
    try {
      final List<MentorItem> fetched = await _fetchMentors();
      final List<MentorItem> firestoreMentors = await _fetchFirestoreMentors();
      final List<MentorItem> mergedFetched = _mergeFirestoreMentors(
        fetched,
        firestoreMentors,
      );
      final Map<String, String> profileOverlays =
          await _fetchProfileImageOverlays();
      final List<MentorItem> withProfileOverlays = _applyProfileImageOverlays(
        mergedFetched,
        profileOverlays,
      );
      final List<MentorItem> deduped = _dedupeMentorsByName(
        withProfileOverlays,
      );
      final List<MentorItem> items = _mergeSeedMentors(deduped);
      items.sort(
        (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
      );
      mentors.value = items;
    } catch (_) {
      mentors.value = _seedMentors;
    }
  }

  static bool hasName(String name, {String? excludeId}) {
    final String normalized = name.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    return mentors.value.any((mentor) {
      if (excludeId != null && mentor.id == excludeId) return false;
      return mentor.name.toLowerCase() == normalized;
    });
  }

  static MentorItem? findByName(String name) {
    final String normalized = name.trim().toLowerCase();
    if (normalized.isEmpty) return null;
    for (final MentorItem mentor in mentors.value) {
      if (mentor.name.toLowerCase() == normalized) {
        return mentor;
      }
    }
    return null;
  }

  static Future<MentorItem?> createMentor({
    required String name,
    required String category,
    String? subtitle,
    File? imageFile,
    String? imageUrl,
  }) async {
    final String trimmed = name.trim();
    if (trimmed.isEmpty) return null;
    final String resolvedCategory = category.trim().isEmpty
        ? 'General'
        : category.trim();
    final String resolvedSubtitle = (subtitle ?? '').trim().isNotEmpty
        ? subtitle!.trim()
        : '$resolvedCategory Mentor';
    final Map<String, dynamic> body = {
      'name': trimmed,
      'category': resolvedCategory,
      'subtitle': resolvedSubtitle,
      'courses': '0',
      'students': '0',
      'ratings': '0',
      'imageUrl': (imageUrl ?? '').trim(),
    };
    final List<http.MultipartFile> files = [];
    if (imageFile != null) {
      files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    }
    final RecordModel record = await _pb
        .collection(PocketBaseService.mentorsCollection)
        .create(body: body, files: files)
        .timeout(_writeTimeout);
    final MentorItem mentor = _fromRecord(record);
    mentors.value = [mentor, ...mentors.value];
    return mentor;
  }

  static Future<MentorItem?> addMentor(MentorItem mentor) async {
    final Map<String, dynamic> body = _mentorToBody(mentor);
    final RecordModel record = await _pb
        .collection(PocketBaseService.mentorsCollection)
        .create(body: body)
        .timeout(_writeTimeout);
    final MentorItem saved = _fromRecord(record);
    mentors.value = [saved, ...mentors.value];
    return saved;
  }

  static Future<MentorItem> updateMentor(
    MentorItem mentor, {
    File? imageFile,
  }) async {
    final Map<String, dynamic> body = _mentorToBody(mentor);
    final List<http.MultipartFile> files = [];
    if (imageFile != null) {
      files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    }
    final RecordModel record = await _pb
        .collection(PocketBaseService.mentorsCollection)
        .update(mentor.id, body: body, files: files)
        .timeout(_writeTimeout);
    final MentorItem saved = _fromRecord(record);
    mentors.value = mentors.value
        .map((item) => item.id == saved.id ? saved : item)
        .toList();
    return saved;
  }

  static Future<void> removeMentor(String id) async {
    if (id.trim().isEmpty) return;
    await _pb
        .collection(PocketBaseService.mentorsCollection)
        .delete(id)
        .timeout(_writeTimeout);
    mentors.value = mentors.value.where((mentor) => mentor.id != id).toList();
  }

  static String nextId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }

  static Future<List<MentorItem>> _fetchMentors() async {
    final List<RecordModel> records = await _pb
        .collection(PocketBaseService.mentorsCollection)
        .getFullList(sort: '-created')
        .timeout(_writeTimeout);
    return records
        .map(_fromRecord)
        .where((mentor) => mentor.category.trim() != '__profile__')
        .toList();
  }

  static Future<List<MentorItem>> _fetchFirestoreMentors() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return const <MentorItem>[];
    try {
      final QuerySnapshot<Map<String, dynamic>> snapshot =
          await FirebaseFirestore.instance.collection('mentors').get();
      return snapshot.docs.map((doc) {
        final Map<String, dynamic> data = doc.data();
        final String category =
            (data['category'] ?? '').toString().trim().isEmpty
            ? 'General'
            : (data['category'] ?? '').toString().trim();
        final String subtitle =
            (data['subtitle'] ?? '').toString().trim().isEmpty
            ? '$category Mentor'
            : (data['subtitle'] ?? '').toString().trim();
        final String imagePath = _resolveFirestoreImage(data);
        return MentorItem.fromMap(doc.id, <String, dynamic>{
          ...data,
          'category': category,
          'subtitle': subtitle,
          'courses': (data['courses'] ?? '0').toString(),
          'students': (data['students'] ?? '0').toString(),
          'ratings': (data['ratings'] ?? '0').toString(),
          'imageUrl': imagePath,
          'bio': (data['bio'] ?? '').toString(),
        });
      }).toList();
    } catch (_) {
      return const <MentorItem>[];
    }
  }

  static List<MentorItem> _mergeFirestoreMentors(
    List<MentorItem> base,
    List<MentorItem> firestoreMentors,
  ) {
    if (firestoreMentors.isEmpty) return List<MentorItem>.from(base);
    final Map<String, MentorItem> byName = <String, MentorItem>{
      for (final MentorItem item in base) item.name.trim().toLowerCase(): item,
    };
    for (final MentorItem cloudMentor in firestoreMentors) {
      final String key = cloudMentor.name.trim().toLowerCase();
      if (key.isEmpty) continue;
      final MentorItem? existing = byName[key];
      if (existing == null) {
        byName[key] = cloudMentor;
        continue;
      }
      byName[key] = existing.copyWith(
        category: existing.category.trim().isNotEmpty
            ? existing.category
            : cloudMentor.category,
        subtitle: existing.subtitle.trim().isNotEmpty
            ? existing.subtitle
            : cloudMentor.subtitle,
        imagePath: cloudMentor.imagePath?.trim().isNotEmpty == true
            ? cloudMentor.imagePath
            : existing.imagePath,
        bio: cloudMentor.bio.trim().isNotEmpty ? cloudMentor.bio : existing.bio,
      );
    }
    return byName.values.toList();
  }

  static Future<Map<String, String>> _fetchProfileImageOverlays() async {
    try {
      final List<RecordModel> records = await _pb
          .collection(PocketBaseService.mentorsCollection)
          .getFullList(filter: 'category="__profile__"', sort: '-updated');
      final Map<String, String> overlays = <String, String>{};
      for (final RecordModel record in records) {
        final String name = (record.data['name'] ?? '').toString().trim();
        if (name.isEmpty) continue;
        final String key = name.toLowerCase();
        if (overlays.containsKey(key)) continue;
        final String image = _resolveFileUrl(record, record.data['image']);
        final String direct = (record.data['imageUrl'] ?? '').toString().trim();
        final String resolved = image.trim().isNotEmpty ? image : direct;
        if (resolved.isEmpty) continue;
        overlays[key] = resolved;
      }
      return overlays;
    } catch (_) {
      return const <String, String>{};
    }
  }

  static List<MentorItem> _applyProfileImageOverlays(
    List<MentorItem> mentors,
    Map<String, String> overlays,
  ) {
    if (overlays.isEmpty) return mentors;
    return mentors.map((mentor) {
      final String key = mentor.name.trim().toLowerCase();
      final String overlay = overlays[key] ?? '';
      if (overlay.trim().isEmpty) return mentor;
      return mentor.copyWith(imagePath: overlay.trim());
    }).toList();
  }

  static List<MentorItem> _dedupeMentorsByName(List<MentorItem> items) {
    final Set<String> seen = <String>{};
    final List<MentorItem> result = <MentorItem>[];
    for (final MentorItem mentor in items) {
      final String key = mentor.name.trim().toLowerCase();
      if (key.isEmpty) continue;
      if (seen.add(key)) {
        result.add(mentor);
      }
    }
    return result;
  }

  static MentorItem _fromRecord(RecordModel record) {
    final Map<String, dynamic> data = Map<String, dynamic>.from(record.data);
    final String existingImage = (data['imageUrl'] ?? data['imagePath'] ?? '')
        .toString();
    if (existingImage.trim().isNotEmpty) {
      data['imageUrl'] = existingImage;
    } else {
      data['imageUrl'] = _resolveFileUrl(record, data['image']);
    }
    return MentorItem.fromMap(record.id, data);
  }

  static List<MentorItem> _mergeSeedMentors(List<MentorItem> fetched) {
    if (fetched.isEmpty) return List<MentorItem>.from(_seedMentors);
    final Set<String> seenNames = fetched
        .map((mentor) => mentor.name.trim().toLowerCase())
        .toSet();
    return <MentorItem>[
      ...fetched,
      ..._seedMentors.where(
        (mentor) => !seenNames.contains(mentor.name.trim().toLowerCase()),
      ),
    ];
  }

  static Future<({int added, Map<String, String> nameToId})>
  seedToServer() async {
    final List<MentorItem> existing = await _fetchMentors();
    final Map<String, MentorItem> byName = <String, MentorItem>{
      for (final MentorItem mentor in existing)
        mentor.name.trim().toLowerCase(): mentor,
    };
    int added = 0;
    for (final MentorItem seed in _seedMentors) {
      final String key = seed.name.trim().toLowerCase();
      if (byName.containsKey(key)) continue;
      final MentorItem? created = await createMentor(
        name: seed.name,
        category: seed.category,
        subtitle: seed.subtitle,
        imageUrl: seed.imagePath,
      );
      if (created != null) {
        added += 1;
        byName[key] = created;
      }
    }
    await refresh();
    final Map<String, String> nameToId = <String, String>{
      for (final MentorItem mentor in byName.values)
        mentor.name.trim(): mentor.id,
    };
    return (added: added, nameToId: nameToId);
  }

  static Map<String, dynamic> _mentorToBody(MentorItem mentor) {
    final Map<String, dynamic> body = {
      'name': mentor.name,
      'category': mentor.category,
      'subtitle': mentor.subtitle,
      'courses': mentor.courses,
      'students': mentor.students,
      'ratings': mentor.ratings,
      'imageUrl': mentor.imagePath ?? '',
    };
    if (mentor.featuredRank != null) {
      body['featuredRank'] = mentor.featuredRank;
    }
    return body;
  }

  static String _resolveFileUrl(RecordModel record, Object? value) {
    if (value == null) return '';
    if (value is String) {
      final String trimmed = value.trim();
      if (trimmed.isEmpty) return '';
      if (_looksLikeUrl(trimmed)) return trimmed;
      return _pb.files.getUrl(record, trimmed).toString();
    }
    if (value is List) {
      for (final Object? entry in value) {
        if (entry is String) {
          final String trimmed = entry.trim();
          if (trimmed.isEmpty) continue;
          if (_looksLikeUrl(trimmed)) return trimmed;
          return _pb.files.getUrl(record, trimmed).toString();
        }
      }
    }
    return '';
  }

  static bool _looksLikeUrl(String value) {
    return value.startsWith('http://') || value.startsWith('https://');
  }

  static String _resolveFirestoreImage(Map<String, dynamic> data) {
    final List<Object?> candidates = <Object?>[
      data['imageUrl'],
      data['imagePath'],
      data['avatarUrl'],
      data['photoUrl'],
      data['image'],
      data['photo'],
      data['avatar'],
    ];
    for (final Object? value in candidates) {
      final String trimmed = (value ?? '').toString().trim();
      if (trimmed.isNotEmpty) return trimmed;
    }
    return '';
  }

  static const List<MentorItem> _seedMentors = [
    MentorItem(
      id: 'm1',
      name: 'Sonja Carter',
      category: 'Graphic Design',
      subtitle: 'Graphic Design Mentor',
      courses: '18',
      students: '12400',
      ratings: '6420',
      imagePath: 'https://picsum.photos/id/1005/400/400',
    ),
    MentorItem(
      id: 'm2',
      name: 'Jensen Reed',
      category: 'Arts & Humanities',
      subtitle: 'Arts & Humanities Mentor',
      courses: '14',
      students: '9800',
      ratings: '5120',
      imagePath: 'https://picsum.photos/id/1011/400/400',
    ),
    MentorItem(
      id: 'm3',
      name: 'Victoria Lee',
      category: 'Programming',
      subtitle: 'Programming Mentor',
      courses: '22',
      students: '17300',
      ratings: '8420',
      imagePath: 'https://picsum.photos/id/1012/400/400',
    ),
    MentorItem(
      id: 'm4',
      name: 'Marco Castaldo',
      category: 'Web Development',
      subtitle: 'Web Development Mentor',
      courses: '16',
      students: '11250',
      ratings: '7030',
      imagePath: 'https://picsum.photos/id/1015/400/400',
    ),
    MentorItem(
      id: 'm5',
      name: 'Hana Ibrahim',
      category: 'Finance & Accounting',
      subtitle: 'Finance Mentor',
      courses: '12',
      students: '8450',
      ratings: '3920',
      imagePath: 'https://picsum.photos/id/1016/400/400',
    ),
    MentorItem(
      id: 'm6',
      name: 'Nour Elshamy',
      category: 'Photography',
      subtitle: 'Photography Mentor',
      courses: '10',
      students: '6200',
      ratings: '2810',
      imagePath: 'https://picsum.photos/id/1021/400/400',
    ),
    MentorItem(
      id: 'm7',
      name: 'Lina Farouk',
      category: 'HR Management',
      subtitle: 'HR Mentor',
      courses: '9',
      students: '5400',
      ratings: '2410',
      imagePath: 'https://picsum.photos/id/1027/400/400',
    ),
    MentorItem(
      id: 'm8',
      name: 'Omar Khaled',
      category: 'SEO & Marketing',
      subtitle: 'Marketing Mentor',
      courses: '15',
      students: '9100',
      ratings: '4680',
      imagePath: 'https://picsum.photos/id/1033/400/400',
    ),
    MentorItem(
      id: 'm9',
      name: 'Salma Nasser',
      category: '3D Design',
      subtitle: '3D Design Mentor',
      courses: '11',
      students: '7350',
      ratings: '3510',
      imagePath: 'https://picsum.photos/id/1035/400/400',
    ),
    MentorItem(
      id: 'm10',
      name: 'Sa3doon',
      category: 'Programming',
      subtitle: 'Flutter Mentor',
      courses: '13',
      students: '9900',
      ratings: '5120',
      imagePath: 'https://picsum.photos/id/1037/400/400',
    ),
  ];
}

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:pocketbase/pocketbase.dart';

import '../services/pocketbase_config.dart';
import '../services/pocketbase_service.dart';
import 'saved_courses_store.dart';

String _firstNonEmptyString(List<Object?> candidates) {
  for (final Object? candidate in candidates) {
    if (candidate == null) continue;
    final String value = candidate.toString().trim();
    if (value.isNotEmpty) return value;
  }
  return '';
}

List<Object?> _normalizeObjectList(Object? value) {
  if (value is List) return value;
  if (value is Map) {
    final Object? nested =
        value['items'] ?? value['lessons'] ?? value['sections'];
    if (nested is List) return nested;
    return value.values.toList();
  }
  if (value is String) {
    final String trimmed = value.trim();
    if (trimmed.isEmpty) return const <Object?>[];
    try {
      final Object? decoded = jsonDecode(trimmed);
      return _normalizeObjectList(decoded);
    } catch (_) {}
  }
  return const <Object?>[];
}

class CourseLesson {
  const CourseLesson({required this.title, this.videoUrl = ''});

  final String title;
  final String videoUrl;

  factory CourseLesson.fromMap(Map<String, dynamic> data) {
    return CourseLesson(
      title: (data['title'] ?? '').toString(),
      videoUrl: _firstNonEmptyString(<Object?>[
        data['videoUrl'],
        data['youtubeUrl'],
        data['videoURL'],
        data['video_url'],
        data['video'],
        data['url'],
        data['fileUrl'],
        data['fileURL'],
        data['sourceUrl'],
        data['sourceURL'],
      ]),
    );
  }

  Map<String, dynamic> toMap() {
    return {'title': title, 'videoUrl': videoUrl};
  }
}

class CourseLessonUpload {
  const CourseLessonUpload({
    required this.sectionIndex,
    required this.lessonIndex,
    required this.file,
  });

  final int sectionIndex;
  final int lessonIndex;
  final File file;
}

class CourseLessonUploadProgress {
  const CourseLessonUploadProgress({
    required this.sectionIndex,
    required this.lessonIndex,
    required this.sentBytes,
    required this.totalBytes,
  });

  final int sectionIndex;
  final int lessonIndex;
  final int sentBytes;
  final int totalBytes;

  double get progress => totalBytes == 0 ? 0 : sentBytes / totalBytes;
}

class CourseSection {
  const CourseSection({required this.title, required this.lessons});

  final String title;
  final List<CourseLesson> lessons;

  factory CourseSection.fromMap(Map<String, dynamic> data) {
    final List<CourseLesson> lessons = [];
    final List<Object?> rawLessons = _normalizeObjectList(data['lessons']);
    for (final Object? entry in rawLessons) {
      if (entry is Map<String, dynamic>) {
        lessons.add(CourseLesson.fromMap(entry));
      } else if (entry is Map) {
        lessons.add(CourseLesson.fromMap(Map<String, dynamic>.from(entry)));
      }
    }
    return CourseSection(
      title: (data['title'] ?? '').toString(),
      lessons: lessons,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'lessons': lessons.map((lesson) => lesson.toMap()).toList(),
    };
  }
}

class CourseItem {
  const CourseItem({
    required this.id,
    required this.category,
    required this.title,
    required this.mentorName,
    required this.mentorSubtitle,
    this.mentorImagePath,
    this.coverImagePath,
    this.mentorId,
    required this.price,
    required this.oldPrice,
    required this.rating,
    required this.students,
    required this.classes,
    required this.hours,
    required this.bookmarked,
    this.sections = const [],
    this.featuredRank,
    this.createdAt,
  });

  final String id;
  final String category;
  final String title;
  final String mentorName;
  final String mentorSubtitle;
  final String? mentorImagePath;
  final String? coverImagePath;
  final String? mentorId;
  final String price;
  final String oldPrice;
  final String rating;
  final String students;
  final int classes;
  final int hours;
  final bool bookmarked;
  final List<CourseSection> sections;
  final int? featuredRank;
  final DateTime? createdAt;

  CourseItem copyWith({
    String? id,
    String? category,
    String? title,
    String? mentorName,
    String? mentorSubtitle,
    String? mentorImagePath,
    String? coverImagePath,
    String? mentorId,
    String? price,
    String? oldPrice,
    String? rating,
    String? students,
    int? classes,
    int? hours,
    bool? bookmarked,
    List<CourseSection>? sections,
    int? featuredRank,
    DateTime? createdAt,
  }) {
    return CourseItem(
      id: id ?? this.id,
      category: category ?? this.category,
      title: title ?? this.title,
      mentorName: mentorName ?? this.mentorName,
      mentorSubtitle: mentorSubtitle ?? this.mentorSubtitle,
      mentorImagePath: mentorImagePath ?? this.mentorImagePath,
      coverImagePath: coverImagePath ?? this.coverImagePath,
      mentorId: mentorId ?? this.mentorId,
      price: price ?? this.price,
      oldPrice: oldPrice ?? this.oldPrice,
      rating: rating ?? this.rating,
      students: students ?? this.students,
      classes: classes ?? this.classes,
      hours: hours ?? this.hours,
      bookmarked: bookmarked ?? this.bookmarked,
      sections: sections ?? this.sections,
      featuredRank: featuredRank ?? this.featuredRank,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory CourseItem.fromMap(String id, Map<String, dynamic> data) {
    final List<CourseSection> sections = [];
    final List<Object?> rawSections = _normalizeObjectList(data['sections']);
    for (final Object? entry in rawSections) {
      if (entry is Map<String, dynamic>) {
        sections.add(CourseSection.fromMap(entry));
      } else if (entry is Map) {
        sections.add(CourseSection.fromMap(Map<String, dynamic>.from(entry)));
      }
    }
    return CourseItem(
      id: id,
      category: (data['category'] ?? '').toString(),
      title: (data['title'] ?? '').toString(),
      mentorName: (data['mentorName'] ?? '').toString(),
      mentorSubtitle: (data['mentorSubtitle'] ?? '').toString(),
      mentorImagePath: (data['mentorImageUrl'] ?? data['mentorImagePath'] ?? '')
          .toString(),
      coverImagePath: (data['coverImageUrl'] ?? data['coverImagePath'] ?? '')
          .toString(),
      mentorId: (data['mentorId'] ?? '').toString().isEmpty
          ? null
          : data['mentorId'].toString(),
      price: (data['price'] ?? '').toString(),
      oldPrice: (data['oldPrice'] ?? '').toString(),
      rating: (data['rating'] ?? '').toString(),
      students: (data['students'] ?? '').toString(),
      classes: _toInt(data['classes']),
      hours: _toInt(data['hours']),
      bookmarked: _toBool(data['bookmarked']),
      sections: sections,
      featuredRank: _toNullableInt(
        data['featuredRank'] ??
            data['featured_rank'] ??
            data['homeRank'] ??
            data['home_rank'] ??
            data['popularRank'] ??
            data['popular_rank'],
      ),
      createdAt: _toNullableDateTime(data['created']),
    );
  }

  Map<String, dynamic> toMap() {
    final Map<String, dynamic> data = {
      'category': category,
      'title': title,
      'mentorName': mentorName,
      'mentorSubtitle': mentorSubtitle,
      'mentorImageUrl': mentorImagePath ?? '',
      'coverImageUrl': coverImagePath ?? '',
      'mentorId': mentorId ?? '',
      'price': price,
      'oldPrice': oldPrice,
      'rating': rating,
      'students': students,
      'classes': classes,
      'hours': hours,
      'bookmarked': bookmarked,
      'sections': sections.map((section) => section.toMap()).toList(),
    };
    if (featuredRank != null) {
      data['featuredRank'] = featuredRank;
    }
    return data;
  }

  static int _toInt(Object? value) {
    if (value is int) return value;
    if (value is double) return value.round();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
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

  static bool _toBool(Object? value) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final String normalized = value.toLowerCase();
      return normalized == 'true' || normalized == '1';
    }
    return false;
  }

  static DateTime? _toNullableDateTime(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) {
      final String trimmed = value.trim();
      if (trimmed.isEmpty) return null;
      DateTime? parsed = DateTime.tryParse(trimmed);
      if (parsed != null) return parsed;
      if (trimmed.contains(' ')) {
        parsed = DateTime.tryParse(trimmed.replaceFirst(' ', 'T'));
        if (parsed != null) return parsed;
      }
      final int? millis = int.tryParse(trimmed);
      if (millis != null) {
        return DateTime.fromMillisecondsSinceEpoch(millis, isUtc: true);
      }
      return null;
    }
    return null;
  }
}

class CourseCatalog {
  static final ValueNotifier<List<CourseItem>> courses =
      ValueNotifier<List<CourseItem>>(_seedCourses);

  static List<CourseItem> get items => courses.value;

  static bool _bound = false;
  static VoidCallback? _savedListener;
  static Timer? _autoRefreshTimer;
  static bool _refreshInProgress = false;
  static const Duration _writeTimeout = Duration(seconds: 20);
  static const Duration _videoWriteTimeout = Duration(minutes: 5);
  static const Duration _autoRefreshInterval = Duration(seconds: 8);

  static PocketBase get _pb => PocketBaseService.client;

  static Future<void> bind() async {
    if (_bound) return;
    _bound = true;
    try {
      await SavedCoursesStore.init();
      _savedListener ??= () {
        courses.value = _applySavedMarks(courses.value);
      };
      SavedCoursesStore.savedIds.addListener(_savedListener!);
      await refresh();
      _startAutoRefresh();
    } catch (_) {
      courses.value = _applySavedMarks(_seedCourses);
      _startAutoRefresh();
    }
  }

  static Future<void> refresh() async {
    if (_refreshInProgress) return;
    _refreshInProgress = true;
    final List<CourseItem> previous = courses.value;
    try {
      final List<CourseItem> fetched = await _fetchCourses();
      final List<CourseItem> items = _mergeSeedCourses(fetched);
      final List<CourseItem> merged = _applySavedMarks(items);
      // Keep server order (-created) so newly added courses stay visible.
      courses.value = merged;
    } catch (_) {
      // Keep last good snapshot to avoid flipping back to static seed
      // when there is a short network interruption.
      courses.value = previous.isNotEmpty
          ? _applySavedMarks(previous)
          : _applySavedMarks(_seedCourses);
    } finally {
      _refreshInProgress = false;
    }
  }

  static void _startAutoRefresh() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(_autoRefreshInterval, (_) {
      unawaited(refresh());
    });
  }

  static bool hasTitle(String title, {String? excludeId}) {
    final String normalized = title.trim().toLowerCase();
    return courses.value.any((course) {
      if (excludeId != null && course.id == excludeId) return false;
      return course.title.toLowerCase() == normalized;
    });
  }

  static CourseItem? findByTitle(String title) {
    final String normalized = title.trim().toLowerCase();
    if (normalized.isEmpty) return null;
    for (final CourseItem course in courses.value) {
      if (course.title.toLowerCase() == normalized) {
        return course;
      }
    }
    return null;
  }

  static Future<CourseItem?> addCourse(
    CourseItem course, {
    File? coverImageFile,
    List<CourseLessonUpload> lessonVideoUploads = const [],
    void Function(CourseLessonUploadProgress progress)? onLessonUploadProgress,
  }) async {
    final Map<String, dynamic> body = _courseToBody(course);
    final List<http.MultipartFile> files = [];
    if (coverImageFile != null) {
      files.add(
        await http.MultipartFile.fromPath('coverImage', coverImageFile.path),
      );
    }
    RecordModel record = await _pb
        .collection(PocketBaseService.coursesCollection)
        .create(body: body, files: files)
        .timeout(_writeTimeout);
    CourseItem saved = _applySavedMarks([_fromRecord(record)]).first;
    if (saved.createdAt == null) {
      saved = saved.copyWith(createdAt: DateTime.now().toUtc());
    }
    if (lessonVideoUploads.isNotEmpty) {
      final DateTime fallbackCreatedAt =
          saved.createdAt ?? DateTime.now().toUtc();
      final List<CourseSection> updatedSections = await _uploadLessonVideos(
        record: record,
        sections: course.sections,
        uploads: lessonVideoUploads,
        onProgress: onLessonUploadProgress,
      );
      record = await _pb
          .collection(PocketBaseService.coursesCollection)
          .update(
            record.id,
            body: {
              'sections': updatedSections
                  .map((section) => section.toMap())
                  .toList(),
            },
          )
          .timeout(_writeTimeout);
      saved = _applySavedMarks([_fromRecord(record)]).first;
      if (saved.createdAt == null) {
        saved = saved.copyWith(createdAt: fallbackCreatedAt);
      }
    }
    courses.value = [saved, ...courses.value];
    return saved;
  }

  static Future<CourseItem?> updateCourse(
    CourseItem course, {
    File? coverImageFile,
    String? previousCoverUrl,
    List<CourseLessonUpload> lessonVideoUploads = const [],
    void Function(CourseLessonUploadProgress progress)? onLessonUploadProgress,
  }) async {
    if (course.id.trim().isEmpty) return null;
    final Map<String, dynamic> body = _courseToBody(course);
    final List<http.MultipartFile> files = [];
    if (coverImageFile != null) {
      files.add(
        await http.MultipartFile.fromPath('coverImage', coverImageFile.path),
      );
    } else if ((course.coverImagePath ?? '').trim().isEmpty &&
        (previousCoverUrl ?? '').trim().isNotEmpty) {
      body['coverImage'] = null;
    }
    RecordModel record = await _pb
        .collection(PocketBaseService.coursesCollection)
        .update(course.id, body: body, files: files)
        .timeout(_writeTimeout);
    CourseItem saved = _applySavedMarks([_fromRecord(record)]).first;
    if (saved.createdAt == null && course.createdAt != null) {
      saved = saved.copyWith(createdAt: course.createdAt);
    }
    if (lessonVideoUploads.isNotEmpty) {
      final DateTime? fallbackCreatedAt = saved.createdAt ?? course.createdAt;
      final List<CourseSection> updatedSections = await _uploadLessonVideos(
        record: record,
        sections: course.sections,
        uploads: lessonVideoUploads,
        onProgress: onLessonUploadProgress,
      );
      record = await _pb
          .collection(PocketBaseService.coursesCollection)
          .update(
            course.id,
            body: {
              'sections': updatedSections
                  .map((section) => section.toMap())
                  .toList(),
            },
          )
          .timeout(_writeTimeout);
      saved = _applySavedMarks([_fromRecord(record)]).first;
      if (saved.createdAt == null && fallbackCreatedAt != null) {
        saved = saved.copyWith(createdAt: fallbackCreatedAt);
      }
    }
    courses.value = courses.value
        .map((item) => item.id == saved.id ? saved : item)
        .toList();
    return saved;
  }

  static Future<void> removeCourse(String id) async {
    if (id.trim().isEmpty) return;
    await _pb
        .collection(PocketBaseService.coursesCollection)
        .delete(id)
        .timeout(_writeTimeout);
    courses.value = courses.value.where((course) => course.id != id).toList();
  }

  static Future<void> updateMentorReferences({
    required String mentorId,
    required String mentorName,
    required String mentorSubtitle,
    String? mentorImagePath,
    String? previousName,
  }) async {
    final String resolvedPrevious = (previousName ?? '').trim();
    courses.value = courses.value.map((course) {
      final bool matchesId = (course.mentorId ?? '').trim() == mentorId;
      final bool matchesLegacy =
          (course.mentorId ?? '').trim().isEmpty &&
          resolvedPrevious.isNotEmpty &&
          course.mentorName.trim() == resolvedPrevious;
      if (matchesId || matchesLegacy) {
        return course.copyWith(
          mentorId: mentorId,
          mentorName: mentorName,
          mentorSubtitle: mentorSubtitle,
          mentorImagePath: mentorImagePath ?? '',
        );
      }
      return course;
    }).toList();
    if (!_bound) return;
    final Map<String, dynamic> body = {
      'mentorId': mentorId,
      'mentorName': mentorName,
      'mentorSubtitle': mentorSubtitle,
      'mentorImageUrl': mentorImagePath ?? '',
    };
    final Set<String> updatedIds = <String>{};
    try {
      final String idFilter = 'mentorId = "${_escapeFilterValue(mentorId)}"';
      final List<RecordModel> byId = await _pb
          .collection(PocketBaseService.coursesCollection)
          .getFullList(filter: idFilter)
          .timeout(_writeTimeout);
      for (final record in byId) {
        if (updatedIds.add(record.id)) {
          await _pb
              .collection(PocketBaseService.coursesCollection)
              .update(record.id, body: body)
              .timeout(_writeTimeout);
        }
      }
      if (resolvedPrevious.isNotEmpty) {
        final String nameFilter =
            'mentorName = "${_escapeFilterValue(resolvedPrevious)}"';
        final List<RecordModel> byName = await _pb
            .collection(PocketBaseService.coursesCollection)
            .getFullList(filter: nameFilter)
            .timeout(_writeTimeout);
        for (final record in byName) {
          if (updatedIds.add(record.id)) {
            await _pb
                .collection(PocketBaseService.coursesCollection)
                .update(record.id, body: body)
                .timeout(_writeTimeout);
          }
        }
      }
    } catch (_) {}
  }

  static Future<bool> toggleBookmark(String id) async {
    final bool saved = await SavedCoursesStore.toggle(id);
    courses.value = courses.value
        .map(
          (course) =>
              course.id == id ? course.copyWith(bookmarked: saved) : course,
        )
        .toList();
    return saved;
  }

  static String nextId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }

  static Future<List<CourseItem>> _fetchCourses() async {
    final List<RecordModel> records = await _pb
        .collection(PocketBaseService.coursesCollection)
        .getFullList(sort: '-created')
        .timeout(_writeTimeout);
    return records.map(_fromRecord).toList();
  }

  static CourseItem _fromRecord(RecordModel record) {
    final Map<String, dynamic> data = Map<String, dynamic>.from(record.data);
    final String created = record.get<String>('created');
    if (created.trim().isNotEmpty) {
      data['created'] = created;
    }
    data['sections'] = _normalizeSections(data['sections']);
    final String existingCover =
        (data['coverImageUrl'] ?? data['coverImagePath'] ?? '').toString();
    if (existingCover.trim().isNotEmpty) {
      data['coverImageUrl'] = existingCover;
    } else {
      data['coverImageUrl'] = _resolveFileUrl(record, data['coverImage']);
    }
    final String existingMentorImage =
        (data['mentorImageUrl'] ?? data['mentorImagePath'] ?? '').toString();
    if (existingMentorImage.trim().isNotEmpty) {
      data['mentorImageUrl'] = existingMentorImage;
    } else {
      data['mentorImageUrl'] = _resolveFileUrl(record, data['mentorImage']);
    }
    return CourseItem.fromMap(record.id, data);
  }

  static Map<String, dynamic> _courseToBody(CourseItem course) {
    final Map<String, dynamic> body = {
      'category': course.category,
      'title': course.title,
      'mentorName': course.mentorName,
      'mentorSubtitle': course.mentorSubtitle,
      'mentorImageUrl': course.mentorImagePath ?? '',
      'coverImageUrl': course.coverImagePath ?? '',
      'mentorId': course.mentorId ?? '',
      'price': course.price,
      'oldPrice': course.oldPrice,
      'rating': course.rating,
      'students': course.students,
      'classes': course.classes,
      'hours': course.hours,
      'bookmarked': course.bookmarked,
      'sections': course.sections.map((section) => section.toMap()).toList(),
    };
    if (course.featuredRank != null) {
      body['featuredRank'] = course.featuredRank;
    }
    return body;
  }

  static List<CourseItem> _mergeSeedCourses(List<CourseItem> fetched) {
    if (fetched.isEmpty) return List<CourseItem>.from(_seedCourses);
    final Set<String> seenTitles = fetched
        .map((course) => course.title.trim().toLowerCase())
        .toSet();
    return <CourseItem>[
      ...fetched,
      ..._seedCourses.where(
        (course) => !seenTitles.contains(course.title.trim().toLowerCase()),
      ),
    ];
  }

  static Future<({int added})> seedToServer({
    Map<String, String>? mentorNameToId,
  }) async {
    final List<CourseItem> existing = await _fetchCourses();
    final Set<String> existingTitles = existing
        .map((course) => course.title.trim().toLowerCase())
        .toSet();
    int added = 0;
    for (final CourseItem seed in _seedCourses) {
      final String key = seed.title.trim().toLowerCase();
      if (existingTitles.contains(key)) continue;
      final String mentorId =
          (mentorNameToId ?? {})[seed.mentorName.trim()] ?? '';
      final CourseItem resolved = seed.copyWith(
        id: '',
        mentorId: mentorId.isEmpty ? null : mentorId,
        bookmarked: false,
      );
      await addCourse(resolved);
      added += 1;
    }
    await refresh();
    return (added: added);
  }

  static Future<bool> ensureWelcomeReferenceCourse() async {
    const String title = 'Welcome to Level Up';
    try {
      final List<CourseItem> existing = await _fetchCourses();
      final bool alreadyExists = existing.any(
        (item) => item.title.trim().toLowerCase() == title.toLowerCase(),
      );
      if (alreadyExists) return false;
      await addCourse(
        const CourseItem(
          id: '',
          category: 'General',
          title: title,
          mentorName: 'Level Up Team',
          mentorSubtitle: 'Reference Course',
          mentorImagePath: '',
          coverImagePath: '',
          price: 'EGP 0',
          oldPrice: 'EGP 0',
          rating: '0.0',
          students: '0 Std',
          classes: 0,
          hours: 0,
          bookmarked: false,
          sections: <CourseSection>[],
        ),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  static List<CourseItem> _applySavedMarks(List<CourseItem> items) {
    final Set<String> saved = SavedCoursesStore.savedIds.value;
    return items
        .map((course) => course.copyWith(bookmarked: saved.contains(course.id)))
        .toList();
  }

  static Object _normalizeSections(Object? value) {
    return _normalizeObjectList(value);
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

  static String _escapeFilterValue(String value) {
    return value.replaceAll(r'\', r'\\').replaceAll('"', r'\"');
  }

  static Future<List<CourseSection>> _uploadLessonVideos({
    required RecordModel record,
    required List<CourseSection> sections,
    required List<CourseLessonUpload> uploads,
    void Function(CourseLessonUploadProgress progress)? onProgress,
  }) async {
    List<CourseSection> updatedSections = sections;
    RecordModel currentRecord = record;
    Set<String> knownFiles = _extractFileNames(
      record.data['lessonVideos'],
    ).toSet();
    for (final CourseLessonUpload upload in uploads) {
      final String filename = _buildLessonVideoFilename(
        upload.file.path,
        upload.sectionIndex,
        upload.lessonIndex,
      );
      final RecordModel updatedRecord = await _uploadRecordFileWithProgress(
        recordId: currentRecord.id,
        // Use "+" to append on multi-file field instead of replacing.
        field: 'lessonVideos+',
        file: upload.file,
        filename: filename,
        onProgress: (sentBytes, totalBytes) {
          if (onProgress == null) return;
          onProgress(
            CourseLessonUploadProgress(
              sectionIndex: upload.sectionIndex,
              lessonIndex: upload.lessonIndex,
              sentBytes: sentBytes,
              totalBytes: totalBytes,
            ),
          );
        },
      );
      final List<String> currentFiles = _extractFileNames(
        updatedRecord.data['lessonVideos'],
      );
      final String resolvedFile =
          _findNewFileName(knownFiles, currentFiles) ??
          (currentFiles.isNotEmpty ? currentFiles.last : filename);
      knownFiles = currentFiles.toSet();
      final String resolvedUrl = _pb.files
          .getUrl(updatedRecord, resolvedFile)
          .toString();
      updatedSections = _replaceLessonVideo(
        updatedSections,
        upload.sectionIndex,
        upload.lessonIndex,
        resolvedUrl,
      );
      currentRecord = updatedRecord;
    }
    return updatedSections;
  }

  static Future<RecordModel> _uploadRecordFileWithProgress({
    required String recordId,
    required String field,
    required File file,
    required String filename,
    void Function(int sentBytes, int totalBytes)? onProgress,
  }) async {
    final Uri uri = Uri.parse(
      '${PocketBaseConfig.endpoint}/api/collections/'
      '${PocketBaseService.coursesCollection}/records/$recordId',
    );
    final http.MultipartRequest request = http.MultipartRequest('PATCH', uri);
    final String token = _pb.authStore.token;
    if (token.trim().isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    final int length = await file.length();
    int sentBytes = 0;
    onProgress?.call(0, length);
    final Stream<List<int>> stream = file.openRead().transform(
      StreamTransformer.fromHandlers(
        handleData: (data, sink) {
          sentBytes += data.length;
          onProgress?.call(sentBytes, length);
          sink.add(data);
        },
      ),
    );
    request.files.add(
      http.MultipartFile(
        field,
        http.ByteStream(stream),
        length,
        filename: filename,
      ),
    );
    final http.StreamedResponse response = await request.send().timeout(
      _videoWriteTimeout,
    );
    final String body = await response.stream.bytesToString();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      Map<String, dynamic> error = {};
      try {
        final Object? decoded = jsonDecode(body);
        if (decoded is Map<String, dynamic>) {
          error = decoded;
        }
      } catch (_) {}
      if (error.isEmpty && body.trim().isNotEmpty) {
        error = {'message': body.trim()};
      }
      throw ClientException(
        url: uri,
        statusCode: response.statusCode,
        response: error,
        originalError: body,
      );
    }
    final Object? decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw ClientException(
        url: uri,
        statusCode: response.statusCode,
        response: const {'message': 'Invalid server response.'},
        originalError: body,
      );
    }
    onProgress?.call(length, length);
    return RecordModel.fromJson(decoded);
  }

  static List<String> _extractFileNames(Object? value) {
    if (value is String) {
      final String trimmed = value.trim();
      return trimmed.isEmpty ? <String>[] : <String>[trimmed];
    }
    if (value is List) {
      return value
          .whereType<String>()
          .map((entry) => entry.trim())
          .where((entry) => entry.isNotEmpty)
          .toList();
    }
    return <String>[];
  }

  static String? _findNewFileName(Set<String> previous, List<String> current) {
    for (final String name in current) {
      if (!previous.contains(name)) return name;
    }
    return null;
  }

  static String _buildLessonVideoFilename(
    String path,
    int sectionIndex,
    int lessonIndex,
  ) {
    final String cleanPath = path.replaceAll('\\', '/');
    final String base = cleanPath.split('/').last.isEmpty
        ? 'video.mp4'
        : cleanPath.split('/').last;
    final List<String> parts = base.split('.');
    String extension = 'mp4';
    if (parts.length > 1) {
      extension = parts.removeLast();
    }
    final String name = parts.join('.').replaceAll(' ', '_');
    final String stamp = DateTime.now().millisecondsSinceEpoch.toString();
    return 'lesson_s${sectionIndex + 1}_l${lessonIndex + 1}_${stamp}_$name.$extension';
  }

  static List<CourseSection> _replaceLessonVideo(
    List<CourseSection> sections,
    int sectionIndex,
    int lessonIndex,
    String url,
  ) {
    if (sectionIndex < 0 || sectionIndex >= sections.length) {
      return sections;
    }
    final CourseSection section = sections[sectionIndex];
    if (lessonIndex < 0 || lessonIndex >= section.lessons.length) {
      return sections;
    }
    final List<CourseSection> updatedSections = List.of(sections);
    final List<CourseLesson> updatedLessons = List.of(section.lessons);
    final CourseLesson lesson = updatedLessons[lessonIndex];
    updatedLessons[lessonIndex] = CourseLesson(
      title: lesson.title,
      videoUrl: url,
    );
    updatedSections[sectionIndex] = CourseSection(
      title: section.title,
      lessons: updatedLessons,
    );
    return updatedSections;
  }

  static const List<CourseItem> _seedCourses = [
    CourseItem(
      id: 'c1',
      category: 'Graphic Design',
      title: 'Graphic Design Advanced',
      mentorId: 'm1',
      mentorName: 'Sonja Carter',
      mentorSubtitle: 'Graphic Design Mentor',
      mentorImagePath: 'https://picsum.photos/id/1005/400/400',
      coverImagePath: 'https://picsum.photos/id/1025/800/500',
      price: 'EGP 1450',
      oldPrice: 'EGP 1890',
      rating: '4.2',
      students: '7830 Std',
      classes: 21,
      hours: 42,
      bookmarked: true,
    ),
    CourseItem(
      id: 'c2',
      category: 'Graphic Design',
      title: 'Advertisement Design',
      mentorId: 'm1',
      mentorName: 'Sonja Carter',
      mentorSubtitle: 'Graphic Design Mentor',
      mentorImagePath: 'https://picsum.photos/id/1005/400/400',
      coverImagePath: 'https://picsum.photos/id/1040/800/500',
      price: 'EGP 1760',
      oldPrice: 'EGP 2240',
      rating: '3.9',
      students: '12680 Std',
      classes: 24,
      hours: 46,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c3',
      category: 'Programming',
      title: 'UI Animation Essentials',
      mentorId: 'm3',
      mentorName: 'Victoria Lee',
      mentorSubtitle: 'Programming Mentor',
      mentorImagePath: 'https://picsum.photos/id/1012/400/400',
      coverImagePath: 'https://picsum.photos/id/1060/800/500',
      price: 'EGP 1620',
      oldPrice: 'EGP 2050',
      rating: '4.2',
      students: '990 Std',
      classes: 18,
      hours: 32,
      bookmarked: true,
    ),
    CourseItem(
      id: 'c4',
      category: 'Web Development',
      title: 'Web Developer Concepts',
      mentorId: 'm4',
      mentorName: 'Marco Castaldo',
      mentorSubtitle: 'Web Development Mentor',
      mentorImagePath: 'https://picsum.photos/id/1015/400/400',
      coverImagePath: 'https://picsum.photos/id/1057/800/500',
      price: 'EGP 2490',
      oldPrice: 'EGP 2990',
      rating: '4.9',
      students: '14580 Std',
      classes: 30,
      hours: 55,
      bookmarked: true,
    ),
    CourseItem(
      id: 'c5',
      category: 'SEO & Marketing',
      title: 'Digital Marketing Course',
      mentorId: 'm2',
      mentorName: 'Jensen Reed',
      mentorSubtitle: 'Marketing Mentor',
      mentorImagePath: 'https://picsum.photos/id/1011/400/400',
      coverImagePath: 'https://picsum.photos/id/1050/800/500',
      price: 'EGP 1920',
      oldPrice: 'EGP 2380',
      rating: '4.4',
      students: '9420 Std',
      classes: 28,
      hours: 48,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c6',
      category: '3D Design',
      title: '3D Modeling Basics',
      mentorId: 'm9',
      mentorName: 'Salma Nasser',
      mentorSubtitle: '3D Design Mentor',
      mentorImagePath: 'https://picsum.photos/id/1035/400/400',
      coverImagePath: 'https://picsum.photos/id/1044/800/500',
      price: 'EGP 1710',
      oldPrice: 'EGP 2140',
      rating: '4.1',
      students: '5620 Std',
      classes: 20,
      hours: 36,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c7',
      category: 'Arts & Humanities',
      title: 'Creative Writing Class',
      mentorId: 'm2',
      mentorName: 'Jensen Reed',
      mentorSubtitle: 'Arts & Humanities Mentor',
      mentorImagePath: 'https://picsum.photos/id/1011/400/400',
      coverImagePath: 'https://picsum.photos/id/1039/800/500',
      price: 'EGP 1390',
      oldPrice: 'EGP 1750',
      rating: '4.3',
      students: '3180 Std',
      classes: 16,
      hours: 24,
      bookmarked: true,
    ),
    CourseItem(
      id: 'c8',
      category: 'Office Productivity',
      title: 'Productivity Mastery',
      mentorId: 'm1',
      mentorName: 'Sonja Carter',
      mentorSubtitle: 'Productivity Mentor',
      mentorImagePath: 'https://picsum.photos/id/1005/400/400',
      coverImagePath: 'https://picsum.photos/id/1062/800/500',
      price: 'EGP 1650',
      oldPrice: 'EGP 2080',
      rating: '4.0',
      students: '2740 Std',
      classes: 14,
      hours: 20,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c9',
      category: 'Programming',
      title: 'Flutter Mobile Development',
      mentorId: 'm10',
      mentorName: 'Sa3doon',
      mentorSubtitle: 'Flutter Mentor',
      mentorImagePath: 'https://picsum.photos/id/1037/400/400',
      coverImagePath: 'https://picsum.photos/id/1069/800/500',
      price: 'EGP 2100',
      oldPrice: 'EGP 2600',
      rating: '4.7',
      students: '10850 Std',
      classes: 26,
      hours: 44,
      bookmarked: true,
    ),
    CourseItem(
      id: 'c10',
      category: 'Programming',
      title: 'Dart Language Essentials',
      mentorId: 'm10',
      mentorName: 'Sa3doon',
      mentorSubtitle: 'Flutter Mentor',
      mentorImagePath: 'https://picsum.photos/id/1037/400/400',
      coverImagePath: 'https://picsum.photos/id/1074/800/500',
      price: 'EGP 1250',
      oldPrice: 'EGP 1650',
      rating: '4.5',
      students: '6200 Std',
      classes: 18,
      hours: 28,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c11',
      category: 'Finance & Accounting',
      title: 'Finance Basics for Designers',
      mentorId: 'm5',
      mentorName: 'Hana Ibrahim',
      mentorSubtitle: 'Finance Mentor',
      mentorImagePath: 'https://picsum.photos/id/1016/400/400',
      coverImagePath: 'https://picsum.photos/id/1080/800/500',
      price: 'EGP 980',
      oldPrice: 'EGP 1290',
      rating: '4.1',
      students: '3640 Std',
      classes: 12,
      hours: 16,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c12',
      category: 'Photography',
      title: 'Street Photography Mastery',
      mentorId: 'm6',
      mentorName: 'Nour Elshamy',
      mentorSubtitle: 'Photography Mentor',
      mentorImagePath: 'https://picsum.photos/id/1021/400/400',
      coverImagePath: 'https://picsum.photos/id/1084/800/500',
      price: 'EGP 1500',
      oldPrice: 'EGP 1950',
      rating: '4.4',
      students: '5220 Std',
      classes: 17,
      hours: 26,
      bookmarked: true,
    ),
    CourseItem(
      id: 'c13',
      category: 'HR Management',
      title: 'HR Foundations',
      mentorId: 'm7',
      mentorName: 'Lina Farouk',
      mentorSubtitle: 'HR Mentor',
      mentorImagePath: 'https://picsum.photos/id/1027/400/400',
      coverImagePath: 'https://picsum.photos/id/1090/800/500',
      price: 'EGP 1180',
      oldPrice: 'EGP 1490',
      rating: '4.0',
      students: '2880 Std',
      classes: 14,
      hours: 22,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c14',
      category: 'SEO & Marketing',
      title: 'SEO Strategy Bootcamp',
      mentorId: 'm8',
      mentorName: 'Omar Khaled',
      mentorSubtitle: 'Marketing Mentor',
      mentorImagePath: 'https://picsum.photos/id/1033/400/400',
      coverImagePath: 'https://picsum.photos/id/110/800/500',
      price: 'EGP 1340',
      oldPrice: 'EGP 1780',
      rating: '4.3',
      students: '4720 Std',
      classes: 15,
      hours: 24,
      bookmarked: false,
    ),
    CourseItem(
      id: 'c15',
      category: 'Business',
      title: 'Business Models Essentials',
      mentorId: 'm8',
      mentorName: 'Omar Khaled',
      mentorSubtitle: 'Marketing Mentor',
      mentorImagePath: 'https://picsum.photos/id/1033/400/400',
      coverImagePath: 'https://picsum.photos/id/111/800/500',
      price: 'EGP 1420',
      oldPrice: 'EGP 1890',
      rating: '4.2',
      students: '3980 Std',
      classes: 16,
      hours: 26,
      bookmarked: false,
    ),
  ];
}

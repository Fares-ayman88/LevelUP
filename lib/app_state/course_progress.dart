import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class CourseCompletionData {
  const CourseCompletionData({
    this.courseId = '',
    required this.title,
    required this.category,
    required this.rating,
    required this.price,
    required this.classes,
    required this.hours,
    required this.certificateId,
  });

  final String courseId;
  final String title;
  final String category;
  final String rating;
  final String price;
  final int classes;
  final int hours;
  final String certificateId;

  CourseCompletionData copyWith({
    String? courseId,
    String? title,
    String? category,
    String? rating,
    String? price,
    int? classes,
    int? hours,
    String? certificateId,
  }) {
    return CourseCompletionData(
      courseId: courseId ?? this.courseId,
      title: title ?? this.title,
      category: category ?? this.category,
      rating: rating ?? this.rating,
      price: price ?? this.price,
      classes: classes ?? this.classes,
      hours: hours ?? this.hours,
      certificateId: certificateId ?? this.certificateId,
    );
  }

  factory CourseCompletionData.fromMap(Map<String, dynamic> data) {
    return CourseCompletionData(
      courseId: (data['courseId'] ?? '').toString(),
      title: (data['courseTitle'] ?? data['title'] ?? '').toString(),
      category: (data['category'] ?? '').toString(),
      rating: (data['rating'] ?? '').toString(),
      price: (data['price'] ?? '').toString(),
      classes: _toInt(data['classes']),
      hours: _toInt(data['hours']),
      certificateId: (data['certificateId'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'courseId': courseId,
      'courseTitle': title,
      'category': category,
      'rating': rating,
      'price': price,
      'classes': classes,
      'hours': hours,
      'certificateId': certificateId,
    };
  }

  static int _toInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.round();
    if (value is String) return int.tryParse(value.trim()) ?? 0;
    return 0;
  }
}

class CourseProgressStore {
  static final Map<String, Set<int>> _completedLessonsByCourse =
      <String, Set<int>>{};
  static final Map<String, CourseCompletionData> _completedCourses =
      <String, CourseCompletionData>{};
  static final ValueNotifier<int> revision = ValueNotifier<int>(0);

  static StreamSubscription<User?>? _authSubscription;
  static StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
  _coursesSubscription;
  static String? _activeUserId;

  static CollectionReference<Map<String, dynamic>> get _collection =>
      FirebaseFirestore.instance.collection('user_course_progress');

  static void bindAuth() {
    if (_authSubscription != null) return;
    _authSubscription = FirebaseAuth.instance.authStateChanges().listen(
      _handleAuthChanged,
    );
    _handleAuthChanged(FirebaseAuth.instance.currentUser);
  }

  static Set<int> completedLessons(String courseTitle, {String courseId = ''}) {
    final String key = _lookupCourseKey(
      courseTitle: courseTitle,
      courseId: courseId,
    );
    final Set<int>? stored = _completedLessonsByCourse[key];
    if (stored == null) return <int>{};
    return Set<int>.from(stored);
  }

  static void markLessonCompleted(
    String courseTitle,
    int lessonId, {
    String courseId = '',
  }) {
    final String key = _ensureWritableKey(
      courseTitle: courseTitle,
      courseId: courseId,
    );
    final Set<int> set = _completedLessonsByCourse.putIfAbsent(
      key,
      () => <int>{},
    );
    if (!set.add(lessonId)) return;
    _notifyChanged();
    unawaited(
      _writeProgress(
        key: key,
        courseId: courseId,
        courseTitle: courseTitle,
        completedLessonIds: set,
        completion: _completedCourses[key],
      ),
    );
  }

  static bool isCourseCompleted(
    String courseTitle,
    int totalLessons, {
    String courseId = '',
  }) {
    if (completionFor(courseTitle, courseId: courseId) != null) {
      return true;
    }
    return completedLessons(courseTitle, courseId: courseId).length >=
        totalLessons;
  }

  static CourseCompletionData? completionFor(
    String courseTitle, {
    String courseId = '',
  }) {
    final String key = _lookupCourseKey(
      courseTitle: courseTitle,
      courseId: courseId,
    );
    return _completedCourses[key];
  }

  static Iterable<CourseCompletionData> allCompletions() {
    return _completedCourses.values;
  }

  static CourseCompletionData markCourseCompleted({
    required String title,
    required String category,
    required String rating,
    required String price,
    required int classes,
    required int hours,
    String courseId = '',
    String? certificateId,
  }) {
    final String key = _ensureWritableKey(
      courseTitle: title,
      courseId: courseId,
    );
    final CourseCompletionData? existing = _completedCourses[key];
    if (existing != null) {
      if (existing.courseId.trim().isEmpty && courseId.trim().isNotEmpty) {
        final CourseCompletionData upgraded = existing.copyWith(
          courseId: courseId.trim(),
        );
        _completedCourses[key] = upgraded;
        _notifyChanged();
        unawaited(
          _writeProgress(
            key: key,
            courseId: courseId,
            courseTitle: title,
            completedLessonIds: _completedLessonsByCourse[key] ?? <int>{},
            completion: upgraded,
          ),
        );
        return upgraded;
      }
      return existing;
    }
    final CourseCompletionData completion = CourseCompletionData(
      courseId: courseId.trim(),
      title: title,
      category: category,
      rating: rating,
      price: price,
      classes: classes,
      hours: hours,
      certificateId: certificateId ?? _generateCertificateId(),
    );
    _completedCourses[key] = completion;
    _completedLessonsByCourse.putIfAbsent(key, () => <int>{});
    _notifyChanged();
    unawaited(
      _writeProgress(
        key: key,
        courseId: courseId,
        courseTitle: title,
        completedLessonIds: _completedLessonsByCourse[key] ?? <int>{},
        completion: completion,
      ),
    );
    return completion;
  }

  static void _handleAuthChanged(User? user) {
    if (user == null) {
      _activeUserId = null;
      _coursesSubscription?.cancel();
      _coursesSubscription = null;
      _resetLocal();
      return;
    }
    if (_activeUserId == user.uid && _coursesSubscription != null) {
      return;
    }
    _activeUserId = user.uid;
    _coursesSubscription?.cancel();
    _resetLocal();
    _coursesSubscription = _collection
        .doc(user.uid)
        .collection('courses')
        .snapshots()
        .listen(_handleCoursesSnapshot, onError: (_) => _resetLocal());
  }

  static void _handleCoursesSnapshot(
    QuerySnapshot<Map<String, dynamic>> snapshot,
  ) {
    final Map<String, Set<int>> lessons = <String, Set<int>>{};
    final Map<String, CourseCompletionData> completions =
        <String, CourseCompletionData>{};
    for (final QueryDocumentSnapshot<Map<String, dynamic>> doc
        in snapshot.docs) {
      final Map<String, dynamic> data = doc.data();
      final String courseTitle = (data['courseTitle'] ?? '').toString();
      final String courseId = (data['courseId'] ?? '').toString();
      final String key = _resolveCourseKey(
        courseTitle: courseTitle,
        courseId: courseId,
      );
      lessons[key] = _parseLessonIds(data['completedLessonIds']);
      final String certificateId = (data['certificateId'] ?? '')
          .toString()
          .trim();
      if (certificateId.isNotEmpty) {
        completions[key] = CourseCompletionData.fromMap(data);
      }
    }
    _completedLessonsByCourse
      ..clear()
      ..addAll(lessons);
    _completedCourses
      ..clear()
      ..addAll(completions);
    _notifyChanged();
  }

  static Set<int> _parseLessonIds(Object? value) {
    if (value is! List) return <int>{};
    final Set<int> parsed = <int>{};
    for (final Object? item in value) {
      if (item is int) {
        parsed.add(item);
        continue;
      }
      if (item is num) {
        parsed.add(item.round());
        continue;
      }
      if (item is String) {
        final int? resolved = int.tryParse(item.trim());
        if (resolved != null) parsed.add(resolved);
      }
    }
    return parsed;
  }

  static String _lookupCourseKey({
    required String courseTitle,
    String courseId = '',
  }) {
    final String preferred = _resolveCourseKey(
      courseTitle: courseTitle,
      courseId: courseId,
    );
    if (_completedLessonsByCourse.containsKey(preferred) ||
        _completedCourses.containsKey(preferred)) {
      return preferred;
    }
    return _resolveCourseKey(courseTitle: courseTitle, courseId: '');
  }

  static String _ensureWritableKey({
    required String courseTitle,
    String courseId = '',
  }) {
    final String preferred = _resolveCourseKey(
      courseTitle: courseTitle,
      courseId: courseId,
    );
    final String legacy = _resolveCourseKey(courseTitle: courseTitle);
    if (preferred == legacy) return preferred;
    if (_completedLessonsByCourse.containsKey(legacy) &&
        !_completedLessonsByCourse.containsKey(preferred)) {
      _completedLessonsByCourse[preferred] = Set<int>.from(
        _completedLessonsByCourse[legacy]!,
      );
      _completedLessonsByCourse.remove(legacy);
    }
    if (_completedCourses.containsKey(legacy) &&
        !_completedCourses.containsKey(preferred)) {
      _completedCourses[preferred] = _completedCourses[legacy]!.copyWith(
        courseId: courseId.trim(),
      );
      _completedCourses.remove(legacy);
    }
    return preferred;
  }

  static String _resolveCourseKey({
    required String courseTitle,
    String courseId = '',
  }) {
    final String id = courseId.trim();
    if (id.isNotEmpty) return 'id:$id';
    return 'title:${courseTitle.trim().toLowerCase()}';
  }

  static Future<void> _writeProgress({
    required String key,
    required String courseId,
    required String courseTitle,
    required Set<int> completedLessonIds,
    required CourseCompletionData? completion,
  }) async {
    final String? userId = _activeUserId;
    if (userId == null) return;
    final List<int> ordered = List<int>.from(completedLessonIds)..sort();
    final Map<String, dynamic> data = {
      'courseId': courseId.trim(),
      'courseTitle': courseTitle.trim(),
      'courseTitleLower': courseTitle.trim().toLowerCase(),
      'completedLessonIds': ordered,
      'updatedAt': Timestamp.now(),
    };
    if (completion != null) {
      data.addAll(completion.toMap());
      data['completedAt'] = Timestamp.now();
    }
    await _collection
        .doc(userId)
        .collection('courses')
        .doc(_docIdForKey(key))
        .set(data, SetOptions(merge: true));
  }

  static String _docIdForKey(String key) {
    return base64UrlEncode(utf8.encode(key)).replaceAll('=', '');
  }

  static void _resetLocal() {
    _completedLessonsByCourse.clear();
    _completedCourses.clear();
    _notifyChanged();
  }

  static void _notifyChanged() {
    revision.value = revision.value + 1;
  }

  static String _generateCertificateId() {
    final int seed = DateTime.now().millisecondsSinceEpoch;
    final int code = math.Random(seed).nextInt(90000000) + 10000000;
    return 'SK$code';
  }
}

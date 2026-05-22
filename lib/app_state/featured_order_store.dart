import 'package:pocketbase/pocketbase.dart';

import '../services/pocketbase_service.dart';
import 'course_catalog.dart';
import 'mentor_catalog.dart';

class FeaturedOrderException implements Exception {
  FeaturedOrderException(this.message);

  final String message;

  @override
  String toString() => message;
}

class FeaturedOrderStore {
  FeaturedOrderStore._();

  static PocketBase get _pb => PocketBaseService.client;
  static const int _rankOffset = 1000;

  static List<CourseItem> orderCourses(List<CourseItem> courses) {
    if (courses.isEmpty) return courses;
    final Map<String, int> sourceIndex = <String, int>{
      for (int i = 0; i < courses.length; i++) courses[i].id: i,
    };
    final List<CourseItem> unranked = <CourseItem>[];
    final List<CourseItem> ranked = <CourseItem>[];
    for (final CourseItem item in courses) {
      if ((item.featuredRank ?? 0) > 0) {
        ranked.add(item);
      } else {
        unranked.add(item);
      }
    }
    unranked.sort((a, b) => _compareNewestFirst(a, b, sourceIndex));
    if (ranked.isEmpty) return courses;
    ranked.sort((a, b) {
      final int left = a.featuredRank ?? _rankOffset;
      final int right = b.featuredRank ?? _rankOffset;
      if (left != right) return left.compareTo(right);
      return _compareNewestFirst(a, b, sourceIndex);
    });
    // Keep new/unranked courses first,
    // then apply admin-defined rank for the rest.
    return <CourseItem>[...unranked, ...ranked];
  }

  static int _compareNewestFirst(
    CourseItem a,
    CourseItem b,
    Map<String, int> sourceIndex,
  ) {
    final DateTime? aCreated = a.createdAt;
    final DateTime? bCreated = b.createdAt;
    if (aCreated != null && bCreated != null) {
      final int byDate = bCreated.compareTo(aCreated);
      if (byDate != 0) return byDate;
    } else if (aCreated != null) {
      return -1;
    } else if (bCreated != null) {
      return 1;
    }
    final int aIndex = sourceIndex[a.id] ?? _rankOffset;
    final int bIndex = sourceIndex[b.id] ?? _rankOffset;
    return aIndex.compareTo(bIndex);
  }

  static List<MentorItem> orderMentors(List<MentorItem> mentors) {
    if (mentors.isEmpty) return mentors;
    final bool hasRank = mentors.any((item) => (item.featuredRank ?? 0) > 0);
    if (!hasRank) return mentors;
    final List<MentorItem> sorted = List<MentorItem>.from(mentors);
    sorted.sort((a, b) {
      final int left = a.featuredRank ?? _rankOffset;
      final int right = b.featuredRank ?? _rankOffset;
      if (left != right) return left.compareTo(right);
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    return sorted;
  }

  static Future<void> persistCourseOrder(List<CourseItem> ordered) async {
    final Map<String, int> ranks = {};
    for (int index = 0; index < ordered.length; index++) {
      ranks[ordered[index].id] = index + 1;
    }
    _applyCourseRanks(ranks);
    await _pushRanks(
      collection: PocketBaseService.coursesCollection,
      ranks: ranks,
    );
  }

  static Future<void> persistMentorOrder(List<MentorItem> ordered) async {
    final Map<String, int> ranks = {};
    for (int index = 0; index < ordered.length; index++) {
      ranks[ordered[index].id] = index + 1;
    }
    _applyMentorRanks(ranks);
    await _pushRanks(
      collection: PocketBaseService.mentorsCollection,
      ranks: ranks,
    );
  }

  static void _applyCourseRanks(Map<String, int> ranks) {
    final List<CourseItem> updated = CourseCatalog.courses.value
        .map(
          (item) => ranks.containsKey(item.id)
              ? item.copyWith(featuredRank: ranks[item.id])
              : item,
        )
        .toList();
    CourseCatalog.courses.value = updated;
  }

  static void _applyMentorRanks(Map<String, int> ranks) {
    final List<MentorItem> updated = MentorCatalog.mentors.value
        .map(
          (item) => ranks.containsKey(item.id)
              ? item.copyWith(featuredRank: ranks[item.id])
              : item,
        )
        .toList();
    MentorCatalog.mentors.value = updated;
  }

  static Future<void> _pushRanks({
    required String collection,
    required Map<String, int> ranks,
  }) async {
    final List<Future<void>> tasks = [];
    ranks.forEach((id, rank) {
      tasks.add(
        _pb.collection(collection).update(id, body: {'featuredRank': rank}),
      );
    });
    try {
      await Future.wait(tasks);
    } catch (error) {
      throw FeaturedOrderException(
        'Failed to save order on server. Ensure the "featuredRank" field exists in PocketBase.',
      );
    }
  }
}

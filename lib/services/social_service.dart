import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class SocialReview {
  const SocialReview({
    required this.id,
    required this.courseKey,
    required this.courseTitle,
    required this.mentorKey,
    required this.mentorName,
    required this.userId,
    required this.userName,
    required this.body,
    required this.rating,
    required this.likesCount,
    required this.likedBy,
    required this.createdAt,
  });

  final String id;
  final String courseKey;
  final String courseTitle;
  final String mentorKey;
  final String mentorName;
  final String userId;
  final String userName;
  final String body;
  final double rating;
  final int likesCount;
  final List<String> likedBy;
  final DateTime? createdAt;

  bool likedByUser(String uid) {
    final String normalized = uid.trim();
    if (normalized.isEmpty) return false;
    return likedBy.contains(normalized);
  }

  factory SocialReview.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final Map<String, dynamic> data = doc.data() ?? <String, dynamic>{};
    final List<String> likedBy = <String>[];
    final Object? rawLikedBy = data['likedBy'];
    if (rawLikedBy is List) {
      for (final Object? entry in rawLikedBy) {
        if (entry is String && entry.trim().isNotEmpty) {
          likedBy.add(entry.trim());
        }
      }
    }
    final int likesCount = _toInt(data['likesCount']);
    return SocialReview(
      id: doc.id,
      courseKey: (data['courseKey'] ?? '').toString(),
      courseTitle: (data['courseTitle'] ?? '').toString(),
      mentorKey: (data['mentorKey'] ?? '').toString(),
      mentorName: (data['mentorName'] ?? '').toString(),
      userId: (data['userId'] ?? '').toString(),
      userName: (data['userName'] ?? '').toString(),
      body: (data['body'] ?? '').toString(),
      rating: _toDouble(data['rating']),
      likesCount: likesCount > 0 ? likesCount : likedBy.length,
      likedBy: likedBy,
      createdAt: _toDateTime(data['createdAt']),
    );
  }

  static int _toInt(Object? value) {
    if (value is int) return value;
    if (value is double) return value.round();
    if (value is String) return int.tryParse(value.trim()) ?? 0;
    return 0;
  }

  static double _toDouble(Object? value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value.trim()) ?? 0;
    return 0;
  }

  static DateTime? _toDateTime(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}

class SocialService {
  SocialService._();

  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static String mentorKey({String? mentorId, required String mentorName}) {
    final String id = (mentorId ?? '').trim();
    if (id.isNotEmpty) return 'id_${_normalizeKey(id)}';
    return 'name_${_normalizeKey(mentorName)}';
  }

  static String courseKey({String? courseId, required String courseTitle}) {
    final String id = (courseId ?? '').trim();
    if (id.isNotEmpty) return 'id_${_normalizeKey(id)}';
    return 'title_${_normalizeKey(courseTitle)}';
  }

  static Stream<int> watchMentorFollowersCount(String mentorKey) {
    final String key = mentorKey.trim();
    if (key.isEmpty) return Stream<int>.value(0);
    return _firestore
        .collection('mentor_follows')
        .where('mentorKey', isEqualTo: key)
        .snapshots()
        .map((snapshot) => snapshot.docs.length);
  }

  static Stream<bool> watchIsFollowingMentor({
    required String mentorKey,
    required String userId,
  }) {
    final String key = mentorKey.trim();
    final String uid = userId.trim();
    if (key.isEmpty || uid.isEmpty) return Stream<bool>.value(false);
    return _firestore
        .collection('mentor_follows')
        .doc(_followDocId(key, uid))
        .snapshots()
        .map((doc) => doc.exists);
  }

  static Future<void> toggleMentorFollow({
    required String mentorKey,
    required String mentorName,
    required User user,
    required bool currentlyFollowing,
  }) async {
    final String key = mentorKey.trim();
    final String uid = user.uid.trim();
    if (key.isEmpty || uid.isEmpty) return;
    final DocumentReference<Map<String, dynamic>> doc = _firestore
        .collection('mentor_follows')
        .doc(_followDocId(key, uid));
    if (currentlyFollowing) {
      await doc.delete();
      return;
    }
    await doc.set({
      'mentorKey': key,
      'mentorName': mentorName.trim(),
      'userId': uid,
      'userEmail': (user.email ?? '').trim(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  static Stream<List<SocialReview>> watchCourseReviews(String courseKey) {
    final String key = courseKey.trim();
    if (key.isEmpty) {
      return Stream<List<SocialReview>>.value(const <SocialReview>[]);
    }
    return _firestore
        .collection('course_reviews')
        .where('courseKey', isEqualTo: key)
        .snapshots()
        .map(_mapReviews);
  }

  static Stream<List<SocialReview>> watchMentorReviews(String mentorKey) {
    final String key = mentorKey.trim();
    if (key.isEmpty) {
      return Stream<List<SocialReview>>.value(const <SocialReview>[]);
    }
    return _firestore
        .collection('course_reviews')
        .where('mentorKey', isEqualTo: key)
        .snapshots()
        .map(_mapReviews);
  }

  static Future<void> addCourseReview({
    required User user,
    required String courseKey,
    required String courseTitle,
    required String mentorKey,
    required String mentorName,
    required String body,
    double rating = 5,
  }) async {
    final String text = body.trim();
    if (text.isEmpty) return;
    final String uid = user.uid.trim();
    if (uid.isEmpty) return;
    final String userName = await _resolveUserName(user);

    await _firestore.collection('course_reviews').add({
      'courseKey': courseKey.trim(),
      'courseTitle': courseTitle.trim(),
      'mentorKey': mentorKey.trim(),
      'mentorName': mentorName.trim(),
      'userId': uid,
      'userEmail': (user.email ?? '').trim(),
      'userName': userName,
      'body': text,
      'rating': rating.clamp(0, 5),
      'likesCount': 0,
      'likedBy': <String>[],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  static Future<void> toggleReviewLike({
    required String reviewId,
    required String userId,
    required bool currentlyLiked,
  }) async {
    final String id = reviewId.trim();
    final String uid = userId.trim();
    if (id.isEmpty || uid.isEmpty) return;
    final DocumentReference<Map<String, dynamic>> doc = _firestore
        .collection('course_reviews')
        .doc(id);
    await doc.update({
      'likedBy': currentlyLiked
          ? FieldValue.arrayRemove(<String>[uid])
          : FieldValue.arrayUnion(<String>[uid]),
      'likesCount': FieldValue.increment(currentlyLiked ? -1 : 1),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  static String formatCompactCount(int value) {
    if (value >= 1000000) {
      final double v = value / 1000000;
      return '${v.toStringAsFixed(v >= 10 ? 0 : 1)}M';
    }
    if (value >= 1000) {
      final double v = value / 1000;
      return '${v.toStringAsFixed(v >= 10 ? 0 : 1)}K';
    }
    return value.toString();
  }

  static String formatTimeAgo(DateTime? dateTime) {
    if (dateTime == null) return 'Just now';
    final Duration diff = DateTime.now().difference(dateTime);
    if (diff.inSeconds < 45) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w ago';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()}mo ago';
    return '${(diff.inDays / 365).floor()}y ago';
  }

  static List<SocialReview> _mapReviews(
    QuerySnapshot<Map<String, dynamic>> snapshot,
  ) {
    final List<SocialReview> reviews = snapshot.docs
        .map(SocialReview.fromDoc)
        .where((review) => review.body.trim().isNotEmpty)
        .toList();
    reviews.sort((a, b) {
      final DateTime? aDate = a.createdAt;
      final DateTime? bDate = b.createdAt;
      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      return bDate.compareTo(aDate);
    });
    return reviews;
  }

  static String _followDocId(String mentorKey, String userId) {
    return '${_normalizeKey(mentorKey)}__${_normalizeKey(userId)}';
  }

  static String _normalizeKey(String value) {
    final String normalized = value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'_+'), '_')
        .replaceAll(RegExp(r'^_|_$'), '');
    return normalized.isEmpty ? 'unknown' : normalized;
  }

  static Future<String> _resolveUserName(User user) async {
    final String displayName = (user.displayName ?? '').trim();
    if (displayName.isNotEmpty) return displayName;
    final String email = (user.email ?? '').trim();
    if (email.contains('@')) {
      return email.split('@').first;
    }
    try {
      final DocumentSnapshot<Map<String, dynamic>> snapshot = await _firestore
          .collection('users')
          .doc(user.uid)
          .get();
      final Map<String, dynamic> data = snapshot.data() ?? <String, dynamic>{};
      final String name = (data['name'] ?? data['fullName'] ?? '')
          .toString()
          .trim();
      if (name.isNotEmpty) return name;
    } catch (_) {}
    return 'Student';
  }
}

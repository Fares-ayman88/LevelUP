import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'admin_access.dart';
import 'course_catalog.dart';
import 'user_access.dart';

enum TransactionStatus { waiting, paid, rejected }

extension TransactionStatusX on TransactionStatus {
  String get code {
    switch (this) {
      case TransactionStatus.waiting:
        return 'waiting';
      case TransactionStatus.paid:
        return 'paid';
      case TransactionStatus.rejected:
        return 'rejected';
    }
  }

  String get label {
    switch (this) {
      case TransactionStatus.waiting:
        return 'Waiting';
      case TransactionStatus.paid:
        return 'Paid';
      case TransactionStatus.rejected:
        return 'Rejected';
    }
  }
}

TransactionStatus _parseTransactionStatus(String? raw) {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'paid':
    case 'approved':
    case 'accept':
    case 'accepted':
    case 'success':
      return TransactionStatus.paid;
    case 'rejected':
    case 'declined':
    case 'denied':
      return TransactionStatus.rejected;
    default:
      return TransactionStatus.waiting;
  }
}

class _ReceiptMeta {
  const _ReceiptMeta({
    required this.receiptCode,
    required this.barcodeLeft,
    required this.barcodeRight,
  });

  final String receiptCode;
  final String barcodeLeft;
  final String barcodeRight;
}

class TransactionItem {
  const TransactionItem({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.courseId,
    required this.mentorId,
    required this.mentorName,
    required this.courseTitle,
    required this.courseCategory,
    required this.priceLabel,
    required this.status,
    this.receiptCode = '',
    this.barcodeLeft = '',
    this.barcodeRight = '',
    this.courseCoverImagePath,
    this.paymentMethod,
    this.senderNumber,
    this.attachmentPath,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String userId;
  final String userName;
  final String userEmail;
  final String courseId;
  final String mentorId;
  final String mentorName;
  final String courseTitle;
  final String courseCategory;
  final String priceLabel;
  final TransactionStatus status;
  final String receiptCode;
  final String barcodeLeft;
  final String barcodeRight;
  final String? courseCoverImagePath;
  final String? paymentMethod;
  final String? senderNumber;
  final String? attachmentPath;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  TransactionItem copyWith({
    String? id,
    String? userId,
    String? userName,
    String? userEmail,
    String? courseId,
    String? mentorId,
    String? mentorName,
    String? courseTitle,
    String? courseCategory,
    String? priceLabel,
    TransactionStatus? status,
    String? receiptCode,
    String? barcodeLeft,
    String? barcodeRight,
    String? courseCoverImagePath,
    String? paymentMethod,
    String? senderNumber,
    String? attachmentPath,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TransactionItem(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      courseId: courseId ?? this.courseId,
      mentorId: mentorId ?? this.mentorId,
      mentorName: mentorName ?? this.mentorName,
      courseTitle: courseTitle ?? this.courseTitle,
      courseCategory: courseCategory ?? this.courseCategory,
      priceLabel: priceLabel ?? this.priceLabel,
      status: status ?? this.status,
      receiptCode: receiptCode ?? this.receiptCode,
      barcodeLeft: barcodeLeft ?? this.barcodeLeft,
      barcodeRight: barcodeRight ?? this.barcodeRight,
      courseCoverImagePath: courseCoverImagePath ?? this.courseCoverImagePath,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      senderNumber: senderNumber ?? this.senderNumber,
      attachmentPath: attachmentPath ?? this.attachmentPath,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory TransactionItem.fromMap(String id, Map<String, dynamic> data) {
    return TransactionItem(
      id: id,
      userId: (data['userId'] ?? '').toString(),
      userName: (data['userName'] ?? '').toString(),
      userEmail: (data['userEmail'] ?? '').toString(),
      courseId: (data['courseId'] ?? '').toString(),
      mentorId: (data['mentorId'] ?? '').toString(),
      mentorName: (data['mentorName'] ?? '').toString(),
      courseTitle: (data['courseTitle'] ?? '').toString(),
      courseCategory: (data['courseCategory'] ?? '').toString(),
      priceLabel: (data['priceLabel'] ?? '').toString(),
      status: _parseTransactionStatus(data['status']?.toString()),
      receiptCode: (data['receiptCode'] ?? '').toString(),
      barcodeLeft: (data['barcodeLeft'] ?? '').toString(),
      barcodeRight: (data['barcodeRight'] ?? '').toString(),
      courseCoverImagePath:
          (data['courseCoverImagePath'] ?? '').toString().trim().isEmpty
          ? null
          : data['courseCoverImagePath'].toString(),
      paymentMethod: (data['paymentMethod'] ?? '').toString().trim().isEmpty
          ? null
          : data['paymentMethod'].toString(),
      senderNumber: (data['senderNumber'] ?? '').toString().trim().isEmpty
          ? null
          : data['senderNumber'].toString(),
      attachmentPath: (data['attachmentPath'] ?? '').toString().trim().isEmpty
          ? null
          : data['attachmentPath'].toString(),
      createdAt: _toDateTime(data['createdAt']),
      updatedAt: _toDateTime(data['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'courseId': courseId,
      'mentorId': mentorId,
      'mentorName': mentorName,
      'courseTitle': courseTitle,
      'courseCategory': courseCategory,
      'priceLabel': priceLabel,
      'status': status.code,
      'receiptCode': receiptCode,
      'barcodeLeft': barcodeLeft,
      'barcodeRight': barcodeRight,
      'courseCoverImagePath': courseCoverImagePath ?? '',
      'paymentMethod': paymentMethod ?? '',
      'senderNumber': senderNumber ?? '',
      'attachmentPath': attachmentPath ?? '',
    };
  }

  static DateTime? _toDateTime(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}

class TransactionCatalog {
  static bool forceLocal = false;
  static final ValueNotifier<List<TransactionItem>> userTransactions =
      ValueNotifier<List<TransactionItem>>(<TransactionItem>[]);
  static final ValueNotifier<List<TransactionItem>> adminTransactions =
      ValueNotifier<List<TransactionItem>>(<TransactionItem>[]);
  static final ValueNotifier<TransactionItem?> lastResolved =
      ValueNotifier<TransactionItem?>(null);
  static final ValueNotifier<bool> resolvedSeenReady = ValueNotifier<bool>(
    false,
  );

  static StreamSubscription<User?>? _authSubscription;
  static StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
  _userSubscription;
  static StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
  _adminSubscription;
  static VoidCallback? _adminAccessListener;
  static Timer? _userRetryTimer;
  static Timer? _adminRetryTimer;
  static String? _currentUserId;
  static bool _firstUserLoad = true;
  static final Map<String, TransactionStatus> _statusCache =
      <String, TransactionStatus>{};
  static Set<String> _resolvedSeen = <String>{};
  static String? _resolvedSeenUserId;
  static final ValueNotifier<bool> adminHasUnread = ValueNotifier<bool>(false);
  static DateTime? _adminLastSeen;
  static List<TransactionItem> _localItems = <TransactionItem>[];
  static bool _localLoaded = false;
  static const String _localKey = 'local_transactions_v1';
  static const String _adminSeenKey = 'admin_seen_payments_v1';
  static const String _resolvedSeenKeyPrefix = 'resolved_seen_v1_';
  static const String _receiptSerialKey = 'receipt_serial_v1';

  static CollectionReference<Map<String, dynamic>> get _collection =>
      FirebaseFirestore.instance.collection('transactions');

  static void bindAuth() {
    if (_authSubscription != null) return;
    _authSubscription = FirebaseAuth.instance.authStateChanges().listen(
      _handleAuth,
    );
    if (_adminAccessListener == null) {
      _adminAccessListener = _handleAdminAccessChanged;
      UserAccess.isAdminListenable.addListener(_adminAccessListener!);
    }
  }

  static void _handleAuth(User? user) {
    if (user == null) {
      _unbindUser();
      _unbindAdmin();
      return;
    }
    if (forceLocal) {
      _ensureLocalLoaded().then((_) {
        _loadAdminSeen();
        _loadResolvedSeen(user.uid);
        bindForUser(user);
        _handleAdminAccessChanged();
      });
      return;
    }
    _loadAdminSeen();
    _loadResolvedSeen(user.uid);
    bindForUser(user);
    _handleAdminAccessChanged();
  }

  static void _unbindUser() {
    _currentUserId = null;
    _firstUserLoad = true;
    _statusCache.clear();
    _userRetryTimer?.cancel();
    _userRetryTimer = null;
    _userSubscription?.cancel();
    _userSubscription = null;
    userTransactions.value = <TransactionItem>[];
    lastResolved.value = null;
    _clearResolvedSeen();
  }

  static void _unbindAdmin() {
    _adminRetryTimer?.cancel();
    _adminRetryTimer = null;
    _adminSubscription?.cancel();
    _adminSubscription = null;
    adminTransactions.value = <TransactionItem>[];
    adminHasUnread.value = false;
  }

  static void _handleAdminAccessChanged() {
    if (_currentUserId == null) {
      _unbindAdmin();
      return;
    }
    if (UserAccess.isAdmin) {
      bindForAdmin();
    } else {
      _unbindAdmin();
    }
  }

  static void bindForUser(User user) {
    if (forceLocal) {
      _currentUserId = user.uid;
      _firstUserLoad = true;
      _statusCache.clear();
      lastResolved.value = null;
      _loadResolvedSeen(user.uid);
      _userSubscription?.cancel();
      _userSubscription = null;
      _refreshLocalViews();
      return;
    }
    if (_currentUserId == user.uid && _userSubscription != null) return;
    _currentUserId = user.uid;
    _firstUserLoad = true;
    _statusCache.clear();
    lastResolved.value = null;
    _userRetryTimer?.cancel();
    _userRetryTimer = null;
    _loadResolvedSeen(user.uid);
    _userSubscription?.cancel();
    _userSubscription = _collection
        .where('userId', isEqualTo: user.uid)
        .snapshots()
        .listen(
          (snapshot) {
            final List<TransactionItem> items = _sortedByNewest(
              snapshot.docs
                  .map((doc) => TransactionItem.fromMap(doc.id, doc.data()))
                  .toList(),
            );
            userTransactions.value = items;
            _handleUserStatusUpdates(items);
          },
          onError: (Object error, StackTrace stackTrace) {
            debugPrint(
              '[TransactionCatalog] user subscription failed: $error',
            );
            debugPrintStack(stackTrace: stackTrace);
            _userSubscription?.cancel();
            _userSubscription = null;
            _scheduleUserRetry();
          },
        );
  }

  static void bindForAdmin() {
    if (forceLocal) {
      _adminSubscription?.cancel();
      _adminSubscription = null;
      _refreshLocalViews();
      return;
    }
    if (_adminSubscription != null) return;
    _adminRetryTimer?.cancel();
    _adminRetryTimer = null;
    _adminSubscription = _collection
        .snapshots()
        .listen(
          (snapshot) {
            final List<TransactionItem> items = _sortedByNewest(
              snapshot.docs
                  .map((doc) => TransactionItem.fromMap(doc.id, doc.data()))
                  .toList(),
            );
            adminTransactions.value = items;
            _updateAdminUnread(items);
          },
          onError: (Object error, StackTrace stackTrace) {
            debugPrint(
              '[TransactionCatalog] admin subscription failed: $error',
            );
            debugPrintStack(stackTrace: stackTrace);
            _adminSubscription?.cancel();
            _adminSubscription = null;
            _scheduleAdminRetry();
          },
        );
  }

  static void _scheduleUserRetry() {
    if (forceLocal) return;
    _userRetryTimer?.cancel();
    _userRetryTimer = Timer(const Duration(seconds: 2), () {
      final User? current = FirebaseAuth.instance.currentUser;
      final String? activeId = _currentUserId;
      if (current == null || activeId == null || current.uid != activeId) {
        return;
      }
      bindForUser(current);
    });
  }

  static void _scheduleAdminRetry() {
    if (forceLocal) return;
    if (!UserAccess.isAdmin) return;
    _adminRetryTimer?.cancel();
    _adminRetryTimer = Timer(const Duration(seconds: 2), () {
      if (!UserAccess.isAdmin) return;
      bindForAdmin();
    });
  }

  static void _handleUserStatusUpdates(List<TransactionItem> items) {
    final Map<String, TransactionStatus> previous =
        Map<String, TransactionStatus>.from(_statusCache);
    _statusCache
      ..clear()
      ..addEntries(items.map((item) => MapEntry(item.id, item.status)));

    if (_firstUserLoad) {
      _firstUserLoad = false;
      for (final TransactionItem item in items) {
        if (item.status != TransactionStatus.waiting) {
          lastResolved.value = item;
          break;
        }
      }
      return;
    }

    for (final TransactionItem item in items) {
      final TransactionStatus? prev = previous[item.id];
      if (prev == TransactionStatus.waiting &&
          item.status != TransactionStatus.waiting) {
        lastResolved.value = item;
        break;
      }
    }
  }

  static bool hasPending() {
    return userTransactions.value.any(
      (item) => item.status == TransactionStatus.waiting,
    );
  }

  static String _normalizeCourseTitle(String value) {
    final String lowered = value.trim().toLowerCase();
    if (lowered.isEmpty) return '';
    return lowered
        .replaceAll(RegExp(r'[^a-z0-9\u0600-\u06FF\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static bool _titlesLikelyMatch(String left, String right) {
    final String a = _normalizeCourseTitle(left);
    final String b = _normalizeCourseTitle(right);
    if (a.isEmpty || b.isEmpty) return false;
    if (a == b) return true;
    if (a.length >= 8 && b.length >= 8 && (a.contains(b) || b.contains(a))) {
      return true;
    }
    final Set<String> aTokens = a
        .split(' ')
        .where((token) => token.length >= 3)
        .toSet();
    final Set<String> bTokens = b
        .split(' ')
        .where((token) => token.length >= 3)
        .toSet();
    if (aTokens.isEmpty || bTokens.isEmpty) return false;
    final int common = aTokens.intersection(bTokens).length;
    final int required = math.max(1, math.min(aTokens.length, bTokens.length));
    return common >= required;
  }

  static bool hasPaidForCourse({
    required String courseTitle,
    String courseId = '',
  }) {
    final String normalizedTitle = _normalizeCourseTitle(courseTitle);
    final String normalizedId = courseId.trim();
    if (normalizedTitle.isEmpty && normalizedId.isEmpty) return false;
    return userTransactions.value.any((item) {
      if (item.status != TransactionStatus.paid) return false;
      if (normalizedId.isNotEmpty && item.courseId.trim() == normalizedId) {
        return true;
      }
      return _titlesLikelyMatch(item.courseTitle, normalizedTitle);
    });
  }

  static bool hasPendingForCourse({
    required String courseTitle,
    String courseId = '',
  }) {
    final String normalizedTitle = _normalizeCourseTitle(courseTitle);
    final String normalizedId = courseId.trim();
    if (normalizedTitle.isEmpty && normalizedId.isEmpty) return false;
    return userTransactions.value.any((item) {
      if (item.status != TransactionStatus.waiting) return false;
      if (normalizedId.isNotEmpty && item.courseId.trim() == normalizedId) {
        return true;
      }
      return _titlesLikelyMatch(item.courseTitle, normalizedTitle);
    });
  }

  static Future<_ReceiptMeta> _createReceiptMeta() async {
    final int serial = await _nextReceiptSerial();
    final String serialText = serial.toString().padLeft(9, '0');
    final int left = (serial * 37) % 100000000;
    final int right = (serial * 91 + 13579) % 100000000;
    return _ReceiptMeta(
      receiptCode: 'SK$serialText',
      barcodeLeft: left.toString().padLeft(8, '0'),
      barcodeRight: right.toString().padLeft(8, '0'),
    );
  }

  static Future<int> _nextReceiptSerial() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    int current = prefs.getInt(_receiptSerialKey) ?? 0;
    if (current <= 0) {
      current = 100000000 + math.Random().nextInt(900000000);
    }
    int next = current + 1;
    if (next > 999999999) {
      next = 100000000 + math.Random().nextInt(900000000);
    }
    await prefs.setInt(_receiptSerialKey, next);
    return next;
  }

  static Future<TransactionItem?> createTransaction({
    String? courseId,
    required String courseTitle,
    required String courseCategory,
    required String priceLabel,
    String? courseCoverImagePath,
    String? paymentMethod,
    String? senderNumber,
    String? attachmentPath,
  }) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    final String userName = _resolveUserName(user);
    final String userEmail = (user.email ?? '').trim();
    final String requestedCourseId = (courseId ?? '').trim();
    CourseItem? course;
    if (requestedCourseId.isNotEmpty) {
      for (final CourseItem item in CourseCatalog.items) {
        if (item.id.trim() == requestedCourseId) {
          course = item;
          break;
        }
      }
    }
    course ??= CourseCatalog.findByTitle(courseTitle);
    final String resolvedCourseId = requestedCourseId.isNotEmpty
        ? requestedCourseId
        : (course?.id ?? '').trim();
    final String mentorId = (course?.mentorId ?? '').trim();
    final String mentorName = (course?.mentorName ?? '').trim();
    final _ReceiptMeta meta = await _createReceiptMeta();
    if (forceLocal) {
      final String id = DateTime.now().millisecondsSinceEpoch.toString();
      final TransactionItem item = TransactionItem(
        id: id,
        userId: user.uid,
        userName: userName,
        userEmail: userEmail,
        courseId: resolvedCourseId,
        mentorId: mentorId,
        mentorName: mentorName,
        courseTitle: courseTitle.trim(),
        courseCategory: courseCategory.trim(),
        priceLabel: priceLabel.trim(),
        status: TransactionStatus.waiting,
        receiptCode: meta.receiptCode,
        barcodeLeft: meta.barcodeLeft,
        barcodeRight: meta.barcodeRight,
        courseCoverImagePath: courseCoverImagePath,
        paymentMethod: paymentMethod,
        senderNumber: senderNumber,
        attachmentPath: attachmentPath,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      _localItems = [item, ..._localItems];
      await _persistLocal();
      _refreshLocalViews();
      return item;
    }
    final DocumentReference<Map<String, dynamic>> doc = _collection.doc();
    final TransactionItem item = TransactionItem(
      id: doc.id,
      userId: user.uid,
      userName: userName,
      userEmail: userEmail,
      courseId: resolvedCourseId,
      mentorId: mentorId,
      mentorName: mentorName,
      courseTitle: courseTitle.trim(),
      courseCategory: courseCategory.trim(),
      priceLabel: priceLabel.trim(),
      status: TransactionStatus.waiting,
      receiptCode: meta.receiptCode,
      barcodeLeft: meta.barcodeLeft,
      barcodeRight: meta.barcodeRight,
      courseCoverImagePath: courseCoverImagePath,
      paymentMethod: paymentMethod,
      senderNumber: senderNumber,
      attachmentPath: attachmentPath,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    final Map<String, dynamic> data = item.toMap()
      ..addAll({'createdAt': Timestamp.now(), 'updatedAt': Timestamp.now()});
    try {
      await doc.set(data);
    } catch (error, stackTrace) {
      debugPrint('[TransactionCatalog] createTransaction failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      rethrow;
    }
    return item;
  }

  static Future<void> updateStatus({
    required String transactionId,
    required TransactionStatus status,
  }) async {
    if (forceLocal) {
      bool changed = false;
      _localItems = _localItems.map((item) {
        if (item.id != transactionId) return item;
        changed = true;
        return item.copyWith(status: status, updatedAt: DateTime.now());
      }).toList();
      if (changed) {
        await _persistLocal();
        _refreshLocalViews();
        lastResolved.value = _localItems.firstWhere(
          (item) => item.id == transactionId,
        );
      }
      return;
    }
    await _collection.doc(transactionId).set({
      'status': status.code,
      'updatedAt': Timestamp.now(),
    }, SetOptions(merge: true));
  }

  static bool isResolvedSeen(String id) {
    return _resolvedSeen.contains(id);
  }

  static Future<void> markResolvedSeen(String id) async {
    final String resolvedId = id.trim();
    if (resolvedId.isEmpty) return;
    final String? userId = _resolvedSeenUserId ?? _currentUserId;
    if (userId == null) return;
    if (_resolvedSeen.contains(resolvedId)) return;
    _resolvedSeen.add(resolvedId);
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(
        '$_resolvedSeenKeyPrefix$userId',
        _resolvedSeen.toList(),
      );
    } catch (_) {}
  }

  static String _resolveUserName(User user) {
    final String displayName = (user.displayName ?? '').trim();
    if (displayName.isNotEmpty) return displayName;
    final String email = (user.email ?? '').trim();
    if (email.contains('@')) return email.split('@').first;
    return 'User';
  }

  static Future<void> _ensureLocalLoaded() async {
    if (_localLoaded) return;
    _localLoaded = true;
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final String? raw = prefs.getString(_localKey);
      if (raw == null || raw.trim().isEmpty) return;
      final List<dynamic> decoded = jsonDecode(raw) as List<dynamic>;
      _localItems = decoded
          .whereType<Map<String, dynamic>>()
          .map(
            (data) =>
                TransactionItem.fromMap((data['id'] ?? '').toString(), data),
          )
          .toList();
    } catch (_) {
      _localItems = <TransactionItem>[];
    }
  }

  static Future<void> _loadResolvedSeen(String userId) async {
    if (_resolvedSeenUserId == userId && resolvedSeenReady.value) {
      return;
    }
    _resolvedSeenUserId = userId;
    resolvedSeenReady.value = false;
    _resolvedSeen = <String>{};
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final List<String>? stored = prefs.getStringList(
        '$_resolvedSeenKeyPrefix$userId',
      );
      if (stored != null) {
        _resolvedSeen = stored.where((id) => id.trim().isNotEmpty).toSet();
      }
    } catch (_) {}
    resolvedSeenReady.value = true;
  }

  static void _clearResolvedSeen() {
    _resolvedSeen = <String>{};
    _resolvedSeenUserId = null;
    resolvedSeenReady.value = false;
  }

  static Future<void> markAdminNotificationsSeen() async {
    final DateTime? latest = _latestPendingAt(adminTransactions.value);
    if (latest == null) {
      adminHasUnread.value = false;
      return;
    }
    _adminLastSeen = latest;
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_adminSeenKey, latest.millisecondsSinceEpoch);
    } catch (_) {}
    adminHasUnread.value = false;
  }

  static Future<void> _loadAdminSeen() async {
    if (_adminLastSeen != null) return;
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final int? millis = prefs.getInt(_adminSeenKey);
      if (millis != null) {
        _adminLastSeen = DateTime.fromMillisecondsSinceEpoch(millis);
      }
    } catch (_) {}
  }

  static Future<void> _persistLocal() async {
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final String raw = jsonEncode(
        _localItems.map((item) {
          final Map<String, dynamic> map = item.toMap();
          map['id'] = item.id;
          return map;
        }).toList(),
      );
      await prefs.setString(_localKey, raw);
    } catch (_) {}
  }

  static void _refreshLocalViews() {
    final String? userId = _currentUserId;
    final List<TransactionItem> ordered = List<TransactionItem>.from(
      _localItems,
    );
    ordered.sort((a, b) {
      final DateTime aTime = a.createdAt ?? DateTime(1970);
      final DateTime bTime = b.createdAt ?? DateTime(1970);
      return bTime.compareTo(aTime);
    });
    if (userId == null) {
      userTransactions.value = <TransactionItem>[];
    } else {
      userTransactions.value = ordered
          .where((item) => item.userId == userId)
          .toList();
    }
    adminTransactions.value = ordered;
    _updateAdminUnread(ordered);
    _handleUserStatusUpdates(userTransactions.value);
  }

  static DateTime? _latestPendingAt(List<TransactionItem> items) {
    DateTime? latest;
    for (final TransactionItem item in items) {
      if (item.status != TransactionStatus.waiting) continue;
      final DateTime time = item.updatedAt ?? item.createdAt ?? DateTime(1970);
      if (latest == null || time.isAfter(latest)) {
        latest = time;
      }
    }
    return latest;
  }

  static List<TransactionItem> _sortedByNewest(List<TransactionItem> items) {
    final List<TransactionItem> sorted = List<TransactionItem>.from(items);
    sorted.sort((a, b) {
      final DateTime aTime = a.createdAt ?? a.updatedAt ?? DateTime(1970);
      final DateTime bTime = b.createdAt ?? b.updatedAt ?? DateTime(1970);
      return bTime.compareTo(aTime);
    });
    return sorted;
  }

  static void _updateAdminUnread(List<TransactionItem> items) {
    if (!AdminAccess.isAdmin()) {
      adminHasUnread.value = false;
      return;
    }
    final DateTime? latestPending = _latestPendingAt(items);
    if (latestPending == null) {
      adminHasUnread.value = false;
      return;
    }
    final DateTime lastSeen =
        _adminLastSeen ?? DateTime.fromMillisecondsSinceEpoch(0);
    adminHasUnread.value = latestPending.isAfter(lastSeen);
  }
}

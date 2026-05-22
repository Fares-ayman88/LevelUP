import 'dart:async';

import 'package:pocketbase/pocketbase.dart';

import 'pocketbase_service.dart';

class MentorChatConversationSummary {
  const MentorChatConversationSummary({
    required this.conversationId,
    required this.userId,
    required this.mentorId,
    required this.mentorName,
    required this.mentorRole,
    required this.mentorImagePath,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.lastMessageFromUser,
    required this.lastSeenByMentor,
    required this.activeForMentor,
    required this.unreadForUser,
    required this.lastUserMessageId,
  });

  final String conversationId;
  final String userId;
  final String mentorId;
  final String mentorName;
  final String mentorRole;
  final String mentorImagePath;
  final String lastMessage;
  final DateTime? lastMessageAt;
  final bool lastMessageFromUser;
  final bool lastSeenByMentor;
  final bool activeForMentor;
  final int unreadForUser;
  final String lastUserMessageId;

  factory MentorChatConversationSummary.fromRecord(RecordModel record) {
    final Map<String, dynamic> data = record.data;
    final String conversationKey = (data['conversationKey'] ?? '')
        .toString()
        .trim();
    return MentorChatConversationSummary(
      conversationId: conversationKey.isEmpty ? record.id : conversationKey,
      userId: (data['userId'] ?? '').toString(),
      mentorId: (data['mentorId'] ?? '').toString(),
      mentorName: (data['mentorName'] ?? '').toString(),
      mentorRole: (data['mentorRole'] ?? '').toString(),
      mentorImagePath: (data['mentorImagePath'] ?? data['mentorImageUrl'] ?? '')
          .toString(),
      lastMessage: (data['lastMessage'] ?? '').toString(),
      lastMessageAt: _toNullableDateTime(
        data['lastMessageAt'] ?? data['updated'] ?? data['created'],
      ),
      lastMessageFromUser: _toBool(data['lastMessageFromUser']),
      lastSeenByMentor: _toBool(data['lastSeenByMentor'], fallback: true),
      activeForMentor: _toBool(data['activeForMentor']),
      unreadForUser: _toInt(data['unreadForUser']),
      lastUserMessageId: (data['lastUserMessageId'] ?? '').toString(),
    );
  }
}

class MentorChatMessage {
  const MentorChatMessage({
    required this.id,
    required this.senderRole,
    required this.text,
    required this.createdAt,
    required this.seenByMentor,
  });

  final String id;
  final String senderRole;
  final String text;
  final DateTime createdAt;
  final bool seenByMentor;

  factory MentorChatMessage.fromRecord(RecordModel record) {
    final Map<String, dynamic> data = record.data;
    return MentorChatMessage(
      id: record.id,
      senderRole: (data['senderRole'] ?? 'mentor').toString(),
      text: (data['text'] ?? '').toString(),
      createdAt: _toDateTime(data['createdAt'] ?? data['created']),
      seenByMentor: _toBool(data['seenByMentor'], fallback: true),
    );
  }
}

class MentorChatService {
  MentorChatService._();

  static const String _chatsCollection = 'mentor_chats';
  static const String _messagesCollection = 'mentor_chat_messages';
  static const Duration _readTimeout = Duration(seconds: 20);
  static const Duration _writeTimeout = Duration(seconds: 20);
  static const Duration _pollInterval = Duration(seconds: 2);

  static PocketBase get _pb => PocketBaseService.client;

  static String buildConversationId({
    required String userId,
    required String mentorId,
  }) {
    return '${_normalizeKey(userId)}__${_normalizeKey(mentorId)}';
  }

  static Stream<List<MentorChatConversationSummary>> streamUserChats(
    String userId,
  ) {
    final String trimmedUser = userId.trim();
    if (trimmedUser.isEmpty) {
      return Stream<List<MentorChatConversationSummary>>.value(
        const <MentorChatConversationSummary>[],
      );
    }
    return _pollList<MentorChatConversationSummary>(() async {
      final String filter = _pb.filter('userId = {:userId}', <String, dynamic>{
        'userId': trimmedUser,
      });
      final List<RecordModel> records = await _pb
          .collection(_chatsCollection)
          .getFullList(filter: filter, sort: '-lastMessageAt,-updated')
          .timeout(_readTimeout);
      final List<MentorChatConversationSummary> items = records
          .map(MentorChatConversationSummary.fromRecord)
          .toList();
      items.sort((a, b) {
        final DateTime aTime =
            a.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final DateTime bTime =
            b.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bTime.compareTo(aTime);
      });
      return items;
    });
  }

  static Stream<List<MentorChatMessage>> streamMessages(String conversationId) {
    final String conversationKey = conversationId.trim();
    if (conversationKey.isEmpty) {
      return Stream<List<MentorChatMessage>>.value(const <MentorChatMessage>[]);
    }
    return _pollList<MentorChatMessage>(() async {
      final String filter = _pb.filter(
        'conversationKey = {:conversationKey}',
        <String, dynamic>{'conversationKey': conversationKey},
      );
      final List<RecordModel> records = await _pb
          .collection(_messagesCollection)
          .getFullList(filter: filter, sort: 'createdAt,created')
          .timeout(_readTimeout);
      return records.map(MentorChatMessage.fromRecord).toList();
    });
  }

  static Stream<MentorChatConversationSummary?> streamConversationSummary(
    String conversationId,
  ) {
    final String conversationKey = conversationId.trim();
    if (conversationKey.isEmpty) {
      return Stream<MentorChatConversationSummary?>.value(null);
    }
    return _pollNullable<MentorChatConversationSummary>(() async {
      final RecordModel? record = await _findConversationByKey(conversationKey);
      if (record == null) return null;
      return MentorChatConversationSummary.fromRecord(record);
    });
  }

  static Future<void> ensureConversation({
    required String conversationId,
    required String userId,
    required String mentorId,
    required String mentorName,
    required String mentorRole,
    String? mentorImagePath,
  }) async {
    final String conversationKey = conversationId.trim();
    final String uid = userId.trim();
    final String mid = mentorId.trim();
    if (conversationKey.isEmpty || uid.isEmpty || mid.isEmpty) return;
    final String name = mentorName.trim().isEmpty
        ? 'Mentor'
        : mentorName.trim();
    final String role = mentorRole.trim().isEmpty
        ? 'Mentor'
        : mentorRole.trim();
    final String imagePath = (mentorImagePath ?? '').trim();
    final String now = DateTime.now().toUtc().toIso8601String();

    final Map<String, dynamic> payload = <String, dynamic>{
      'conversationKey': conversationKey,
      'userId': uid,
      'mentorId': mid,
      'mentorName': name,
      'mentorRole': role,
      'updatedAt': now,
    };
    if (imagePath.isNotEmpty) {
      payload['mentorImagePath'] = imagePath;
    }

    final RecordModel? existing = await _findConversationByKey(conversationKey);
    if (existing == null) {
      await _pb
          .collection(_chatsCollection)
          .create(
            body: <String, dynamic>{
              ...payload,
              'lastMessage': '',
              'lastMessageAt': now,
              'lastMessageFromUser': false,
              'lastSeenByMentor': true,
              'activeForMentor': false,
              'unreadForUser': 0,
              'lastUserMessageId': '',
            },
          )
          .timeout(_writeTimeout);
      return;
    }

    await _pb
        .collection(_chatsCollection)
        .update(existing.id, body: payload)
        .timeout(_writeTimeout);
  }

  static Future<void> sendUserText({
    required String conversationId,
    required String userId,
    required String mentorId,
    required String mentorName,
    required String mentorRole,
    String? mentorImagePath,
    required String text,
  }) async {
    final String conversationKey = conversationId.trim();
    final String uid = userId.trim();
    final String mid = mentorId.trim();
    final String trimmed = text.trim();
    if (conversationKey.isEmpty ||
        uid.isEmpty ||
        mid.isEmpty ||
        trimmed.isEmpty) {
      return;
    }

    await ensureConversation(
      conversationId: conversationKey,
      userId: uid,
      mentorId: mid,
      mentorName: mentorName,
      mentorRole: mentorRole,
      mentorImagePath: mentorImagePath,
    );

    final RecordModel? conversation = await _findConversationByKey(
      conversationKey,
    );
    if (conversation == null) return;
    final String now = DateTime.now().toUtc().toIso8601String();

    final RecordModel messageRecord = await _pb
        .collection(_messagesCollection)
        .create(
          body: <String, dynamic>{
            'chatId': conversation.id,
            'conversationKey': conversationKey,
            'senderRole': 'user',
            'senderId': uid,
            'text': trimmed,
            'seenByMentor': false,
            'createdAt': now,
          },
        )
        .timeout(_writeTimeout);

    final String name = mentorName.trim().isEmpty
        ? 'Mentor'
        : mentorName.trim();
    final String role = mentorRole.trim().isEmpty
        ? 'Mentor'
        : mentorRole.trim();
    final String imagePath = (mentorImagePath ?? '').trim();
    final Map<String, dynamic> payload = <String, dynamic>{
      'conversationKey': conversationKey,
      'userId': uid,
      'mentorId': mid,
      'mentorName': name,
      'mentorRole': role,
      'lastMessage': _previewText(trimmed),
      'lastMessageAt': now,
      'lastMessageFromUser': true,
      'lastSeenByMentor': false,
      'lastUserMessageId': messageRecord.id,
      'unreadForUser': 0,
      'updatedAt': now,
    };
    if (imagePath.isNotEmpty) {
      payload['mentorImagePath'] = imagePath;
    }
    await _pb
        .collection(_chatsCollection)
        .update(conversation.id, body: payload)
        .timeout(_writeTimeout);
  }

  static Future<void> markMentorSeen(String conversationId) async {
    final String conversationKey = conversationId.trim();
    if (conversationKey.isEmpty) return;
    final RecordModel? conversation = await _findConversationByKey(
      conversationKey,
    );
    if (conversation == null) return;
    final Map<String, dynamic> data = conversation.data;
    final String lastUserMessageId = (data['lastUserMessageId'] ?? '')
        .toString()
        .trim();
    if (lastUserMessageId.isNotEmpty) {
      await _pb
          .collection(_messagesCollection)
          .update(
            lastUserMessageId,
            body: <String, dynamic>{'seenByMentor': true},
          )
          .timeout(_writeTimeout);
    }
    await _pb
        .collection(_chatsCollection)
        .update(
          conversation.id,
          body: <String, dynamic>{
            'lastSeenByMentor': true,
            'activeForMentor': true,
            'updatedAt': DateTime.now().toUtc().toIso8601String(),
          },
        )
        .timeout(_writeTimeout);
  }

  static Future<void> setMentorActive(
    String conversationId, {
    required bool active,
  }) async {
    final String conversationKey = conversationId.trim();
    if (conversationKey.isEmpty) return;
    final RecordModel? conversation = await _findConversationByKey(
      conversationKey,
    );
    if (conversation == null) return;
    await _pb
        .collection(_chatsCollection)
        .update(
          conversation.id,
          body: <String, dynamic>{
            'activeForMentor': active,
            'updatedAt': DateTime.now().toUtc().toIso8601String(),
          },
        )
        .timeout(_writeTimeout);
  }

  static Future<void> markReadForUser(String conversationId) async {
    final String conversationKey = conversationId.trim();
    if (conversationKey.isEmpty) return;
    final RecordModel? conversation = await _findConversationByKey(
      conversationKey,
    );
    if (conversation == null) return;
    await _pb
        .collection(_chatsCollection)
        .update(
          conversation.id,
          body: <String, dynamic>{
            'unreadForUser': 0,
            'updatedAt': DateTime.now().toUtc().toIso8601String(),
          },
        )
        .timeout(_writeTimeout);
  }

  static String formatMessageTime(DateTime value) {
    final String hour = value.hour.toString().padLeft(2, '0');
    final String minute = value.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  static String formatSummaryTime(DateTime? value) {
    if (value == null) return '';
    final DateTime now = DateTime.now();
    final DateTime today = DateTime(now.year, now.month, now.day);
    final DateTime other = DateTime(value.year, value.month, value.day);
    final Duration diff = today.difference(other);
    if (diff.inDays == 0) {
      return formatMessageTime(value);
    }
    if (diff.inDays == 1) return 'Yesterday';
    return '${value.day}/${value.month}';
  }

  static Future<RecordModel?> _findConversationByKey(
    String conversationKey,
  ) async {
    final String key = conversationKey.trim();
    if (key.isEmpty) return null;
    final String filter = _pb.filter(
      'conversationKey = {:conversationKey}',
      <String, dynamic>{'conversationKey': key},
    );
    final ResultList<RecordModel> result = await _pb
        .collection(_chatsCollection)
        .getList(page: 1, perPage: 1, filter: filter, sort: '-updated')
        .timeout(_readTimeout);
    if (result.items.isEmpty) return null;
    return result.items.first;
  }

  static Stream<List<T>> _pollList<T>(
    Future<List<T>> Function() loader,
  ) async* {
    List<T> last = <T>[];
    while (true) {
      try {
        last = await loader();
      } catch (_) {}
      yield last;
      await Future<void>.delayed(_pollInterval);
    }
  }

  static Stream<T?> _pollNullable<T>(Future<T?> Function() loader) async* {
    T? last;
    while (true) {
      try {
        last = await loader();
      } catch (_) {}
      yield last;
      await Future<void>.delayed(_pollInterval);
    }
  }

  static String _previewText(String value) {
    final String trimmed = value.trim();
    if (trimmed.length <= 60) return trimmed;
    return '${trimmed.substring(0, 60)}...';
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
}

DateTime _toDateTime(Object? value) {
  if (value is DateTime) return value;
  if (value is String) {
    final String trimmed = value.trim();
    if (trimmed.isNotEmpty) {
      final DateTime? parsed = DateTime.tryParse(trimmed);
      if (parsed != null) return parsed.toLocal();
    }
  }
  return DateTime.now();
}

DateTime? _toNullableDateTime(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  if (value is String) {
    final String trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final DateTime? parsed = DateTime.tryParse(trimmed);
    if (parsed != null) return parsed.toLocal();
  }
  return null;
}

int _toInt(Object? value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value.trim()) ?? 0;
  return 0;
}

bool _toBool(Object? value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is int) return value != 0;
  if (value is double) return value.round() != 0;
  if (value is String) {
    final String lowered = value.toLowerCase();
    return lowered == 'true' || lowered == '1' || lowered == 'yes';
  }
  return fallback;
}

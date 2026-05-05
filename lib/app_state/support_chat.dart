import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:pocketbase/pocketbase.dart';

import '../services/pocketbase_service.dart';
import 'static_admins.dart';
import 'user_profile.dart';

class SupportChatException implements Exception {
  SupportChatException(this.message);

  final String message;

  @override
  String toString() => message;
}

class SupportChatAttachment {
  const SupportChatAttachment({
    required this.url,
    required this.name,
    required this.size,
    required this.type,
    required this.data,
    required this.mime,
  });

  final String url;
  final String name;
  final int size;
  final String type;
  final String data;
  final String mime;

  factory SupportChatAttachment.fromMap(Map<String, dynamic> data) {
    return SupportChatAttachment(
      url: (data['url'] ?? '').toString(),
      name: (data['name'] ?? '').toString(),
      size: _toInt(data['size']),
      type: (data['type'] ?? '').toString(),
      data: (data['data'] ?? '').toString(),
      mime: (data['mime'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'url': url,
      'name': name,
      'size': size,
      'type': type,
      'data': data,
      'mime': mime,
    };
  }
}

class SupportChatMessage {
  const SupportChatMessage({
    required this.id,
    required this.senderRole,
    required this.text,
    required this.type,
    required this.createdAt,
    required this.attachments,
  });

  final String id;
  final String senderRole;
  final String text;
  final String type;
  final DateTime createdAt;
  final List<SupportChatAttachment> attachments;

  factory SupportChatMessage.fromRecord(RecordModel record) {
    final Map<String, dynamic> data = record.data;
    final List<SupportChatAttachment> attachments = [];
    final Object? raw = data['attachments'];
    if (raw is List) {
      for (final Object? entry in raw) {
        if (entry is Map<String, dynamic>) {
          attachments.add(SupportChatAttachment.fromMap(entry));
        } else if (entry is Map) {
          attachments.add(
            SupportChatAttachment.fromMap(Map<String, dynamic>.from(entry)),
          );
        }
      }
    }
    return SupportChatMessage(
      id: record.id,
      senderRole: (data['senderRole'] ?? '').toString(),
      text: (data['text'] ?? '').toString(),
      type: (data['type'] ?? 'text').toString(),
      createdAt: _toDateTime(data['createdAt'] ?? data['created']),
      attachments: attachments,
    );
  }
}

class SupportChatSummary {
  const SupportChatSummary({
    required this.chatId,
    required this.userId,
    required this.userName,
    required this.userEmail,
    this.adminId = '',
    this.adminName = '',
    this.adminEmail = '',
    required this.lastMessage,
    this.lastMessageSender,
    required this.lastMessageAt,
    required this.unreadForAdmin,
    required this.unreadForUser,
    required this.lastReadByAdminAt,
    required this.lastReadByUserAt,
    required this.activeForAdmin,
    required this.activeForUser,
  });

  final String chatId;
  final String userId;
  final String userName;
  final String userEmail;
  final String adminId;
  final String adminName;
  final String adminEmail;
  final String lastMessage;
  final String? lastMessageSender;
  final DateTime? lastMessageAt;
  final int unreadForAdmin;
  final int unreadForUser;
  final DateTime? lastReadByAdminAt;
  final DateTime? lastReadByUserAt;
  final bool activeForAdmin;
  final bool activeForUser;

  factory SupportChatSummary.fromRecord(RecordModel record) {
    final Map<String, dynamic> data = record.data;
    return SupportChatSummary(
      chatId: record.id,
      userId: (data['userId'] ?? '').toString(),
      userName: (data['userName'] ?? '').toString(),
      userEmail: (data['userEmail'] ?? '').toString(),
      adminId: (data['adminId'] ?? '').toString(),
      adminName: (data['adminName'] ?? '').toString(),
      adminEmail: (data['adminEmail'] ?? '').toString(),
      lastMessage: (data['lastMessage'] ?? '').toString(),
      lastMessageSender: data['lastMessageSender']?.toString(),
      lastMessageAt: _toNullableDateTime(
        data['lastMessageAt'] ?? data['updated'] ?? data['created'],
      ),
      unreadForAdmin: _toInt(data['unreadForAdmin']),
      unreadForUser: _toInt(data['unreadForUser']),
      lastReadByAdminAt: _toNullableDateTime(data['lastReadByAdminAt']),
      lastReadByUserAt: _toNullableDateTime(data['lastReadByUserAt']),
      activeForAdmin: _toBool(data['activeForAdmin']),
      activeForUser: _toBool(data['activeForUser']),
    );
  }
}

class SupportAdmin {
  const SupportAdmin({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl = '',
    this.status = '',
    this.approved = false,
  });

  final String id;
  final String name;
  final String email;
  final String avatarUrl;
  final String status;
  final bool approved;

  bool get isActive =>
      status.trim().isEmpty || status.toLowerCase() == 'active';

  factory SupportAdmin.fromRecord(RecordModel record) {
    final Map<String, dynamic> data = record.data;
    final String rawName =
        (data['fullName'] ??
                data['name'] ??
                data['nickName'] ??
                data['displayName'] ??
                data['username'] ??
                data['userName'] ??
                data['user_name'] ??
                '')
            .toString()
            .trim();
    final String email = (data['email'] ?? '').toString().trim();
    final String name = _resolveAdminDisplayName(rawName, email);
    final String avatarUrl =
        (data['photoUrl'] ??
                data['photoURL'] ??
                data['avatarUrl'] ??
                data['imageUrl'] ??
                data['image'] ??
                data['imagePath'] ??
                data['photo'] ??
                data['avatar'] ??
                data['profileImage'] ??
                data['profileImageUrl'] ??
                data['profile_image'] ??
                data['profilePhoto'] ??
                '')
            .toString()
            .trim();
    return SupportAdmin(
      id: record.id,
      name: name.isEmpty ? 'Admin' : name,
      email: email,
      avatarUrl: avatarUrl,
      status: (data['status'] ?? '').toString(),
      approved: data['approved'] == true,
    );
  }
}

String _resolveAdminDisplayName(String rawName, String email) {
  final String trimmed = rawName.trim();
  if (trimmed.isNotEmpty && trimmed.toLowerCase() != 'admin') {
    return trimmed;
  }
  final String alias = _aliasFromEmail(email);
  if (alias.isNotEmpty) {
    return _capitalizeAlias(alias);
  }
  return trimmed.isEmpty ? 'Admin' : trimmed;
}

String _aliasFromEmail(String email) {
  final String normalized = email.trim().toLowerCase();
  if (normalized.isEmpty) return '';
  final int at = normalized.indexOf('@');
  return at == -1 ? normalized : normalized.substring(0, at);
}

String _capitalizeAlias(String value) {
  if (value.isEmpty) return value;
  return value[0].toUpperCase() + value.substring(1);
}

class SupportChatUpload {
  const SupportChatUpload({
    required this.file,
    required this.name,
    required this.size,
    required this.isImage,
  });

  final File file;
  final String name;
  final int size;
  final bool isImage;
}

class SupportChatService {
  static const String adminName = 'Sa3doon';
  static const String adminEmail = 'sa3doon@levelup.admin';
  static const String adminAvatarAsset = 'assets/support/admin.jpeg';
  static const List<String> _preferredAdminAliases = [
    'sa3doon',
    'fares',
    'mahmoud',
  ];
  static const int _maxImageBytes = 700 * 1024;
  static const int _maxFileBytes = 300 * 1024;
  static const String _chatsCollection = 'support_chats';
  static const String _messagesCollection = 'support_chat_messages';
  static const Duration _readTimeout = Duration(seconds: 20);
  static const Duration _writeTimeout = Duration(seconds: 20);
  static const Duration _pollInterval = Duration(seconds: 2);

  static PocketBase get _pb => PocketBaseService.client;

  static Stream<List<SupportChatSummary>> streamAdminChats() {
    return _pollList<SupportChatSummary>(_fetchAdminChats);
  }

  static Stream<SupportChatSummary?> streamUserChat(String chatId) {
    return streamChatSummary(chatId);
  }

  static Stream<List<SupportChatSummary>> streamUserChats(String userId) {
    final String uid = userId.trim();
    if (uid.isEmpty) {
      return Stream<List<SupportChatSummary>>.value(
        const <SupportChatSummary>[],
      );
    }
    return _pollList<SupportChatSummary>(() => _fetchUserChats(uid));
  }

  static Stream<List<SupportAdmin>> streamAdmins() {
    return _pollList<SupportAdmin>(_fetchAdmins);
  }

  static Future<List<SupportChatSummary>> _fetchAdminChats() async {
    final List<RecordModel> records = await _pb
        .collection(_chatsCollection)
        .getFullList(sort: '-lastMessageAt,-updated')
        .timeout(_readTimeout);
    final List<SupportChatSummary> chats = records
        .map(SupportChatSummary.fromRecord)
        .toList();
    chats.sort((a, b) {
      final DateTime aTime =
          a.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final DateTime bTime =
          b.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
    return chats;
  }

  static Future<List<SupportChatSummary>> _fetchUserChats(String userId) async {
    final String filter = _pb.filter('userId = {:userId}', <String, dynamic>{
      'userId': userId,
    });
    final List<RecordModel> records = await _pb
        .collection(_chatsCollection)
        .getFullList(filter: filter, sort: '-lastMessageAt,-updated')
        .timeout(_readTimeout);
    final List<SupportChatSummary> chats = records
        .map(SupportChatSummary.fromRecord)
        .toList();
    chats.sort((a, b) {
      final DateTime aTime =
          a.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final DateTime bTime =
          b.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
    return chats;
  }

  static Future<List<SupportAdmin>> _fetchAdmins() async {
    try {
      final List<RecordModel> records = await _pb
          .collection('users')
          .getFullList(sort: '-updated')
          .timeout(_readTimeout);
      final List<SupportAdmin> admins = records
          .where((record) => _isAdminRecord(record.data))
          .map(SupportAdmin.fromRecord)
          .toList();
      final List<SupportAdmin> deduped = _dedupeAdmins(admins);
      final List<SupportAdmin> approved = deduped
          .where((admin) => admin.approved)
          .toList();
      final List<SupportAdmin> filtered = approved.isNotEmpty
          ? approved
          : deduped.where((admin) => admin.isActive).toList();
      final List<SupportAdmin> result = filtered.isNotEmpty
          ? filtered
          : deduped;
      final List<SupportAdmin> preferred = _orderPreferredAdmins(result);
      if (preferred.isNotEmpty) return preferred;
      if (result.isNotEmpty) {
        result.sort(
          (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
        );
        return result;
      }
    } catch (_) {}
    return _fallbackAdmins();
  }

  static List<SupportAdmin> _fallbackAdmins() {
    return _preferredAdminAliases
        .map(
          (alias) => SupportAdmin(
            id: alias,
            name: _capitalizeAlias(alias),
            email: StaticAdmins.emailForAlias(alias),
            status: 'active',
            approved: true,
          ),
        )
        .toList();
  }

  static List<SupportAdmin> _orderPreferredAdmins(List<SupportAdmin> admins) {
    final List<SupportAdmin> ordered = [];
    final Set<String> usedIds = <String>{};
    for (final String alias in _preferredAdminAliases) {
      SupportAdmin? match;
      for (final SupportAdmin admin in admins) {
        if (_adminMatchesAlias(admin, alias)) {
          match = admin;
          break;
        }
      }
      if (match != null && usedIds.add(match.id)) {
        ordered.add(match);
      }
    }
    return ordered;
  }

  static bool _adminMatchesAlias(SupportAdmin admin, String alias) {
    final String normalized = alias.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    final String emailAlias = _aliasFromEmail(admin.email);
    if (emailAlias == normalized) return true;
    final String name = admin.name.trim().toLowerCase();
    if (name == normalized) return true;
    if (name.contains(normalized)) return true;
    return false;
  }

  static bool _isAdminRecord(Map<String, dynamic> data) {
    final String role = (data['role'] ?? '').toString().trim().toLowerCase();
    if (role == 'admin') return true;
    if (data['isAdmin'] == true ||
        data['admin'] == true ||
        data['is_admin'] == true) {
      return true;
    }
    final String supportRole =
        (data['supportRole'] ?? data['support_role'] ?? data['support'] ?? '')
            .toString()
            .trim()
            .toLowerCase();
    if (supportRole == 'admin' || supportRole == 'support') {
      return true;
    }
    if (data['supportAdmin'] == true || data['support_admin'] == true) {
      return true;
    }
    final String email = (data['email'] ?? '').toString().trim();
    if (email.isNotEmpty) {
      if (StaticAdmins.isAdminEmail(email)) return true;
      final int at = email.indexOf('@');
      final String local = at == -1 ? email : email.substring(0, at);
      if (StaticAdmins.isAlias(local)) return true;
    }
    final String name =
        (data['fullName'] ??
                data['name'] ??
                data['nickName'] ??
                data['username'] ??
                '')
            .toString()
            .trim()
            .toLowerCase();
    if (name.isNotEmpty) {
      if (StaticAdmins.isAlias(name)) return true;
      final List<String> tokens = name
          .split(RegExp(r'[\s\._\-]+'))
          .where((value) => value.isNotEmpty)
          .toList();
      for (final String token in tokens) {
        if (StaticAdmins.isAlias(token)) return true;
      }
      if (_containsAdminAlias(name)) return true;
    }
    if (email.isNotEmpty && StaticAdmins.isAdminEmail(email)) {
      return true;
    }
    return false;
  }

  static bool _containsAdminAlias(String value) {
    const List<String> aliases = ['sa3doon', 'mahmoud', 'fares'];
    for (final String alias in aliases) {
      if (value.contains(alias)) return true;
    }
    return false;
  }

  static List<SupportAdmin> _dedupeAdmins(List<SupportAdmin> admins) {
    final Map<String, SupportAdmin> byKey = {};
    for (final SupportAdmin admin in admins) {
      final String email = admin.email.trim().toLowerCase();
      final String key = email.isNotEmpty ? email : admin.id;
      final SupportAdmin? existing = byKey[key];
      if (existing == null || _adminScore(admin) > _adminScore(existing)) {
        byKey[key] = admin;
      }
    }
    return byKey.values.toList();
  }

  static int _adminScore(SupportAdmin admin) {
    int score = 0;
    if (admin.approved) score += 4;
    if (admin.isActive) score += 2;
    if (admin.avatarUrl.trim().isNotEmpty) score += 1;
    if (admin.name.trim().isNotEmpty &&
        admin.name.trim().toLowerCase() != 'admin') {
      score += 1;
    }
    return score;
  }

  static Stream<SupportChatSummary?> streamChatSummary(String chatId) {
    final String value = chatId.trim();
    if (value.isEmpty) {
      return Stream<SupportChatSummary?>.value(null);
    }
    return _pollNullable<SupportChatSummary>(() async {
      final RecordModel? record = await _findChatRecord(
        value,
        allowUserIdFallback: true,
      );
      if (record == null) return null;
      return SupportChatSummary.fromRecord(record);
    });
  }

  static Stream<List<SupportChatMessage>> streamMessages(String chatId) {
    final String value = chatId.trim();
    if (value.isEmpty) {
      return Stream<List<SupportChatMessage>>.value(
        const <SupportChatMessage>[],
      );
    }
    return _pollList<SupportChatMessage>(() async {
      final RecordModel? chat = await _findChatRecord(
        value,
        allowUserIdFallback: true,
      );
      final String chatKey = (chat?.data['userId'] ?? value).toString().trim();
      if (chatKey.isEmpty) return const <SupportChatMessage>[];
      final String filter = _pb.filter(
        'chatKey = {:chatKey}',
        <String, dynamic>{'chatKey': chatKey},
      );
      final List<RecordModel> records = await _pb
          .collection(_messagesCollection)
          .getFullList(filter: filter, sort: 'createdAt,created')
          .timeout(_readTimeout);
      return records.map(SupportChatMessage.fromRecord).toList();
    });
  }

  static Future<User?> ensureSignedIn() async {
    User? user = FirebaseAuth.instance.currentUser;
    if (user != null) return user;
    try {
      final UserCredential credential = await FirebaseAuth.instance
          .signInAnonymously();
      return credential.user;
    } catch (_) {
      return null;
    }
  }

  static Future<void> ensureChatForUser(User user) async {
    await _ensureChatRecordForUser(user);
  }

  static Future<void> markRead({
    required String chatId,
    required bool isAdmin,
  }) async {
    final RecordModel? chat = await _findChatRecord(
      chatId,
      allowUserIdFallback: true,
    );
    if (chat == null) return;
    await _pb
        .collection(_chatsCollection)
        .update(
          chat.id,
          body: <String, dynamic>{
            isAdmin ? 'unreadForAdmin' : 'unreadForUser': 0,
            isAdmin ? 'lastReadByAdminAt' : 'lastReadByUserAt': DateTime.now()
                .toUtc()
                .toIso8601String(),
            'updatedAt': DateTime.now().toUtc().toIso8601String(),
          },
        )
        .timeout(_writeTimeout);
  }

  static Future<void> setActive({
    required String chatId,
    required bool isAdmin,
    required bool active,
  }) async {
    final RecordModel? chat = await _findChatRecord(
      chatId,
      allowUserIdFallback: true,
    );
    if (chat == null) return;
    await _pb
        .collection(_chatsCollection)
        .update(
          chat.id,
          body: <String, dynamic>{
            isAdmin ? 'activeForAdmin' : 'activeForUser': active,
            'updatedAt': DateTime.now().toUtc().toIso8601String(),
          },
        )
        .timeout(_writeTimeout);
  }

  static Future<void> sendText({
    required String chatId,
    required User user,
    required bool isAdmin,
    required String text,
    String? adminId,
    String? adminName,
    String? adminEmail,
  }) async {
    final String trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final RecordModel? chat = isAdmin
        ? await _findChatRecord(chatId, allowUserIdFallback: true)
        : await _ensureChatRecordForUser(user);
    if (chat == null) return;
    final String chatKey = (chat.data['userId'] ?? '').toString().trim();
    if (chatKey.isEmpty) return;
    final String now = DateTime.now().toUtc().toIso8601String();

    await _pb
        .collection(_messagesCollection)
        .create(
          body: <String, dynamic>{
            'chatId': chat.id,
            'chatKey': chatKey,
            'senderRole': isAdmin ? 'admin' : 'user',
            'senderId': isAdmin
                ? _resolveAdminSenderId(user, adminEmail)
                : user.uid,
            'text': trimmed,
            'type': 'text',
            'attachments': const [],
            'createdAt': now,
          },
        )
        .timeout(_writeTimeout);

    await _updateChatSummary(
      chat: chat,
      user: user,
      isAdmin: isAdmin,
      lastMessage: _previewText(trimmed),
      adminId: adminId,
      adminName: adminName,
      adminEmail: adminEmail,
      now: now,
    );
  }

  static Future<void> sendAttachments({
    required String chatId,
    required User user,
    required bool isAdmin,
    required List<SupportChatUpload> attachments,
    String? adminId,
    String? adminName,
    String? adminEmail,
  }) async {
    if (attachments.isEmpty) return;
    final bool allImages = attachments.every((item) => item.isImage);
    final bool allFiles = attachments.every((item) => !item.isImage);
    if (!allImages && !allFiles) {
      final List<SupportChatUpload> images = attachments
          .where((item) => item.isImage)
          .toList();
      final List<SupportChatUpload> files = attachments
          .where((item) => !item.isImage)
          .toList();
      if (images.isNotEmpty) {
        await sendAttachments(
          chatId: chatId,
          user: user,
          isAdmin: isAdmin,
          attachments: images,
          adminId: adminId,
          adminName: adminName,
          adminEmail: adminEmail,
        );
      }
      if (files.isNotEmpty) {
        await sendAttachments(
          chatId: chatId,
          user: user,
          isAdmin: isAdmin,
          attachments: files,
          adminId: adminId,
          adminName: adminName,
          adminEmail: adminEmail,
        );
      }
      return;
    }

    final RecordModel? chat = isAdmin
        ? await _findChatRecord(chatId, allowUserIdFallback: true)
        : await _ensureChatRecordForUser(user);
    if (chat == null) return;
    final String chatKey = (chat.data['userId'] ?? '').toString().trim();
    if (chatKey.isEmpty) return;
    final String type = allImages ? 'images' : 'files';
    final List<SupportChatAttachment> uploaded = await _encodeAttachments(
      attachments,
    );
    if (uploaded.isEmpty) return;
    final String now = DateTime.now().toUtc().toIso8601String();

    await _pb
        .collection(_messagesCollection)
        .create(
          body: <String, dynamic>{
            'chatId': chat.id,
            'chatKey': chatKey,
            'senderRole': isAdmin ? 'admin' : 'user',
            'senderId': isAdmin
                ? _resolveAdminSenderId(user, adminEmail)
                : user.uid,
            'text': '',
            'type': type,
            'attachments': uploaded.map((item) => item.toMap()).toList(),
            'createdAt': now,
          },
        )
        .timeout(_writeTimeout);

    await _updateChatSummary(
      chat: chat,
      user: user,
      isAdmin: isAdmin,
      lastMessage: type == 'images'
          ? 'Image'
          : _previewText(uploaded.first.name),
      adminId: adminId,
      adminName: adminName,
      adminEmail: adminEmail,
      now: now,
    );
  }

  static Future<void> _updateChatSummary({
    required RecordModel chat,
    required User user,
    required bool isAdmin,
    required String lastMessage,
    required String now,
    String? adminId,
    String? adminName,
    String? adminEmail,
  }) async {
    final Map<String, dynamic> data = chat.data;
    final int unreadForAdmin = _toInt(data['unreadForAdmin']);
    final int unreadForUser = _toInt(data['unreadForUser']);
    final String resolvedUserId = (data['userId'] ?? '').toString().trim();
    final Map<String, dynamic> payload = {
      'lastMessage': lastMessage,
      'lastMessageAt': now,
      'lastMessageSender': isAdmin ? 'admin' : 'user',
      'unreadForAdmin': isAdmin ? unreadForAdmin : unreadForAdmin + 1,
      'unreadForUser': isAdmin ? unreadForUser + 1 : unreadForUser,
      'updatedAt': now,
    };

    if (!isAdmin) {
      payload.addAll({
        'userId': resolvedUserId.isEmpty ? user.uid : resolvedUserId,
        'userName': _resolveUserName(user),
        'userEmail': _resolveUserEmail(user),
      });
      final String resolvedAdminId = (adminId ?? '').trim();
      final String resolvedAdminName = (adminName ?? '').trim();
      final String resolvedAdminEmail = (adminEmail ?? '').trim();
      if (resolvedAdminId.isNotEmpty) {
        payload['adminId'] = resolvedAdminId;
      }
      if (resolvedAdminName.isNotEmpty) {
        payload['adminName'] = resolvedAdminName;
      }
      if (resolvedAdminEmail.isNotEmpty) {
        payload['adminEmail'] = resolvedAdminEmail;
      }
    } else {
      final String resolvedAdminEmail = (adminEmail ?? user.email ?? '')
          .toString()
          .trim();
      final String resolvedAdminId = (adminId ?? user.uid).trim();
      final String resolvedAdminName =
          (adminName ??
                  user.displayName ??
                  _resolveAdminDisplayName('', resolvedAdminEmail))
              .toString()
              .trim();
      if (resolvedAdminId.isNotEmpty) {
        payload['adminId'] = resolvedAdminId;
      }
      if (resolvedAdminName.isNotEmpty) {
        payload['adminName'] = resolvedAdminName;
      }
      if (resolvedAdminEmail.isNotEmpty) {
        payload['adminEmail'] = resolvedAdminEmail;
      }
    }

    await _pb
        .collection(_chatsCollection)
        .update(chat.id, body: payload)
        .timeout(_writeTimeout);
  }

  static Future<RecordModel?> _ensureChatRecordForUser(User user) async {
    final RecordModel? existing = await _findChatByUserId(user.uid);
    final String now = DateTime.now().toUtc().toIso8601String();
    if (existing == null) {
      return _pb
          .collection(_chatsCollection)
          .create(
            body: <String, dynamic>{
              'userId': user.uid,
              'userName': _resolveUserName(user),
              'userEmail': _resolveUserEmail(user),
              'unreadForAdmin': 0,
              'unreadForUser': 0,
              'activeForAdmin': false,
              'activeForUser': false,
              'updatedAt': now,
            },
          )
          .timeout(_writeTimeout);
    }

    final Map<String, dynamic> payload = <String, dynamic>{
      'userName': _resolveUserName(user),
      'userEmail': _resolveUserEmail(user),
      'updatedAt': now,
    };
    await _pb
        .collection(_chatsCollection)
        .update(existing.id, body: payload)
        .timeout(_writeTimeout);
    return _pb
        .collection(_chatsCollection)
        .getOne(existing.id)
        .timeout(_readTimeout);
  }

  static Future<RecordModel?> _findChatRecord(
    String chatIdOrUserId, {
    required bool allowUserIdFallback,
  }) async {
    final String value = chatIdOrUserId.trim();
    if (value.isEmpty) return null;
    final RecordModel? byId = await _getChatById(value);
    if (byId != null) return byId;
    if (!allowUserIdFallback) return null;
    return _findChatByUserId(value);
  }

  static Future<RecordModel?> _getChatById(String id) async {
    try {
      return await _pb
          .collection(_chatsCollection)
          .getOne(id)
          .timeout(_readTimeout);
    } catch (_) {
      return null;
    }
  }

  static Future<RecordModel?> _findChatByUserId(String userId) async {
    final String trimmed = userId.trim();
    if (trimmed.isEmpty) return null;
    final String filter = _pb.filter('userId = {:userId}', <String, dynamic>{
      'userId': trimmed,
    });
    final ResultList<RecordModel> result = await _pb
        .collection(_chatsCollection)
        .getList(page: 1, perPage: 1, filter: filter, sort: '-updated')
        .timeout(_readTimeout);
    if (result.items.isEmpty) return null;
    return result.items.first;
  }

  static String _resolveAdminSenderId(User user, String? adminEmail) {
    final String provided = (adminEmail ?? '').trim();
    if (provided.isNotEmpty) return provided;
    final String userEmail = (user.email ?? '').trim();
    if (userEmail.isNotEmpty) return userEmail;
    return user.uid;
  }

  static Future<List<SupportChatAttachment>> _encodeAttachments(
    List<SupportChatUpload> attachments,
  ) async {
    final List<SupportChatAttachment> uploaded = [];
    for (final SupportChatUpload attachment in attachments) {
      final int maxBytes = attachment.isImage ? _maxImageBytes : _maxFileBytes;
      if (attachment.size > maxBytes) {
        throw SupportChatException(
          attachment.isImage
              ? 'Image too large (max 700KB)'
              : 'File too large (max 300KB)',
        );
      }
      try {
        final List<int> bytes = await attachment.file.readAsBytes();
        final String data = base64Encode(bytes);
        uploaded.add(
          SupportChatAttachment(
            url: '',
            name: attachment.name.trim().isEmpty
                ? 'file_${DateTime.now().millisecondsSinceEpoch}'
                : attachment.name.trim(),
            size: attachment.size,
            type: attachment.isImage ? 'image' : 'file',
            data: data,
            mime: _guessMime(attachment.name, attachment.isImage),
          ),
        );
      } catch (_) {}
    }
    return uploaded;
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

  static String _resolveUserName(User user) {
    final String stored = UserProfile.userName.trim();
    if (stored.isNotEmpty) return stored;
    final String displayName = (user.displayName ?? '').trim();
    if (displayName.isNotEmpty) return displayName;
    final String email = _resolveUserEmail(user);
    if (email.contains('@')) return email.split('@').first;
    return 'User';
  }

  static String _resolveUserEmail(User user) {
    return (user.email ?? '').trim();
  }

  static String _previewText(String text) {
    final String trimmed = text.trim();
    if (trimmed.length <= 60) return trimmed;
    return '${trimmed.substring(0, 60)}...';
  }

  static String _guessMime(String name, bool isImage) {
    if (!isImage) return 'application/octet-stream';
    final String lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
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
}

int _toInt(Object? value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value.trim()) ?? 0;
  return 0;
}

bool _toBool(Object? value) {
  if (value is bool) return value;
  if (value is int) return value != 0;
  if (value is double) return value.round() != 0;
  if (value is String) {
    final String lowered = value.toLowerCase();
    return lowered == 'true' || lowered == '1' || lowered == 'yes';
  }
  return false;
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

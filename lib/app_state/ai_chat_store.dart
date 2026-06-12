import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../screens/chat_thread_screen.dart';

class AiChatException implements Exception {
  AiChatException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AiChatConfig {
  AiChatConfig._();

  static String endpoint = 'http://10.0.2.2:8787/chat';
  static String streamEndpoint = '';
  static String apiKey = '';
  static String model = 'gemini-2.5-flash';
  static String geminiModel = 'gemini-2.5-flash';
  static Duration timeout = const Duration(seconds: 20);
}

class AiChatSession {
  AiChatSession({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    required this.messages,
  });

  final String id;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<ChatMessage> messages;

  AiChatSession copyWith({
    String? id,
    String? title,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<ChatMessage>? messages,
  }) {
    return AiChatSession(
      id: id ?? this.id,
      title: title ?? this.title,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      messages: messages ?? this.messages,
    );
  }
}

class AiChatSummary {
  const AiChatSummary({
    required this.id,
    required this.title,
    required this.lastMessage,
    required this.lastTime,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final String lastMessage;
  final String lastTime;
  final DateTime updatedAt;
}

class AiChatStore {
  AiChatStore._();

  static const String _geminiApiKey = '';
  static const Duration sessionExpiry = Duration(minutes: 30);
  static const String _prefsSessionsKey = 'ai_chat_sessions_v1';
  static const String _prefsActiveKey = 'ai_chat_active_v1';
  static final StreamController<List<ChatMessage>> _controller =
      StreamController<List<ChatMessage>>.broadcast();
  static final ValueNotifier<List<AiChatSummary>> summaries =
      ValueNotifier<List<AiChatSummary>>(<AiChatSummary>[]);
  static List<ChatMessage> _messages = <ChatMessage>[];
  static List<AiChatSession> _sessions = <AiChatSession>[];
  static String? _activeSessionId;
  static bool _initialized = false;
  static Future<void>? _initFuture;
  static final http.Client _client = http.Client();

  static Stream<List<ChatMessage>> get stream => _controller.stream;
  static List<ChatMessage> get messages =>
      List<ChatMessage>.unmodifiable(_messages);
  static String? get activeSessionId => _activeSessionId;

  static Future<void> ensureInitialized() async {
    if (_initialized) {
      _rolloverIfNeeded();
      _emit();
      return;
    }
    if (_initFuture != null) {
      await _initFuture;
      return;
    }
    final Completer<void> completer = Completer<void>();
    _initFuture = completer.future;
    try {
      await _loadSessions();
    } catch (_) {}
    _initialized = true;
    if (_activeSessionId == null) {
      if (_sessions.isNotEmpty) {
        _activeSessionId = _sessions.first.id;
      } else {
        final AiChatSession session = _createSession();
        _sessions.add(session);
        _activeSessionId = session.id;
      }
    }
    _rolloverIfNeeded();
    _setActiveMessagesFromSession();
    _emit();
    _rebuildSummaries();
    completer.complete();
  }

  static Future<void> startNewSession() async {
    await ensureInitialized();
    final AiChatSession session = _createSession();
    _sessions.add(session);
    _activeSessionId = session.id;
    _setActiveMessagesFromSession();
    _sortSessions();
    _rebuildSummaries();
    _emit();
    unawaited(_saveSessions());
  }

  static Future<void> selectSession(String id) async {
    await ensureInitialized();
    if (_activeSessionId == id) return;
    _activeSessionId = id;
    _setActiveMessagesFromSession();
    _emit();
    _rebuildSummaries();
    unawaited(_saveSessions());
  }

  static Future<void> deleteSession(String id) async {
    await ensureInitialized();
    final int index = _sessions.indexWhere((session) => session.id == id);
    if (index == -1) return;
    final bool wasActive = _sessions[index].id == _activeSessionId;
    _sessions.removeAt(index);
    if (wasActive) {
      final AiChatSession session = _createSession();
      _sessions.add(session);
      _activeSessionId = session.id;
      _messages = <ChatMessage>[];
    }
    _sortSessions();
    _setActiveMessagesFromSession();
    _rebuildSummaries();
    _emit();
    unawaited(_saveSessions());
  }

  static Future<void> _loadSessions() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? raw = prefs.getString(_prefsSessionsKey);
    final String? activeId = prefs.getString(_prefsActiveKey);
    final List<AiChatSession> loaded = <AiChatSession>[];
    if (raw != null && raw.trim().isNotEmpty) {
      try {
        final Object? decoded = jsonDecode(raw);
        if (decoded is List) {
          for (final Object? item in decoded) {
            if (item is Map<String, dynamic>) {
              loaded.add(_decodeSession(item));
            }
          }
        }
      } catch (_) {}
    }
    _sessions = loaded;
    _activeSessionId = activeId;
    if (_activeSessionId != null &&
        _sessions.indexWhere((s) => s.id == _activeSessionId) == -1) {
      _activeSessionId = null;
    }
    _sortSessions();
  }

  static Future<void> _saveSessions() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<Map<String, dynamic>> payload =
        _sessions.map(_encodeSession).toList();
    await prefs.setString(_prefsSessionsKey, jsonEncode(payload));
    if (_activeSessionId != null) {
      await prefs.setString(_prefsActiveKey, _activeSessionId!);
    } else {
      await prefs.remove(_prefsActiveKey);
    }
  }

  static void _rolloverIfNeeded() {
    final AiChatSession? active = _findActiveSession();
    if (active == null) {
      final AiChatSession session = _createSession();
      _sessions.add(session);
      _activeSessionId = session.id;
      _setActiveMessagesFromSession();
      _sortSessions();
      unawaited(_saveSessions());
      return;
    }
    if (active.messages.isEmpty) {
      _setActiveMessagesFromSession();
      return;
    }
    final Duration idle = DateTime.now().difference(active.updatedAt);
    if (idle < sessionExpiry) {
      _setActiveMessagesFromSession();
      return;
    }
    final AiChatSession session = _createSession();
    _sessions.add(session);
    _activeSessionId = session.id;
    _setActiveMessagesFromSession();
    _sortSessions();
    unawaited(_saveSessions());
  }

  static AiChatSession _createSession() {
    final DateTime now = DateTime.now();
    return AiChatSession(
      id: now.microsecondsSinceEpoch.toString(),
      title: 'AI',
      createdAt: now,
      updatedAt: now,
      messages: <ChatMessage>[],
    );
  }

  static AiChatSession? _findActiveSession() {
    if (_activeSessionId == null) return null;
    for (final AiChatSession session in _sessions) {
      if (session.id == _activeSessionId) return session;
    }
    return null;
  }

  static void _setActiveMessagesFromSession() {
    final AiChatSession? active = _findActiveSession();
    _messages = active == null
        ? <ChatMessage>[]
        : List<ChatMessage>.of(active.messages);
  }

  static void _sortSessions() {
    _sessions.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  static void _rebuildSummaries() {
    final List<AiChatSummary> items = _sessions
        .where((session) => session.messages.isNotEmpty)
        .map(_toSummary)
        .toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    summaries.value = List<AiChatSummary>.unmodifiable(items);
  }

  static AiChatSummary _toSummary(AiChatSession session) {
    final ChatMessage? last = _lastRealMessage(session.messages);
    final String message = last == null
        ? 'New chat'
        : _resolveMessagePreview(last);
    final String time = last?.time ?? _formatTime(session.updatedAt);
    return AiChatSummary(
      id: session.id,
      title: session.title,
      lastMessage: message,
      lastTime: time,
      updatedAt: session.updatedAt,
    );
  }

  static ChatMessage? _lastRealMessage(List<ChatMessage> messages) {
    for (int i = messages.length - 1; i >= 0; i--) {
      final ChatMessage message = messages[i];
      if (message.type == ChatMessageType.text &&
          (message.text ?? '').trim() == '...') {
        continue;
      }
      return message;
    }
    return null;
  }

  static String _resolveMessagePreview(ChatMessage message) {
    switch (message.type) {
      case ChatMessageType.text:
        return (message.text ?? '').trim().isEmpty
            ? 'New chat'
            : message.text!.trim();
      case ChatMessageType.images:
        return 'Image';
      case ChatMessageType.files:
        return 'Attachment';
      case ChatMessageType.rating:
        return message.text ?? 'Rating';
    }
  }

  static Map<String, dynamic> _encodeSession(AiChatSession session) {
    return {
      'id': session.id,
      'title': session.title,
      'createdAt': session.createdAt.toIso8601String(),
      'updatedAt': session.updatedAt.toIso8601String(),
      'messages': session.messages.map(_encodeMessage).toList(),
    };
  }

  static AiChatSession _decodeSession(Map<String, dynamic> data) {
    final List<ChatMessage> messages = <ChatMessage>[];
    final Object? rawMessages = data['messages'];
    if (rawMessages is List) {
      for (final Object? item in rawMessages) {
        if (item is Map<String, dynamic>) {
          final ChatMessage? decoded = _decodeMessage(item);
          if (decoded != null) messages.add(decoded);
        }
      }
    }
    return AiChatSession(
      id: (data['id'] ?? '').toString(),
      title: (data['title'] ?? 'AI').toString(),
      createdAt:
          DateTime.tryParse((data['createdAt'] ?? '').toString()) ??
              DateTime.now(),
      updatedAt:
          DateTime.tryParse((data['updatedAt'] ?? '').toString()) ??
              DateTime.now(),
      messages: messages,
    );
  }

  static Map<String, dynamic> _encodeMessage(ChatMessage message) {
    return {
      'type': message.type.name,
      'isBot': message.isBot,
      'time': message.time,
      'text': message.text,
      'rating': message.rating,
      'imagePaths': message.imagePaths,
      'files': message.files
          .map(
            (file) => {
              'name': file.name,
              'path': file.path,
              'size': file.size,
            },
          )
          .toList(),
      'isRead': message.isRead,
    };
  }

  static ChatMessage? _decodeMessage(Map<String, dynamic> data) {
    final String type = (data['type'] ?? '').toString();
    final bool isBot = data['isBot'] == true;
    final String time = (data['time'] ?? '').toString();
    final bool? isRead = data['isRead'] as bool?;
    switch (_parseType(type)) {
      case ChatMessageType.images:
        final List<String> images = (data['imagePaths'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            <String>[];
        return ChatMessage.images(
          isBot: isBot,
          time: time,
          imagePaths: images,
          isRead: isRead,
        );
      case ChatMessageType.files:
        final List<ChatFileAttachment> files = <ChatFileAttachment>[];
        final Object? rawFiles = data['files'];
        if (rawFiles is List) {
          for (final Object? item in rawFiles) {
            if (item is Map) {
              files.add(
                ChatFileAttachment(
                  name: (item['name'] ?? '').toString(),
                  path: (item['path'] ?? '').toString(),
                  size: int.tryParse((item['size'] ?? '').toString()) ?? 0,
                ),
              );
            }
          }
        }
        return ChatMessage.files(
          isBot: isBot,
          time: time,
          files: files,
          isRead: isRead,
        );
      case ChatMessageType.rating:
        return ChatMessage.rating(
          isBot: isBot,
          text: (data['text'] ?? '').toString(),
          rating: int.tryParse((data['rating'] ?? '').toString()) ?? 0,
          time: time,
          isRead: isRead,
        );
      case ChatMessageType.text:
        return ChatMessage.text(
          isBot: isBot,
          text: (data['text'] ?? '').toString(),
          time: time,
          isRead: isRead,
        );
    }
  }

  static ChatMessageType _parseType(String raw) {
    for (final ChatMessageType value in ChatMessageType.values) {
      if (value.name == raw) return value;
    }
    return ChatMessageType.text;
  }

  static void _updateActiveSession({
    DateTime? updatedAt,
    bool persist = true,
  }) {
    if (_activeSessionId == null) return;
    final int index =
        _sessions.indexWhere((session) => session.id == _activeSessionId);
    if (index == -1) return;
    final AiChatSession current = _sessions[index];
    final AiChatSession updated = current.copyWith(
      messages: List<ChatMessage>.of(_messages),
      updatedAt: updatedAt ?? current.updatedAt,
    );
    _sessions[index] = updated;
    _sortSessions();
    _rebuildSummaries();
    if (persist) {
      unawaited(_saveSessions());
    }
  }

  static Future<void> sendText(String text) async {
    await sendMessage(text: text);
  }

  static Future<void> sendAttachments(
    List<ChatPickedAttachment> attachments,
  ) async {
    await sendMessage(attachments: attachments);
  }

  static Future<void> sendMessage({
    String text = '',
    List<ChatPickedAttachment> attachments = const [],
  }) async {
    final String trimmed = text.trim();
    if (trimmed.isEmpty && attachments.isEmpty) return;
    await ensureInitialized();
    _rolloverIfNeeded();
    final DateTime now = DateTime.now();
    final List<ChatMessage> next = List<ChatMessage>.of(_messages);
    if (trimmed.isNotEmpty) {
      next.add(
        ChatMessage.text(
          isBot: false,
          text: trimmed,
          time: _formatTime(now),
          isRead: true,
        ),
      );
    }
    final List<ChatPickedAttachment> images =
        attachments.where((item) => item.isImage).toList(growable: false);
    final List<ChatPickedAttachment> files =
        attachments.where((item) => !item.isImage).toList(growable: false);

    if (images.isNotEmpty) {
      next.add(
        ChatMessage.images(
          isBot: false,
          time: _formatTime(now),
          imagePaths: images.map((item) => item.file.path).toList(),
          isRead: true,
        ),
      );
    }
    if (files.isNotEmpty) {
      next.add(
        ChatMessage.files(
          isBot: false,
          time: _formatTime(now),
          files: files
              .map(
                (item) => ChatFileAttachment(
                  name: item.name,
                  path: item.file.path,
                  size: item.size,
                ),
              )
              .toList(),
          isRead: true,
        ),
      );
    }
    next.add(_typingMessage());
    _messages = next;
    _updateActiveSession(updatedAt: now);
    _emit();

    try {
      final List<Map<String, dynamic>> payload = attachments.isEmpty
          ? const <Map<String, dynamic>>[]
          : await _encodeAttachments(attachments);
      final String message = trimmed.isNotEmpty
          ? trimmed
          : 'Analyze the attachments and answer in Arabic.';
      await _streamReply(
        message: message,
        attachments: payload,
      );
    } catch (error) {
      _replaceTypingWith(
        'Unable to process your message right now. Please try again.',
      );
      throw AiChatException(
        error.toString().trim().replaceFirst('Exception: ', ''),
      );
    }
  }

  static Future<String> _fetchReply(
    String message, {
    required List<Map<String, dynamic>> attachments,
    bool allowGemini = true,
  }) async {
    if (allowGemini && _geminiApiKey.trim().isNotEmpty) {
      return _fetchGeminiReply(
        message: message,
        attachments: attachments,
      );
    }
    if (AiChatConfig.endpoint.trim().isEmpty) {
      throw AiChatException('Missing API endpoint.');
    }

    final Uri uri = Uri.parse(AiChatConfig.endpoint.trim());
    final List<Map<String, String>> history = _messages
        .where((item) => item.type == ChatMessageType.text)
        .where((item) => (item.text ?? '').trim().isNotEmpty)
        .where((item) => (item.text ?? '').trim() != '...')
        .map(
          (item) => {
            'role': item.isBot ? 'assistant' : 'user',
            'text': item.text ?? '',
          },
        )
        .toList();

    final Map<String, dynamic> payload = {
      'message': message,
      'model': AiChatConfig.model,
      'history': history,
      'attachments': attachments,
      'locale': 'ar',
    };

    final Map<String, String> headers = {
      'Content-Type': 'application/json',
    };
    if (AiChatConfig.apiKey.trim().isNotEmpty) {
      headers['Authorization'] = 'Bearer ${AiChatConfig.apiKey.trim()}';
    }

    final http.Response response = await _client
        .post(
          uri,
          headers: headers,
          body: jsonEncode(payload),
        )
        .timeout(AiChatConfig.timeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AiChatException('Server error: ${response.statusCode}');
    }

    final Object? decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) {
      final Object? reply = decoded['reply'] ??
          decoded['text'] ??
          decoded['message'] ??
          decoded['content'];
      final String resolved = (reply ?? '').toString().trim();
      if (resolved.isNotEmpty) return resolved;
    }

    throw AiChatException('Empty reply from server.');
  }

  static Future<String> _fetchGeminiReply({
    required String message,
    required List<Map<String, dynamic>> attachments,
  }) async {
    final String key = _geminiApiKey.trim();
    if (key.isEmpty) {
      throw AiChatException('Missing Gemini API key.');
    }

    final GenerativeModel model = GenerativeModel(
      model: AiChatConfig.geminiModel,
      apiKey: key,
    );

    final List<Part> parts = <Part>[
      TextPart(
        message.trim().isEmpty
            ? 'Analyze the provided attachments and answer in Arabic.'
            : message,
      ),
    ];

    final String fileContext = _attachmentsToText(attachments);
    if (fileContext.isNotEmpty) {
      parts.add(TextPart(fileContext));
    }

    for (final Map<String, dynamic> item in attachments) {
      final String type = (item['type'] ?? '').toString().toLowerCase();
      if (type != 'image') continue;
      final String data = (item['data'] ?? '').toString().trim();
      if (data.isEmpty) continue;
      final String mime = (item['mime'] ?? 'image/jpeg').toString();
      try {
        final Uint8List bytes = Uint8List.fromList(base64Decode(data));
        parts.add(DataPart(mime, bytes));
      } catch (_) {
        final String name = (item['name'] ?? 'image').toString();
        parts.add(TextPart('Image "$name" could not be decoded.'));
      }
    }

    final GenerateContentResponse response =
        await model.generateContent(<Content>[Content.multi(parts)]);
    final String text = (response.text ?? '').trim();
    if (text.isEmpty) {
      throw AiChatException('Empty reply from Gemini.');
    }
    return text;
  }

  static String _attachmentsToText(
    List<Map<String, dynamic>> attachments,
  ) {
    if (attachments.isEmpty) return '';
    final StringBuffer buffer = StringBuffer();
    for (final Map<String, dynamic> item in attachments) {
      final String type = (item['type'] ?? '').toString().toLowerCase();
      if (type != 'file') continue;
      final String name = (item['name'] ?? 'file').toString();
      final String note = (item['note'] ?? '').toString().trim();
      final String text = (item['text'] ?? '').toString().trim();
      if (text.isNotEmpty) {
        buffer.writeln('File "$name" content:\n$text');
      } else if (note.isNotEmpty) {
        buffer.writeln('File "$name": $note');
      } else {
        buffer.writeln('File "$name" attached.');
      }
      buffer.writeln();
    }
    return buffer.toString().trim();
  }
  static Future<void> _streamReply({
    required String message,
    required List<Map<String, dynamic>> attachments,
  }) async {
    Object? geminiError;
    if (_geminiApiKey.trim().isNotEmpty) {
      try {
        final String reply = await _fetchGeminiReply(
          message: message,
          attachments: attachments,
        );
        _replaceTypingWith(reply);
        return;
      } catch (error) {
        geminiError = error;
      }
    }
    final String endpoint = _resolveStreamEndpoint();
    if (endpoint.trim().isEmpty) {
      try {
        final String reply = await _fetchReply(
          message,
          attachments: attachments,
          allowGemini: false,
        );
        _replaceTypingWith(reply);
        return;
      } catch (error) {
        final Object resolved = geminiError ?? error;
        _replaceTypingWith(_summarizeError(resolved.toString()));
        throw AiChatException(
          resolved.toString().trim().replaceFirst('Exception: ', ''),
        );
      }
    }

    final Uri uri = Uri.parse(endpoint.trim());
    final Map<String, dynamic> payload = {
      'message': message,
      'model': AiChatConfig.model,
      'history': _messages
          .where((item) => item.type == ChatMessageType.text)
          .where((item) => (item.text ?? '').trim().isNotEmpty)
          .where((item) => (item.text ?? '').trim() != '...')
          .map(
            (item) => {
              'role': item.isBot ? 'assistant' : 'user',
              'text': item.text ?? '',
            },
          )
          .toList(),
      'attachments': attachments,
      'locale': 'ar',
    };

    final http.Request request = http.Request('POST', uri);
    request.headers['Content-Type'] = 'application/json';
    if (AiChatConfig.apiKey.trim().isNotEmpty) {
      request.headers['Authorization'] =
          'Bearer ${AiChatConfig.apiKey.trim()}';
    }
    request.body = jsonEncode(payload);

    try {
      final http.StreamedResponse response = await _client.send(request);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final String body = await response.stream.bytesToString();
        throw AiChatException(
          body.isEmpty
              ? 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø³ÙŠØ±ÙØ±: ${response.statusCode}'
              : body,
        );
      }

      final Stream<String> lines = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());

      String buffer = '';
      bool received = false;
      String? streamError;
      await for (final String line in lines) {
        final String trimmed = line.trim();
        if (trimmed.isEmpty) continue;
        if (!trimmed.startsWith('data:')) continue;
        final String raw = trimmed.substring(5).trim();
        if (raw == '[DONE]') break;
        try {
          final Object? decoded = jsonDecode(raw);
          if (decoded is Map<String, dynamic>) {
            final Object? error = decoded['error'];
            if (error is String && error.trim().isNotEmpty) {
              streamError = error.trim();
            }
            final Object? body = decoded['body'];
            if (streamError == null &&
                body is String &&
                body.trim().isNotEmpty) {
              streamError = body.trim();
            }
            final Object? delta = decoded['delta'];
            if (delta is String && delta.isNotEmpty) {
              received = true;
              buffer += delta;
              _updateStreamingMessage(buffer);
            }
          }
        } catch (_) {}
      }

      if (!received && buffer.trim().isEmpty) {
        _replaceTypingWith(
          streamError?.trim().isNotEmpty == true
              ? _summarizeError(streamError!)
              : 'Ù„Ù… ÙŠØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø±Ø¯ Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ±.',
        );
      }
    } catch (error) {
      try {
        final String reply = await _fetchReply(
          message,
          attachments: attachments,
          allowGemini: false,
        );
        _replaceTypingWith(reply);
      } catch (_) {
        final Object resolved = geminiError ?? error;
        _replaceTypingWith(_summarizeError(resolved.toString()));
        throw AiChatException(
          resolved.toString().trim().replaceFirst('Exception: ', ''),
        );
      }
    }
  }

  static void _replaceTypingWith(String reply) {
    final List<ChatMessage> next = List<ChatMessage>.of(_messages);
    final int typingIndex = next.lastIndexWhere(
      (item) =>
          item.isBot &&
          item.type == ChatMessageType.text &&
          (item.text ?? '').trim() == '...',
    );
    if (typingIndex >= 0) {
      next.removeAt(typingIndex);
    }
    next.add(
      ChatMessage.text(
        isBot: true,
        text: reply,
        time: _formatTime(DateTime.now()),
      ),
    );
    _messages = next;
    _updateActiveSession(updatedAt: DateTime.now());
    _emit();
  }

  static void _updateStreamingMessage(String reply) {
    final List<ChatMessage> next = List<ChatMessage>.of(_messages);
    final int typingIndex = next.lastIndexWhere(
      (item) =>
          item.isBot &&
          item.type == ChatMessageType.text &&
          (item.text ?? '').trim() == '...',
    );
    if (typingIndex >= 0) {
      final String time = next[typingIndex].time;
      next[typingIndex] = ChatMessage.text(
        isBot: true,
        text: reply,
        time: time,
      );
    } else {
      next.add(
        ChatMessage.text(
          isBot: true,
          text: reply,
          time: _formatTime(DateTime.now()),
        ),
      );
    }
    _messages = next;
    _updateActiveSession(persist: false);
    _emit();
  }

  static ChatMessage _typingMessage() {
    return ChatMessage.text(
      isBot: true,
      text: '...',
      time: _formatTime(DateTime.now()),
    );
  }

  static String _resolveStreamEndpoint() {
    if (AiChatConfig.streamEndpoint.trim().isNotEmpty) {
      return AiChatConfig.streamEndpoint.trim();
    }
    if (AiChatConfig.endpoint.trim().isEmpty) return '';
    if (AiChatConfig.endpoint.trim().endsWith('/chat')) {
      return AiChatConfig.endpoint.trim().replaceFirst('/chat', '/chat/stream');
    }
    return AiChatConfig.endpoint.trim();
  }

  static Future<List<Map<String, dynamic>>> _encodeAttachments(
    List<ChatPickedAttachment> attachments,
  ) async {
    final List<Map<String, dynamic>> payload = [];
    for (final ChatPickedAttachment attachment in attachments) {
      final String mime = _guessMime(attachment.name, attachment.isImage);
      if (attachment.isImage) {
        if (attachment.size > 2 * 1024 * 1024) {
          throw AiChatException('Ø§Ù„ØµÙˆØ±Ø© ÙƒØ¨ÙŠØ±Ø© Ø¬Ø¯Ù‹Ø§ (Ø§Ù„Ø­Ø¯ 2MB).');
        }
        final List<int> bytes = await attachment.file.readAsBytes();
        payload.add({
          'type': 'image',
          'name': attachment.name,
          'mime': mime,
          'data': base64Encode(bytes),
        });
      } else {
        if (attachment.size > 512 * 1024) {
          payload.add({
            'type': 'file',
            'name': attachment.name,
            'mime': mime,
            'note': 'Ù…Ù„Ù ÙƒØ¨ÙŠØ± Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø±Ø³Ø§Ù„Ù‡ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.',
          });
          continue;
        }
        if (mime.startsWith('text/')) {
          final String content =
              await attachment.file.readAsString().catchError((_) => '');
          payload.add({
            'type': 'file',
            'name': attachment.name,
            'mime': mime,
            'text': content,
          });
        } else {
          payload.add({
            'type': 'file',
            'name': attachment.name,
            'mime': mime,
            'note': 'Ù†ÙˆØ¹ Ø§Ù„Ù…Ù„Ù ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ… Ù„Ù„Ù…Ø­ØªÙˆÙ‰. Ø³ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§Ø³Ù… ÙÙ‚Ø·.',
          });
        }
      }
    }
    return payload;
  }

  static String _guessMime(String name, bool isImage) {
    final String lower = name.toLowerCase();
    if (isImage) {
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        return 'image/jpeg';
      }
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.gif')) return 'image/gif';
      return 'image/jpeg';
    }
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.md')) return 'text/markdown';
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.csv')) return 'text/csv';
    return 'application/octet-stream';
  }

  static void _emit() {
    _controller.add(List<ChatMessage>.unmodifiable(_messages));
  }

  static String _formatTime(DateTime value) {
    final String hour = value.hour.toString().padLeft(2, '0');
    final String minute = value.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  static String _summarizeError(String raw) {
    final String trimmed = raw.trim();
    if (trimmed.isEmpty) return 'Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø³ÙŠØ±ÙØ±.';
    if (trimmed.length <= 180) return trimmed;
    return '${trimmed.substring(0, 180)}...';
  }
}

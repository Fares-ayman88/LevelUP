import 'package:flutter/foundation.dart';

import 'mentor_catalog.dart';
import '../services/mentor_chat_service.dart';

class MentorChatSummary {
  const MentorChatSummary({
    required this.id,
    required this.name,
    required this.role,
    this.imagePath,
    required this.lastMessage,
    required this.lastTime,
    required this.unreadCount,
    required this.isActive,
    required this.lastFromUser,
    required this.lastSeenByMentor,
  });

  final String id;
  final String name;
  final String role;
  final String? imagePath;
  final String lastMessage;
  final String lastTime;
  final int unreadCount;
  final bool isActive;
  final bool lastFromUser;
  final bool lastSeenByMentor;

  MentorChatSummary copyWith({
    String? imagePath,
    String? lastMessage,
    String? lastTime,
    int? unreadCount,
    bool? isActive,
    bool? lastFromUser,
    bool? lastSeenByMentor,
  }) {
    return MentorChatSummary(
      id: id,
      name: name,
      role: role,
      imagePath: imagePath ?? this.imagePath,
      lastMessage: lastMessage ?? this.lastMessage,
      lastTime: lastTime ?? this.lastTime,
      unreadCount: unreadCount ?? this.unreadCount,
      isActive: isActive ?? this.isActive,
      lastFromUser: lastFromUser ?? this.lastFromUser,
      lastSeenByMentor: lastSeenByMentor ?? this.lastSeenByMentor,
    );
  }
}

class MentorChatStore {
  MentorChatStore._();

  static final ValueNotifier<List<MentorChatSummary>> chats =
      ValueNotifier<List<MentorChatSummary>>([]);

  static MentorChatSummary? byId(String id) {
    for (final MentorChatSummary item in chats.value) {
      if (item.id == id) return item;
    }
    return null;
  }

  static void syncWithCatalog(List<MentorItem> mentors) {
    if (mentors.isEmpty) return;
    final List<MentorChatSummary> current = chats.value;
    final Map<String, MentorChatSummary> byId = {
      for (final MentorChatSummary item in current) item.id: item,
    };
    final Map<String, MentorChatSummary> byName = {
      for (final MentorChatSummary item in current)
        _normalizeName(item.name): item,
    };
    final Set<String> usedIds = <String>{};
    final List<MentorChatSummary> merged = [];

    for (final MentorItem mentor in mentors) {
      MentorChatSummary? existing = byId[mentor.id];
      existing ??= byName[_normalizeName(mentor.name)];
      if (existing == null) {
        final String mentorKey = _normalizeName(mentor.name);
        final String firstName = mentor.name
            .trim()
            .split(' ')
            .first
            .toLowerCase();
        for (final MentorChatSummary item in current) {
          final String itemKey = _normalizeName(item.name);
          if (itemKey == firstName ||
              mentorKey.contains(itemKey) ||
              itemKey.contains(mentorKey)) {
            existing = item;
            break;
          }
        }
      }

      final String role = mentor.subtitle.trim().isNotEmpty
          ? mentor.subtitle.trim()
          : '${mentor.category.trim()} Mentor';
      if (existing == null) {
        merged.add(
          MentorChatSummary(
            id: mentor.id,
            name: mentor.name,
            role: role,
            imagePath: mentor.imagePath,
            lastMessage: 'Tap to start chat',
            lastTime: '',
            unreadCount: 0,
            isActive: false,
            lastFromUser: false,
            lastSeenByMentor: true,
          ),
        );
        usedIds.add(mentor.id);
      } else {
        merged.add(
          MentorChatSummary(
            id: mentor.id,
            name: mentor.name,
            role: role,
            imagePath: (mentor.imagePath ?? '').trim().isNotEmpty
                ? mentor.imagePath
                : existing.imagePath,
            lastMessage: existing.lastMessage,
            lastTime: existing.lastTime,
            unreadCount: existing.unreadCount,
            isActive: existing.isActive,
            lastFromUser: existing.lastFromUser,
            lastSeenByMentor: existing.lastSeenByMentor,
          ),
        );
        usedIds.add(existing.id);
        usedIds.add(mentor.id);
      }
    }

    for (final MentorChatSummary item in current) {
      if (usedIds.contains(item.id)) continue;
      merged.add(item);
    }

    if (_sameChats(current, merged)) return;
    chats.value = merged;
  }

  static bool _sameChats(
    List<MentorChatSummary> left,
    List<MentorChatSummary> right,
  ) {
    if (left.length != right.length) return false;
    for (int i = 0; i < left.length; i++) {
      final MentorChatSummary a = left[i];
      final MentorChatSummary b = right[i];
      if (a.id != b.id) return false;
      if (a.name != b.name) return false;
      if (a.role != b.role) return false;
      if ((a.imagePath ?? '').trim() != (b.imagePath ?? '').trim()) {
        return false;
      }
      if (a.lastMessage != b.lastMessage) return false;
      if (a.lastTime != b.lastTime) return false;
      if (a.unreadCount != b.unreadCount) return false;
      if (a.isActive != b.isActive) return false;
      if (a.lastFromUser != b.lastFromUser) return false;
      if (a.lastSeenByMentor != b.lastSeenByMentor) return false;
    }
    return true;
  }

  static void mergeServerSummaries(
    List<MentorChatConversationSummary> summaries,
  ) {
    if (summaries.isEmpty) return;
    final List<MentorChatSummary> current = chats.value;
    final Map<String, MentorChatSummary> byId = <String, MentorChatSummary>{
      for (final MentorChatSummary item in current) item.id: item,
    };
    final Map<String, MentorChatSummary> byName = <String, MentorChatSummary>{
      for (final MentorChatSummary item in current)
        _normalizeName(item.name): item,
    };

    final Map<String, MentorChatSummary> merged = <String, MentorChatSummary>{
      for (final MentorChatSummary item in current) item.id: item,
    };
    final Set<String> consumedIds = <String>{};

    for (final MentorChatConversationSummary summary in summaries) {
      if (summary.mentorId.trim().isEmpty) continue;
      final String normalizedName = _normalizeName(summary.mentorName);
      final MentorChatSummary? existing =
          byId[summary.mentorId] ?? byName[normalizedName];
      final MentorChatSummary seed =
          existing ??
          MentorChatSummary(
            id: summary.mentorId,
            name: summary.mentorName.trim().isEmpty
                ? 'Mentor'
                : summary.mentorName.trim(),
            role: summary.mentorRole.trim().isEmpty
                ? 'Mentor'
                : summary.mentorRole.trim(),
            imagePath: summary.mentorImagePath.trim().isEmpty
                ? null
                : summary.mentorImagePath.trim(),
            lastMessage: 'Tap to start chat',
            lastTime: '',
            unreadCount: 0,
            isActive: false,
            lastFromUser: false,
            lastSeenByMentor: true,
          );

      final MentorChatSummary next = MentorChatSummary(
        id: seed.id,
        name: summary.mentorName.trim().isEmpty
            ? seed.name
            : summary.mentorName.trim(),
        role: summary.mentorRole.trim().isEmpty
            ? seed.role
            : summary.mentorRole.trim(),
        imagePath: summary.mentorImagePath.trim().isEmpty
            ? seed.imagePath
            : summary.mentorImagePath.trim(),
        lastMessage: summary.lastMessage.trim().isEmpty
            ? seed.lastMessage
            : summary.lastMessage.trim(),
        lastTime: MentorChatService.formatSummaryTime(summary.lastMessageAt),
        unreadCount: summary.unreadForUser,
        isActive: summary.activeForMentor,
        lastFromUser: summary.lastMessageFromUser,
        lastSeenByMentor: summary.lastSeenByMentor,
      );

      if (existing != null && existing.id != next.id) {
        merged.remove(existing.id);
      }
      merged[next.id] = next;
      consumedIds.add(next.id);
      if (existing != null) {
        consumedIds.add(existing.id);
      }
    }

    final List<MentorChatSummary> ordered = <MentorChatSummary>[];
    for (final MentorChatSummary item in current) {
      if (consumedIds.contains(item.id) && merged[item.id] == null) {
        continue;
      }
      final MentorChatSummary? next = merged[item.id];
      if (next != null) {
        ordered.add(next);
        merged.remove(item.id);
      } else {
        ordered.add(item);
      }
    }
    for (final MentorChatSummary item in merged.values) {
      ordered.add(item);
    }

    if (_sameChats(current, ordered)) return;
    chats.value = ordered;
  }

  static String _normalizeName(String value) {
    return value.trim().toLowerCase();
  }

  static void markActive(String id, bool active) {
    final List<MentorChatSummary> updated = chats.value
        .map((item) => item.id == id ? item.copyWith(isActive: active) : item)
        .toList();
    chats.value = updated;
  }

  static void markRead(String id) {
    final List<MentorChatSummary> updated = chats.value
        .map((item) => item.id == id ? item.copyWith(unreadCount: 0) : item)
        .toList();
    chats.value = updated;
  }

  static void updateLastMessage({
    required String id,
    required String message,
    required String timeLabel,
    required bool fromUser,
    bool seenByMentor = false,
  }) {
    final List<MentorChatSummary> updated = chats.value
        .map(
          (item) => item.id == id
              ? item.copyWith(
                  lastMessage: message,
                  lastTime: timeLabel,
                  lastFromUser: fromUser,
                  lastSeenByMentor: seenByMentor,
                  unreadCount: fromUser ? 0 : (item.unreadCount + 1),
                )
              : item,
        )
        .toList();
    chats.value = updated;
  }

  static void markSeenByMentor(String id, bool seen) {
    final List<MentorChatSummary> updated = chats.value
        .map(
          (item) =>
              item.id == id ? item.copyWith(lastSeenByMentor: seen) : item,
        )
        .toList();
    chats.value = updated;
  }
}

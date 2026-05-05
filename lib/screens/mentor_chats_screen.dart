import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/admin_access.dart';
import '../app_state/mentor_catalog.dart';
import '../app_state/mentor_chat_store.dart';
import '../routes.dart';
import '../services/mentor_chat_service.dart';
import '../utils/image_utils.dart';
import '../widgets/main_bottom_nav.dart';
import 'mentor_chat_thread_screen.dart';

const Color _chatsBackground = Color(0xFFFFFFFF);
const Color _chatsSurface = Color(0xFFFFFFFF);
const Color _chatsTitle = Color(0xFF202244);
const Color _chatsMuted = Color(0xFF7D8190);
const Color _chatsAccent = Color(0xFF4C5EF5);
const Color _chatsCard = Color(0xFFFFFFFF);
const Color _chatsDivider = Color(0xFFE3E8F3);
const Color _chatsActiveDot = Color(0xFF28C88A);
const Color _chatsInactiveDot = Color(0xFFC7CBD9);
const Color _chatsSeen = Color(0xFF4C5EF5);

bool _chatsIsDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;
Color _chatsBackgroundColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFF000000) : _chatsBackground;
Color _chatsSurfaceColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFF121212) : _chatsSurface;
Color _chatsCardColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFF141414) : _chatsCard;
Color _chatsTitleColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFFF3F3F3) : _chatsTitle;
Color _chatsMutedColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFFB7B7B7) : _chatsMuted;
Color _chatsDividerColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFF2E2E2E) : _chatsDivider;
Color _chatsAvatarBgColor(BuildContext context) =>
    _chatsIsDark(context) ? const Color(0xFF202020) : const Color(0xFFE9ECF7);

class MentorChatsScreen extends StatelessWidget {
  const MentorChatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final bool isAdmin = AdminAccess.isAdmin();
    final String supportLabel = isAdmin ? 'User Support' : 'Admin Support';
    final List<String> tabs = ['Indox', 'Mentor Chats', supportLabel];
    return Scaffold(
      backgroundColor: _chatsBackgroundColor(context),
      bottomNavigationBar: const MainBottomNav(currentIndex: 2),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return Column(
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    18,
                    horizontalPadding,
                    8,
                  ),
                  child: Row(
                    children: [
                      _HeaderIconButton(
                        icon: Icons.arrow_back,
                        onTap: () {
                          Navigator.of(context).maybePop().then((popped) {
                            if (!popped && context.mounted) {
                              Navigator.of(context).pushNamed(AppRoutes.home);
                            }
                          });
                        },
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Mentor Chats',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _chatsTitleColor(context),
                        ),
                      ),
                      const Spacer(),
                      const _HeaderIconButton(icon: Icons.more_horiz),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    6,
                    horizontalPadding,
                    12,
                  ),
                  child: _TopTabs(
                    labels: tabs,
                    selectedIndex: 1,
                    onTap: (index) {
                      if (index == 0) {
                        Navigator.of(
                          context,
                        ).pushReplacementNamed(AppRoutes.indox);
                      } else if (index == 2) {
                        Navigator.of(
                          context,
                        ).pushReplacementNamed(AppRoutes.supportChats);
                      }
                    },
                  ),
                ),
                Expanded(
                  child: ValueListenableBuilder<List<MentorItem>>(
                    valueListenable: MentorCatalog.mentors,
                    builder: (context, mentors, _) {
                      MentorChatStore.syncWithCatalog(mentors);
                      final User? currentUser =
                          FirebaseAuth.instance.currentUser;
                      final Widget chatsView =
                          ValueListenableBuilder<List<MentorChatSummary>>(
                            valueListenable: MentorChatStore.chats,
                            builder: (context, chats, _) {
                              final List<MentorChatSummary> recentChats = chats
                                  .where(
                                    (chat) =>
                                        chat.lastMessage.trim().isNotEmpty &&
                                        chat.lastMessage.trim().toLowerCase() !=
                                            'tap to start chat' &&
                                        chat.lastTime.trim().isNotEmpty,
                                  )
                                  .toList();
                              final List<Widget> children = [];
                              if (recentChats.isNotEmpty) {
                                children.add(
                                  Text(
                                    'Recent Chats',
                                    style: GoogleFonts.poppins(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: _chatsTitleColor(context),
                                    ),
                                  ),
                                );
                                children.add(const SizedBox(height: 12));
                                for (final MentorChatSummary chat
                                    in recentChats) {
                                  children.add(
                                    _MentorChatTile(
                                      chat: chat,
                                      onTap: () =>
                                          Navigator.of(context).pushNamed(
                                            AppRoutes.mentorChatThread,
                                            arguments: MentorChatThreadArgs(
                                              id: chat.id,
                                              name: chat.name,
                                              role: chat.role,
                                              imagePath: chat.imagePath,
                                            ),
                                          ),
                                    ),
                                  );
                                  children.add(const SizedBox(height: 14));
                                }
                                children.add(const SizedBox(height: 4));
                              }
                              children.add(
                                Text(
                                  'Mentors',
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: _chatsTitleColor(context),
                                  ),
                                ),
                              );
                              children.add(const SizedBox(height: 12));
                              for (final MentorChatSummary chat in chats) {
                                children.add(
                                  _MentorChatTile(
                                    chat: chat,
                                    onTap: () =>
                                        Navigator.of(context).pushNamed(
                                          AppRoutes.mentorChatThread,
                                          arguments: MentorChatThreadArgs(
                                            id: chat.id,
                                            name: chat.name,
                                            role: chat.role,
                                            imagePath: chat.imagePath,
                                          ),
                                        ),
                                  ),
                                );
                                children.add(const SizedBox(height: 14));
                              }
                              if (children.isNotEmpty) {
                                children.removeLast();
                              }
                              return ListView(
                                padding: EdgeInsets.fromLTRB(
                                  horizontalPadding,
                                  6,
                                  horizontalPadding,
                                  16,
                                ),
                                children: children,
                              );
                            },
                          );
                      if (currentUser == null) {
                        return chatsView;
                      }
                      return StreamBuilder<List<MentorChatConversationSummary>>(
                        stream: MentorChatService.streamUserChats(
                          currentUser.uid,
                        ),
                        builder: (context, snapshot) {
                          final List<MentorChatConversationSummary> summaries =
                              snapshot.data ??
                              const <MentorChatConversationSummary>[];
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            MentorChatStore.mergeServerSummaries(summaries);
                          });
                          return chatsView;
                        },
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({required this.icon, this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _chatsSurfaceColor(context),
          shape: BoxShape.circle,
          border: Border.all(color: _chatsDividerColor(context)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Icon(icon, size: 20, color: _chatsTitleColor(context)),
      ),
    );
  }
}

class _TopTabs extends StatelessWidget {
  const _TopTabs({
    required this.labels,
    required this.selectedIndex,
    required this.onTap,
  });

  final List<String> labels;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final List<Widget> children = [];
    for (int index = 0; index < labels.length; index++) {
      children.add(
        Expanded(
          child: _TopTabButton(
            label: labels[index],
            selected: index == selectedIndex,
            onTap: () => onTap(index),
          ),
        ),
      );
      if (index != labels.length - 1) {
        children.add(const SizedBox(width: 10));
      }
    }
    return Row(children: children);
  }
}

class _TopTabButton extends StatelessWidget {
  const _TopTabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? _chatsAccent : _chatsSurfaceColor(context),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? _chatsAccent : _chatsDividerColor(context),
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: _chatsAccent.withValues(alpha: 0.25),
                    blurRadius: 14,
                    offset: const Offset(0, 8),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 6),
                  ),
                ],
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : _chatsTitleColor(context),
          ),
        ),
      ),
    );
  }
}

class _MentorChatTile extends StatelessWidget {
  const _MentorChatTile({required this.chat, required this.onTap});

  final MentorChatSummary chat;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bool hasUnread = chat.unreadCount > 0;
    final ImageProvider? avatarImage = resolveImageProvider(chat.imagePath);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: _chatsCardColor(context),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _chatsDividerColor(context)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 14,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: _chatsAvatarBgColor(context),
                    backgroundImage: avatarImage,
                    child: avatarImage == null
                        ? Text(
                            chat.name.substring(0, 1),
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: _chatsTitleColor(context),
                            ),
                          )
                        : null,
                  ),
                  Positioned(
                    bottom: 2,
                    right: 2,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: chat.isActive
                            ? _chatsActiveDot
                            : _chatsInactiveDot,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _chatsCardColor(context),
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            chat.name,
                            style: GoogleFonts.poppins(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: _chatsTitleColor(context),
                            ),
                          ),
                        ),
                        Text(
                          chat.lastTime,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: hasUnread
                                ? _chatsAccent
                                : _chatsMutedColor(context),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (chat.lastFromUser)
                          Icon(
                            chat.lastSeenByMentor
                                ? Icons.done_all
                                : Icons.check,
                            size: 14,
                            color: chat.lastSeenByMentor
                                ? _chatsSeen
                                : _chatsMutedColor(context),
                          ),
                        if (chat.lastFromUser) const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            chat.lastMessage,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _chatsMutedColor(context),
                            ),
                          ),
                        ),
                        if (hasUnread)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: _chatsAccent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              chat.unreadCount.toString(),
                              style: GoogleFonts.poppins(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      chat.role,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: _chatsMutedColor(context),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

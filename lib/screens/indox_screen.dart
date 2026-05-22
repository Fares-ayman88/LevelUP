import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/admin_access.dart';
import '../app_state/ai_chat_store.dart';
import '../routes.dart';
import 'chat_thread_screen.dart' show ChatMessage, ChatPickedAttachment;
import 'chat_thread_modern_screen.dart';
import 'call_screen.dart';

class IndoxScreen extends StatefulWidget {
  const IndoxScreen({super.key});

  @override
  State<IndoxScreen> createState() => _IndoxScreenState();
}

class _IndoxScreenState extends State<IndoxScreen> {
  static const Color _inboxTitle = Color(0xFF202244);
  static const Color _inboxMuted = Color(0xFF7D8190);
  static const Color _inboxAccent = Color(0xFF4C5EF5);
  static const Color _inboxSoft = Color(0xFFE9ECFF);
  int _focusComposerSeed = 0;

  Future<void> _startNewAiSession(BuildContext context) async {
    final NavigatorState navigator = Navigator.of(context);
    final ScaffoldState? scaffold = Scaffold.maybeOf(context);
    await AiChatStore.startNewSession();
    if (!mounted) return;
    setState(() {
      _focusComposerSeed += 1;
    });
    if (scaffold?.isDrawerOpen == true) {
      navigator.pop();
    }
  }

  Future<void> _selectAiSession(BuildContext context, String id) async {
    final NavigatorState navigator = Navigator.of(context);
    final ScaffoldState? scaffold = Scaffold.maybeOf(context);
    await AiChatStore.selectSession(id);
    if (!mounted) return;
    if (scaffold?.isDrawerOpen == true) {
      navigator.pop();
    }
  }

  Future<void> _deleteAiSession(BuildContext context, String id) async {
    final NavigatorState navigator = Navigator.of(context);
    final ScaffoldState? scaffold = Scaffold.maybeOf(context);
    await AiChatStore.deleteSession(id);
    if (!mounted) return;
    if (scaffold?.isDrawerOpen == true) {
      navigator.pop();
    }
  }

  Future<void> _sendAiText(String text) async {
    await AiChatStore.sendText(text);
  }

  Future<void> _sendAiAttachments(
    List<ChatPickedAttachment> attachments,
  ) async {
    await AiChatStore.sendAttachments(attachments);
  }

  Future<void> _sendAiComposed(
    String text,
    List<ChatPickedAttachment> attachments,
  ) async {
    await AiChatStore.sendMessage(text: text, attachments: attachments);
  }

  void _handleBackTap(BuildContext context) {
    Navigator.of(context).maybePop().then((popped) {
      if (!popped && context.mounted) {
        Navigator.of(context).pushNamed(AppRoutes.home);
      }
    });
  }

  Widget _buildAiSidebar(BuildContext context) {
    return Container(
      color: const Color(0xFFFDF9F4),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Chat BoT',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: _inboxTitle,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () async {
                      await _startNewAiSession(context);
                    },
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _inboxSoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.add,
                        color: _inboxAccent,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ValueListenableBuilder<List<AiChatSummary>>(
                  valueListenable: AiChatStore.summaries,
                  builder: (context, items, _) {
                    if (items.isEmpty) {
                      return Center(
                        child: Text(
                          'No AI chats yet',
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: _inboxMuted,
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final AiChatSummary chat = items[index];
                        final bool selected =
                            chat.id == AiChatStore.activeSessionId;
                        return GestureDetector(
                          onTap: () async {
                            await _selectAiSession(context, chat.id);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: selected ? _inboxSoft : Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: selected
                                    ? _inboxAccent.withValues(alpha: 0.2)
                                    : const Color(0xFFE7DDD3),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 10,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: _inboxSoft,
                                  child: Text(
                                    'CB',
                                    style: GoogleFonts.poppins(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                      color: _inboxAccent,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Chat BoT',
                                        style: GoogleFonts.poppins(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: _inboxTitle,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        chat.lastMessage,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.poppins(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w500,
                                          color: _inboxMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      chat.lastTime,
                                      style: GoogleFonts.poppins(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        color: _inboxMuted,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    GestureDetector(
                                      onTap: () async {
                                        await _deleteAiSession(
                                          context,
                                          chat.id,
                                        );
                                      },
                                      child: Container(
                                        width: 26,
                                        height: 26,
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                          border: Border.all(
                                            color: const Color(0xFFE7DDD3),
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.delete_outline_rounded,
                                          size: 16,
                                          color: Color(0xFF2A2B2F),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAiDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFFFDF9F4),
      width: 280,
      child: _buildAiSidebar(context),
    );
  }

  Widget _buildHeaderActions(BuildContext context) {
    return Builder(
      builder: (context) {
        return Row(
          children: [
            GestureDetector(
              onTap: () async {
                await _startNewAiSession(context);
              },
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE7DDD3)),
                ),
                child: const Icon(
                  Icons.close_rounded,
                  size: 18,
                  color: Color(0xFF2A2B2F),
                ),
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: () {
                Scaffold.maybeOf(context)?.openDrawer();
              },
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE7DDD3)),
                ),
                child: const Icon(
                  Icons.menu_rounded,
                  size: 18,
                  color: Color(0xFF2A2B2F),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 26),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Center(
                child: Container(
                  width: 54,
                  height: 54,
                  decoration: const BoxDecoration(
                    color: _inboxSoft,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: _inboxAccent,
                    size: 26,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Your AI space is ready',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: _inboxTitle,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Ask anything about your courses, research topics, or get help with your assignments in real-time.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
                color: _inboxMuted,
                height: 1.6,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    unawaited(AiChatStore.ensureInitialized());
  }

  @override
  Widget build(BuildContext context) {
    final bool isAdmin = AdminAccess.isAdmin();
    final String supportLabel = isAdmin ? 'User Support' : 'Admin Support';
    final List<String> tabs = ['Indox', 'Mentor Chats', supportLabel];
    return StreamBuilder<List<ChatMessage>>(
      stream: AiChatStore.stream,
      builder: (context, snapshot) {
        final Widget drawer = _buildAiDrawer(context);
        final Widget sidePanel = _buildAiSidebar(context);
        final Widget headerActions = _buildHeaderActions(context);
        return ChatThreadModernScreen(
          key: const ValueKey('ai-chat'),
          title: 'Chat BoT',
          subtitle: 'Assistant',
          showTabs: true,
          tabLabels: tabs,
          selectedTabIndex: 0,
          onTabTap: (index) {
            if (index == 1) {
              Navigator.of(
                context,
              ).pushReplacementNamed(AppRoutes.mentorChats);
            } else if (index == 2) {
              Navigator.of(
                context,
              ).pushReplacementNamed(AppRoutes.supportChats);
            }
          },
          messagesStream: AiChatStore.stream,
          initialMessages: AiChatStore.messages,
          onSendText: _sendAiText,
          onSendAttachments: _sendAiAttachments,
          onSendComposed: _sendAiComposed,
          emptyState: _buildEmptyState(),
          showLabels: false,
          assistantLabel: 'Chat BoT',
          userLabel: 'You',
          showCallAction: true,
          showSearchAction: false,
          showMenuAction: false,
          showAttachmentButton: true,
          composerHint: 'Type a message...',
          focusRequestId: _focusComposerSeed,
          headerBottom: headerActions,
          drawer: drawer,
          sidePanel: sidePanel,
          showBottomNav: true,
          bottomNavIndex: 2,
          onBackTap: () => _handleBackTap(context),
          onCallTap: () => Navigator.of(context).pushNamed(
            AppRoutes.call,
            arguments: const CallScreenArgs(name: 'Chat BoT'),
          ),
        );
      },
    );
  }
}

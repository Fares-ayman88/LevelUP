import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../app_state/mentor_chat_store.dart';
import '../routes.dart';
import '../services/mentor_chat_service.dart';
import '../services/social_service.dart';
import '../utils/image_utils.dart';
import 'call_screen.dart';
import 'chat_thread_modern_screen.dart';
import 'chat_thread_screen.dart' show ChatMessage;

class MentorChatThreadArgs {
  const MentorChatThreadArgs({
    required this.id,
    required this.name,
    required this.role,
    this.imagePath,
  });

  final String id;
  final String name;
  final String role;
  final String? imagePath;
}

class MentorChatThreadScreen extends StatefulWidget {
  const MentorChatThreadScreen({super.key});

  @override
  State<MentorChatThreadScreen> createState() => _MentorChatThreadScreenState();
}

class _MentorChatThreadScreenState extends State<MentorChatThreadScreen> {
  bool _initialized = false;
  bool _loading = true;
  String? _error;
  User? _user;
  MentorChatThreadArgs? _args;
  String _conversationId = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    _args = ModalRoute.of(context)?.settings.arguments as MentorChatThreadArgs?;
    _prepareConversation();
  }

  Future<void> _prepareConversation() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Sign in to open mentor chat.';
      });
      return;
    }
    final MentorChatThreadArgs args =
        _args ??
        const MentorChatThreadArgs(id: '', name: 'Mentor', role: 'Mentor');
    final String mentorId = args.id.trim().isNotEmpty
        ? args.id.trim()
        : SocialService.mentorKey(mentorName: args.name, mentorId: null);
    final String mentorName = args.name.trim().isEmpty ? 'Mentor' : args.name;
    final String mentorRole = args.role.trim().isEmpty ? 'Mentor' : args.role;
    final String conversationId = MentorChatService.buildConversationId(
      userId: user.uid,
      mentorId: mentorId,
    );

    try {
      await MentorChatService.ensureConversation(
        conversationId: conversationId,
        userId: user.uid,
        mentorId: mentorId,
        mentorName: mentorName,
        mentorRole: mentorRole,
        mentorImagePath: args.imagePath,
      );
      await MentorChatService.markReadForUser(conversationId);
      MentorChatStore.markRead(mentorId);
      if (!mounted) return;
      setState(() {
        _user = user;
        _conversationId = conversationId;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '').trim();
      });
    }
  }

  List<ChatMessage> _mapMessages(List<MentorChatMessage> messages) {
    if (messages.isEmpty) {
      final String name = (_args?.name ?? '').trim().isEmpty
          ? 'Mentor'
          : _args!.name.trim();
      return <ChatMessage>[
        ChatMessage.text(
          isBot: true,
          text: 'Hi, I am $name. How can I help you?',
          time: MentorChatService.formatMessageTime(DateTime.now()),
        ),
      ];
    }
    return messages.map((message) {
      final bool isFromMentor = message.senderRole != 'user';
      return ChatMessage.text(
        isBot: isFromMentor,
        text: message.text,
        time: MentorChatService.formatMessageTime(message.createdAt),
        isRead: isFromMentor ? null : message.seenByMentor,
      );
    }).toList();
  }

  Future<void> _sendText(String text) async {
    final User? user = _user ?? FirebaseAuth.instance.currentUser;
    if (user == null || _conversationId.isEmpty) return;
    final MentorChatThreadArgs args =
        _args ??
        const MentorChatThreadArgs(id: '', name: 'Mentor', role: 'Mentor');
    final String mentorId = args.id.trim().isNotEmpty
        ? args.id.trim()
        : SocialService.mentorKey(mentorName: args.name, mentorId: null);
    final String mentorName = args.name.trim().isEmpty ? 'Mentor' : args.name;
    final String mentorRole = args.role.trim().isEmpty ? 'Mentor' : args.role;

    await MentorChatService.sendUserText(
      conversationId: _conversationId,
      userId: user.uid,
      mentorId: mentorId,
      mentorName: mentorName,
      mentorRole: mentorRole,
      mentorImagePath: args.imagePath,
      text: text,
    );
    MentorChatStore.updateLastMessage(
      id: mentorId,
      message: text,
      timeLabel: MentorChatService.formatSummaryTime(DateTime.now()),
      fromUser: true,
      seenByMentor: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(_error!, textAlign: TextAlign.center),
          ),
        ),
      );
    }

    final MentorChatThreadArgs args =
        _args ??
        const MentorChatThreadArgs(id: '', name: 'Mentor', role: 'Mentor');
    final String name = args.name.trim().isEmpty ? 'Mentor' : args.name.trim();
    final String role = args.role.trim().isEmpty ? 'Mentor' : args.role.trim();

    return StreamBuilder<MentorChatConversationSummary?>(
      stream: MentorChatService.streamConversationSummary(_conversationId),
      builder: (context, snapshot) {
        final bool mentorActive = snapshot.data?.activeForMentor ?? false;
        return Theme(
          data: Theme.of(context).copyWith(brightness: Brightness.light),
          child: ChatThreadModernScreen(
            title: name,
            subtitle: role.isEmpty ? null : role,
            showTabs: false,
            showBottomNav: false,
            showSearchAction: false,
            showMenuAction: false,
            showAttachmentButton: false,
            assistantActive: mentorActive,
            onBackTap: () {
              Navigator.of(context).maybePop().then((popped) {
                if (!popped && context.mounted) {
                  Navigator.of(
                    context,
                  ).pushReplacementNamed(AppRoutes.mentorChats);
                }
              });
            },
            showAvatars: false,
            showLabels: false,
            assistantLabel: name,
            userLabel: 'You',
            assistantAvatar: resolveImageProvider(args.imagePath),
            onCallTap: () => Navigator.of(
              context,
            ).pushNamed(AppRoutes.call, arguments: CallScreenArgs(name: name)),
            messagesStream: MentorChatService.streamMessages(
              _conversationId,
            ).map(_mapMessages),
            onSendText: _sendText,
          ),
        );
      },
    );
  }
}

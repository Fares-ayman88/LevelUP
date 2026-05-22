import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../app_state/admin_access.dart';
import '../app_state/support_chat.dart';
import '../routes.dart';
import 'call_screen.dart';
import 'chat_thread_screen.dart'
    show ChatMessage, ChatFileAttachment, ChatPickedAttachment;
import 'chat_thread_modern_screen.dart';

class SupportChatThreadArgs {
  const SupportChatThreadArgs({
    required this.chatId,
    required this.userName,
    required this.userEmail,
    this.adminId,
    this.adminName,
    this.adminEmail,
    this.adminAvatarUrl,
  });

  final String chatId;
  final String userName;
  final String userEmail;
  final String? adminId;
  final String? adminName;
  final String? adminEmail;
  final String? adminAvatarUrl;
}

class SupportChatThreadScreen extends StatefulWidget {
  const SupportChatThreadScreen({super.key});

  @override
  State<SupportChatThreadScreen> createState() =>
      _SupportChatThreadScreenState();
}

class _SupportChatThreadScreenState extends State<SupportChatThreadScreen> {
  bool _markedRead = false;
  bool _loading = true;
  User? _user;
  String? _error;
  StreamSubscription<List<SupportChatMessage>>? _messagesSub;
  String? _listeningChatId;
  String? _lastSeenMessageId;

  @override
  void initState() {
    super.initState();
    _ensureUser();
  }

  Future<void> _ensureUser() async {
    if (AdminAccess.isAdmin()) {
      setState(() {
        _user = FirebaseAuth.instance.currentUser;
        _loading = false;
      });
      _bindMessageListener();
      _setActive(true);
      return;
    }
    final User? user = await SupportChatService.ensureSignedIn();
    if (!mounted) return;
    if (user == null) {
      setState(() {
        _error = 'Sign in to start a support chat.';
        _loading = false;
      });
      return;
    }
    setState(() {
      _user = user;
      _loading = false;
    });
    _bindMessageListener();
    _setActive(true);
    try {
      await SupportChatService.ensureChatForUser(user);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '').trim();
        if (_error!.isEmpty) {
          _error = 'Support chat is unavailable right now.';
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _markReadOnce();
    _bindMessageListener();
  }

  Future<void> _markReadOnce() async {
    if (_markedRead) return;
    final bool isAdmin = AdminAccess.isAdmin();
    final String chatId = _resolveChatId(isAdmin);
    if (chatId.isEmpty) return;
    _markedRead = true;
    final User? user = _user ?? FirebaseAuth.instance.currentUser;
    if (!isAdmin && user != null) {
      await SupportChatService.ensureChatForUser(user);
    }
    await SupportChatService.markRead(chatId: chatId, isAdmin: isAdmin);
  }

  Future<void> _setActive(bool active) async {
    final bool isAdmin = AdminAccess.isAdmin();
    final String chatId = _resolveChatId(isAdmin);
    if (chatId.isEmpty) return;
    await SupportChatService.setActive(
      chatId: chatId,
      isAdmin: isAdmin,
      active: active,
    );
  }

  void _bindMessageListener() {
    if (_loading || _error != null) return;
    final bool isAdmin = AdminAccess.isAdmin();
    final String chatId = _resolveChatId(isAdmin);
    if (chatId.isEmpty) return;
    if (_listeningChatId == chatId) return;
    _listeningChatId = chatId;
    _messagesSub?.cancel();
    _messagesSub = SupportChatService.streamMessages(chatId).listen((messages) {
      if (messages.isEmpty) return;
      final SupportChatMessage last = messages.last;
      final bool sentByMe = isAdmin
          ? last.senderRole == 'admin'
          : last.senderRole == 'user';
      if (sentByMe) return;
      if (_lastSeenMessageId == last.id) return;
      _lastSeenMessageId = last.id;
      SupportChatService.markRead(chatId: chatId, isAdmin: isAdmin);
    });
  }

  String _resolveChatId(bool isAdmin) {
    final SupportChatThreadArgs? args =
        ModalRoute.of(context)?.settings.arguments as SupportChatThreadArgs?;
    if (isAdmin) return args?.chatId ?? '';
    if (args != null && args.chatId.trim().isNotEmpty) {
      return args.chatId;
    }
    final User? user = _user ?? FirebaseAuth.instance.currentUser;
    return user?.uid ?? '';
  }

  String _resolveTitle(bool isAdmin) {
    final SupportChatThreadArgs? args =
        ModalRoute.of(context)?.settings.arguments as SupportChatThreadArgs?;
    if (isAdmin) {
      final String name = (args?.userName ?? '').trim();
      return name.isEmpty ? 'User' : name;
    }
    final String adminName = (args?.adminName ?? '').trim();
    return adminName.isEmpty ? SupportChatService.adminName : adminName;
  }

  List<ChatMessage> _mapMessages(
    List<SupportChatMessage> messages,
    bool isAdminView,
    DateTime? lastReadByAdminAt,
    DateTime? lastReadByUserAt,
  ) {
    return messages.map((message) {
      final bool isBot = isAdminView
          ? message.senderRole != 'admin'
          : message.senderRole == 'admin';
      final String time = SupportChatService.formatMessageTime(
        message.createdAt,
      );
      final bool hasAttachments = message.attachments.isNotEmpty;
      final bool allImages =
          hasAttachments &&
          message.attachments.every((item) => item.type == 'image');
      bool? isRead;
      if (isAdminView && message.senderRole == 'admin') {
        isRead =
            lastReadByUserAt != null &&
            !message.createdAt.isAfter(lastReadByUserAt);
      } else if (!isAdminView && message.senderRole == 'user') {
        isRead =
            lastReadByAdminAt != null &&
            !message.createdAt.isAfter(lastReadByAdminAt);
      }
      if (message.type == 'images' || (message.type == 'text' && allImages)) {
        return ChatMessage.images(
          isBot: isBot,
          time: time,
          imagePaths: message.attachments
              .map((item) {
                if (item.url.isNotEmpty) return item.url;
                if (item.data.isNotEmpty) return 'base64:${item.data}';
                return '';
              })
              .where((value) => value.isNotEmpty)
              .toList(),
          isRead: isRead,
        );
      }
      if (message.type == 'files' ||
          (message.type == 'text' && hasAttachments)) {
        return ChatMessage.files(
          isBot: isBot,
          time: time,
          files: message.attachments
              .map(
                (item) => ChatFileAttachment(
                  name: item.name,
                  path: item.url.isNotEmpty ? item.url : '',
                  size: item.size,
                ),
              )
              .toList(),
          isRead: isRead,
        );
      }
      return ChatMessage.text(
        isBot: isBot,
        text: message.text,
        time: time,
        isRead: isRead,
      );
    }).toList();
  }

  Future<void> _sendText(String text) async {
    final User? user = _user ?? FirebaseAuth.instance.currentUser;
    if (user == null) return;
    final bool isAdmin = AdminAccess.isAdmin();
    final String chatId = _resolveChatId(isAdmin);
    if (chatId.isEmpty) return;
    final SupportChatThreadArgs? args =
        ModalRoute.of(context)?.settings.arguments as SupportChatThreadArgs?;
    await SupportChatService.sendText(
      chatId: chatId,
      user: user,
      isAdmin: isAdmin,
      text: text,
      adminId: isAdmin ? null : args?.adminId,
      adminName: isAdmin ? null : args?.adminName,
      adminEmail: isAdmin ? null : args?.adminEmail,
    );
  }

  Future<void> _sendAttachments(List<ChatPickedAttachment> attachments) async {
    final User? user = _user ?? FirebaseAuth.instance.currentUser;
    if (user == null || attachments.isEmpty) return;
    final bool isAdmin = AdminAccess.isAdmin();
    final String chatId = _resolveChatId(isAdmin);
    if (chatId.isEmpty) return;
    final SupportChatThreadArgs? args =
        ModalRoute.of(context)?.settings.arguments as SupportChatThreadArgs?;
    final List<SupportChatUpload> uploads = attachments
        .map(
          (item) => SupportChatUpload(
            file: item.file,
            name: item.name,
            size: item.size,
            isImage: item.isImage,
          ),
        )
        .toList();
    await SupportChatService.sendAttachments(
      chatId: chatId,
      user: user,
      isAdmin: isAdmin,
      attachments: uploads,
      adminId: isAdmin ? null : args?.adminId,
      adminName: isAdmin ? null : args?.adminName,
      adminEmail: isAdmin ? null : args?.adminEmail,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        body: Center(child: Text(_error!, textAlign: TextAlign.center)),
      );
    }
    final bool isAdmin = AdminAccess.isAdmin();
    final String chatId = _resolveChatId(isAdmin);
    if (chatId.isEmpty) {
      return Scaffold(
        body: Center(
          child: Text(
            'Sign in to start a support chat.',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
      );
    }

    return StreamBuilder<SupportChatSummary?>(
      stream: SupportChatService.streamChatSummary(chatId),
      builder: (context, snapshot) {
        final SupportChatSummary? summary = snapshot.data;
        final String resolvedUserName =
            (summary?.userName.trim().isNotEmpty ?? false)
            ? summary!.userName
            : 'User';
        final bool adminView = isAdmin;
        final SupportChatThreadArgs? args =
            ModalRoute.of(context)?.settings.arguments
                as SupportChatThreadArgs?;
        final String adminLabel = (args?.adminName ?? '').trim().isNotEmpty
            ? args!.adminName!.trim()
            : SupportChatService.adminName;
        final String assistantLabel = adminView ? resolvedUserName : adminLabel;
        final String userLabel = 'You';
        final String subtitle = adminView ? 'USER SUPPORT' : 'SUPPORT';
        final String avatarUrl = (args?.adminAvatarUrl ?? '').trim();
        return Theme(
          data: Theme.of(context).copyWith(brightness: Brightness.light),
          child: ChatThreadModernScreen(
            title: assistantLabel,
            subtitle: subtitle,
            showTabs: false,
            showBottomNav: false,
            showSearchAction: false,
            showMenuAction: false,
            showAttachmentButton: false,
            onBackTap: () {
              Navigator.of(context).maybePop().then((popped) {
                if (!popped && context.mounted) {
                  Navigator.of(
                    context,
                  ).pushReplacementNamed(AppRoutes.supportChats);
                }
              });
            },
            onCallTap: () => Navigator.of(context).pushNamed(
              AppRoutes.call,
              arguments: CallScreenArgs(name: _resolveTitle(isAdmin)),
            ),
            showAvatars: false,
            showLabels: false,
            assistantLabel: assistantLabel,
            userLabel: userLabel,
            assistantAvatar: adminView
                ? null
                : (avatarUrl.isNotEmpty
                      ? NetworkImage(avatarUrl)
                      : ((args?.adminEmail ?? '') ==
                                SupportChatService.adminEmail
                            ? const AssetImage(
                                SupportChatService.adminAvatarAsset,
                              )
                            : null)),
            userAvatarText: userLabel.characters.first,
            messagesStream: SupportChatService.streamMessages(chatId).map(
              (messages) => _mapMessages(
                messages,
                isAdmin,
                summary?.lastReadByAdminAt,
                summary?.lastReadByUserAt,
              ),
            ),
            onSendText: _sendText,
            onSendAttachments: _sendAttachments,
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _setActive(false);
    _messagesSub?.cancel();
    super.dispose();
  }
}

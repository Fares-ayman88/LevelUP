import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../widgets/main_bottom_nav.dart';
import 'chat_thread_screen.dart'
    show ChatMessage, ChatMessageType, ChatFileAttachment, ChatPickedAttachment;

const Color _chatBackground = Color(0xFFF2D8C6);
const Color _chatBackgroundBottom = Color(0xFFFFFFFF);
const Color _chatSurface = Color(0xFFFFFFFF);
const Color _chatTitle = Color(0xFF2A2B2F);
const Color _chatMuted = Color(0xFF9E9A93);
const Color _chatAccent = Color(0xFF151B26);
const Color _chatAccentGreen = Color(0xFF2FBF8B);
const Color _chatPresenceInactive = Color(0xFFBFC5CF);
const Color _chatUserBubble = Color(0xFFE6F2FF);
const Color _chatIncomingBubble = Color(0xFFFFFFFF);
const Color _chatInputBlue = _chatAccent;
const Color _chatBorder = Color(0xFFE7DDD3);
const double _chatBubbleRadius = 22;

class ChatThreadModernScreen extends StatefulWidget {
  const ChatThreadModernScreen({
    super.key,
    required this.title,
    this.subtitle,
    this.showTabs = false,
    this.tabLabels = const ['Indox', 'Mentor Chats'],
    this.selectedTabIndex = 0,
    this.onTabTap,
    this.messagesStream,
    this.onSendText,
    this.onSendAttachments,
    this.onSendComposed,
    this.emptyState,
    this.showAttachmentButton = true,
    this.headerBottom,
    this.drawer,
    this.sidePanel,
    this.sidePanelWidth = 260,
    this.showBottomNav = false,
    this.bottomNavIndex = 0,
    this.showCallAction = true,
    this.showSearchAction = true,
    this.showMenuAction = false,
    this.onCallTap,
    this.onBackTap,
    this.onSearchTap,
    this.onMenuTap,
    this.initialMessages,
    this.showAvatars = false,
    this.showLabels = false,
    this.assistantLabel = 'Assistant',
    this.userLabel = 'You',
    this.assistantAvatar,
    this.showAssistantPresence = true,
    this.assistantActive = true,
    this.userAvatarText,
    this.composerHint = 'Type a message...',
    this.focusRequestId = 0,
  });

  final String title;
  final String? subtitle;
  final bool showTabs;
  final List<String> tabLabels;
  final int selectedTabIndex;
  final ValueChanged<int>? onTabTap;
  final Stream<List<ChatMessage>>? messagesStream;
  final Future<void> Function(String text)? onSendText;
  final Future<void> Function(List<ChatPickedAttachment> attachments)?
  onSendAttachments;
  final Future<void> Function(
    String text,
    List<ChatPickedAttachment> attachments,
  )?
  onSendComposed;
  final Widget? emptyState;
  final bool showAttachmentButton;
  final Widget? headerBottom;
  final Widget? drawer;
  final Widget? sidePanel;
  final double sidePanelWidth;
  final bool showBottomNav;
  final int bottomNavIndex;
  final bool showCallAction;
  final bool showSearchAction;
  final bool showMenuAction;
  final VoidCallback? onCallTap;
  final VoidCallback? onSearchTap;
  final VoidCallback? onMenuTap;
  final VoidCallback? onBackTap;
  final List<ChatMessage>? initialMessages;
  final bool showAvatars;
  final bool showLabels;
  final String assistantLabel;
  final String userLabel;
  final ImageProvider? assistantAvatar;
  final bool showAssistantPresence;
  final bool assistantActive;
  final String? userAvatarText;
  final String composerHint;
  final int focusRequestId;

  @override
  State<ChatThreadModernScreen> createState() => _ChatThreadModernScreenState();
}

class _ChatThreadModernScreenState extends State<ChatThreadModernScreen>
    with SingleTickerProviderStateMixin {
  static const String _typingToken = '...';
  final TextEditingController _composerController = TextEditingController();
  final FocusNode _composerFocus = FocusNode();
  final ScrollController _scrollController = ScrollController();
  late final AnimationController _backgroundController;
  late List<ChatMessage> _messages;
  bool _hasText = false;
  bool _isSending = false;
  int _lastMessageCount = 0;
  bool _didInitialScroll = false;
  bool _autoScrollEnabled = true;
  String _lastStreamSignature = '';
  String _pendingAnchorSignature = '';
  List<ChatMessage> _pendingMessages = const [];
  int _lastFocusRequestId = 0;
  final List<ChatPickedAttachment> _draftAttachments = <ChatPickedAttachment>[];

  @override
  void initState() {
    super.initState();
    _lastFocusRequestId = widget.focusRequestId;
    _backgroundController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat(reverse: true);
    _messages = widget.messagesStream == null
        ? List<ChatMessage>.of(widget.initialMessages ?? _demoMessages)
        : <ChatMessage>[];
    _lastStreamSignature = _buildMessagesSignature(
      widget.initialMessages ?? const <ChatMessage>[],
    );
    _pendingAnchorSignature = _lastStreamSignature;
    _composerController.addListener(_handleComposerChanged);
    _scrollController.addListener(_handleScrollChanged);
    if (widget.focusRequestId > 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _composerFocus.requestFocus();
      });
    }
  }

  @override
  void didUpdateWidget(covariant ChatThreadModernScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusRequestId != _lastFocusRequestId) {
      _lastFocusRequestId = widget.focusRequestId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _composerFocus.requestFocus();
      });
    }
  }

  @override
  void dispose() {
    _backgroundController.dispose();
    _composerController.removeListener(_handleComposerChanged);
    _scrollController.removeListener(_handleScrollChanged);
    _composerController.dispose();
    _composerFocus.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleComposerChanged() {
    final bool next = _composerController.text.trim().isNotEmpty;
    if (next == _hasText) return;
    setState(() => _hasText = next);
  }

  void _handleScrollChanged() {
    if (!_scrollController.hasClients) return;
    final ScrollPosition position = _scrollController.position;
    final bool atBottom = position.pixels >= position.maxScrollExtent - 24;
    _autoScrollEnabled = atBottom;
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _sendText() {
    _handleSendText();
  }

  Future<void> _handleSendText() async {
    final String text = _composerController.text.trim();
    final List<ChatPickedAttachment> attachments =
        List<ChatPickedAttachment>.of(_draftAttachments);
    if (_isSending || (text.isEmpty && attachments.isEmpty)) return;
    _isSending = true;
    _composerController.clear();
    _composerFocus.requestFocus();
    setState(() {
      _draftAttachments.clear();
    });
    final String now = _formatTime(DateTime.now());
    final List<ChatMessage> userMessages = _buildUserMessages(
      text: text,
      attachments: attachments,
      time: now,
    );
    if (widget.messagesStream != null) {
      _pendingAnchorSignature = _lastStreamSignature;
      _pendingMessages = List<ChatMessage>.of(userMessages);
      setState(() {});
      _scheduleScrollToBottom(force: true);
    }
    bool textHandled = text.isEmpty;
    bool attachmentsHandled = attachments.isEmpty;
    try {
      if (widget.onSendComposed != null) {
        await widget.onSendComposed!(text, attachments);
        textHandled = true;
        attachmentsHandled = true;
      } else {
        if (!attachmentsHandled && widget.onSendAttachments != null) {
          await widget.onSendAttachments!(attachments);
          attachmentsHandled = true;
        }
        if (!textHandled && widget.onSendText != null) {
          await widget.onSendText!(text);
          textHandled = true;
        }
      }
      if (!textHandled || !attachmentsHandled) {
        final List<ChatMessage> fallback = _buildUserMessages(
          text: textHandled ? '' : text,
          attachments: attachmentsHandled ? const [] : attachments,
          time: now,
        );
        if (fallback.isNotEmpty) {
          setState(() => _messages.addAll(fallback));
        }
        _clearPendingMessages();
      }
      _scheduleScrollToBottom(force: true);
    } catch (error) {
      _clearPendingMessages();
      if (!mounted) return;
      final String message = error.toString().trim().replaceFirst(
        'Exception: ',
        '',
      );
      _showToast(message.isEmpty ? 'Send failed. Try again.' : message);
      return;
    } finally {
      _isSending = false;
    }
  }

  void _clearPendingMessages() {
    if (_pendingMessages.isEmpty) return;
    if (!mounted) return;
    setState(() {
      _pendingMessages = const [];
    });
  }

  List<ChatMessage> _buildUserMessages({
    required String text,
    required List<ChatPickedAttachment> attachments,
    required String time,
  }) {
    final List<ChatMessage> result = <ChatMessage>[];
    final String trimmed = text.trim();
    if (trimmed.isNotEmpty) {
      result.add(ChatMessage.text(isBot: false, text: trimmed, time: time));
    }
    final List<String> imagePaths = attachments
        .where((item) => item.isImage)
        .map((item) => item.file.path)
        .toList();
    if (imagePaths.isNotEmpty) {
      result.add(
        ChatMessage.images(isBot: false, time: time, imagePaths: imagePaths),
      );
    }
    final List<ChatFileAttachment> files = attachments
        .where((item) => !item.isImage)
        .map(
          (item) => ChatFileAttachment(
            name: item.name,
            path: item.file.path,
            size: item.size,
          ),
        )
        .toList();
    if (files.isNotEmpty) {
      result.add(ChatMessage.files(isBot: false, time: time, files: files));
    }
    return result;
  }

  String _buildMessagesSignature(List<ChatMessage> messages) {
    if (messages.isEmpty) return '0:0';
    final Iterable<int> hashes = messages.map((message) {
      switch (message.type) {
        case ChatMessageType.text:
          return Object.hash(
            message.type.index,
            message.isBot,
            message.time,
            (message.text ?? '').trim(),
          );
        case ChatMessageType.images:
          return Object.hash(
            message.type.index,
            message.isBot,
            message.time,
            Object.hashAll(message.imagePaths),
          );
        case ChatMessageType.files:
          return Object.hash(
            message.type.index,
            message.isBot,
            message.time,
            Object.hashAll(
              message.files.map(
                (file) => Object.hash(file.name, file.path, file.size),
              ),
            ),
          );
        case ChatMessageType.rating:
          return Object.hash(
            message.type.index,
            message.isBot,
            message.time,
            message.rating ?? 0,
            (message.text ?? '').trim(),
          );
      }
    });
    final int digest = Object.hashAll(hashes);
    return '${messages.length}:$digest';
  }

  void _queueDraftAttachments(List<ChatPickedAttachment> attachments) {
    if (attachments.isEmpty) return;
    setState(() {
      _draftAttachments.addAll(attachments);
    });
    _composerFocus.requestFocus();
  }

  void _removeDraftAttachmentAt(int index) {
    if (index < 0 || index >= _draftAttachments.length) return;
    setState(() {
      _draftAttachments.removeAt(index);
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? file = await ImagePicker().pickImage(
        source: source,
        imageQuality: 85,
      );
      if (!mounted) return;
      Navigator.of(context).maybePop();
      if (file == null) return;
      final File resolved = File(file.path);
      final int size = await resolved.length();
      _queueDraftAttachments([
        ChatPickedAttachment(
          file: resolved,
          name: file.name,
          size: size,
          isImage: true,
        ),
      ]);
    } catch (error) {
      if (!mounted) return;
      Navigator.of(context).maybePop();
      _showToast('Attachment failed. Try again.');
    }
  }

  Future<void> _pickFiles() async {
    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        withData: false,
      );
      if (!mounted) return;
      Navigator.of(context).maybePop();
      if (result == null || result.files.isEmpty) return;
      final List<ChatPickedAttachment> attachments = [];
      for (final PlatformFile item in result.files) {
        final String? path = item.path;
        if (path == null) continue;
        attachments.add(
          ChatPickedAttachment(
            file: File(path),
            name: item.name,
            size: item.size,
            isImage: false,
          ),
        );
      }
      if (attachments.isEmpty) return;
      _queueDraftAttachments(attachments);
    } catch (_) {
      if (!mounted) return;
      Navigator.of(context).maybePop();
      _showToast('Attachment failed. Try again.');
    }
  }

  void _showAttachmentSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _AttachmentOption(
                  icon: Icons.photo_camera,
                  label: 'Camera',
                  onTap: () {
                    _pickImage(ImageSource.camera);
                  },
                ),
                _AttachmentOption(
                  icon: Icons.photo_library,
                  label: 'Gallery',
                  onTap: () {
                    _pickImage(ImageSource.gallery);
                  },
                ),
                _AttachmentOption(
                  icon: Icons.attach_file,
                  label: 'Files',
                  onTap: () {
                    _pickFiles();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _scheduleScrollToBottom({bool jump = false, bool force = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      if (!force && !_autoScrollEnabled) return;
      final double target = _scrollController.position.maxScrollExtent;
      if (jump) {
        _scrollController.jumpTo(target);
      } else {
        _scrollController.animateTo(
          target,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Widget _buildMessagesList(List<ChatMessage> messages) {
    if (messages.length != _lastMessageCount) {
      _lastMessageCount = messages.length;
      if (messages.isNotEmpty) {
        final bool initial = !_didInitialScroll;
        _didInitialScroll = true;
        _scheduleScrollToBottom(jump: initial);
      }
    }
    if (messages.isEmpty) {
      final Widget? emptyState = widget.emptyState;
      if (emptyState != null) return emptyState;
      return Center(
        child: Text(
          'No messages yet',
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: _chatMuted,
          ),
        ),
      );
    }
    return ListView.separated(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 12),
      physics: const BouncingScrollPhysics(),
      itemCount: messages.length,
      separatorBuilder: (_, __) => const SizedBox(height: 18),
      itemBuilder: (context, index) {
        final ChatMessage message = messages[index];
        switch (message.type) {
          case ChatMessageType.text:
            final bool isTyping =
                message.isBot && (message.text ?? '').trim() == _typingToken;
            return _MessageBubble(
              isBot: message.isBot,
              label: widget.showLabels
                  ? (message.isBot ? widget.assistantLabel : widget.userLabel)
                  : null,
              showAvatar: widget.showAvatars,
              avatarImage: message.isBot ? widget.assistantAvatar : null,
              avatarText: message.isBot
                  ? null
                  : (widget.userAvatarText?.trim().isNotEmpty == true
                        ? widget.userAvatarText
                        : widget.userLabel.characters.first),
              child: isTyping
                  ? const _TypingDots()
                  : _BubbleText(message.text ?? '', color: _chatTitle),
            );
          case ChatMessageType.images:
            return _ImageBubble(
              isBot: message.isBot,
              imagePaths: message.imagePaths,
              label: widget.showLabels
                  ? (message.isBot ? widget.assistantLabel : widget.userLabel)
                  : null,
              showAvatar: widget.showAvatars,
              avatarImage: message.isBot ? widget.assistantAvatar : null,
              avatarText: message.isBot
                  ? null
                  : (widget.userAvatarText?.trim().isNotEmpty == true
                        ? widget.userAvatarText
                        : widget.userLabel.characters.first),
            );
          case ChatMessageType.files:
            return _FileBubble(
              isBot: message.isBot,
              files: message.files,
              label: widget.showLabels
                  ? (message.isBot ? widget.assistantLabel : widget.userLabel)
                  : null,
              showAvatar: widget.showAvatars,
              avatarImage: message.isBot ? widget.assistantAvatar : null,
              avatarText: message.isBot
                  ? null
                  : (widget.userAvatarText?.trim().isNotEmpty == true
                        ? widget.userAvatarText
                        : widget.userLabel.characters.first),
            );
          case ChatMessageType.rating:
            return _RatingBubble(
              isBot: message.isBot,
              text: message.text ?? '',
              rating: message.rating ?? 4,
              label: widget.showLabels
                  ? (message.isBot ? widget.assistantLabel : widget.userLabel)
                  : null,
              showAvatar: widget.showAvatars,
              avatarImage: message.isBot ? widget.assistantAvatar : null,
              avatarText: message.isBot
                  ? null
                  : (widget.userAvatarText?.trim().isNotEmpty == true
                        ? widget.userAvatarText
                        : widget.userLabel.characters.first),
            );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final List<String> tabLabels = widget.tabLabels.isNotEmpty
        ? widget.tabLabels
        : const ['Indox', 'Mentor Chats'];
    final int activeTab =
        widget.selectedTabIndex >= 0 &&
            widget.selectedTabIndex < tabLabels.length
        ? widget.selectedTabIndex
        : 0;
    return Scaffold(
      backgroundColor: _chatBackground,
      drawer: widget.drawer,
      drawerEnableOpenDragGesture: widget.drawer != null,
      bottomNavigationBar: widget.showBottomNav
          ? MainBottomNav(currentIndex: widget.bottomNavIndex)
          : null,
      body: AnimatedBuilder(
        animation: _backgroundController,
        builder: (context, child) {
          final double wave = math.sin(
            _backgroundController.value * math.pi * 2,
          );
          final double shift = wave * 0.08;
          final double tint = 0.5 + 0.5 * wave;
          final Alignment begin = Alignment(0, -1 + shift);
          final Alignment end = Alignment(0, 1 - shift);
          final Color topColor =
              Color.lerp(_chatBackground, const Color(0xFFF6C8AE), tint) ??
              _chatBackground;
          final Color bottomColor =
              Color.lerp(
                _chatBackgroundBottom,
                const Color(0xFFFFF6EE),
                tint,
              ) ??
              _chatBackgroundBottom;
          return Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: begin,
                end: end,
                colors: [topColor, bottomColor],
              ),
            ),
            child: child,
          );
        },
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final bool showSidePanel =
                  widget.sidePanel != null && constraints.maxWidth >= 900;
              final double sideWidth = showSidePanel
                  ? widget.sidePanelWidth
                  : 0;
              final double availableWidth = constraints.maxWidth - sideWidth;
              final double maxContentWidth = math.min(availableWidth, 420);
              final double horizontalPadding = math.max(
                20,
                (availableWidth - maxContentWidth) / 2,
              );

              final Widget chatColumn = SizedBox(
                width: availableWidth,
                child: Column(
                  children: [
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        18,
                        horizontalPadding,
                        8,
                      ),
                      child: _HeaderRow(
                        title: widget.title,
                        subtitle: widget.subtitle,
                        avatarImage: widget.assistantAvatar,
                        showAssistantPresence: widget.showAssistantPresence,
                        assistantActive: widget.assistantActive,
                        avatarText: widget.assistantLabel,
                        showCall: widget.showCallAction,
                        showSearch: widget.showSearchAction,
                        showMenu: widget.showMenuAction,
                        onCallTap: widget.onCallTap,
                        onSearchTap: widget.onSearchTap,
                        onMenuTap: widget.onMenuTap,
                        onBackTap: widget.onBackTap,
                      ),
                    ),
                    if (widget.showTabs)
                      Padding(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          6,
                          horizontalPadding,
                          12,
                        ),
                        child: _TopTabs(
                          labels: tabLabels,
                          selectedIndex: activeTab,
                          onTap: widget.onTabTap,
                        ),
                      ),
                    if (widget.headerBottom != null)
                      Padding(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          0,
                          horizontalPadding,
                          8,
                        ),
                        child: widget.headerBottom!,
                      ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12, top: 6),
                      child: Text(
                        'TODAY',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _chatMuted,
                          letterSpacing: 2.2,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          0,
                          horizontalPadding,
                          0,
                        ),
                        child: widget.messagesStream == null
                            ? _buildMessagesList(_messages)
                            : StreamBuilder<List<ChatMessage>>(
                                stream: widget.messagesStream,
                                initialData: widget.initialMessages ?? const [],
                                builder: (context, snapshot) {
                                  final List<ChatMessage> messages =
                                      snapshot.data ?? const [];
                                  final String signature =
                                      _buildMessagesSignature(messages);
                                  _lastStreamSignature = signature;
                                  final bool streamHasChanged =
                                      _pendingMessages.isNotEmpty &&
                                      signature != _pendingAnchorSignature;
                                  if (streamHasChanged) {
                                    WidgetsBinding.instance
                                        .addPostFrameCallback(
                                          (_) => _clearPendingMessages(),
                                        );
                                  }
                                  final List<ChatMessage> effectiveMessages =
                                      streamHasChanged ||
                                          _pendingMessages.isEmpty
                                      ? messages
                                      : <ChatMessage>[
                                          ...messages,
                                          ..._pendingMessages,
                                        ];
                                  return _buildMessagesList(effectiveMessages);
                                },
                              ),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        8,
                        horizontalPadding,
                        16,
                      ),
                      child: _Composer(
                        controller: _composerController,
                        focusNode: _composerFocus,
                        hintColor: _chatMuted,
                        accent: _chatInputBlue,
                        hasText: _hasText,
                        hasAttachments: _draftAttachments.isNotEmpty,
                        draftAttachments: _draftAttachments,
                        hintText: widget.composerHint,
                        onSend: _sendText,
                        onAttachmentTap: _showAttachmentSheet,
                        onRemoveAttachment: _removeDraftAttachmentAt,
                        showAttachmentButton: widget.showAttachmentButton,
                      ),
                    ),
                  ],
                ),
              );

              if (!showSidePanel) return chatColumn;
              return Row(
                children: [
                  SizedBox(width: sideWidth, child: widget.sidePanel),
                  Expanded(child: chatColumn),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({
    required this.title,
    this.subtitle,
    this.avatarImage,
    this.showAssistantPresence = true,
    this.assistantActive = true,
    this.avatarText,
    required this.showCall,
    required this.showSearch,
    required this.showMenu,
    this.onCallTap,
    this.onSearchTap,
    this.onMenuTap,
    this.onBackTap,
  });

  final String title;
  final String? subtitle;
  final ImageProvider? avatarImage;
  final bool showAssistantPresence;
  final bool assistantActive;
  final String? avatarText;
  final bool showCall;
  final bool showSearch;
  final bool showMenu;
  final VoidCallback? onCallTap;
  final VoidCallback? onSearchTap;
  final VoidCallback? onMenuTap;
  final VoidCallback? onBackTap;

  @override
  Widget build(BuildContext context) {
    final String? subtitleText = subtitle == null || subtitle!.trim().isEmpty
        ? null
        : subtitle!.trim();
    final String resolvedAvatarText = (avatarText ?? title).trim();
    final String initial = resolvedAvatarText.isEmpty
        ? 'A'
        : resolvedAvatarText.characters.first;
    final VoidCallback? videoTap = onSearchTap ?? onCallTap;
    final VoidCallback handleBack =
        onBackTap ?? () => Navigator.of(context).maybePop();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _chatSurface,
        borderRadius: BorderRadius.circular(36),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: handleBack,
            child: const SizedBox(
              width: 32,
              height: 32,
              child: Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 18,
                color: _chatTitle,
              ),
            ),
          ),
          const SizedBox(width: 6),
          Stack(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: const Color(0xFF7AA39A),
                backgroundImage: avatarImage,
                child: avatarImage == null
                    ? Text(
                        initial,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _chatTitle,
                        ),
                      )
                    : null,
              ),
              if (showAssistantPresence)
                Positioned(
                  right: 2,
                  bottom: 2,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: assistantActive
                          ? _chatAccentGreen
                          : _chatPresenceInactive,
                      shape: BoxShape.circle,
                      border: Border.all(color: _chatSurface, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: _chatTitle,
                  ),
                ),
                if (subtitleText != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitleText.toUpperCase(),
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: _chatMuted,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (showCall)
            _HeaderIconButton(icon: Icons.call_rounded, onTap: onCallTap),
          if (showCall)
            _HeaderIconButton(icon: Icons.videocam_rounded, onTap: videoTap),
          if (showSearch)
            _HeaderIconButton(icon: Icons.search, onTap: onSearchTap),
          if (showMenu)
            _HeaderIconButton(icon: Icons.more_horiz, onTap: onMenuTap),
        ],
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
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.only(left: 12),
        child: Icon(icon, size: 20, color: _chatTitle),
      ),
    );
  }
}

class _TopTabs extends StatelessWidget {
  const _TopTabs({
    required this.labels,
    required this.selectedIndex,
    this.onTap,
  });

  final List<String> labels;
  final int selectedIndex;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final List<Widget> children = [];
    for (int index = 0; index < labels.length; index++) {
      children.add(
        Expanded(
          child: _TopTabButton(
            label: labels[index],
            selected: index == selectedIndex,
            onTap: onTap == null ? null : () => onTap!(index),
          ),
        ),
      );
      if (index != labels.length - 1) {
        children.add(const SizedBox(width: 12));
      }
    }
    return Row(children: children);
  }
}

class _TopTabButton extends StatelessWidget {
  const _TopTabButton({
    required this.label,
    required this.selected,
    this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? _chatAccent : const Color(0xFFF7EEE6),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: selected ? _chatAccent : _chatBorder),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: _chatAccent.withValues(alpha: 0.25),
                    blurRadius: 14,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
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
            color: selected ? Colors.white : _chatTitle,
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.isBot,
    required this.child,
    this.label,
    this.showAvatar = false,
    this.avatarImage,
    this.avatarText,
  });

  final bool isBot;
  final Widget child;
  final String? label;
  final bool showAvatar;
  final ImageProvider? avatarImage;
  final String? avatarText;

  @override
  Widget build(BuildContext context) {
    final BorderRadius borderRadius = BorderRadius.only(
      topLeft: const Radius.circular(_chatBubbleRadius),
      topRight: const Radius.circular(_chatBubbleRadius),
      bottomLeft: Radius.circular(isBot ? 10 : _chatBubbleRadius),
      bottomRight: Radius.circular(isBot ? _chatBubbleRadius : 10),
    );
    final Widget bubble = ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 260),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: isBot ? _chatIncomingBubble : _chatUserBubble,
          borderRadius: borderRadius,
          border: Border.all(color: Colors.transparent),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 14,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: child,
      ),
    );

    final Widget avatar = CircleAvatar(
      radius: 18,
      backgroundColor: const Color(0xFFE9ECF7),
      backgroundImage: avatarImage,
      child: avatarImage == null
          ? Text(
              (avatarText ?? '').trim().isEmpty
                  ? (isBot ? 'A' : 'Y')
                  : avatarText!.trim().substring(0, 1),
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _chatTitle,
              ),
            )
          : null,
    );

    final Widget content = Column(
      crossAxisAlignment: isBot
          ? CrossAxisAlignment.start
          : CrossAxisAlignment.end,
      children: [
        if (label != null) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              label!,
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _chatMuted,
              ),
            ),
          ),
        ],
        Row(
          mainAxisAlignment: isBot
              ? MainAxisAlignment.start
              : MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (showAvatar && isBot) ...[avatar, const SizedBox(width: 10)],
            bubble,
            if (showAvatar && !isBot) ...[const SizedBox(width: 10), avatar],
          ],
        ),
      ],
    );

    return Align(
      alignment: isBot ? Alignment.centerLeft : Alignment.centerRight,
      child: content,
    );
  }
}

class _BubbleText extends StatelessWidget {
  const _BubbleText(this.text, {this.color = _chatTitle});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.poppins(
        fontSize: 14.5,
        fontWeight: FontWeight.w500,
        color: color,
        height: 1.45,
      ),
    );
  }
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final List<Widget> dots = [];
        for (int index = 0; index < 3; index++) {
          final double phase = (_controller.value + index * 0.22) % 1;
          final double wave = (math.sin(phase * math.pi * 2) + 1) / 2;
          final double scale = 0.6 + wave * 0.6;
          final double opacity = 0.35 + wave * 0.65;
          dots.add(
            Opacity(
              opacity: opacity,
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: _chatMuted,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
          );
          if (index != 2) {
            dots.add(const SizedBox(width: 4));
          }
        }
        return Row(mainAxisSize: MainAxisSize.min, children: dots);
      },
    );
  }
}

class _ImageBubble extends StatelessWidget {
  const _ImageBubble({
    required this.isBot,
    required this.imagePaths,
    this.label,
    this.showAvatar = false,
    this.avatarImage,
    this.avatarText,
  });

  final bool isBot;
  final List<String> imagePaths;
  final String? label;
  final bool showAvatar;
  final ImageProvider? avatarImage;
  final String? avatarText;

  @override
  Widget build(BuildContext context) {
    final List<String> displayPaths = imagePaths
        .take(2)
        .toList(growable: false);
    return _MessageBubble(
      isBot: isBot,
      label: label,
      showAvatar: showAvatar,
      avatarImage: avatarImage,
      avatarText: avatarText,
      child: Row(
        children: displayPaths.isEmpty
            ? const [_ImageThumb(), SizedBox(width: 10), _ImageThumb()]
            : displayPaths
                  .asMap()
                  .entries
                  .map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(right: 10),
                      child: _ImageThumb(
                        imagePath: entry.value,
                        heroTag: _imageHeroTag(entry.value, entry.key),
                        onTap: () => _openImageViewer(
                          context,
                          entry.value,
                          _imageHeroTag(entry.value, entry.key),
                        ),
                      ),
                    ),
                  )
                  .toList(),
      ),
    );
  }
}

class _ImageThumb extends StatelessWidget {
  const _ImageThumb({this.imagePath, this.onTap, this.heroTag});

  final String? imagePath;
  final VoidCallback? onTap;
  final String? heroTag;

  @override
  Widget build(BuildContext context) {
    final Widget content;
    if (imagePath == null) {
      content = const SizedBox.expand();
    } else {
      final String path = imagePath!;
      final bool isBase64 = path.startsWith('base64:');
      final bool isNetwork =
          path.startsWith('http://') || path.startsWith('https://');
      Widget image = isBase64
          ? Image.memory(
              base64Decode(path.substring(7)),
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return const Center(child: Icon(Icons.broken_image));
              },
            )
          : isNetwork
          ? Image.network(
              path,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return const Center(child: Icon(Icons.broken_image));
              },
            )
          : Image.file(
              File(path),
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return const Center(child: Icon(Icons.broken_image));
              },
            );
      if (heroTag != null && heroTag!.isNotEmpty) {
        image = Hero(tag: heroTag!, child: image);
      }
      content = ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: image,
      );
    }
    return GestureDetector(
      onTap: imagePath == null ? null : onTap,
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: _chatSurface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _chatBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: content,
      ),
    );
  }
}

class _FileBubble extends StatelessWidget {
  const _FileBubble({
    required this.isBot,
    required this.files,
    this.label,
    this.showAvatar = false,
    this.avatarImage,
    this.avatarText,
  });

  final bool isBot;
  final List<ChatFileAttachment> files;
  final String? label;
  final bool showAvatar;
  final ImageProvider? avatarImage;
  final String? avatarText;

  @override
  Widget build(BuildContext context) {
    return _MessageBubble(
      isBot: isBot,
      label: label,
      showAvatar: showAvatar,
      avatarImage: avatarImage,
      avatarText: avatarText,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: files
            .map(
              (file) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _FileItem(file: file),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _FileItem extends StatelessWidget {
  const _FileItem({required this.file});

  final ChatFileAttachment file;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _chatSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _chatBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.insert_drive_file, size: 18, color: _chatTitle),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  file.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: _chatTitle,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatFileSize(file.size),
                  style: GoogleFonts.poppins(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _chatMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RatingBubble extends StatelessWidget {
  const _RatingBubble({
    required this.isBot,
    required this.text,
    required this.rating,
    this.label,
    this.showAvatar = false,
    this.avatarImage,
    this.avatarText,
  });

  final bool isBot;
  final String text;
  final int rating;
  final String? label;
  final bool showAvatar;
  final ImageProvider? avatarImage;
  final String? avatarText;

  @override
  Widget build(BuildContext context) {
    return _MessageBubble(
      isBot: isBot,
      label: label,
      showAvatar: showAvatar,
      avatarImage: avatarImage,
      avatarText: avatarText,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text,
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _chatTitle,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: List.generate(
              5,
              (index) => Icon(
                Icons.star,
                size: 16,
                color: index < rating
                    ? const Color(0xFFF4B400)
                    : const Color(0xFFD4D7E5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.hintColor,
    required this.accent,
    required this.hasText,
    required this.hasAttachments,
    required this.draftAttachments,
    required this.hintText,
    required this.onSend,
    required this.onAttachmentTap,
    required this.onRemoveAttachment,
    required this.showAttachmentButton,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final Color hintColor;
  final Color accent;
  final bool hasText;
  final bool hasAttachments;
  final List<ChatPickedAttachment> draftAttachments;
  final String hintText;
  final VoidCallback onSend;
  final VoidCallback onAttachmentTap;
  final ValueChanged<int> onRemoveAttachment;
  final bool showAttachmentButton;

  @override
  Widget build(BuildContext context) {
    final bool canSend = hasText || hasAttachments;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _chatSurface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: Colors.transparent),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (draftAttachments.isNotEmpty) ...[
            SizedBox(
              height: 66,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: draftAttachments.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final ChatPickedAttachment item = draftAttachments[index];
                  final Widget tile = item.isImage
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(
                            item.file,
                            width: 56,
                            height: 56,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) {
                              return Container(
                                width: 56,
                                height: 56,
                                color: const Color(0xFFF3EBE3),
                                child: const Icon(Icons.broken_image, size: 20),
                              );
                            },
                          ),
                        )
                      : Container(
                          constraints: const BoxConstraints(
                            minWidth: 120,
                            maxWidth: 180,
                            minHeight: 56,
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7EEE6),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: _chatBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.insert_drive_file_rounded,
                                size: 18,
                                color: _chatMuted,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: _chatTitle,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      tile,
                      Positioned(
                        top: -6,
                        right: -6,
                        child: GestureDetector(
                          onTap: () => onRemoveAttachment(index),
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: _chatTitle,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 1),
                            ),
                            child: const Icon(
                              Icons.close_rounded,
                              size: 14,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 10),
          ],
          Row(
            children: [
              if (showAttachmentButton) ...[
                GestureDetector(
                  onTap: onAttachmentTap,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3EBE3),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.add, color: _chatMuted, size: 18),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) {
                    if (canSend) onSend();
                  },
                  decoration: InputDecoration(
                    hintText: hintText,
                    hintStyle: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: hintColor.withValues(alpha: 0.8),
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: _chatTitle,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: canSend ? onSend : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: canSend ? accent : const Color(0xFFDAD2C9),
                    shape: BoxShape.circle,
                    boxShadow: canSend
                        ? [
                            BoxShadow(
                              color: accent.withValues(alpha: 0.22),
                              blurRadius: 14,
                              offset: const Offset(0, 8),
                            ),
                          ]
                        : null,
                  ),
                  child: Icon(
                    Icons.arrow_forward_rounded,
                    color: canSend ? Colors.white : const Color(0xFFAAA39A),
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AttachmentOption extends StatelessWidget {
  const _AttachmentOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: _chatTitle),
      title: Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: _chatTitle,
        ),
      ),
      onTap: onTap,
    );
  }
}

String _imageHeroTag(String path, int index) {
  return 'chat_image_${path.hashCode}_$index';
}

void _openImageViewer(BuildContext context, String imagePath, String heroTag) {
  Navigator.of(context).push(
    PageRouteBuilder(
      opaque: false,
      pageBuilder: (context, animation, secondaryAnimation) {
        return FadeTransition(
          opacity: animation,
          child: _ImageViewerPage(imagePath: imagePath, heroTag: heroTag),
        );
      },
    ),
  );
}

class _ImageViewerPage extends StatelessWidget {
  const _ImageViewerPage({required this.imagePath, required this.heroTag});

  final String imagePath;
  final String heroTag;

  @override
  Widget build(BuildContext context) {
    final bool isBase64 = imagePath.startsWith('base64:');
    final bool isNetwork =
        imagePath.startsWith('http://') || imagePath.startsWith('https://');
    final Widget image = isBase64
        ? Image.memory(
            base64Decode(imagePath.substring(7)),
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return const Center(child: Icon(Icons.broken_image));
            },
          )
        : isNetwork
        ? Image.network(
            imagePath,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return const Center(child: Icon(Icons.broken_image));
            },
          )
        : Image.file(
            File(imagePath),
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return const Center(child: Icon(Icons.broken_image));
            },
          );

    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: 0.96),
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: Hero(
                tag: heroTag,
                child: InteractiveViewer(
                  minScale: 1,
                  maxScale: 4,
                  child: image,
                ),
              ),
            ),
            Positioned(
              top: 12,
              left: 12,
              child: GestureDetector(
                onTap: () => Navigator.of(context).maybePop(),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.55),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatTime(DateTime time) {
  final String hour = time.hour.toString().padLeft(2, '0');
  final String minute = time.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

String _formatFileSize(int bytes) {
  if (bytes <= 0) return '0 B';
  const List<String> units = ['B', 'KB', 'MB', 'GB'];
  double size = bytes.toDouble();
  int unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return '${size.toStringAsFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}';
}

final List<ChatMessage> _demoMessages = [
  ChatMessage.text(
    isBot: true,
    text: 'Hi, Nicholas Good Evening',
    time: '10:45',
  ),
  ChatMessage.text(
    isBot: true,
    text: 'How was your UI/UX Design Course Like.?',
    time: '12:45',
  ),
  ChatMessage.text(isBot: false, text: 'Hi, Morning too Ronald', time: '15:29'),
  ChatMessage.images(isBot: false, time: '15:52'),
  ChatMessage.rating(
    isBot: false,
    text: 'Hello, i also just finished the Sketch Basic',
    rating: 4,
    time: '15:29',
  ),
  ChatMessage.text(isBot: true, text: 'OMG, This is Amazing..', time: '13:59'),
];

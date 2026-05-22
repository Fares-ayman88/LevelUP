import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/admin_access.dart';
import '../app_state/support_chat.dart';
import '../routes.dart';
import '../widgets/main_bottom_nav.dart';
import 'support_chat_thread_screen.dart';

const Color _supportBackground = Color(0xFFFFFFFF);
const Color _supportSurface = Color(0xFFFFFFFF);
const Color _supportTitle = Color(0xFF202244);
const Color _supportMuted = Color(0xFF7D8190);
const Color _supportAccent = Color(0xFF4C5EF5);
const Color _supportActiveDot = Color(0xFF28C88A);
const Color _supportCard = Color(0xFFFFFFFF);
const Color _supportDivider = Color(0xFFE3E8F3);

bool _supportIsDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;
Color _supportBackgroundColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFF000000) : _supportBackground;
Color _supportSurfaceColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFF121212) : _supportSurface;
Color _supportTitleColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFFF3F3F3) : _supportTitle;
Color _supportMutedColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFFB7B7B7) : _supportMuted;
Color _supportCardColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFF141414) : _supportCard;
Color _supportDividerColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFF2E2E2E) : _supportDivider;
Color _supportAvatarBgColor(BuildContext context) =>
    _supportIsDark(context) ? const Color(0xFF202020) : const Color(0xFFE9ECF7);

class SupportChatsScreen extends StatefulWidget {
  const SupportChatsScreen({super.key});

  @override
  State<SupportChatsScreen> createState() => _SupportChatsScreenState();
}

class _SupportChatsScreenState extends State<SupportChatsScreen> {
  static const List<String> _preferredAdminAliases = [
    'sa3doon',
    'fares',
    'mahmoud',
  ];

  User? _user;
  String? _error;
  List<SupportAdmin> _cachedAdmins = <SupportAdmin>[];

  @override
  void initState() {
    super.initState();
    _ensureChat();
  }

  Future<void> _ensureChat() async {
    if (AdminAccess.isAdmin()) {
      _user = FirebaseAuth.instance.currentUser;
      return;
    }
    final User? user = await SupportChatService.ensureSignedIn();
    if (!mounted) return;
    if (user == null) {
      setState(() => _error = 'Sign in to start a support chat');
      return;
    }
    setState(() => _user = user);
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

  List<SupportAdmin> _resolveAdmins(List<SupportAdmin>? latest) {
    List<SupportAdmin> base;
    if (latest != null && latest.isNotEmpty) {
      _cachedAdmins = latest;
      base = latest;
    } else if (_cachedAdmins.isNotEmpty) {
      base = _cachedAdmins;
    } else {
      base = _fallbackAdmins();
      _cachedAdmins = base;
    }
    return _buildPreferredAdmins(base);
  }

  List<SupportAdmin> _fallbackAdmins() {
    return const [
      SupportAdmin(
        id: 'sa3doon',
        name: 'Sa3doon',
        email: 'sa3doon@levelup.admin',
        status: 'active',
        approved: true,
      ),
      SupportAdmin(
        id: 'fares',
        name: 'Fares',
        email: 'fares@levelup.admin',
        status: 'active',
        approved: true,
      ),
      SupportAdmin(
        id: 'mahmoud',
        name: 'Mahmoud',
        email: 'mahmoud@levelup.admin',
        status: 'active',
        approved: true,
      ),
    ];
  }

  List<SupportAdmin> _buildPreferredAdmins(List<SupportAdmin> base) {
    final List<SupportAdmin> fallback = _fallbackAdmins();
    final List<SupportAdmin> searchSpace = [...base, ...fallback];
    final List<SupportAdmin> ordered = [];
    for (final String alias in _preferredAdminAliases) {
      final SupportAdmin? match = _findAdminForAlias(searchSpace, alias);
      if (match != null && !_containsAdmin(ordered, match)) {
        ordered.add(match);
      }
    }
    return ordered.isNotEmpty ? ordered : base;
  }

  SupportAdmin? _findAdminForAlias(List<SupportAdmin> admins, String alias) {
    for (final SupportAdmin admin in admins) {
      if (_adminMatchesAlias(admin, alias)) {
        return admin;
      }
    }
    return null;
  }

  bool _adminMatchesAlias(SupportAdmin admin, String alias) {
    final String normalized = alias.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    final String email = admin.email.trim().toLowerCase();
    if (email.isNotEmpty) {
      final int at = email.indexOf('@');
      final String emailAlias = at == -1 ? email : email.substring(0, at);
      if (emailAlias == normalized) return true;
    }
    final String name = admin.name.trim().toLowerCase();
    if (name == normalized || name.contains(normalized)) return true;
    final String id = admin.id.trim().toLowerCase();
    if (id == normalized) return true;
    return false;
  }

  bool _containsAdmin(List<SupportAdmin> admins, SupportAdmin candidate) {
    final String email = candidate.email.trim().toLowerCase();
    return admins.any((admin) {
      if (admin.id == candidate.id) return true;
      if (email.isEmpty) return false;
      return admin.email.trim().toLowerCase() == email;
    });
  }

  List<Widget> _buildAdminSection({
    required List<SupportAdmin> admins,
    required List<SupportChatSummary> chats,
    required String chatId,
    bool enableTap = true,
  }) {
    final List<Widget> widgets = [
      Text(
        'Admin Team',
        style: GoogleFonts.poppins(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: _supportTitleColor(context),
        ),
      ),
      const SizedBox(height: 12),
    ];
    if (admins.isEmpty) {
      widgets.add(
        Text(
          'No admin accounts yet',
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: _supportMutedColor(context),
          ),
        ),
      );
      return widgets;
    }
    final Map<String, SupportChatSummary> byAdminId = {};
    final Map<String, SupportChatSummary> byAdminEmail = {};
    final Map<String, SupportChatSummary> byAdminName = {};
    for (final SupportChatSummary summary in chats) {
      final String adminId = summary.adminId.trim();
      if (adminId.isNotEmpty) {
        byAdminId[adminId] = summary;
      }
      final String adminEmail = summary.adminEmail.trim().toLowerCase();
      if (adminEmail.isNotEmpty) {
        byAdminEmail[adminEmail] = summary;
      }
      final String adminName = summary.adminName.trim().toLowerCase();
      if (adminName.isNotEmpty) {
        byAdminName[adminName] = summary;
      }
    }

    widgets.addAll(
      admins.map((admin) {
        final String emailKey = admin.email.trim().toLowerCase();
        SupportChatSummary? summary =
            byAdminId[admin.id] ??
            (emailKey.isEmpty ? null : byAdminEmail[emailKey]);
        if (summary == null) {
          final String nameKey = admin.name.trim().toLowerCase();
          if (nameKey.isNotEmpty) {
            summary = byAdminName[nameKey];
          }
        }
        final String resolvedChatId = summary?.chatId.trim().isNotEmpty == true
            ? summary!.chatId
            : chatId;
        final String message = (summary?.lastMessage ?? '').isEmpty
            ? 'Tap to start support chat'
            : summary!.lastMessage;
        final String time = summary == null
            ? ''
            : SupportChatService.formatSummaryTime(summary.lastMessageAt);
        final int unreadCount = summary?.unreadForUser ?? 0;
        final String lastSender = summary?.lastMessageSender ?? '';
        final bool lastFromMe = lastSender == 'user';
        final DateTime? lastReadByOther = summary?.lastReadByAdminAt;
        final bool lastSeenByOther =
            summary?.lastMessageAt != null &&
            lastReadByOther != null &&
            !summary!.lastMessageAt!.isAfter(lastReadByOther);
        final bool isActive = summary?.activeForAdmin ?? false;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _SupportChatTile(
            chat: _SupportChat(
              chatId: resolvedChatId,
              name: admin.name,
              role: admin.email.isEmpty ? 'Admin Support' : admin.email,
              message: message,
              time: time,
              unreadCount: unreadCount,
              isActive: isActive,
              lastFromMe: lastFromMe,
              lastSeenByOther: lastSeenByOther,
              avatarUrl: admin.avatarUrl,
              avatarAsset: admin.email == SupportChatService.adminEmail
                  ? SupportChatService.adminAvatarAsset
                  : null,
            ),
            onTap: () {
              if (!enableTap) return;
              Navigator.of(context).pushNamed(
                AppRoutes.supportChatThread,
                arguments: SupportChatThreadArgs(
                  chatId: resolvedChatId,
                  userName: '',
                  userEmail: '',
                  adminId: admin.id,
                  adminName: admin.name,
                  adminEmail: admin.email,
                  adminAvatarUrl: admin.avatarUrl,
                ),
              );
            },
          ),
        );
      }),
    );
    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final bool isAdmin = AdminAccess.isAdmin();
    final String supportLabel = isAdmin ? 'User Support' : 'Admin Support';
    final List<String> tabLabels = ['Indox', 'Mentor Chats', supportLabel];
    final User? user = _user ?? FirebaseAuth.instance.currentUser;
    final bool isSignedIn = user != null;
    final String chatId = user?.uid ?? '';

    final Stream<List<SupportChatSummary>> stream = isAdmin
        ? SupportChatService.streamAdminChats()
        : (!isSignedIn
              ? Stream<List<SupportChatSummary>>.value(const [])
              : SupportChatService.streamUserChats(chatId));

    return Scaffold(
      backgroundColor: _supportBackgroundColor(context),
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
                        supportLabel,
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _supportTitleColor(context),
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
                    labels: tabLabels,
                    selectedIndex: 2,
                    onTap: (index) {
                      if (index == 0) {
                        Navigator.of(
                          context,
                        ).pushReplacementNamed(AppRoutes.indox);
                        return;
                      }
                      if (index == 1) {
                        Navigator.of(
                          context,
                        ).pushReplacementNamed(AppRoutes.mentorChats);
                      }
                    },
                  ),
                ),
                Expanded(
                  child: StreamBuilder<List<SupportAdmin>>(
                    stream: SupportChatService.streamAdmins(),
                    initialData: _cachedAdmins.isNotEmpty
                        ? _cachedAdmins
                        : _fallbackAdmins(),
                    builder: (context, adminSnapshot) {
                      final List<SupportAdmin> admins = _resolveAdmins(
                        adminSnapshot.data,
                      );
                      if (isAdmin) {
                        return StreamBuilder<List<SupportChatSummary>>(
                          stream: stream,
                          builder: (context, snapshot) {
                            final List<SupportChatSummary> chats =
                                snapshot.data ?? const [];
                            final List<Widget> children = [];
                            if (_error != null) {
                              children.add(
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Text(
                                    _error!,
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: _supportMutedColor(context),
                                    ),
                                  ),
                                ),
                              );
                            }
                            children.addAll(
                              _buildAdminSection(
                                admins: admins,
                                chats: const [],
                                chatId: chatId,
                                enableTap: false,
                              ),
                            );
                            if (snapshot.connectionState ==
                                    ConnectionState.waiting &&
                                !snapshot.hasData) {
                              children.add(const SizedBox(height: 12));
                              children.add(
                                const Center(
                                  child: CircularProgressIndicator(),
                                ),
                              );
                              return ListView(
                                padding: EdgeInsets.fromLTRB(
                                  horizontalPadding,
                                  6,
                                  horizontalPadding,
                                  16,
                                ),
                                children: children,
                              );
                            }
                            if (chats.isEmpty) {
                              children.add(
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    'No support chats yet',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: _supportMutedColor(context),
                                    ),
                                  ),
                                ),
                              );
                              return ListView(
                                padding: EdgeInsets.fromLTRB(
                                  horizontalPadding,
                                  6,
                                  horizontalPadding,
                                  16,
                                ),
                                children: children,
                              );
                            }
                            children.add(const SizedBox(height: 6));
                            children.add(
                              Text(
                                'Recent',
                                style: GoogleFonts.poppins(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _supportTitleColor(context),
                                ),
                              ),
                            );
                            children.add(const SizedBox(height: 12));
                            children.addAll(
                              chats.map((summary) {
                                final String name = summary.userName.isEmpty
                                    ? 'User'
                                    : summary.userName;
                                final String role = summary.userEmail.isEmpty
                                    ? 'Unknown email'
                                    : summary.userEmail;
                                final String message =
                                    summary.lastMessage.isEmpty
                                    ? 'Tap to start support chat'
                                    : summary.lastMessage;
                                final String time =
                                    SupportChatService.formatSummaryTime(
                                      summary.lastMessageAt,
                                    );
                                final int unreadCount = summary.unreadForAdmin;
                                final String lastSender =
                                    summary.lastMessageSender ?? '';
                                final bool lastFromMe = lastSender == 'admin';
                                final DateTime? lastReadByOther =
                                    summary.lastReadByUserAt;
                                final bool lastSeenByOther =
                                    summary.lastMessageAt != null &&
                                    lastReadByOther != null &&
                                    !summary.lastMessageAt!.isAfter(
                                      lastReadByOther,
                                    );
                                final bool isActive = summary.activeForUser;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: _SupportChatTile(
                                    chat: _SupportChat(
                                      chatId: summary.chatId,
                                      name: name,
                                      role: role,
                                      message: message,
                                      time: time,
                                      unreadCount: unreadCount,
                                      isActive: isActive,
                                      lastFromMe: lastFromMe,
                                      lastSeenByOther: lastSeenByOther,
                                    ),
                                    onTap: () =>
                                        Navigator.of(context).pushNamed(
                                          AppRoutes.supportChatThread,
                                          arguments: SupportChatThreadArgs(
                                            chatId: summary.chatId,
                                            userName: summary.userName,
                                            userEmail: summary.userEmail,
                                          ),
                                        ),
                                  ),
                                );
                              }),
                            );
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
                      }

                      return StreamBuilder<List<SupportChatSummary>>(
                        stream: stream,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState ==
                                  ConnectionState.waiting &&
                              !snapshot.hasData &&
                              adminSnapshot.connectionState ==
                                  ConnectionState.waiting &&
                              !adminSnapshot.hasData) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                          final List<SupportChatSummary> chats =
                              snapshot.data ?? const <SupportChatSummary>[];
                          final Map<String, SupportAdmin> adminByEmail = {
                            for (final SupportAdmin admin in admins)
                              admin.email.trim().toLowerCase(): admin,
                          };
                          final Map<String, SupportAdmin> adminByName = {
                            for (final SupportAdmin admin in admins)
                              admin.name.trim().toLowerCase(): admin,
                          };
                          final List<Widget> children = [];
                          if (_error != null) {
                            children.add(
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  _error!,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: _supportMutedColor(context),
                                  ),
                                ),
                              ),
                            );
                          }
                          if (!isSignedIn) {
                            children.add(
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  'Sign in to start a support chat',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: _supportMutedColor(context),
                                  ),
                                ),
                              ),
                            );
                          }
                          children.addAll(
                            _buildAdminSection(
                              admins: admins,
                              chats: chats,
                              chatId: chatId,
                            ),
                          );
                          if (chats.isNotEmpty) {
                            children.add(const SizedBox(height: 6));
                            children.add(
                              Text(
                                'Recent',
                                style: GoogleFonts.poppins(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _supportTitleColor(context),
                                ),
                              ),
                            );
                            children.add(const SizedBox(height: 12));
                            children.addAll(
                              chats.map((summary) {
                                final String name =
                                    summary.adminName.trim().isNotEmpty
                                    ? summary.adminName
                                    : SupportChatService.adminName;
                                final String role =
                                    summary.adminEmail.trim().isNotEmpty
                                    ? summary.adminEmail
                                    : 'Admin Support';
                                final String message =
                                    summary.lastMessage.isEmpty
                                    ? 'Tap to start support chat'
                                    : summary.lastMessage;
                                final String time =
                                    SupportChatService.formatSummaryTime(
                                      summary.lastMessageAt,
                                    );
                                final int unreadCount = summary.unreadForUser;
                                final SupportAdmin? matchedAdmin =
                                    adminByEmail[summary.adminEmail
                                        .trim()
                                        .toLowerCase()] ??
                                    adminByName[name.trim().toLowerCase()];
                                final String? avatarAsset =
                                    summary.adminEmail ==
                                        SupportChatService.adminEmail
                                    ? SupportChatService.adminAvatarAsset
                                    : null;
                                final String? avatarUrl =
                                    matchedAdmin?.avatarUrl;
                                final String lastSender =
                                    summary.lastMessageSender ?? '';
                                final bool lastFromMe = lastSender == 'user';
                                final DateTime? lastReadByOther =
                                    summary.lastReadByAdminAt;
                                final bool lastSeenByOther =
                                    summary.lastMessageAt != null &&
                                    lastReadByOther != null &&
                                    !summary.lastMessageAt!.isAfter(
                                      lastReadByOther,
                                    );
                                final bool isActive = summary.activeForAdmin;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: _SupportChatTile(
                                    chat: _SupportChat(
                                      chatId: summary.chatId,
                                      name: name,
                                      role: role,
                                      message: message,
                                      time: time,
                                      unreadCount: unreadCount,
                                      isActive: isActive,
                                      lastFromMe: lastFromMe,
                                      lastSeenByOther: lastSeenByOther,
                                      avatarAsset: avatarAsset,
                                      avatarUrl: avatarUrl,
                                    ),
                                    onTap: () =>
                                        Navigator.of(context).pushNamed(
                                          AppRoutes.supportChatThread,
                                          arguments: SupportChatThreadArgs(
                                            chatId: summary.chatId,
                                            userName: summary.userName,
                                            userEmail: summary.userEmail,
                                            adminId: summary.adminId,
                                            adminName: name,
                                            adminEmail: summary.adminEmail,
                                            adminAvatarUrl: avatarUrl,
                                          ),
                                        ),
                                  ),
                                );
                              }),
                            );
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
          color: _supportSurfaceColor(context),
          shape: BoxShape.circle,
          border: Border.all(color: _supportDividerColor(context)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Icon(icon, size: 20, color: _supportTitleColor(context)),
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
          color: selected ? _supportAccent : _supportSurfaceColor(context),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? _supportAccent : _supportDividerColor(context),
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: _supportAccent.withValues(alpha: 0.25),
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
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : _supportTitleColor(context),
          ),
        ),
      ),
    );
  }
}

class _SupportChatTile extends StatelessWidget {
  const _SupportChatTile({required this.chat, required this.onTap});

  final _SupportChat chat;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bool hasUnread = chat.unreadCount > 0;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: _supportCardColor(context),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _supportDividerColor(context)),
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
                  _SupportAvatar(chat: chat),
                  if (chat.isActive)
                    Positioned(
                      bottom: 2,
                      right: 2,
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _supportActiveDot,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: _supportCardColor(context),
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
                              color: _supportTitleColor(context),
                            ),
                          ),
                        ),
                        Text(
                          chat.time,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: hasUnread
                                ? _supportAccent
                                : _supportMutedColor(context),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (chat.lastFromMe)
                          Icon(
                            chat.lastSeenByOther ? Icons.done_all : Icons.check,
                            size: 14,
                            color: chat.lastSeenByOther
                                ? _supportAccent
                                : _supportMutedColor(context),
                          ),
                        if (chat.lastFromMe) const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            chat.message,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _supportMutedColor(context),
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
                              color: _supportAccent,
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
                        color: _supportMutedColor(context),
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

class _SupportAvatar extends StatelessWidget {
  const _SupportAvatar({required this.chat});

  final _SupportChat chat;

  @override
  Widget build(BuildContext context) {
    final String url = (chat.avatarUrl ?? '').trim();
    if (url.isNotEmpty) {
      return CircleAvatar(
        radius: 28,
        backgroundColor: _supportSurfaceColor(context),
        child: ClipOval(
          child: Image.network(
            url,
            width: 56,
            height: 56,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) {
              return Center(child: _InitialSupportAvatar(name: chat.name));
            },
          ),
        ),
      );
    }
    final String? asset = chat.avatarAsset;
    if (asset != null && asset.isNotEmpty) {
      return CircleAvatar(
        radius: 28,
        backgroundImage: AssetImage(asset),
        backgroundColor: _supportSurfaceColor(context),
      );
    }
    return CircleAvatar(
      radius: 28,
      backgroundColor: _supportAvatarBgColor(context),
      child: _InitialSupportAvatar(name: chat.name),
    );
  }
}

class _InitialSupportAvatar extends StatelessWidget {
  const _InitialSupportAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Text(
      name.isEmpty ? '?' : name.substring(0, 1),
      style: GoogleFonts.poppins(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: _supportTitleColor(context),
      ),
    );
  }
}

class _SupportChat {
  const _SupportChat({
    required this.chatId,
    required this.name,
    required this.role,
    required this.message,
    required this.time,
    required this.unreadCount,
    required this.isActive,
    required this.lastFromMe,
    required this.lastSeenByOther,
    this.avatarAsset,
    this.avatarUrl,
  });

  final String chatId;
  final String name;
  final String role;
  final String message;
  final String time;
  final int unreadCount;
  final bool isActive;
  final bool lastFromMe;
  final bool lastSeenByOther;
  final String? avatarAsset;
  final String? avatarUrl;
}

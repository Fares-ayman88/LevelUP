import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_state/app_strings.dart';

const Color _title = Color(0xFF202244);
const Color _primary = Color(0xFF0D65FF);
const Color _muted = Color(0xFF7D818F);

class InviteFriendsScreen extends StatefulWidget {
  const InviteFriendsScreen({super.key});

  @override
  State<InviteFriendsScreen> createState() => _InviteFriendsScreenState();
}

class _InviteFriendsScreenState extends State<InviteFriendsScreen> {
  static const String _inviteMessage =
      'Join me on LevelUp and start learning with me!';
  static const String _inviteAppLink = 'https://levelup.app';

  final Set<String> _invited = {};
  List<_InviteContact> _contacts = const [];

  bool _loading = true;
  bool _permissionDenied = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final PermissionStatus status = await Permission.contacts.request();
      if (!mounted) return;

      if (!status.isGranted) {
        setState(() {
          _loading = false;
          _permissionDenied = true;
          _contacts = const [];
        });
        return;
      }

      final List<Contact> contacts = await FlutterContacts.getContacts(
        withProperties: true,
      );

      final Set<String> seenPhones = <String>{};
      final List<_InviteContact> mapped = <_InviteContact>[];

      for (final Contact contact in contacts) {
        if (contact.phones.isEmpty) continue;

        final String name = contact.displayName.trim();
        final String phone = contact.phones.first.number.trim();
        if (name.isEmpty || phone.isEmpty) continue;

        final String normalized = _normalizePhone(phone);
        if (normalized.isEmpty || seenPhones.contains(normalized)) continue;

        seenPhones.add(normalized);
        mapped.add(_InviteContact(id: contact.id, name: name, phone: phone));
      }

      mapped.sort(
        (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
      );

      if (!mounted) return;
      setState(() {
        _contacts = mapped;
        _permissionDenied = false;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = context.tr('contacts_load_failed');
      });
    }
  }

  String _normalizePhone(String value) {
    return value.replaceAll(RegExp(r'[^0-9+]'), '');
  }

  Future<void> _invite(_InviteContact contact) async {
    final String normalizedPhone = _normalizePhone(contact.phone);
    if (normalizedPhone.isEmpty) {
      _showSnack(context.tr('invalid_contact_phone'));
      return;
    }

    final Uri uri = Uri(
      scheme: 'sms',
      path: normalizedPhone,
      queryParameters: <String, String>{'body': _inviteMessage},
    );

    final bool launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (launched) {
      setState(() => _invited.add(contact.id));
    } else {
      _showSnack(context.tr('sms_open_failed'));
    }
  }

  Future<void> _shareOnFacebook() async {
    final Uri webShareUri = Uri.https(
      'www.facebook.com',
      '/sharer/sharer.php',
      <String, String>{'u': _inviteAppLink, 'quote': _inviteMessage},
    );

    final Uri appShareUri = Uri.parse(
      'fb://facewebmodal/f?href=${Uri.encodeComponent(webShareUri.toString())}',
    );

    final bool openedApp = await launchUrl(
      appShareUri,
      mode: LaunchMode.externalApplication,
    );
    if (openedApp) return;

    final bool openedWeb = await launchUrl(
      webShareUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (!openedWeb) {
      _showSnack(context.tr('facebook_share_open_failed'));
    }
  }

  Future<void> _shareOnTwitter() async {
    final String text = '$_inviteMessage $_inviteAppLink';
    final Uri webShareUri = Uri.https(
      'twitter.com',
      '/intent/tweet',
      <String, String>{'text': text},
    );

    final Uri appShareUri = Uri.parse(
      'twitter://post?message=${Uri.encodeComponent(text)}',
    );

    final bool openedApp = await launchUrl(
      appShareUri,
      mode: LaunchMode.externalApplication,
    );
    if (openedApp) return;

    final bool openedWeb = await launchUrl(
      webShareUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (!openedWeb) {
      _showSnack(context.tr('twitter_share_open_failed'));
    }
  }

  Future<void> _shareOnGmail() async {
    final String subject = 'LevelUp Invite';
    final String body = '$_inviteMessage\n$_inviteAppLink';

    final Uri appComposeUri = Uri.parse(
      'googlegmail://co?subject=${Uri.encodeComponent(subject)}&body=${Uri.encodeComponent(body)}',
    );

    final Uri webComposeUri = Uri.https(
      'mail.google.com',
      '/mail/',
      <String, String>{'view': 'cm', 'fs': '1', 'su': subject, 'body': body},
    );

    final bool openedApp = await launchUrl(
      appComposeUri,
      mode: LaunchMode.externalApplication,
    );
    if (openedApp) return;

    final bool openedWeb = await launchUrl(
      webComposeUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (!openedWeb) {
      _showSnack(context.tr('gmail_share_open_failed'));
    }
  }

  Future<void> _shareOnWhatsApp() async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDDE3F1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  context.tr('whatsapp_invite_title'),
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _title,
                  ),
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.chat_bubble_outline_rounded),
                  title: Text(context.tr('whatsapp_send_chat')),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _shareOnWhatsAppChat();
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.auto_awesome_motion_rounded),
                  title: Text(context.tr('whatsapp_post_status')),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _shareOnWhatsAppStatus();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _shareOnWhatsAppChat() async {
    final String text = '$_inviteMessage\n$_inviteAppLink';

    final Uri appUri = Uri.parse(
      'whatsapp://send?text=${Uri.encodeComponent(text)}',
    );
    final Uri webUri = Uri.https('wa.me', '/', <String, String>{'text': text});

    final bool openedApp = await launchUrl(
      appUri,
      mode: LaunchMode.externalApplication,
    );
    if (openedApp) return;

    final bool openedWeb = await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (!openedWeb) {
      _showSnack(context.tr('whatsapp_share_open_failed'));
    }
  }

  Future<void> _shareOnWhatsAppStatus() async {
    final String text = '$_inviteMessage\n$_inviteAppLink';

    final Uri appUri = Uri.parse(
      'whatsapp://send?text=${Uri.encodeComponent(text)}',
    );
    final Uri webUri = Uri.https('wa.me', '/', <String, String>{'text': text});

    final bool openedApp = await launchUrl(
      appUri,
      mode: LaunchMode.externalApplication,
    );

    if (!mounted) return;
    if (openedApp) {
      _showSnack(context.tr('whatsapp_status_hint'));
      return;
    }

    final bool openedWeb = await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedWeb) {
      _showSnack(context.tr('whatsapp_status_hint'));
      return;
    }

    _showSnack(context.tr('whatsapp_share_open_failed'));
  }

  Future<void> _shareOnInstagram() async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDDE3F1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  context.tr('instagram_invite_title'),
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _title,
                  ),
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.alternate_email_rounded),
                  title: Text(context.tr('instagram_send_dm')),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _shareOnInstagramDm();
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.auto_awesome_motion_rounded),
                  title: Text(context.tr('instagram_post_story')),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _shareOnInstagramStory();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _shareOnInstagramDm() async {
    final Uri appUri = Uri.parse('instagram://app');
    final Uri webUri = Uri.https('www.instagram.com', '/');

    final bool openedApp = await launchUrl(
      appUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedApp) {
      _showSnack(context.tr('instagram_dm_hint'));
      return;
    }

    final bool openedWeb = await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedWeb) {
      _showSnack(context.tr('instagram_dm_hint'));
      return;
    }

    _showSnack(context.tr('instagram_share_open_failed'));
  }

  Future<void> _shareOnInstagramStory() async {
    final Uri appUri = Uri.parse('instagram://camera');
    final Uri webUri = Uri.https('www.instagram.com', '/');

    final bool openedApp = await launchUrl(
      appUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedApp) {
      _showSnack(context.tr('instagram_story_hint'));
      return;
    }

    final bool openedWeb = await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedWeb) {
      _showSnack(context.tr('instagram_story_hint'));
      return;
    }

    _showSnack(context.tr('instagram_share_open_failed'));
  }

  Future<void> _shareOnLinkedIn() async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDDE3F1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  context.tr('linkedin_invite_title'),
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _title,
                  ),
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.mail_outline_rounded),
                  title: Text(context.tr('linkedin_send_message')),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _shareOnLinkedInMessage();
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.edit_note_rounded),
                  title: Text(context.tr('linkedin_post_feed')),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _shareOnLinkedInPost();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _shareOnLinkedInMessage() async {
    final Uri appUri = Uri.parse('linkedin://messaging');
    final Uri webUri = Uri.https('www.linkedin.com', '/messaging/');

    final bool openedApp = await launchUrl(
      appUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedApp) {
      _showSnack(context.tr('linkedin_message_hint'));
      return;
    }

    final bool openedWeb = await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (openedWeb) {
      _showSnack(context.tr('linkedin_message_hint'));
      return;
    }

    _showSnack(context.tr('linkedin_share_open_failed'));
  }

  Future<void> _shareOnLinkedInPost() async {
    final Uri webShareUri = Uri.https(
      'www.linkedin.com',
      '/sharing/share-offsite/',
      <String, String>{'url': _inviteAppLink},
    );
    final Uri appShareUri = Uri.parse(
      'linkedin://shareArticle?mini=true&url=${Uri.encodeComponent(_inviteAppLink)}&title=${Uri.encodeComponent('LevelUp Invite')}&summary=${Uri.encodeComponent(_inviteMessage)}',
    );

    final bool openedApp = await launchUrl(
      appShareUri,
      mode: LaunchMode.externalApplication,
    );
    if (openedApp) return;

    final bool openedWeb = await launchUrl(
      webShareUri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;

    if (!openedWeb) {
      _showSnack(context.tr('linkedin_share_open_failed'));
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                18,
                horizontalPadding,
                24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      InkWell(
                        borderRadius: BorderRadius.circular(24),
                        onTap: () => Navigator.of(context).pop(),
                        child: const Padding(
                          padding: EdgeInsets.all(6),
                          child: Icon(
                            Icons.arrow_back,
                            size: 26,
                            color: _title,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        context.tr('invite_title'),
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x14697AA0),
                          blurRadius: 18,
                          offset: Offset(0, 12),
                        ),
                      ],
                    ),
                    child: _buildContactsBody(context),
                  ),
                  const SizedBox(height: 22),
                  Text(
                    context.tr('share_invite'),
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 16,
                    runSpacing: 12,
                    children: [
                      _ShareBadge(
                        label: 'f',
                        color: const Color(0xFF1877F2),
                        onTap: _shareOnFacebook,
                      ),
                      _ShareBadge(
                        label: 't',
                        color: const Color(0xFF1DA1F2),
                        onTap: _shareOnTwitter,
                      ),
                      _ShareBadge(
                        label: 'G+',
                        color: const Color(0xFFDB4437),
                        onTap: _shareOnGmail,
                      ),
                      _ShareBadge(
                        label: 'w',
                        color: const Color(0xFF25D366),
                        onTap: _shareOnWhatsApp,
                      ),
                      _ShareBadge(
                        label: 'ig',
                        color: const Color(0xFFE4405F),
                        onTap: _shareOnInstagram,
                      ),
                      _ShareBadge(
                        label: 'in',
                        color: const Color(0xFF0A66C2),
                        onTap: _shareOnLinkedIn,
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildContactsBody(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 36),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_permissionDenied) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
        child: Column(
          children: [
            Text(
              context.tr('contacts_permission_required'),
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _muted,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _loadContacts,
                  child: Text(
                    context.tr('retry'),
                    style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w700,
                      color: _primary,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: openAppSettings,
                  child: Text(
                    context.tr('open_settings'),
                    style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Center(
          child: Text(
            _error!,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.red.shade600,
            ),
          ),
        ),
      );
    }

    if (_contacts.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
        child: Center(
          child: Text(
            context.tr('no_phone_contacts'),
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: _muted,
            ),
          ),
        ),
      );
    }

    return Column(
      children: _contacts.map((contact) {
        final bool invited = _invited.contains(contact.id);
        return Column(
          children: [
            _InviteRow(
              contact: contact,
              invited: invited,
              onTap: () => _invite(contact),
            ),
            if (contact != _contacts.last)
              const Divider(height: 1, color: Color(0xFFE6ECF7)),
          ],
        );
      }).toList(),
    );
  }
}

class _InviteRow extends StatelessWidget {
  const _InviteRow({
    required this.contact,
    required this.invited,
    required this.onTap,
  });

  final _InviteContact contact;
  final bool invited;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: Colors.black,
            child: Text(
              contact.initials,
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  contact.name,
                  style: GoogleFonts.poppins(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: _title,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  contact.phone,
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: _muted,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 36,
            child: ElevatedButton(
              onPressed: invited ? null : () => onTap(),
              style: ElevatedButton.styleFrom(
                backgroundColor: invited ? const Color(0xFFE6EDF8) : _primary,
                foregroundColor: invited ? _title : Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 18),
              ),
              child: Text(
                invited ? context.tr('invited') : context.tr('invite'),
                style: GoogleFonts.poppins(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ShareBadge extends StatelessWidget {
  const _ShareBadge({required this.label, required this.color, this.onTap});

  final String label;
  final Color color;
  final Future<void> Function()? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap == null ? null : () => onTap!(),
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ),
    );
  }
}

class _InviteContact {
  const _InviteContact({
    required this.id,
    required this.name,
    required this.phone,
  });

  final String id;
  final String name;
  final String phone;

  String get initials {
    final List<String> parts = name
        .split(' ')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'U';
  }
}

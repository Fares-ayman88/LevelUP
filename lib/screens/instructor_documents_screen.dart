import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

class InstructorDocumentsArgs {
  const InstructorDocumentsArgs({
    required this.name,
    required this.email,
    required this.phone,
    required this.category,
    required this.coursesTaken,
    required this.experienceYears,
    required this.notes,
  });

  final String name;
  final String email;
  final String phone;
  final String category;
  final String coursesTaken;
  final String experienceYears;
  final String notes;
}

class InstructorDocumentsScreen extends StatefulWidget {
  const InstructorDocumentsScreen({super.key});

  @override
  State<InstructorDocumentsScreen> createState() =>
      _InstructorDocumentsScreenState();
}

class _InstructorDocumentsScreenState extends State<InstructorDocumentsScreen> {
  static const Color _title = Color(0xFF1C2140);
  static const Color _muted = Color(0xFF7D8194);
  static const Color _primary = Color(0xFF0D65FF);

  static const List<_WhatsAppContact> _contacts = [
    _WhatsAppContact(
      title: 'Admin WhatsApp 1',
      phone: '+201148822933',
      subtitle: 'CV, certificates, ID photo',
    ),
    _WhatsAppContact(
      title: 'Admin WhatsApp 2',
      phone: '+201094300987',
      subtitle: 'CV, certificates, ID photo',
    ),
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  InstructorDocumentsArgs _resolveArgs(BuildContext context) {
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    if (args is InstructorDocumentsArgs) {
      return args;
    }
    return const InstructorDocumentsArgs(
      name: '',
      email: '',
      phone: '',
      category: '',
      coursesTaken: '',
      experienceYears: '',
      notes: '',
    );
  }

  String _sanitizePhone(String phone) {
    return phone.replaceAll(RegExp(r'[^0-9]'), '');
  }

  String _buildMessage(InstructorDocumentsArgs args) {
    final StringBuffer buffer = StringBuffer();
    buffer.writeln('Instructor application documents');
    buffer.writeln('Name: ${args.name}');
    buffer.writeln('Email: ${args.email}');
    buffer.writeln('Phone: ${args.phone}');
    buffer.writeln('Category: ${args.category}');
    if (args.experienceYears.trim().isNotEmpty) {
      buffer.writeln('Experience: ${args.experienceYears} years');
    }
    if (args.coursesTaken.trim().isNotEmpty) {
      buffer.writeln('Courses: ${args.coursesTaken}');
    }
    if (args.notes.trim().isNotEmpty) {
      buffer.writeln('Notes: ${args.notes}');
    }
    buffer.writeln('Attached: CV, certificates, ID photo.');
    return buffer.toString().trim();
  }

  Future<void> _openWhatsApp(
    _WhatsAppContact contact,
    InstructorDocumentsArgs args,
  ) async {
    final String phone = _sanitizePhone(contact.phone);
    if (phone.isEmpty) {
      _showMessage('Admin WhatsApp number is not configured.');
      return;
    }
    final String message = _buildMessage(args);
    final Uri uri = Uri.parse(
      'https://wa.me/$phone?text=${Uri.encodeComponent(message)}',
    );
    final bool launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!launched) {
      _showMessage('Could not open WhatsApp.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final InstructorDocumentsArgs args = _resolveArgs(context);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
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
                      child: Icon(Icons.arrow_back, color: _title),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Submit Documents',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Send your documents via WhatsApp',
                style: GoogleFonts.poppins(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: _title,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Please send your CV, certificates, and a clear ID photo. You can include any extra info about your courses or experience.',
                style: GoogleFonts.poppins(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: _muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              _SummaryCard(args: args),
              const SizedBox(height: 18),
              Text(
                'WhatsApp Contacts',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: _title,
                ),
              ),
              const SizedBox(height: 10),
              ..._contacts.map(
                (contact) => _ContactCard(
                  contact: contact,
                  onTap: () => _openWhatsApp(contact, args),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Tip: If WhatsApp does not open, copy the phone number and send the documents manually.',
                style: GoogleFonts.poppins(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _muted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.args});

  final InstructorDocumentsArgs args;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE1E6F2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 16,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Application Summary',
            style: GoogleFonts.poppins(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: _InstructorDocumentsScreenState._title,
            ),
          ),
          const SizedBox(height: 10),
          _SummaryRow(label: 'Name', value: args.name),
          _SummaryRow(label: 'Email', value: args.email),
          _SummaryRow(label: 'Phone', value: args.phone),
          _SummaryRow(label: 'Category', value: args.category),
          if (args.experienceYears.trim().isNotEmpty)
            _SummaryRow(
              label: 'Experience',
              value: '${args.experienceYears} years',
            ),
          if (args.coursesTaken.trim().isNotEmpty)
            _SummaryRow(label: 'Courses', value: args.coursesTaken),
          if (args.notes.trim().isNotEmpty)
            _SummaryRow(label: 'Notes', value: args.notes),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            child: Text(
              '$label:',
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: _InstructorDocumentsScreenState._muted,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '-' : value,
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: _InstructorDocumentsScreenState._title,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({required this.contact, required this.onTap});

  final _WhatsAppContact contact;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE1E6F2)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF1FF),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.chat_bubble_outline,
              color: _InstructorDocumentsScreenState._primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  contact.title,
                  style: GoogleFonts.poppins(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: _InstructorDocumentsScreenState._title,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  contact.phone,
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: _InstructorDocumentsScreenState._muted,
                  ),
                ),
                if (contact.subtitle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    contact.subtitle,
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _InstructorDocumentsScreenState._muted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: _InstructorDocumentsScreenState._primary,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Open',
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WhatsAppContact {
  const _WhatsAppContact({
    required this.title,
    required this.phone,
    required this.subtitle,
  });

  final String title;
  final String phone;
  final String subtitle;
}

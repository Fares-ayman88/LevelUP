import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/transaction_catalog.dart';

class PaymentRequestArgs {
  const PaymentRequestArgs({required this.transactionId});

  final String transactionId;
}

class PaymentRequestScreen extends StatefulWidget {
  const PaymentRequestScreen({super.key});

  @override
  State<PaymentRequestScreen> createState() => _PaymentRequestScreenState();
}

class _PaymentRequestScreenState extends State<PaymentRequestScreen> {
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    TransactionCatalog.bindAuth();
    TransactionCatalog.bindForAdmin();
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

  Future<void> _updateStatus(
    TransactionItem item,
    TransactionStatus status,
  ) async {
    if (_updating) return;
    setState(() => _updating = true);
    try {
      await TransactionCatalog.updateStatus(
        transactionId: item.id,
        status: status,
      );
      if (!mounted) return;
      _showMessage(
        status == TransactionStatus.paid
            ? 'Payment approved.'
            : 'Payment rejected.',
      );
      Navigator.of(context).maybePop();
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not update payment.');
    } finally {
      if (mounted) {
        setState(() => _updating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final PaymentRequestArgs args =
        ModalRoute.of(context)?.settings.arguments as PaymentRequestArgs;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: ValueListenableBuilder<List<TransactionItem>>(
          valueListenable: TransactionCatalog.adminTransactions,
          builder: (context, items, _) {
            final TransactionItem? item = items
                .where((element) => element.id == args.transactionId)
                .cast<TransactionItem?>()
                .firstWhere((element) => element != null, orElse: () => null);
            if (item == null) {
              return _EmptyState(onBack: () => Navigator.of(context).pop());
            }
            return _PaymentRequestBody(
              item: item,
              updating: _updating,
              onBack: () => Navigator.of(context).pop(),
              onAccept: () => _updateStatus(item, TransactionStatus.paid),
              onReject: () => _updateStatus(item, TransactionStatus.rejected),
            );
          },
        ),
      ),
    );
  }
}

class _PaymentRequestBody extends StatelessWidget {
  const _PaymentRequestBody({
    required this.item,
    required this.updating,
    required this.onBack,
    required this.onAccept,
    required this.onReject,
  });

  final TransactionItem item;
  final bool updating;
  final VoidCallback onBack;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final String sender = (item.senderNumber ?? '').trim();
    final String attachment = (item.attachmentPath ?? '').trim();
    final bool showActions = item.status == TransactionStatus.waiting;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: onBack,
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(
                    Icons.arrow_back,
                    size: 26,
                    color: Color(0xFF202244),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Payment Request',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF202244),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _InfoCard(
            title: item.courseTitle,
            subtitle: item.courseCategory,
            rows: [
              _InfoRow(label: 'Amount', value: item.priceLabel),
              _InfoRow(
                label: 'User',
                value: item.userName.isNotEmpty
                    ? item.userName
                    : item.userEmail,
              ),
              if ((item.paymentMethod ?? '').trim().isNotEmpty)
                _InfoRow(label: 'Method', value: item.paymentMethod ?? ''),
              if (sender.isNotEmpty)
                _InfoRow(label: 'Sender Number', value: sender),
              _InfoRow(label: 'Status', value: item.status.label),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'Transfer Screenshot',
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF3C4466),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E6F4)),
            ),
            clipBehavior: Clip.antiAlias,
            child: attachment.isEmpty
                ? Center(
                    child: Text(
                      'No attachment provided.',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF7D818F),
                      ),
                    ),
                  )
                : Image.file(File(attachment), fit: BoxFit.cover),
          ),
          if (showActions) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: updating ? null : onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFE74C3C),
                      side: const BorderSide(color: Color(0xFFE74C3C)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      updating ? 'Updating...' : 'Reject',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: updating ? null : onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1F7C64),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      updating ? 'Updating...' : 'Accept',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.title,
    required this.subtitle,
    required this.rows,
  });

  final String title;
  final String subtitle;
  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF1C2140),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF7D818F),
            ),
          ),
          const SizedBox(height: 12),
          ...rows,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF7D818F),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF202244),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Request not found.',
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF7D818F),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onBack,
            child: Text(
              'Back',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

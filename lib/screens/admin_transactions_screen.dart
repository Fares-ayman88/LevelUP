import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../app_state/admin_access.dart';
import '../app_state/transaction_catalog.dart';

enum _RangeFilter { all, today, last7, last30, custom }

class AdminTransactionsScreen extends StatefulWidget {
  const AdminTransactionsScreen({super.key});

  @override
  State<AdminTransactionsScreen> createState() =>
      _AdminTransactionsScreenState();
}

class _AdminTransactionsScreenState extends State<AdminTransactionsScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _danger = Color(0xFFE74C3C);
  static const Color _card = Color(0xFFFFFFFF);
  static const Color _chipBorder = Color(0xFFE2E6F4);

  final Set<String> _processing = <String>{};
  _RangeFilter _filter = _RangeFilter.all;
  DateTime? _fromDate;
  DateTime? _toDate;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    TransactionCatalog.bindAuth();
    TransactionCatalog.bindForAdmin();
  }

  Color _statusColor(TransactionStatus status) {
    switch (status) {
      case TransactionStatus.paid:
        return const Color(0xFF1F7C64);
      case TransactionStatus.rejected:
        return const Color(0xFFE74C3C);
      case TransactionStatus.waiting:
        return const Color(0xFFE2702B);
    }
  }

  DateTime _resolveDate(TransactionItem item) {
    return item.updatedAt ?? item.createdAt ?? DateTime.now();
  }

  List<TransactionItem> _applyFilter(List<TransactionItem> items) {
    if (_filter == _RangeFilter.all) return items;
    final DateTime now = DateTime.now();
    DateTime start;
    DateTime end;
    if (_filter == _RangeFilter.today) {
      start = DateTime(now.year, now.month, now.day);
      end = start.add(const Duration(days: 1));
    } else if (_filter == _RangeFilter.last7) {
      start = DateTime(
        now.year,
        now.month,
        now.day,
      ).subtract(const Duration(days: 6));
      end = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
    } else if (_filter == _RangeFilter.last30) {
      start = DateTime(
        now.year,
        now.month,
        now.day,
      ).subtract(const Duration(days: 29));
      end = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
    } else {
      if (_fromDate == null || _toDate == null) return items;
      start = DateTime(_fromDate!.year, _fromDate!.month, _fromDate!.day);
      end = DateTime(
        _toDate!.year,
        _toDate!.month,
        _toDate!.day,
      ).add(const Duration(days: 1));
    }
    return items.where((item) {
      final DateTime date = _resolveDate(item);
      return date.isAfter(start.subtract(const Duration(milliseconds: 1))) &&
          date.isBefore(end);
    }).toList();
  }

  Future<void> _updateStatus(
    TransactionItem item,
    TransactionStatus status, {
    String? successMessage,
  }) async {
    if (_processing.contains(item.id)) return;
    setState(() => _processing.add(item.id));
    try {
      await TransactionCatalog.updateStatus(
        transactionId: item.id,
        status: status,
      );
      if (!mounted) return;
      final String message = (successMessage ?? '').trim().isNotEmpty
          ? successMessage!.trim()
          : (status == TransactionStatus.paid
                ? 'Payment approved.'
                : 'Payment rejected.');
      _showToast(message);
    } catch (_) {
      if (!mounted) return;
      _showToast('Could not update payment.');
    } finally {
      if (mounted) {
        setState(() => _processing.remove(item.id));
      }
    }
  }

  Future<void> _confirmRemove(TransactionItem item) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Remove course access'),
          content: Text(
            'Remove "${item.courseTitle}" from '
            '${item.userName.isNotEmpty ? item.userName : item.userEmail}?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: _danger,
                foregroundColor: Colors.white,
              ),
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    await _updateStatus(
      item,
      TransactionStatus.rejected,
      successMessage: 'Access removed.',
    );
  }

  void _showToast(String message) {
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

  Future<void> _pickCustomRange() async {
    final DateTime now = DateTime.now();
    final DateTime initialFrom =
        _fromDate ?? now.subtract(const Duration(days: 7));
    final DateTime? from = await showDatePicker(
      context: context,
      initialDate: initialFrom,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1),
    );
    if (from == null || !mounted) return;
    final DateTime initialTo = _toDate ?? now;
    final DateTime? to = await showDatePicker(
      context: context,
      initialDate: initialTo.isBefore(from) ? from : initialTo,
      firstDate: from,
      lastDate: DateTime(now.year + 1),
    );
    if (to == null || !mounted) return;
    setState(() {
      _fromDate = from;
      _toDate = to;
      _filter = _RangeFilter.custom;
    });
  }

  String _formatDate(DateTime date) {
    final String y = date.year.toString();
    final String m = date.month.toString().padLeft(2, '0');
    final String d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  String _formatDateTime(DateTime date) {
    final String dateText = _formatDate(date);
    final String h = date.hour.toString().padLeft(2, '0');
    final String min = date.minute.toString().padLeft(2, '0');
    return '$dateText $h:$min';
  }

  Future<Uint8List> _buildPdfBytes(List<TransactionItem> items) async {
    final pw.Document doc = pw.Document();
    final List<List<String>> rows = items.map((item) {
      final DateTime date = _resolveDate(item);
      return [
        _formatDateTime(date),
        item.userName.isNotEmpty ? item.userName : item.userEmail,
        item.courseTitle,
        item.priceLabel,
        item.status.label,
      ];
    }).toList();
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (context) => [
          pw.Text(
            'Transactions Report',
            style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 8),
          pw.Text('Generated: ${_formatDateTime(DateTime.now())}'),
          pw.SizedBox(height: 12),
          pw.TableHelper.fromTextArray(
            headers: const ['Date', 'User', 'Course', 'Price', 'Status'],
            data: rows,
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              fontSize: 10,
            ),
            cellStyle: const pw.TextStyle(fontSize: 9),
            columnWidths: const {
              0: pw.FlexColumnWidth(1.2),
              1: pw.FlexColumnWidth(1.4),
              2: pw.FlexColumnWidth(2.2),
              3: pw.FlexColumnWidth(1),
              4: pw.FlexColumnWidth(1),
            },
          ),
        ],
      ),
    );
    return doc.save();
  }

  Future<void> _printTransactions(List<TransactionItem> items) async {
    try {
      final Uint8List bytes = await _buildPdfBytes(items);
      await Printing.layoutPdf(onLayout: (_) async => bytes);
    } catch (_) {
      _showToast('Print failed');
    }
  }

  Future<void> _exportPdf(List<TransactionItem> items) async {
    try {
      final Uint8List bytes = await _buildPdfBytes(items);
      await Printing.sharePdf(bytes: bytes, filename: 'transactions.pdf');
    } catch (_) {
      _showToast('Export failed');
    }
  }

  String _filterLabel() {
    switch (_filter) {
      case _RangeFilter.today:
        return 'Today';
      case _RangeFilter.last7:
        return 'Last 7 days';
      case _RangeFilter.last30:
        return 'Last 30 days';
      case _RangeFilter.custom:
        if (_fromDate != null && _toDate != null) {
          return '${_formatDate(_fromDate!)} Ã¢â€ â€™ ${_formatDate(_toDate!)}';
        }
        return 'Custom range';
      case _RangeFilter.all:
        return 'All';
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isAdmin = AdminAccess.isAdmin();
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: ValueListenableBuilder<List<TransactionItem>>(
          valueListenable: TransactionCatalog.adminTransactions,
          builder: (context, transactions, _) {
            final List<TransactionItem> filtered = _applyFilter(
              List<TransactionItem>.from(transactions)
                ..sort((a, b) => _resolveDate(b).compareTo(_resolveDate(a))),
            );

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Row(
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
                      Expanded(
                        child: Text(
                          'Recent Transactions',
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: _title,
                          ),
                        ),
                      ),
                      _ActionIconButton(
                        icon: Icons.print_rounded,
                        label: 'Print',
                        onTap: isAdmin
                            ? () => _printTransactions(filtered)
                            : null,
                      ),
                      const SizedBox(width: 8),
                      _ActionIconButton(
                        icon: Icons.picture_as_pdf_rounded,
                        label: 'PDF',
                        onTap: isAdmin ? () => _exportPdf(filtered) : null,
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 6, 20, 8),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    decoration: BoxDecoration(
                      color: _card,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x14697AA0),
                          blurRadius: 16,
                          offset: Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEAF0FF),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.history_rounded,
                                size: 20,
                                color: _title,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _filterLabel(),
                                    style: GoogleFonts.poppins(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: _title,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${filtered.length} transactions',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            TextButton.icon(
                              onPressed: _pickCustomRange,
                              icon: const Icon(
                                Icons.date_range_rounded,
                                size: 18,
                              ),
                              label: Text(
                                'Pick range',
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              style: TextButton.styleFrom(
                                foregroundColor: _title,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                minimumSize: const Size(0, 0),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            _FilterChip(
                              label: 'All',
                              selected: _filter == _RangeFilter.all,
                              onTap: () =>
                                  setState(() => _filter = _RangeFilter.all),
                            ),
                            _FilterChip(
                              label: 'Today',
                              selected: _filter == _RangeFilter.today,
                              onTap: () =>
                                  setState(() => _filter = _RangeFilter.today),
                            ),
                            _FilterChip(
                              label: 'Last 7 days',
                              selected: _filter == _RangeFilter.last7,
                              onTap: () =>
                                  setState(() => _filter = _RangeFilter.last7),
                            ),
                            _FilterChip(
                              label: 'Last 30 days',
                              selected: _filter == _RangeFilter.last30,
                              onTap: () =>
                                  setState(() => _filter = _RangeFilter.last30),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: !isAdmin
                      ? Center(
                          child: Text(
                            'Admins only.',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _muted,
                            ),
                          ),
                        )
                      : filtered.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEAF0FF),
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: const Icon(
                                  Icons.receipt_long_rounded,
                                  size: 30,
                                  color: _title,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No transactions yet.',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: _muted,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            return _AdminTransactionCard(
                              item: filtered[index],
                              statusColor: _statusColor(filtered[index].status),
                              isBusy: _processing.contains(filtered[index].id),
                              onAccept: () => _updateStatus(
                                filtered[index],
                                TransactionStatus.paid,
                              ),
                              onReject: () => _updateStatus(
                                filtered[index],
                                TransactionStatus.rejected,
                              ),
                              onRemove: () => _confirmRemove(filtered[index]),
                              formattedDate: _formatDateTime(
                                _resolveDate(filtered[index]),
                              ),
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

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF0D65FF) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? const Color(0xFF0D65FF)
                : _AdminTransactionsScreenState._chipBorder,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14697AA0),
              blurRadius: 14,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : const Color(0xFF3C4466),
          ),
        ),
      ),
    );
  }
}

class _AdminTransactionCard extends StatelessWidget {
  const _AdminTransactionCard({
    required this.item,
    required this.statusColor,
    required this.isBusy,
    required this.onAccept,
    required this.onReject,
    required this.onRemove,
    required this.formattedDate,
  });

  final TransactionItem item;
  final Color statusColor;
  final bool isBusy;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback onRemove;
  final String formattedDate;

  @override
  Widget build(BuildContext context) {
    final bool isWaiting = item.status == TransactionStatus.waiting;
    final bool isPaid = item.status == TransactionStatus.paid;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.courseTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1C2140),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.courseCategory,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _AdminTransactionsScreenState._muted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.userName.isNotEmpty ? item.userName : item.userEmail,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _AdminTransactionsScreenState._title,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.priceLabel,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _AdminTransactionsScreenState._muted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formattedDate,
                      style: GoogleFonts.poppins(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: _AdminTransactionsScreenState._muted,
                      ),
                    ),
                    if ((item.senderNumber ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'From: ${item.senderNumber}',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _AdminTransactionsScreenState._muted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      item.status == TransactionStatus.paid
                          ? Icons.check_circle
                          : item.status == TransactionStatus.rejected
                          ? Icons.cancel
                          : Icons.schedule,
                      size: 14,
                      color: statusColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item.status.label,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (isWaiting) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isBusy ? null : onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _AdminTransactionsScreenState._danger,
                      side: const BorderSide(
                        color: _AdminTransactionsScreenState._danger,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      isBusy ? 'Updating...' : 'Reject',
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
                    onPressed: isBusy ? null : onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1F7C64),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      isBusy ? 'Updating...' : 'Accept',
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
          ] else if (isPaid) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: isBusy ? null : onRemove,
                style: OutlinedButton.styleFrom(
                  foregroundColor: _AdminTransactionsScreenState._danger,
                  side: const BorderSide(
                    color: _AdminTransactionsScreenState._danger,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.remove_circle_outline, size: 16),
                label: Text(
                  isBusy ? 'Updating...' : 'Remove Access',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ActionIconButton extends StatelessWidget {
  const _ActionIconButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 42,
      height: 42,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          foregroundColor: _AdminTransactionsScreenState._title,
          side: const BorderSide(color: Color(0xFFE2E6F4)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: EdgeInsets.zero,
        ),
        child: Icon(icon, size: 20),
      ),
    );
  }
}

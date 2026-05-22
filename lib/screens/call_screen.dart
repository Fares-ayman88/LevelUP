import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class CallScreenArgs {
  const CallScreenArgs({required this.name});

  final String name;
}

class CallScreen extends StatefulWidget {
  const CallScreen({super.key});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _danger = Color(0xFFE74C3C);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _soft = Color(0xFFEAF0FF);

  Timer? _timer;
  Duration _elapsed = Duration.zero;
  bool _isMuted = false;
  bool _videoOff = true;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _elapsed += const Duration(seconds: 1));
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _toggleMute() {
    setState(() => _isMuted = !_isMuted);
  }

  void _toggleVideo() {
    setState(() => _videoOff = !_videoOff);
  }

  void _endCall() {
    Navigator.of(context).maybePop();
  }

  String _formatDuration(Duration duration) {
    final int minutes = duration.inMinutes;
    final int seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final CallScreenArgs? args =
        ModalRoute.of(context)?.settings.arguments as CallScreenArgs?;
    final String name = (args?.name ?? 'Call').trim();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.arrow_back, size: 26, color: _title),
                ),
              ),
              const SizedBox(height: 18),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 180,
                      height: 180,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      name,
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: _title,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${_formatDuration(_elapsed)} Minutes',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _muted,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _CallActionButton(
                      background: _soft,
                      icon: _isMuted ? Icons.mic_off : Icons.mic,
                      iconColor: _title,
                      onTap: _toggleMute,
                    ),
                    _CallActionButton(
                      background: _danger,
                      icon: Icons.call_end,
                      iconColor: Colors.white,
                      onTap: _endCall,
                    ),
                    _CallActionButton(
                      background: _primary,
                      icon: _videoOff ? Icons.videocam_off : Icons.videocam,
                      iconColor: Colors.white,
                      onTap: _toggleVideo,
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

class _CallActionButton extends StatelessWidget {
  const _CallActionButton({
    required this.background,
    required this.icon,
    required this.iconColor,
    required this.onTap,
  });

  final Color background;
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkResponse(
      onTap: onTap,
      radius: 34,
      child: Container(
        width: 62,
        height: 62,
        decoration: BoxDecoration(color: background, shape: BoxShape.circle),
        child: Icon(icon, color: iconColor, size: 26),
      ),
    );
  }
}

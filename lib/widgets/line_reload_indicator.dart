import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

class LineReloadIndicator extends StatefulWidget {
  const LineReloadIndicator({
    super.key,
    required this.visible,
  });

  final bool visible;

  @override
  State<LineReloadIndicator> createState() => _LineReloadIndicatorState();
}

class _LineReloadIndicatorState extends State<LineReloadIndicator>
    with SingleTickerProviderStateMixin {
  static const Duration _minVisible = Duration(milliseconds: 450);

  late final AnimationController _controller;
  Timer? _hideTimer;
  DateTime? _shownAt;
  bool _renderVisible = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat();
  }

  @override
  void didUpdateWidget(covariant LineReloadIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible) {
      _hideTimer?.cancel();
      if (!_renderVisible) {
        _shownAt = DateTime.now();
        setState(() => _renderVisible = true);
      }
      return;
    }

    if (!_renderVisible) return;
    final DateTime now = DateTime.now();
    final DateTime started = _shownAt ?? now;
    final Duration elapsed = now.difference(started);
    final Duration remain =
        elapsed >= _minVisible ? Duration.zero : (_minVisible - elapsed);

    _hideTimer?.cancel();
    _hideTimer = Timer(remain, () {
      if (!mounted) return;
      setState(() => _renderVisible = false);
    });
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: true,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 180),
        opacity: _renderVisible ? 1 : 0,
        child: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: SizedBox(
            width: 38,
            height: 38,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                final double t = _controller.value;
                return Transform.rotate(
                  angle: t * math.pi * 2,
                  child: Stack(
                    children: [
                      _dotAt(
                        alignment: const Alignment(-0.78, 0.56),
                        wobble: math.sin((t - 0.30) * math.pi * 2),
                      ),
                      _dotAt(
                        alignment: const Alignment(0.78, 0.56),
                        wobble: math.sin((t - 0.15) * math.pi * 2),
                      ),
                      _dotAt(
                        alignment: const Alignment(0, -0.92),
                        wobble: math.sin(t * math.pi * 2),
                        invert: true,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _dotAt({
    required Alignment alignment,
    required double wobble,
    bool invert = false,
  }) {
    final double shift = (invert ? 1 : -1) * wobble * 3.8;
    final double scale = 0.82 + ((wobble + 1) / 2) * 0.26;
    final double opacity = 0.78 + ((wobble + 1) / 2) * 0.22;

    return Align(
      alignment: alignment,
      child: Transform.translate(
        offset: Offset(0, shift),
        child: Transform.scale(
          scale: scale,
          child: Opacity(
            opacity: opacity,
            child: Container(
              width: 12,
              height: 12,
              decoration: const BoxDecoration(
                color: Color(0xFF0D65FF),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

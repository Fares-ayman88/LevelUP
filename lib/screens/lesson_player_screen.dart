import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../utils/youtube_utils.dart';

class LessonPlayerScreen extends StatefulWidget {
  const LessonPlayerScreen({super.key});

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen> {
  static const Color _title = Colors.white;
  static const Color _muted = Color(0xFF9AA1B8);

  LessonPlayerArgs? _data;
  String? _videoId;
  String? _videoUrl;
  WebViewController? _webController;
  WebResourceError? _webError;
  VideoPlayerController? _videoController;
  String? _videoError;
  bool _isLoading = true;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    _data = args is LessonPlayerArgs
        ? args
        : const LessonPlayerArgs(
            sectionTitle: 'Section 01 - Introduction',
            courseTitle: 'Course Name',
            lessonTitle: 'Lesson Preview',
          );
    final String resolvedUrl = (_data?.videoUrl ?? '').trim();
    _videoId = extractYoutubeId(resolvedUrl);
    if (_videoId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _setupWebView();
      });
    } else if (resolvedUrl.isNotEmpty) {
      _videoUrl = resolvedUrl;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _setupVideoPlayer(resolvedUrl);
      });
    }
    _initialized = true;
  }

  Future<void> _setupWebView() async {
    final String? videoId = _videoId;
    if (videoId == null) return;
    final Uri embedUri = Uri.https('www.youtube.com', '/embed/$videoId', {
      'playsinline': '1',
      'controls': '1',
      'rel': '0',
      'modestbranding': '1',
      'enablejsapi': '1',
    });

    final WebViewController controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() => _isLoading = true);
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            if (!mounted) return;
            setState(() => _webError = error);
          },
        ),
      );

    final platformController = controller.platform;
    if (platformController is AndroidWebViewController) {
      platformController.setMediaPlaybackRequiresUserGesture(false);
    }
    final WebViewCookieManager cookieManager = WebViewCookieManager();
    final platformCookieManager = cookieManager.platform;
    if (platformController is AndroidWebViewController &&
        platformCookieManager is AndroidWebViewCookieManager) {
      try {
        await platformCookieManager.setAcceptThirdPartyCookies(
          platformController,
          true,
        );
      } catch (_) {}
    }

    await controller.loadRequest(embedUri);

    if (!mounted) return;
    setState(() {
      _webController = controller;
    });
  }

  Future<void> _setupVideoPlayer(String url) async {
    final Uri? uri = Uri.tryParse(url);
    if (uri == null) {
      if (!mounted) return;
      setState(() {
        _videoError = 'Invalid video URL.';
        _isLoading = false;
      });
      return;
    }
    try {
      final VideoPlayerController controller = VideoPlayerController.networkUrl(
        uri,
      );
      controller.addListener(_handleVideoTick);
      await controller.initialize();
      await controller.setLooping(false);
      if (!mounted) {
        controller.removeListener(_handleVideoTick);
        await controller.dispose();
        return;
      }
      setState(() {
        _videoController = controller;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _videoError = e.toString().isNotEmpty
            ? e.toString()
            : 'Video failed to load.';
        _isLoading = false;
      });
    }
  }

  void _handleVideoTick() {
    if (!mounted) return;
    setState(() {});
  }

  void _toggleVideoPlayback() {
    final VideoPlayerController? controller = _videoController;
    if (controller == null || !controller.value.isInitialized) return;
    if (controller.value.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
  }

  @override
  void dispose() {
    _videoController?.removeListener(_handleVideoTick);
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final LessonPlayerArgs data =
        _data ??
        const LessonPlayerArgs(
          sectionTitle: 'Section 01 - Introduction',
          courseTitle: 'Course Name',
          lessonTitle: 'Lesson Preview',
        );
    final String headerTitle = data.courseTitle.trim().isEmpty
        ? data.sectionTitle
        : '${data.sectionTitle} - ${data.courseTitle}';

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => Navigator.of(context).pop(),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(
                        Icons.arrow_back,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data.lessonTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: _title,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          headerTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: _muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: Center(
                  child:
                      (_videoId == null &&
                          (_videoUrl == null || _videoUrl!.trim().isEmpty))
                      ? _NoVideoCard(lessonTitle: data.lessonTitle)
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: _videoId != null
                                  ? (_webController == null
                                        ? const SizedBox(
                                            height: 210,
                                            child: Center(
                                              child: CircularProgressIndicator(
                                                color: Colors.white,
                                              ),
                                            ),
                                          )
                                        : Stack(
                                            alignment: Alignment.center,
                                            children: [
                                              AspectRatio(
                                                aspectRatio: 16 / 9,
                                                child: WebViewWidget(
                                                  controller: _webController!,
                                                ),
                                              ),
                                              if (_isLoading)
                                                const CircularProgressIndicator(
                                                  color: Colors.white,
                                                ),
                                            ],
                                          ))
                                  : _VideoPlayerCard(
                                      controller: _videoController,
                                      isLoading: _isLoading,
                                      onToggle: _toggleVideoPlayback,
                                    ),
                            ),
                            if (_videoId != null && _webError != null) ...[
                              const SizedBox(height: 12),
                              _WebErrorCard(
                                description: _webError!.description,
                                code: _webError!.errorCode,
                              ),
                              if (data.videoUrl?.trim().isNotEmpty == true) ...[
                                const SizedBox(height: 10),
                                _OpenExternalButton(
                                  url: data.videoUrl!.trim(),
                                  label: 'Open in YouTube',
                                ),
                              ],
                            ],
                            if (_videoId == null &&
                                (_videoError ?? '').trim().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              _WebErrorCard(
                                description: _videoError!,
                                code: -1,
                              ),
                              if (data.videoUrl?.trim().isNotEmpty == true) ...[
                                const SizedBox(height: 10),
                                _OpenExternalButton(
                                  url: data.videoUrl!.trim(),
                                  label: 'Open Video',
                                ),
                              ],
                            ],
                            if (_videoId == null &&
                                _videoController != null) ...[
                              const SizedBox(height: 10),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: VideoProgressIndicator(
                                  _videoController!,
                                  allowScrubbing: true,
                                  colors: const VideoProgressColors(
                                    playedColor: Colors.white,
                                    bufferedColor: Color(0xFF3B4252),
                                    backgroundColor: Color(0xFF1D2230),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                data.videoUrl?.trim().isNotEmpty == true
                    ? _videoId != null
                          ? 'Source: YouTube'
                          : 'Source: Uploaded video'
                    : 'No video provided',
                style: GoogleFonts.poppins(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: _muted,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoVideoCard extends StatelessWidget {
  const _NoVideoCard({required this.lessonTitle});

  final String lessonTitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF11141A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1E2530)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.play_circle_outline,
            color: Colors.white54,
            size: 48,
          ),
          const SizedBox(height: 10),
          Text(
            'No video for this lesson yet.',
            style: GoogleFonts.poppins(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            lessonTitle,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF9AA1B8),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _VideoPlayerCard extends StatelessWidget {
  const _VideoPlayerCard({
    required this.controller,
    required this.isLoading,
    required this.onToggle,
  });

  final VideoPlayerController? controller;
  final bool isLoading;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final bool ready = controller != null && controller!.value.isInitialized;
    final bool playing = ready && controller!.value.isPlaying;
    return Stack(
      alignment: Alignment.center,
      children: [
        AspectRatio(
          aspectRatio: ready ? controller!.value.aspectRatio : 16 / 9,
          child: ready
              ? VideoPlayer(controller!)
              : Container(color: Colors.black),
        ),
        if (isLoading || !ready)
          const CircularProgressIndicator(color: Colors.white),
        if (ready)
          Positioned.fill(
            child: GestureDetector(
              onTap: onToggle,
              child: Container(color: Colors.transparent),
            ),
          ),
        if (ready && !playing)
          const Icon(
            Icons.play_circle_outline,
            color: Colors.white70,
            size: 58,
          ),
      ],
    );
  }
}

class _WebErrorCard extends StatelessWidget {
  const _WebErrorCard({required this.description, required this.code});

  final String description;
  final int code;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B1F27),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF2A303C)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFFFB4B4), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Player error ($code): $description',
              style: GoogleFonts.poppins(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: Colors.white70,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OpenExternalButton extends StatelessWidget {
  const _OpenExternalButton({required this.url, this.label = 'Open'});

  final String url;
  final String label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          final Uri? uri = Uri.tryParse(url);
          if (uri == null) return;
          launchUrl(uri, mode: LaunchMode.externalApplication);
        },
        icon: const Icon(Icons.open_in_new, size: 18),
        label: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
          ),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Color(0xFF2C3545)),
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }
}

class LessonPlayerArgs {
  const LessonPlayerArgs({
    required this.sectionTitle,
    required this.courseTitle,
    required this.lessonTitle,
    this.videoUrl,
    this.currentTime = '04:34',
    this.totalTime = '36:34',
  });

  final String sectionTitle;
  final String courseTitle;
  final String lessonTitle;
  final String? videoUrl;
  final String currentTime;
  final String totalTime;
}

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../routes.dart';

class MainBottomNav extends StatelessWidget {
  const MainBottomNav({super.key, required this.currentIndex});

  final int currentIndex;

  static const double _designWidth = 418;
  static const double _designHeight = 100;

  String get _assetName {
    switch (currentIndex) {
      case 1:
        return 'assets/home/TAB BAR MY COURSES.svg';
      case 2:
        return 'assets/home/TAB BAR INDOX.svg';
      case 3:
        return 'assets/home/TAB BAR PAYMENT.svg';
      case 4:
        return 'assets/home/TAB BAR PROFILE.svg';
      default:
        return 'assets/home/TAB BAR.svg';
    }
  }

  Future<void> _handleTap(BuildContext context, int index) async {
    final String? currentRoute = ModalRoute.of(context)?.settings.name;
    if (index == 0 && currentRoute == AppRoutes.home) return;
    if (index == 1 && currentRoute == AppRoutes.myCourses) return;
    if (index == 2 && currentRoute == AppRoutes.indox) return;
    if (index == 3 && currentRoute == AppRoutes.transactions) return;
    if (index == 4 && currentRoute == AppRoutes.profile) return;
    if (index == 0) {
      Navigator.of(context).pushNamed(AppRoutes.home);
      return;
    }
    if (index == 1) {
      Navigator.of(context).pushNamed(AppRoutes.myCourses);
      return;
    }
    if (index == 2) {
      Navigator.of(context).pushNamed(AppRoutes.indox);
      return;
    }
    if (index == 3) {
      Navigator.of(context).pushNamed(AppRoutes.transactions);
      return;
    }
    if (index == 4) {
      Navigator.of(context).pushNamed(AppRoutes.profile);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final double width = constraints.maxWidth;
          final double height = width * (_designHeight / _designWidth);
          return SizedBox(
            width: width,
            height: height,
            child: Stack(
              children: [
                SvgPicture.asset(
                  _assetName,
                  width: width,
                  height: height,
                  fit: BoxFit.contain,
                ),
                Positioned.fill(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: List.generate(
                      5,
                      (index) => Expanded(
                        child: Material(
                          color: Colors.transparent,
                        child: InkWell(
                          splashColor: Colors.transparent,
                          highlightColor: Colors.transparent,
                          onTap: () async {
                            await _handleTap(context, index);
                          },
                          child: const SizedBox.expand(),
                        ),
                      ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

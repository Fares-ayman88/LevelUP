import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/app_strings.dart';

const Color _title = Color(0xFF202244);
const Color _text = Color(0xFF7D818F);

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
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
                        context.tr('terms_title'),
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    context.tr('condition_attending'),
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'At enim hic etiam dolore. Dulce amarum, leve asperum, '
                    'prope longe, stare movere, quadratum rotundum. At certe '
                    'gravius. Nullus est igitur cuiusquam dies natalis. Paullum, '
                    'cum regem Persem captum adduceret, eodem flumine invectio?',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _text,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Quare hoc videndum est, possitne nobis hoc ratio '
                    'philosophorum dare. Sed finge non solum callidum eum, '
                    'qui aliquid improbe faciat, verum etiam praepotentem, '
                    'ut M. Est autem officium, quod ita factum est, ut eius '
                    'facti probabilis ratio reddi possit.',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _text,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    context.tr('terms_use'),
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Ut proverbia non nulla veriora sint quam vestra dogmata. '
                    'Tamen aberramus a proposito, et, ne longius, prorsus, inquam, '
                    'Piso, si ista mala sunt, placet. Omnes enim iucundum motum, '
                    'quo sensus hilaretur. Cum id fugiunt, re eadem defendunt, '
                    'quae Peripatetic, verba. Quibusnam praeteritis? Portenta haec '
                    'esse dicit, quidem hactenus; Si id dicis, vicimus. Qui ita '
                    'affectus, beatum esse numquam probabis; Igitur neque stultorum '
                    'quisquam beatus neque sapiientium non beatus.',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _text,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Dicam, inquam, et quidem discendi causa magis, quam quo te '
                    'aut Epicurum reprehensum velim. Dolor ergo, id est summum '
                    'malum, metuetur semper, etiamsi non ader.',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _text,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

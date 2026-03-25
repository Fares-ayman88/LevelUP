import { useNavigate } from 'react-router-dom';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div className="terms-page">
      <div className="screen screen--narrow">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Terms & Conditions</h2>
        </div>
        <div className="terms-block">
          <h3>Condition & Attending</h3>
          <p>
            At enim hic etiam dolore. Dulce amarum, leve asperum, prope longe,
            stare movere, quadratum rotundum. At certe gravius. Nullus est
            igitur cuiusquam dies natalis. Paullum, cum regem Persem captum
            adduceret, eodem flumine invectio?
          </p>
          <p>
            Quare hoc videndum est, possitne nobis hoc ratio philosophorum
            dare. Sed finge non solum callidum eum, qui aliquid improbe faciat,
            verum etiam praepotentem, ut M. Est autem officium, quod ita factum
            est, ut eius facti probabilis ratio reddi possit.
          </p>
        </div>
        <div className="terms-block">
          <h3>Terms & Use</h3>
          <p>
            Ut proverbia non nulla veriora sint quam vestra dogmata. Tamen
            aberramus a proposito, et, ne longius, prorsus, inquam, Piso, si
            ista mala sunt, placet. Omnes enim iucundum motum, quo sensus
            hilaretur. Cum id fugiunt, re eadem defendunt, quae Peripatetic,
            verba. Quibusnam praeteritis? Portenta haec esse dicit, quidem
            hactenus; Si id dicis, vicimus.
          </p>
          <p>
            Dicam, inquam, et quidem discendi causa magis, quam quo te aut
            Epicurum reprehensum velim. Dolor ergo, id est summum malum,
            metuetur semper, etiamsi non ader.
          </p>
        </div>
      </div>
    </div>
  );
}

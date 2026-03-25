import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SUBCATEGORIES = [
  { code: 'en_us', label: 'English (US)' },
  { code: 'en_uk', label: 'English (UK)' },
];

const ALL_LANGUAGES = [
  { code: 'en_us', label: 'English (US)' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italian' },
  { code: 'ko', label: 'Korean' },
  { code: 'fr', label: 'Francais' },
  { code: 'ru', label: 'Russian' },
  { code: 'pl', label: 'Polish' },
  { code: 'es', label: 'Spanish' },
  { code: 'zh', label: 'Mandarin' },
];

const STORAGE_KEY = 'levelup_language';

export default function Language() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('en_us');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSelected(saved);
  }, []);

  const handleSelect = (code) => {
    setSelected(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  return (
    <div className="language-page">
      <div className="screen screen--narrow">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Language</h2>
        </div>
        <div className="language-section">
          <h3>Suggested</h3>
          {SUBCATEGORIES.map((option) => (
            <button
              key={option.code}
              type="button"
              className="language-row"
              onClick={() => handleSelect(option.code)}
            >
              <span>{option.label}</span>
              <span
                className={`language-check ${
                  selected === option.code ? 'active' : ''
                }`}
              >
                {selected === option.code ? 'v' : ''}
              </span>
            </button>
          ))}
        </div>
        <div className="language-section">
          <h3>Language</h3>
          {ALL_LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              className="language-row"
              onClick={() => handleSelect(option.code)}
            >
              <span>{option.label}</span>
              <span
                className={`language-check ${
                  selected === option.code ? 'active' : ''
                }`}
              >
                {selected === option.code ? 'v' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

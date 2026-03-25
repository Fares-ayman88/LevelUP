import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const buildItems = (labels, selected = []) =>
  labels.map((label) => ({ label, selected: selected.includes(label) }));

export default function Filter() {
  const navigate = useNavigate();
  const [subCategories, setSubCategories] = useState(
    buildItems(
      ['3D Design', 'Web Development', '3D Animation', 'Graphic Design', 'SEO & Marketing', 'Arts & Humanities'],
      ['Web Development', '3D Animation'],
    ),
  );
  const [levels, setLevels] = useState(
    buildItems(['All Levels', 'Beginners', 'Intermediate', 'Expert'], ['Beginners', 'Intermediate']),
  );
  const [prices, setPrices] = useState(buildItems(['Paid', 'Free'], ['Paid']));
  const [features, setFeatures] = useState(
    buildItems(['All Caption', 'Quizzes', 'Coding Exercise', 'Practice Tests']),
  );
  const [ratings, setRatings] = useState(
    buildItems(['4.5 & Up Above', '4.0 & Up Above', '3.5 & Up Above', '3.0 & Up Above']),
  );
  const [durations, setDurations] = useState(
    buildItems(['0-2 Hours', '3-6 Hours', '7-16 Hours', '17+ Hours']),
  );

  const groups = useMemo(
    () => [
      { title: 'SubCategories:', items: subCategories, setter: setSubCategories },
      { title: 'Levels:', items: levels, setter: setLevels },
      { title: 'Price:', items: prices, setter: setPrices },
      { title: 'Features:', items: features, setter: setFeatures },
      { title: 'Rating:', items: ratings, setter: setRatings },
      { title: 'Video Durations:', items: durations, setter: setDurations },
    ],
    [subCategories, levels, prices, features, ratings, durations],
  );

  const toggleItem = (items, setter, index) => {
    setter(items.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item)));
  };

  const clearAll = () => {
    setSubCategories(subCategories.map((item) => ({ ...item, selected: false })));
    setLevels(levels.map((item) => ({ ...item, selected: false })));
    setPrices(prices.map((item) => ({ ...item, selected: false })));
    setFeatures(features.map((item) => ({ ...item, selected: false })));
    setRatings(ratings.map((item) => ({ ...item, selected: false })));
    setDurations(durations.map((item) => ({ ...item, selected: false })));
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Filter</h2>
          <button type="button" className="link-button" onClick={clearAll}>Clear</button>
        </div>
        <div className="filter-list">
          {groups.map((group) => (
            <div key={group.title} className="filter-group">
              <h3>{group.title}</h3>
              {group.items.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  className="filter-item"
                  onClick={() => toggleItem(group.items, group.setter, index)}
                >
                  <span className={`filter-check ${item.selected ? 'active' : ''}`}>
                    {item.selected ? 'v' : ''}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <button type="button" className="primary-pill" onClick={() => navigate(-1)}>
          <span>Apply</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import SearchFiltersPanel from '../components/SearchFiltersPanel.jsx';
import { filtersToSearchParams, searchParamsToFilters } from '../components/searchFiltersLogic.js';

export default function Filter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => searchParamsToFilters(searchParams));
  const query = searchParams.get('q') || '';

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>
              arrow_back
            </span>
          </button>
          <h2>Filter</h2>
        </div>
        <div className="search-filters-page">
          <SearchFiltersPanel
            value={filters}
            onChange={setFilters}
            onApply={(nextFilters) => {
              const nextParams = filtersToSearchParams(nextFilters, query);
              navigate({
                pathname: '/search-results',
                search: nextParams.toString() ? `?${nextParams.toString()}` : '',
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

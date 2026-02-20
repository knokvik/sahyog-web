import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SearchResultsPopup.module.css';
import { useGlobalSearch } from '../api/useGlobalSearch';

export function SearchResultsPopup({ query, isVisible, onClose }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useGlobalSearch(query);

  if (!isVisible || query.trim().length < 2) {
    return null;
  }

  const handleResultClick = (item, type) => {
    // Navigate logic based on the type of result clicked
    onClose();
    switch (type) {
      case 'user':
      case 'volunteer':
        navigate('/users');
        break;
      case 'disaster':
        navigate('/disasters');
        break;
      case 'shelter':
        navigate('/shelters');
        break;
      case 'missing_person':
        navigate('/missing');
        break;
      default:
        break;
    }
  };

  const results = data?.data || {};
  const { users, volunteers, disasters, shelters, missing_persons } = results;
  const totalFound = data?.meta?.totalFound || 0;

  return (
    <div className={styles.popupWrapper}>
      {isLoading ? (
        <div className={styles.loadingState}>
          <span className="material-symbols-outlined pulse-animation" style={{ fontSize: 24, alignSelf: 'center', marginBottom: 8, color: '#3b82f6' }}>search</span>
          <span>Searching global records...</span>
        </div>
      ) : isError ? (
        <div className={styles.errorState}>
          <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>error</span>
          <span>Failed to search: {error?.message}</span>
        </div>
      ) : totalFound === 0 ? (
        <div className={styles.emptyState}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3 }}>inbox_clear</span>
          <p>No results found for "{query}"</p>
        </div>
      ) : (
        <div className={styles.resultsContainer}>
          {users?.length > 0 && (
            <div className={styles.categoryGroup}>
              <h4 className={styles.categoryHeader}>
                <span className="material-symbols-outlined">person</span>
                Users
              </h4>
              <ul className={styles.resultList}>
                {users.map(u => (
                  <li key={u.id} className={styles.resultItem} onClick={() => handleResultClick(u, 'user')}>
                    <span className={styles.resultMain}>{u.name}</span>
                    <span className={styles.resultSub}>{u.email}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {volunteers?.length > 0 && (
            <div className={styles.categoryGroup}>
              <h4 className={styles.categoryHeader}>
                <span className="material-symbols-outlined">group</span>
                Volunteers
              </h4>
              <ul className={styles.resultList}>
                {volunteers.map(v => (
                  <li key={v.id} className={styles.resultItem} onClick={() => handleResultClick(v, 'volunteer')}>
                    <span className={styles.resultMain}>{v.name}</span>
                    <span className={styles.resultSub}>{v.skills?.join(', ') || 'No specific skills listed'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {disasters?.length > 0 && (
            <div className={styles.categoryGroup}>
              <h4 className={styles.categoryHeader}>
                <span className="material-symbols-outlined">flood</span>
                Disasters
              </h4>
              <ul className={styles.resultList}>
                {disasters.map(d => (
                  <li key={d.id} className={styles.resultItem} onClick={() => handleResultClick(d, 'disaster')}>
                    <span className={styles.resultMain}>{d.name}</span>
                    <span className={styles.resultSub}>{d.type} - Severity: {d.severity}/10</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shelters?.length > 0 && (
            <div className={styles.categoryGroup}>
              <h4 className={styles.categoryHeader}>
                <span className="material-symbols-outlined">night_shelter</span>
                Shelters
              </h4>
              <ul className={styles.resultList}>
                {shelters.map(s => (
                  <li key={s.id} className={styles.resultItem} onClick={() => handleResultClick(s, 'shelter')}>
                    <span className={styles.resultMain}>{s.name}</span>
                    <span className={styles.resultSub}>Occupancy: {s.current_occupancy}/{s.capacity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missing_persons?.length > 0 && (
            <div className={styles.categoryGroup}>
              <h4 className={styles.categoryHeader}>
                <span className="material-symbols-outlined">person_search</span>
                Missing Persons
              </h4>
              <ul className={styles.resultList}>
                {missing_persons.map(m => (
                  <li key={m.id} className={styles.resultItem} onClick={() => handleResultClick(m, 'missing_person')}>
                    <span className={styles.resultMain}>{m.name}</span>
                    <span className={styles.resultSub}>Age: {m.age} - Status: {m.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

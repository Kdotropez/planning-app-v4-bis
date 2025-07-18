import React, { useState, useEffect } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { format, parseISO, isMonday, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import '../styles/WeekSelector.css';
import '../styles/App.css';

const WeekSelector = ({ onWeekSelect, onBack }) => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedWeek = localStorage.getItem('selectedWeek');
    if (savedWeek) {
      try {
        const parsedDate = parseISO(savedWeek);
        if (isMonday(parsedDate)) {
          setSelectedWeek(savedWeek);
          console.log('WeekSelector: Loaded valid Monday from localStorage:', savedWeek);
        } else {
          console.warn('WeekSelector: Invalid Monday in localStorage:', savedWeek);
          localStorage.removeItem('selectedWeek');
          setSelectedWeek('');
        }
      } catch (error) {
        console.error('WeekSelector: Error parsing savedWeek from localStorage:', error);
        localStorage.removeItem('selectedWeek');
        setSelectedWeek('');
      }
    } else {
      console.log('WeekSelector: No week found in localStorage');
    }
    console.log('WeekSelector: Component mounted');
  }, []);

  const handleAddWeek = (week) => {
    console.log('WeekSelector: Attempting to add week:', week);
    try {
      const parsedDate = parseISO(week);
      if (isMonday(parsedDate)) {
        setSelectedWeek(week);
        setError('');
        localStorage.setItem('selectedWeek', week);
        console.log('WeekSelector: Selected valid Monday:', week);
      } else {
        setError('Veuillez sélectionner un lundi.');
        console.warn('WeekSelector: Selected date is not a Monday:', week);
      }
    } catch (error) {
      setError('Date invalide.');
      console.error('WeekSelector: Error parsing selected week:', error);
    }
  };

  const handleWeekChange = (e) => {
    const selectedDate = e.target.value;
    console.log('WeekSelector: Date input changed:', selectedDate);
    if (selectedDate) {
      handleAddWeek(selectedDate);
    }
  };

  const handleReset = () => {
    setSelectedWeek('');
    setError('');
    localStorage.removeItem('selectedWeek');
    console.log('WeekSelector: Reset week and cleared localStorage');
  };

  const getWeekRangeDisplay = (week) => {
    if (!week) return '';
    try {
      const monday = parseISO(week);
      const sunday = addDays(monday, 6);
      return `lundi ${format(monday, 'dd MMMM', { locale: fr })} au dimanche ${format(sunday, 'dd MMMM', { locale: fr })}`;
    } catch (error) {
      console.error('WeekSelector: Error formatting week range:', error);
      return '';
    }
  };

  return (
    <div className="week-selector-container">
      <h2>Sélectionner la semaine</h2>
      <div className="add-week-section">
        <p className="week-message">Veuillez sélectionner un lundi</p>
        {error && <p className="error-message" style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
        <label className="calendar-label" htmlFor="week-input">
          <FaArrowRight className="calendar-arrow" />
          <input
            id="week-input"
            type="date"
            value={selectedWeek}
            onChange={handleWeekChange}
            className="week-input"
            title="Sélectionner un lundi"
          />
        </label>
        {selectedWeek && <p className="week-display">{getWeekRangeDisplay(selectedWeek)}</p>}
      </div>
      <div className="action-buttons">
        <button
          className="validate-btn"
          onClick={() => {
            console.log('WeekSelector: Validating week:', selectedWeek);
            onWeekSelect([selectedWeek]);
          }}
          disabled={!selectedWeek || error}
        >
          Valider
        </button>
        <div className="secondary-buttons">
          <button className="reset-button" onClick={handleReset} title="Réinitialiser la semaine">
            Réinitialiser
          </button>
          <button
            className="back-btn"
            onClick={() => {
              console.log('WeekSelector: Returning to previous screen');
              onBack();
            }}
            title="Retour"
          >
            Retour
          </button>
        </div>
      </div>
      <p className="copyright">© Nicolas Lefèvre 2025 Klick Planning</p>
    </div>
  );
};

export default WeekSelector;
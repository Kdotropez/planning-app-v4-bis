import React, { useState, useEffect } from 'react';
import { parse, addMinutes, format } from 'date-fns';
import '../styles/TimeSlotConfig.css';
import '../styles/App.css';

const generateTimeSlots = (startTime, endTime, interval) => {
  const start = parse(startTime, 'HH:mm', new Date());
  let end = parse(endTime === '24:00' ? '23:59' : endTime, 'HH:mm', new Date());
  const slots = interval === 15
    ? { morning: [], earlyAfternoon: [], lateAfternoon: [], earlyEvening: [], lateEvening: [] }
    : { morning: [], afternoon: [], evening: [] };
  let current = start;
  while (current <= end) {
    const next = addMinutes(current, interval);
    const slot = `${format(current, 'HH:mm')}-${format(next, 'HH:mm')}`;
    const hour = current.getHours();
    if (interval === 15) {
      if (hour < 12) slots.morning.push(slot);
      else if (hour < 15) slots.earlyAfternoon.push(slot);
      else if (hour < 18) slots.lateAfternoon.push(slot);
      else if (hour < 21) slots.earlyEvening.push(slot);
      else slots.lateEvening.push(slot);
    } else {
      if (hour < 12) slots.morning.push(slot);
      else if (hour < 18) slots.afternoon.push(slot);
      else slots.evening.push(slot);
    }
    current = next;
  }
  return slots;
};

const TimeSlotConfig = ({ onConfigComplete, onBack }) => {
  const [interval, setInterval] = useState('30');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('24:00');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedConfig = JSON.parse(localStorage.getItem('timeSlotConfig_global') || '{}');
    if (savedConfig.interval) {
      setInterval(savedConfig.interval);
      setStartTime(savedConfig.startTime || '09:00');
      setEndTime(savedConfig.endTime || '24:00');
      console.log('TimeSlotConfig: Loaded config from localStorage:', savedConfig);
    }
  }, []);

  const handleIntervalChange = (e) => {
    const newInterval = parseInt(e.target.value);
    setInterval(newInterval);
    const config = { interval: newInterval, startTime, endTime };
    localStorage.setItem('timeSlotConfig_global', JSON.stringify(config));
    console.log('TimeSlotConfig: Updated interval:', newInterval);
  };

  const handleStartTimeChange = (e) => {
    const newStartTime = e.target.value;
    setStartTime(newStartTime);
    const config = { interval, startTime: newStartTime, endTime };
    localStorage.setItem('timeSlotConfig_global', JSON.stringify(config));
    console.log('TimeSlotConfig: Updated start time:', newStartTime);
  };

  const handleEndTimeChange = (e) => {
    let newEndTime = e.target.value;
    if (newEndTime === '23:59') {
      newEndTime = '24:00'; // Allow 24:00 as end of day
    }
    setEndTime(newEndTime);
    const config = { interval, startTime, endTime: newEndTime };
    localStorage.setItem('timeSlotConfig_global', JSON.stringify(config));
    console.log('TimeSlotConfig: Updated end time:', newEndTime);
  };

  const handleReset = () => {
    setInterval('30');
    setStartTime('09:00');
    setEndTime('24:00');
    setError('');
    localStorage.removeItem('timeSlotConfig_global');
    console.log('TimeSlotConfig: Reset config and cleared localStorage');
  };

  const handleValidate = () => {
    if (!interval || !startTime || !endTime) {
      setError('Veuillez remplir tous les champs.');
      console.log('TimeSlotConfig: Validation failed - missing fields:', { interval, startTime, endTime });
      return;
    }

    const startMinutes = parseInt(startTime.replace(':', ''));
    let endMinutes = endTime === '24:00' ? 24 * 60 : parseInt(endTime.replace(':', ''));

    if (startMinutes >= endMinutes) {
      setError('L’heure de fin doit être postérieure à l’heure de début.');
      console.log('TimeSlotConfig: Validation failed - endTime not after startTime:', { startMinutes, endMinutes });
      return;
    }

    if (![15, 30, 60].includes(Number(interval))) {
      setError('L’intervalle doit être 15, 30 ou 60 minutes.');
      console.log('TimeSlotConfig: Validation failed - invalid interval:', { interval });
      return;
    }

    const timeSlots = generateTimeSlots(startTime, endTime, Number(interval));
    const config = { interval: Number(interval), startTime, endTime, ...timeSlots };
    localStorage.setItem('timeSlotConfig_global', JSON.stringify(config));
    console.log('TimeSlotConfig: Saving config to localStorage:', config);
    try {
      onConfigComplete(config);
      console.log('TimeSlotConfig: Successfully called onConfigComplete with config:', config);
    } catch (error) {
      console.error('TimeSlotConfig: Error calling onConfigComplete:', error);
      setError('Erreur lors du passage à l’étape suivante. Vérifiez la console.');
    }
  };

  return (
    <div className="timeslot-config-container">
      <h2>Configurer les tranches horaires</h2>
      <div className="config-section">
        <p className="config-message">Sélectionner un intervalle</p>
        <select
          value={interval}
          onChange={handleIntervalChange}
          className="interval-select"
        >
          <option value="">-- Choisir un intervalle --</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </select>
        <p className="config-message">Heure de début</p>
        <input
          type="time"
          value={startTime}
          onChange={handleStartTimeChange}
          className="time-input"
        />
        <p className="config-message">Heure de fin</p>
        <input
          type="time"
          value={endTime === '24:00' ? '23:59' : endTime}
          onChange={handleEndTimeChange}
          className="time-input"
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="action-buttons">
        <button
          className="validate-btn"
          onClick={handleValidate}
          disabled={!interval || !startTime || !endTime}
        >
          Valider
        </button>
        <div className="secondary-buttons">
          <button className="reset-button" onClick={handleReset} title="Réinitialiser la configuration">
            Réinitialiser
          </button>
          <button
            className="back-btn"
            onClick={() => {
              console.log('TimeSlotConfig: Returning to previous screen');
              onBack();
            }}
            title="Retour"
          >
            Retour
          </button>
        </div>
      </div>
      <p className="copyright">© Nicolas Lefevre 2025 Klick Planning</p>
    </div>
  );
};

export default TimeSlotConfig;
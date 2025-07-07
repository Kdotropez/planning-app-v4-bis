import React, { useState, useEffect } from 'react';
import { format, addDays, parse, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FaCopy, FaPaste, FaUndo, FaToggleOn } from 'react-icons/fa';
import Modal from './Modal';
import {
  copyDay,
  pasteDay,
  copyPreviousWeek,
  pastePreviousWeek,
  confirmPastePreviousWeek,
} from './CopyPasteUtils';
import {
  calculateWeeklyHours,
  getEmployeeWeeklySchedule,
  getShopDailySchedule,
  getAllTimeSlots,
} from './ScheduleUtils';
import {
  calculateDailyHoursForTable,
  exportEmployeeSummaryToPDF,
  exportEmployeeScheduleToPDF,
  exportShopScheduleToPDF,
  exportWeeklySummaryToPDF,
} from './PDFExport';
import '../styles/PlanningTable.css';

const PlanningTable = ({
  employees = [],
  selectedWeek,
  selectedShop,
  onBackToShop,
  onBackToWeek,
  onBackToEmployees,
  onBackToConfig,
  onWeekChange,
  timeSlotConfig,
}) => {
  const [planning, setPlanning] = useState({});
  const [selectedDay, setSelectedDay] = useState('Lundi');
  const [showCopyPaste, setShowCopyPaste] = useState(false);
  const [copyMode, setCopyMode] = useState('all');
  const [sourceDay, setSourceDay] = useState('');
  const [targetDays, setTargetDays] = useState([]);
  const [sourceEmployee, setSourceEmployee] = useState('');
  const [targetEmployee, setTargetEmployee] = useState('');
  const [copiedData, setCopiedData] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [previousWeek, setPreviousWeek] = useState('');
  const [previousWeeks, setPreviousWeeks] = useState([]);
  const [showConfirmPaste, setShowConfirmPaste] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [selectedEmployeeForRecap, setSelectedEmployeeForRecap] = useState('');
  const [isEmployeeRecapModalOpen, setIsEmployeeRecapModalOpen] = useState(false);
  const [isWeeklyRecapModalOpen, setIsWeeklyRecapModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  useEffect(() => {
    if (!selectedShop || !selectedWeek) {
      setError('Boutique ou semaine non sélectionnée');
      return;
    }

    const key = `planning_${selectedShop}_${selectedWeek}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          setPlanning(parsed);
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Loaded planning from localStorage:', parsed);
          }
        } else {
          setPlanning({});
          setError('Données de planning invalides dans localStorage');
        }
      } else {
        setPlanning({});
        if (process.env.NODE_ENV !== 'production') {
          console.log('PlanningTable: No planning data found in localStorage for key:', key);
        }
      }
    } catch (error) {
      console.error('PlanningTable: Error loading planning from localStorage:', error);
      setPlanning({});
      setError('Erreur lors du chargement du planning');
    }

    const weeks = [];
    for (let i = 0; i < 52; i++) {
      const week = format(addDays(new Date(selectedWeek), -i * 7), 'yyyy-MM-dd');
      if (localStorage.getItem(`planning_${selectedShop}_${week}`)) {
        weeks.push(week);
      }
    }
    setPreviousWeeks(weeks);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Loaded previous weeks:', weeks);
    }
  }, [selectedShop, selectedWeek]);

  const getCouleurJour = (index, context) => {
    const buttonColors = [
      '#4a90e2',
      '#50c878',
      '#e74c3c',
      '#9b59b6',
      '#f1c40f',
      '#e67e22',
      '#1abc9c',
    ];
    const tableColors = ['#e6f0fa', '#e6ffed', '#fff5f5', '#e0f7fa', '#f3e5f5', '#fff3e0', '#e8f5e9'];
    const color = context === 'total-btn' ? buttonColors[index % buttonColors.length] : tableColors[index % tableColors.length];
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: getCouleurJour called with index:', index, 'context:', context, 'returning:', color);
    }
    return color;
  };

  const getEmployeeColor = (employee) => {
    const pastelColors = [
      '#e6f0fa',
      '#e6ffed',
      '#fff5f5',
      '#e0f7fa',
      '#f3e5f5',
      '#fff3e0',
      '#e8f5e9',
    ];
    const index = employees.indexOf(employee) % pastelColors.length;
    return pastelColors[index];
  };

  const formatTimeSlot = (timeRange) => {
    const [start, end] = timeRange.split('-');
    const formatTime = (time) => {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    };
    return (
      <div className="time-slot-header">
        <span>De <span className="time-value">{formatTime(start)}</span></span>
        <span>à <span className="time-value">{formatTime(end)}</span></span>
      </div>
    );
  };

  const balanceTimeSlots = () => {
    if (!timeSlotConfig || !timeSlotConfig.interval || !timeSlotConfig.startTime || !timeSlotConfig.endTime) {
      setError('Configuration des créneaux horaires invalide');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('PlanningTable: Invalid timeSlotConfig, using default values:', timeSlotConfig);
      }
      return {
        morning: [],
        afternoon: [],
        evening: [],
        earlyAfternoon: [],
        lateAfternoon: [],
        earlyEvening: [],
        lateEvening: [],
      };
    }

    const interval = timeSlotConfig.interval;
    const start = parse(timeSlotConfig.startTime, 'HH:mm', new Date());
    const end = parse(timeSlotConfig.endTime === '24:00' ? '23:59' : timeSlotConfig.endTime, 'HH:mm', new Date());
    const slots = interval === 15
      ? { morning: [], earlyAfternoon: [], lateAfternoon: [], earlyEvening: [], lateEvening: [] }
      : { morning: [], afternoon: [], evening: [] };
    const allSlots = [];
    let current = start;
    while (current <= end) {
      const next = addMinutes(current, interval);
      const slot = `${format(current, 'HH:mm')}-${format(next, 'HH:mm')}`;
      allSlots.push(slot);
      current = next;
    }

    if (interval === 15) {
      allSlots.forEach((slot, index) => {
        const hour = parseInt(slot.split('-')[0].split(':')[0]);
        if (hour < 12) slots.morning.push(slot);
        else if (hour < 15) slots.earlyAfternoon.push(slot);
        else if (hour < 18) slots.lateAfternoon.push(slot);
        else if (hour < 21) slots.earlyEvening.push(slot);
        else slots.lateEvening.push(slot);
      });
    } else {
      const slotsPerTable = Math.floor(allSlots.length / 3);
      slots.morning = allSlots.slice(0, slotsPerTable);
      slots.afternoon = allSlots.slice(slotsPerTable, 2 * slotsPerTable);
      slots.evening = allSlots.slice(2 * slotsPerTable);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Generated time slots for interval', interval, ':', slots);
    }
    return slots;
  };

  const timeSlots = balanceTimeSlots();

  const calculateTotalDailyHours = (localEmployees, selectedDay, planning, timeSlots) => {
    if (!localEmployees || !localEmployees.length) {
      return '0.0';
    }
    const total = localEmployees.reduce((sum, employee) => sum + parseFloat(calculateDailyHoursForTable(employee, selectedDay, planning, timeSlots) || 0), 0).toFixed(1);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`calculateTotalDailyHours: ${selectedDay}: ${total}h`);
    }
    return total;
  };

  const calculateWeeklyHoursForTable = (employee, planning, timeSlots) => {
    if (!timeSlots) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('PlanningTable: Invalid timeSlots for calculateWeeklyHoursForTable:', timeSlots);
      }
      return 0;
    }
    let totalHours = 0;
    days.forEach((day) => {
      totalHours += parseFloat(calculateDailyHoursForTable(employee, day, planning, timeSlots) || 0);
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`calculateWeeklyHoursForTable: ${employee}: ${totalHours.toFixed(1)}h`);
    }
    return totalHours.toFixed(1);
  };

  const handleToggleSlot = (employee, day, timeRange) => {
    const key = `${day}_${timeRange}_${employee}`;
    setPlanning((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const keyStorage = `planning_${selectedShop}_${selectedWeek}`;
      try {
        localStorage.setItem(keyStorage, JSON.stringify(updated));
        if (process.env.NODE_ENV !== 'production') {
          console.log(`PlanningTable: Toggled ${key}, saved to localStorage:`, updated);
        }
      } catch (error) {
        console.error('PlanningTable: Error saving to localStorage:', error);
        setError('Erreur lors de la sauvegarde du planning');
      }
      return updated;
    });
  };

  const handleReset = () => {
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    const key = `planning_${selectedShop}_${selectedWeek}`;
    try {
      localStorage.removeItem(key);
      if (process.env.NODE_ENV !== 'production') {
        console.log('PlanningTable: Planning reset and removed from localStorage:', key);
      }
    } catch (error) {
      console.error('PlanningTable: Error removing from localStorage:', error);
      setError('Erreur lors de la réinitialisation du planning');
    }
    setPlanning({});
    setShowConfirmReset(false);
  };

  const handleDayChange = (day) => {
    setSelectedDay(day);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Changed selected day to:', day);
    }
  };

  const handleCopyDay = () => {
    copyDay(sourceDay, copyMode, sourceEmployee, employees, timeSlots, planning, setCopiedData, setCopyFeedback);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Copied day:', sourceDay, 'mode:', copyMode, 'employee:', sourceEmployee);
    }
  };

  const handlePasteDay = () => {
    pasteDay(targetDays, targetEmployee, copiedData, copyMode, planning, setPlanning, setCopyFeedback, setCopiedData);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Pasted to days:', targetDays, 'employee:', targetEmployee);
    }
  };

  const handleCopyPreviousWeek = () => {
    copyPreviousWeek(previousWeek, selectedShop, setCopiedData, setCopyFeedback);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Copied previous week:', previousWeek);
    }
  };

  const handlePastePreviousWeek = () => {
    pastePreviousWeek(copiedData, setCopyFeedback, setShowConfirmPaste);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Initiated paste of previous week');
    }
  };

  const handleConfirmPastePreviousWeek = () => {
    confirmPastePreviousWeek(
      copiedData,
      selectedShop,
      new Date(selectedWeek),
      planning,
      setPlanning,
      setCopyFeedback,
      setShowConfirmPaste,
      setCopiedData
    );
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Confirmed paste of previous week');
    }
  };

  const handleResetSelections = () => {
    setSourceDay('');
    setTargetDays([]);
    setSourceEmployee('');
    setTargetEmployee('');
    setCopyMode('all');
    setCopiedData(null);
    setCopyFeedback('');
    setPreviousWeek('');
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Reset copy/paste selections');
    }
  };

  const handleToggleCopyPaste = () => {
    setShowCopyPaste(!showCopyPaste);
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Toggled copy-paste section:', !showCopyPaste);
    }
  };

  const handleEmployeeRecapClick = (employee) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Opening employee recap modal for:', employee);
    }
    setSelectedEmployeeForRecap(employee);
    setIsEmployeeRecapModalOpen(true);
  };

  const handleWeeklyRecapClick = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('PlanningTable: Opening weekly recap modal for shop:', selectedShop);
    }
    setIsWeeklyRecapModalOpen(true);
  };

  const renderTimeSlotTable = (period, slots, periodName) => {
    if (slots.length === 0) {
      return <div className="error-message">Aucun créneau horaire disponible pour {periodName}. Veuillez vérifier la configuration.</div>;
    }
    return (
      <div className="time-slot-section">
        <table className="planning-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th className="fixed-col" style={{ maxWidth: '180px', width: '180px', minWidth: '180px', fontSize: '14px' }}>{periodName}</th>
              {slots.map((timeRange) => (
                <th key={`${period}_${timeRange}`} className="scrollable-col" style={{ width: '60px', minWidth: '60px', fontSize: '14px' }}>
                  {formatTimeSlot(timeRange)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={`${period}_${employee}`}>
                <td className="fixed-col">
                  {employee} ({calculateDailyHoursForTable(employee, selectedDay, planning, timeSlots)} h)
                </td>
                {slots.map((timeRange) => (
                  <td
                    key={`${period}_${employee}_${timeRange}`}
                    className="scrollable-col"
                    onClick={() => handleToggleSlot(employee, selectedDay, timeRange)}
                    style={{ backgroundColor: planning[`${selectedDay}_${timeRange}_${employee}`] ? getEmployeeColor(employee) : '', fontSize: '14px', transition: 'background-color 0.2s' }}
                  >
                    {planning[`${selectedDay}_${timeRange}_${employee}`] ? '✅' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const is15MinuteInterval = timeSlotConfig && timeSlotConfig.interval === 15;

  return (
    <div className="planning-container">
      {error && <div className="error-message">{error}</div>}
      <h2 style={{ fontFamily: 'Roboto', fontSize: '24px', fontWeight: 'bold' }}>Planning pour {selectedShop}</h2>
      <h3 className="selected-day">Jour sélectionné : {selectedDay}</h3>
      <div className="header-info">
        <div style={{ fontFamily: 'Roboto', fontSize: '18px', fontWeight: 'bold' }}>
          Lundi {selectedWeek ? format(new Date(selectedWeek), 'dd/MM/yy', { locale: fr }) : '-'} au Dimanche {selectedWeek ? format(addDays(new Date(selectedWeek), 6), 'dd/MM/yy', { locale: fr }) : '-'}
        </div>
        <div style={{ fontFamily: 'Roboto', fontSize: '18px', fontWeight: 'bold' }}>Employés: {employees.length ? employees.join(', ') : 'Aucun employé sélectionné'}</div>
        <div className="back-btn-container">
          {[
            { label: 'Retour Boutique', onClick: onBackToShop, className: 'back-btn back-btn-primary', log: 'Returning to shop selection' },
            { label: 'Retour Semaine', onClick: onBackToWeek, className: 'back-btn', log: 'Returning to week selection' },
            { label: 'Retour Employés', onClick: onBackToEmployees, className: 'back-btn', log: 'Returning to employee selection' },
            { label: 'Retour Configuration', onClick: onBackToConfig, className: 'back-btn', log: 'Returning to time slot configuration' },
            { label: 'Réinitialiser', onClick: handleReset, className: 'reset-button', log: 'Resetting planning' },
          ].map((btn, index) => (
            <button
              key={btn.label}
              className={btn.className}
              onClick={() => {
                if (process.env.NODE_ENV !== 'production') {
                  console.log(`PlanningTable: ${btn.log}`);
                }
                btn.onClick();
              }}
              title={btn.label}
              style={{
                fontFamily: 'Roboto',
                backgroundColor: btn.className.includes('reset-button') ? '#c00' : '#4a90e2',
                color: 'white',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s, transform 0.1s',
                minWidth: '90px',
                height: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1.4',
              }}
            >
              <span>{btn.label.split(' ')[0]}</span>
              <span>{btn.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="total-hours-fixed">
        {days.map((day, index) => (
          <button
            key={day}
            className={`total-btn ${selectedDay === day ? 'active' : ''}`}
            onClick={() => handleDayChange(day)}
            title={`Voir le planning pour ${day}`}
            style={{ 
              fontFamily: 'Roboto', 
              backgroundColor: getCouleurJour(index, 'total-btn'), 
              color: 'white', 
              borderRadius: '8px', 
              padding: '10px', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              transition: 'background-color 0.2s, transform 0.1s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '90px',
              height: '60px'
            }}
          >
            <span>{day}</span>
            <span>({calculateTotalDailyHours(employees, day, planning, timeSlots)} h)</span>
          </button>
        ))}
      </div>

      <div className="recap-controls">
        {employees.map((employee) => (
          <button
            key={employee}
            className="recap-btn"
            onClick={() => handleEmployeeRecapClick(employee)}
            title={`Récapitulatif hebdomadaire de ${employee}`}
            style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
          >
            Recap {employee}: <strong>{calculateWeeklyHoursForTable(employee, planning, timeSlots)} h</strong>
          </button>
        ))}
        <button
          className="recap-btn"
          onClick={() => handleWeeklyRecapClick()}
          title="Récapitulatif hebdomadaire de la boutique"
          style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
        >
          Récapitulatif semaine
        </button>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          {renderTimeSlotTable('morning', timeSlots.morning, 'Matin')}
          {is15MinuteInterval ? (
            <>
              {renderTimeSlotTable('earlyAfternoon', timeSlots.earlyAfternoon, 'Début après-midi')}
              {renderTimeSlotTable('lateAfternoon', timeSlots.lateAfternoon, 'Fin après-midi')}
              {renderTimeSlotTable('earlyEvening', timeSlots.earlyEvening, 'Début soirée')}
              {renderTimeSlotTable('lateEvening', timeSlots.lateEvening, 'Fin soirée')}
            </>
          ) : (
            <>
              {renderTimeSlotTable('afternoon', timeSlots.afternoon, 'Après-midi')}
              {renderTimeSlotTable('evening', timeSlots.evening, 'Soirée')}
            </>
          )}
        </div>
      </div>

      <button
        className="back-btn"
        onClick={() => handleToggleCopyPaste()}
        title="Afficher/Masquer les options de copier/coller"
        style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
      >
        <FaToggleOn /> {showCopyPaste ? 'Masquer' : 'Afficher'} Copier/Coller
      </button>

      {showCopyPaste && (
        <div className="copy-paste-section">
          <div className="copy-paste-controls">
            <h4 style={{ fontFamily: 'Roboto', fontSize: '18px' }}>Copier/Coller un jour</h4>
            <div className="control-group">
              <label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Mode de copie :</label>
              <select
                value={copyMode}
                onChange={(e) => {
                  setCopyMode(e.target.value);
                  if (process.env.NODE_ENV !== 'production') {
                    console.log('PlanningTable: Changed copy mode to:', e.target.value);
                  }
                }}
                className="copy-mode-select"
                style={{ fontFamily: 'Roboto', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="all">Tous les employés</option>
                <option value="individual">Un employé</option>
                <option value="employeeToEmployee">D’un employé à un autre</option>
              </select>
            </div>
            <div className="control-group">
              <label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Jour source :</label>
              <select
                value={sourceDay}
                onChange={(e) => {
                  setSourceDay(e.target.value);
                  if (process.env.NODE_ENV !== 'production') {
                    console.log('PlanningTable: Changed source day to:', e.target.value);
                  }
                }}
                className="day-select"
                style={{ fontFamily: 'Roboto', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">-- Sélectionner un jour --</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            {(copyMode === 'individual' || copyMode === 'employeeToEmployee') && (
              <div className="control-group">
                <label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Employé source :</label>
                <select
                  value={sourceEmployee}
                  onChange={(e) => {
                    setSourceEmployee(e.target.value);
                    if (process.env.NODE_ENV !== 'production') {
                      console.log('PlanningTable: Changed source employee to:', e.target.value);
                    }
                  }}
                  className="employee-select"
                  style={{ fontFamily: 'Roboto', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                >
                  <option value="">-- Sélectionner un employé --</option>
                  {employees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {copyMode === 'employeeToEmployee' && (
              <div className="control-group">
                <label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Employé cible :</label>
                <select
                  value={targetEmployee}
                  onChange={(e) => {
                    setTargetEmployee(e.target.value);
                    if (process.env.NODE_ENV !== 'production') {
                      console.log('PlanningTable: Changed target employee to:', e.target.value);
                    }
                  }}
                  className="employee-select"
                  style={{ fontFamily: 'Roboto', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                >
                  <option value="">-- Sélectionner un employé --</option>
                  {employees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="control-group">
              <label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Jours cibles :</label>
              <div className="target-days">
                {days.map((day) => (
                  <label key={day} style={{ fontFamily: 'Roboto', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={targetDays.includes(day)}
                      onChange={() => {
                        if (targetDays.includes(day)) {
                          setTargetDays(targetDays.filter((d) => d !== day));
                        } else {
                          setTargetDays([...targetDays, day]);
                        }
                        if (process.env.NODE_ENV !== 'production') {
                          console.log('PlanningTable: Toggled target day:', day, 'New target days:', targetDays);
                        }
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="button-group">
              <button
                className="copy-btn"
                onClick={() => handleCopyDay()}
                disabled={!sourceDay || (copyMode !== 'all' && !sourceEmployee)}
                title="Copier les données du jour"
                style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
              >
                <FaCopy /> Copier
              </button>
              <button
                className="copy-btn"
                onClick={() => handlePasteDay()}
                disabled={!copiedData || targetDays.length === 0 || (copyMode === 'employeeToEmployee' && !targetEmployee)}
                title="Coller les données"
                style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
              >
                <FaPaste /> Coller
              </button>
              <button
                className="reset-button"
                onClick={() => handleResetSelections()}
                disabled={!sourceDay && !sourceEmployee && !targetEmployee && targetDays.length === 0 && !copiedData}
                title="Réinitialiser les sélections"
                style={{ fontFamily: 'Roboto', backgroundColor: '#c00', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
              >
                Réinitialiser
              </button>
            </div>
            {copyFeedback && <div className="copy-feedback" style={{ fontFamily: 'Roboto', fontSize: '14px', color: '#4a90e2' }}>{copyFeedback}</div>}
          </div>

          <div className="copy-paste-controls">
            <h4 style={{ fontFamily: 'Roboto', fontSize: '18px' }}>Copier/Coller une semaine existante</h4>
            <div className="control-group">
              <label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Semaine source :</label>
              <select
                value={previousWeek}
                onChange={(e) => {
                  setPreviousWeek(e.target.value);
                  if (process.env.NODE_ENV !== 'production') {
                    console.log('PlanningTable: Changed previous week to:', e.target.value);
                  }
                }}
                className="previous-week-select"
                style={{ fontFamily: 'Roboto', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">-- Sélectionner une semaine --</option>
                {previousWeeks.map((week) => (
                  <option key={week} value={week}>
                    {format(new Date(week), 'dd/MM/yy', { locale: fr })}
                  </option>
                ))}
              </select>
            </div>
            <div className="button-group">
              <button
                className="copy-btn"
                onClick={() => handleCopyPreviousWeek()}
                disabled={!previousWeek}
                title="Copier la semaine sélectionnée"
                style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
              >
                <FaCopy /> Copier semaine
              </button>
              <button
                className="copy-btn"
                onClick={() => handlePastePreviousWeek()}
                disabled={!copiedData}
                title="Coller la semaine"
                style={{ fontFamily: 'Roboto', backgroundColor: '#4a90e2', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
              >
                <FaPaste /> Coller semaine
              </button>
              <button
                className="reset-button"
                onClick={() => handleResetSelections()}
                disabled={!sourceDay && !sourceEmployee && !targetEmployee && targetDays.length === 0 && !copiedData}
                title="Réinitialiser les sélections"
                style={{ fontFamily: 'Roboto', backgroundColor: '#c00', color: 'white', borderRadius: '8px', padding: '10px 20px', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s, transform 0.1s' }}
              >
                Réinitialiser
              </button>
            </div>
            {copyFeedback && <div className="copy-feedback" style={{ fontFamily: 'Roboto', fontSize: '14px', color: '#4a90e2' }}>{copyFeedback}</div>}
          </div>
        </div>
      )}

      <Modal
        isOpen={isEmployeeRecapModalOpen}
        onClose={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Closing employee recap modal');
          }
          setIsEmployeeRecapModalOpen(false);
          setSelectedEmployeeForRecap('');
        }}
        onConfirm={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Exporting employee summary PDF for:', selectedEmployeeForRecap);
          }
          exportEmployeeSummaryToPDF(selectedEmployeeForRecap, planning, timeSlotConfig, selectedShop, new Date(selectedWeek), days, getCouleurJour, timeSlots);
          setIsEmployeeRecapModalOpen(false);
          setSelectedEmployeeForRecap('');
        }}
        message={
          <div style={{ display: 'flex', justifyContent: 'left' }}>
            <div style={{ width: '500px' }}>
              <h3 style={{ fontFamily: 'Roboto', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                Récapitulatif de <span style={{ color: '#333333' }}>{selectedEmployeeForRecap || 'Non spécifié'}</span> ({calculateWeeklyHoursForTable(selectedEmployeeForRecap, planning, timeSlots)} h)
              </h3>
              <p style={{ fontFamily: 'Roboto', fontWeight: 'bold', margin: '5px 0', fontSize: '14px' }}>
                Boutique: {selectedShop || 'Non spécifié'}
              </p>
              <p style={{ fontFamily: 'Roboto', fontWeight: 'bold', margin: '5px 0', fontSize: '14px' }}>
                Semaine: {selectedWeek ? `lundi ${format(new Date(selectedWeek), 'dd/MM/yy', { locale: fr })} au dimanche ${format(addDays(new Date(selectedWeek), 6), 'dd/MM/yy', { locale: fr })}` : '-'}
              </p>
              <table className="recap-table" style={{ fontFamily: 'Roboto', width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Jour</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Arrivée</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Sortie</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Retour</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Fin</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '70px', fontSize: '14px' }}>Heures effectives</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployeeForRecap && getEmployeeWeeklySchedule(selectedEmployeeForRecap, planning, timeSlots, timeSlotConfig, days, getCouleurJour).map(({ day, periods, totalHours }, index) => (
                    <tr key={day} style={{ backgroundColor: getCouleurJour(index, 'recap-table') }}>
                      <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>{day}</td>
                      <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{periods[0].arrival || '-'}</td>
                      <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{periods[0].departure || '-'}</td>
                      <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{periods[0].return || '-'}</td>
                      <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{periods[0].end || '-'}</td>
                      <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '70px', fontSize: '14px' }}>{totalHours} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontFamily: 'Roboto', marginTop: '10px', fontSize: '14px' }}>Voulez-vous exporter en PDF ?</p>
              <p className="copyright" style={{ fontFamily: 'Roboto', fontSize: '10px', color: '#666' }}>© Nicolas Lefèvre 2025</p>
            </div>
          </div>
        }
        style={{ width: '500px', padding: '20px', fontFamily: 'Roboto' }}
      />

      <Modal
        isOpen={isWeeklyRecapModalOpen}
        onClose={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Closing weekly recap modal');
          }
          setIsWeeklyRecapModalOpen(false);
        }}
        onConfirm={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Exporting weekly summary PDF for shop:', selectedShop);
          }
          exportWeeklySummaryToPDF(employees, planning, timeSlotConfig, selectedShop, new Date(selectedWeek), days, getCouleurJour, timeSlots);
          setIsWeeklyRecapModalOpen(false);
        }}
        message={
          <div style={{ display: 'flex', justifyContent: 'left' }}>
            <div style={{ width: '500px', maxHeight: '50vh', overflowY: 'auto' }}>
              <h3 style={{ fontFamily: 'Roboto', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                Récapitulatif de {selectedShop || 'Non spécifié'}
              </h3>
              <p style={{ fontFamily: 'Roboto', fontWeight: 'bold', margin: '5px 0', fontSize: '14px' }}>
                Semaine: {selectedWeek ? `lundi ${format(new Date(selectedWeek), 'dd/MM/yy', { locale: fr })} au dimanche ${format(addDays(new Date(selectedWeek), 6), 'dd/MM/yy', { locale: fr })}` : '-'}
              </p>
              <table className="recap-table" style={{ fontFamily: 'Roboto', width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Jour</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '90px', fontSize: '14px' }}>Employé</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Arrivée</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Sortie</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Retour</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>Fin</th>
                    <th style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '70px', fontSize: '14px' }}>Heures effectives</th>
                  </tr>
                </thead>
                <tbody>
                  {getShopDailySchedule(employees, planning, timeSlots, timeSlotConfig, days, getCouleurJour).map((dayData, index) => (
                    <tr key={dayData.day} style={{ backgroundColor: getCouleurJour(index, 'recap-table') }}>
                      {dayData.employees.map((emp, idx) => (
                        <>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '60px', fontSize: '14px' }}>{idx === 0 ? dayData.day : ''}</td>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '90px', fontSize: '14px' }}>{emp.name}</td>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{emp.periods[0]?.arrival || '-'}</td>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{emp.periods[0]?.departure || '-'}</td>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{emp.periods[0]?.return || '-'}</td>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'normal', textAlign: 'left', width: '60px', fontSize: '14px' }}>{emp.periods[0]?.end || '-'}</td>
                          <td style={{ fontFamily: 'Roboto', padding: '12px', fontWeight: 'bold', textAlign: 'left', width: '70px', fontSize: '14px' }}>{emp.totalHours} h</td>
                        </>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontFamily: 'Roboto', marginTop: '10px', fontSize: '14px' }}>Voulez-vous exporter en PDF ?</p>
              <p className="copyright" style={{ fontFamily: 'Roboto', fontSize: '10px', color: '#666' }}>© Nicolas Lefèvre 2025</p>
            </div>
          </div>
        }
        style={{ width: '500px', padding: '20px', fontFamily: 'Roboto' }}
      />

      <Modal
        isOpen={showConfirmPaste}
        onClose={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Closed confirm paste modal');
          }
          setShowConfirmPaste(false);
        }}
        onConfirm={() => handleConfirmPastePreviousWeek()}
        message="Voulez-vous vraiment coller la semaine précédente ? Cela remplacera le planning actuel."
        style={{ fontFamily: 'Roboto', fontSize: '14px' }}
      />
      <Modal
        isOpen={showConfirmReset}
        onClose={() => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PlanningTable: Closed confirm reset modal');
          }
          setShowConfirmReset(false);
        }}
        onConfirm={() => confirmReset()}
        message="Voulez-vous vraiment réinitialiser le planning ? Cela supprimera toutes les données du planning actuel."
        style={{ fontFamily: 'Roboto', fontSize: '14px' }}
      />

      <p className="copyright" style={{ fontFamily: 'Roboto', fontSize: '10px', color: '#666' }}>© Nicolas Lefèvre 2025</p>
    </div>
  );
};

export default PlanningTable;
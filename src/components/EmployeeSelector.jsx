import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from './Modal';
import '../styles/EmployeeSelector.css';
import '../styles/App.css';

const EmployeeSelector = ({ selectedShop, onEmployeesSelect, onBack }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    if (!selectedShop) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('EmployeeSelector: No selectedShop provided, skipping load');
      }
      return;
    }
    try {
      const savedEmployees = JSON.parse(localStorage.getItem(`employees_${selectedShop}`) || '[]');
      setEmployees(savedEmployees);
      setSelectedEmployees(savedEmployees); // Cases cochées par défaut
      if (process.env.NODE_ENV !== 'production') {
        console.log('EmployeeSelector: Loaded employees for shop', selectedShop, ':', savedEmployees);
      }
    } catch (error) {
      console.error('EmployeeSelector: Error loading employees from localStorage:', error);
      setEmployees([]);
      setSelectedEmployees([]);
    }
  }, [selectedShop]);

  const handleAddEmployee = () => {
    if (newEmployee && !employees.includes(newEmployee.toUpperCase())) {
      const updatedEmployees = [...employees, newEmployee.toUpperCase()];
      setEmployees(updatedEmployees);
      setSelectedEmployees([...selectedEmployees, newEmployee.toUpperCase()]); // Nouvel employé coché par défaut
      try {
        localStorage.setItem(`employees_${selectedShop}`, JSON.stringify(updatedEmployees));
        localStorage.setItem(`selectedEmployees_${selectedShop}`, JSON.stringify(updatedEmployees));
        if (process.env.NODE_ENV !== 'production') {
          console.log('EmployeeSelector: Added employee:', newEmployee.toUpperCase(), 'to shop:', selectedShop, 'updatedEmployees:', updatedEmployees);
        }
      } catch (error) {
        console.error('EmployeeSelector: Error saving employees to localStorage:', error);
      }
      setNewEmployee('');
    }
  };

  const handleToggleEmployee = (employee) => {
    const updatedSelected = selectedEmployees.includes(employee)
      ? selectedEmployees.filter((emp) => emp !== employee)
      : [...selectedEmployees, employee];
    setSelectedEmployees(updatedSelected);
    try {
      localStorage.setItem(`selectedEmployees_${selectedShop}`, JSON.stringify(updatedSelected));
      if (process.env.NODE_ENV !== 'production') {
        console.log('EmployeeSelector: Toggled employee:', employee, 'New selection:', updatedSelected, 'for shop:', selectedShop);
      }
    } catch (error) {
      console.error('EmployeeSelector: Error saving selected employees to localStorage:', error);
    }
  };

  const handleReset = () => {
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    setEmployees([]);
    setSelectedEmployees([]);
    try {
      localStorage.removeItem(`employees_${selectedShop}`);
      localStorage.removeItem(`selectedEmployees_${selectedShop}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('EmployeeSelector: Reset employees for shop:', selectedShop);
      }
    } catch (error) {
      console.error('EmployeeSelector: Error removing employees from localStorage:', error);
    }
    setShowConfirmReset(false);
  };

  const handleDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee);
  };

  const confirmDeleteEmployee = () => {
    const updatedEmployees = employees.filter((emp) => emp !== employeeToDelete);
    const updatedSelected = selectedEmployees.filter((emp) => emp !== employeeToDelete);
    setEmployees(updatedEmployees);
    setSelectedEmployees(updatedSelected);
    try {
      localStorage.setItem(`employees_${selectedShop}`, JSON.stringify(updatedEmployees));
      localStorage.setItem(`selectedEmployees_${selectedShop}`, JSON.stringify(updatedSelected));
      if (process.env.NODE_ENV !== 'production') {
        console.log('EmployeeSelector: Deleted employee:', employeeToDelete, 'from shop:', selectedShop, 'updatedEmployees:', updatedEmployees);
      }
    } catch (error) {
      console.error('EmployeeSelector: Error saving employees after deletion to localStorage:', error);
    }
    setEmployeeToDelete(null);
  };

  return (
    <div className="employee-selector-container">
      <h2>Sélectionner des employés</h2>
      <div className="add-employee-section">
        <input
          type="text"
          value={newEmployee}
          onChange={(e) => setNewEmployee(e.target.value)}
          placeholder="Nom de l'employé"
          className="employee-input"
        />
        <button onClick={handleAddEmployee} className="add-employee-btn">Ajouter</button>
      </div>
      <div className="employee-list">
        {employees.map((employee) => (
          <div key={employee} className="employee-item">
            <label>
              <input
                type="checkbox"
                checked={selectedEmployees.includes(employee)}
                onChange={() => handleToggleEmployee(employee)}
              />
              {employee}
            </label>
            <FaTimes
              className="delete-icon"
              onClick={() => handleDeleteEmployee(employee)}
              title={`Supprimer ${employee}`}
            />
          </div>
        ))}
      </div>
      <div className="action-buttons">
        <button
          className="validate-btn"
          onClick={() => onEmployeesSelect(selectedEmployees)}
          disabled={selectedEmployees.length === 0}
        >
          Valider
        </button>
        <div className="secondary-buttons">
          <button className="reset-button" onClick={handleReset} title="Réinitialiser la sélection des employés">
            Réinitialiser
          </button>
          <button
            className="back-btn"
            onClick={() => {
              console.log('EmployeeSelector: Returning to week selection');
              onBack();
            }}
            title="Retour Semaine"
          >
            Retour Semaine
          </button>
        </div>
      </div>
      <Modal
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        onConfirm={confirmReset}
        message="Voulez-vous vraiment réinitialiser la liste des employés ? Cela supprimera tous les employés."
      />
      <Modal
        isOpen={!!employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={confirmDeleteEmployee}
        message={`Voulez-vous vraiment supprimer l'employé ${employeeToDelete} ?`}
      />
      <p className="copyright">© Nicolas Lefevre 2025 Klick Planning</p>
    </div>
  );
};

export default EmployeeSelector;
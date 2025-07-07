import React, { useState } from 'react';
import ShopSelector from './components/ShopSelector';
import WeekSelector from './components/WeekSelector';
import EmployeeSelector from './components/EmployeeSelector';
import TimeSlotConfig from './components/TimeSlotConfig';
import PlanningTable from './components/PlanningTable';
import './styles/App.css';

const App = () => {
  const [step, setStep] = useState('config');
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [timeSlotConfig, setTimeSlotConfig] = useState(JSON.parse(localStorage.getItem('timeSlotConfig_global') || '{}'));

  const handleBack = () => {
    if (step === 'planning') setStep('employees');
    else if (step === 'employees') setStep('week');
    else if (step === 'week') setStep('shop');
    else if (step === 'shop') setStep('config');
    if (process.env.NODE_ENV !== 'production') {
      console.log('App: Navigating back, current step:', step);
    }
  };

  return (
    <div className="app-container">
      {step === 'config' && (
        <TimeSlotConfig
          onConfigComplete={(config) => {
            setTimeSlotConfig(config);
            setStep('shop');
            if (process.env.NODE_ENV !== 'production') {
              console.log('App: Time slot config completed:', config);
            }
          }}
          onBack={() => console.log('App: No previous step for config')}
        />
      )}
      {step === 'shop' && (
        <ShopSelector
          onShopSelect={(shop) => {
            setSelectedShop(shop);
            setStep('week');
            if (process.env.NODE_ENV !== 'production') {
              console.log('App: Selected shop:', shop, 'Transitioning to WeekSelector');
            }
          }}
          onBack={handleBack}
        />
      )}
      {step === 'week' && (
        <WeekSelector
          onWeekSelect={(week) => {
            setSelectedWeek(week[0]);
            setStep('employees');
            if (process.env.NODE_ENV !== 'production') {
              console.log('App: Selected week:', week, 'Transitioning to EmployeeSelector');
            }
          }}
          onBack={handleBack}
        />
      )}
      {step === 'employees' && (
        <EmployeeSelector
          selectedShop={selectedShop}
          onEmployeesSelect={(employees) => {
            setSelectedEmployees(employees);
            setStep('planning');
            if (process.env.NODE_ENV !== 'production') {
              console.log('App: Selected employees:', employees);
            }
          }}
          onBack={handleBack}
        />
      )}
      {step === 'planning' && (
        <PlanningTable
          employees={selectedEmployees}
          selectedWeek={selectedWeek}
          selectedShop={selectedShop}
          onBackToShop={() => setStep('shop')}
          onBackToWeek={() => setStep('week')}
          onBackToEmployees={() => setStep('employees')}
          onBackToConfig={() => setStep('config')}
          onWeekChange={setSelectedWeek}
          timeSlotConfig={timeSlotConfig}
        />
      )}
    </div>
  );
};

export default App;
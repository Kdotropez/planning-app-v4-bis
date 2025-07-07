import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllTimeSlots } from './ScheduleUtils';

export const copyDay = (day, mode, sourceEmployee, localEmployees, timeSlots, planning, setCopiedData, setCopyFeedback) => {
    console.log('copyDay: Starting copy for day:', day, 'mode:', mode, 'sourceEmployee:', sourceEmployee);
    if (!day) {
        setCopyFeedback('Veuillez sélectionner un jour source.');
        setTimeout(() => setCopyFeedback(''), 2000);
        console.warn('copyDay: No day selected');
        return;
    }
    const dayData = {};
    const allSlots = getAllTimeSlots(timeSlots); // Utiliser getAllTimeSlots pour collecter tous les créneaux
    if (mode === 'all') {
        localEmployees.forEach((emp) => {
            allSlots.forEach((timeRange) => {
                const key = `${day}_${timeRange}_${emp}`;
                if (planning[key]) dayData[key] = true;
            });
        });
    } else if (mode === 'individual' && sourceEmployee) {
        allSlots.forEach((timeRange) => {
            const key = `${day}_${timeRange}_${sourceEmployee}`;
            if (planning[key]) dayData[key] = true;
        });
    } else if (mode === 'employeeToEmployee' && sourceEmployee) {
        allSlots.forEach((timeRange) => {
            const key = `${day}_${timeRange}_${sourceEmployee}`;
            if (planning[key]) dayData[key] = true;
        });
    }
    console.log('copyDay: Collected dayData:', dayData);
    setCopiedData(dayData);
    if (Object.keys(dayData).length === 0) {
        setCopyFeedback('Aucune donnée à copier pour ce jour.');
    } else {
        setCopyFeedback(`Données copiées pour ${day} (${mode === 'all' ? 'tous les employés' : mode === 'individual' ? 'individuel' : 'd’un employé à un autre'})`);
    }
    setTimeout(() => setCopyFeedback(''), 2000);
    console.log(`Copied ${mode} for ${day} from ${sourceEmployee || 'all'}`);
};

export const pasteDay = (targetDays, targetEmp, copiedData, copyMode, planning, setPlanning, setCopyFeedback, setCopiedData) => {
    console.log('pasteDay: Starting paste for targetDays:', targetDays, 'targetEmp:', targetEmp, 'copiedData:', copiedData);
    if (!copiedData) {
        setCopyFeedback('Aucune donnée à coller.');
        setTimeout(() => setCopyFeedback(''), 2000);
        console.warn('pasteDay: No copied data available');
        return;
    }
    setPlanning((prev) => {
        const updated = { ...prev };
        targetDays.forEach((day) => {
            Object.keys(copiedData).forEach((key) => {
                const [sourceDay, timeRange, sourceEmp] = key.split('_');
                const newKey = `${day}_${timeRange}_${targetEmp || sourceEmp}`;
                if (copyMode === 'all' || !targetEmp || (copyMode === 'employeeToEmployee' && targetEmp)) {
                    updated[newKey] = copiedData[key];
                }
            });
        });
        console.log('pasteDay: Updated planning:', updated);
        setCopyFeedback(`Données collées sur ${targetDays.join(', ')} ${targetEmp ? `pour ${targetEmp}` : ''}`);
        setTimeout(() => setCopyFeedback(''), 2000);
        console.log(`Pasted to ${targetDays.join(', ')} for ${targetEmp || 'all'}`);
        return updated;
    });
    setCopiedData(null);
};

export const copyPreviousWeek = (previousWeek, selectedShop, setCopiedData, setCopyFeedback) => {
    console.log('copyPreviousWeek: Starting copy for previousWeek:', previousWeek);
    if (!previousWeek) {
        setCopyFeedback('Veuillez sélectionner une semaine précédente.');
        setTimeout(() => setCopyFeedback(''), 2000);
        console.warn('copyPreviousWeek: No previous week selected');
        return;
    }
    const previousKey = `planning_${selectedShop}_${previousWeek}`;
    const saved = localStorage.getItem(previousKey);
    if (saved) {
        const previousPlanning = JSON.parse(saved);
        console.log('copyPreviousWeek: Collected data:', previousPlanning);
        setCopiedData(previousPlanning);
        if (Object.keys(previousPlanning).length === 0) {
            setCopyFeedback('Aucune donnée à copier pour cette semaine.');
        } else {
            setCopyFeedback(`Semaine du ${format(new Date(previousWeek), 'dd/MM/yy', { locale: fr })} copiée.`);
        }
        setTimeout(() => setCopyFeedback(''), 2000);
        console.log(`Copied entire week from: ${previousKey}`);
    } else {
        setCopyFeedback('Aucun planning trouvé pour la semaine sélectionnée.');
        setTimeout(() => setCopyFeedback(''), 2000);
        console.log(`No planning found for ${previousKey}`);
    }
};

export const pastePreviousWeek = (copiedData, setCopyFeedback, setShowConfirmPaste) => {
    console.log('pastePreviousWeek: Starting paste, copiedData:', copiedData);
    if (!copiedData) {
        setCopyFeedback('Aucune donnée à coller.');
        setTimeout(() => setCopyFeedback(''), 2000);
        console.warn('pastePreviousWeek: No copied data');
        return;
    }
    setShowConfirmPaste(true);
    console.log('pastePreviousWeek: Showing confirmation in previous-week-copy section');
};

export const confirmPastePreviousWeek = (copiedData, selectedShop, selectedWeekDate, planning, setPlanning, setCopyFeedback, setShowConfirmPaste, setCopiedData) => {
    console.log('confirmPastePreviousWeek: Confirming paste, copiedData:', copiedData);
    if (!selectedShop || !selectedWeekDate) {
        console.warn('confirmPastePreviousWeek: Missing selectedShop or selectedWeekDate', { selectedShop, selectedWeekDate });
        setCopyFeedback('Erreur : Boutique ou semaine non sélectionnée.');
        setTimeout(() => setCopyFeedback(''), 2000);
        setShowConfirmPaste(false);
        return;
    }
    setPlanning((prev) => {
        const updated = { ...prev };
        Object.keys(copiedData).forEach((key) => {
            updated[key] = copiedData[key];
        });
        console.log('confirmPastePreviousWeek: Updated planning:', updated);
        const key = `planning_${selectedShop}_${selectedWeekDate.toISOString().split('T')[0]}`;
        localStorage.setItem(key, JSON.stringify(updated));
        console.log(`confirmPastePreviousWeek: Saved to localStorage for ${key}:`, updated);
        return updated;
    });
    setCopyFeedback('Semaine collée avec succès.');
    setTimeout(() => setCopyFeedback(''), 2000);
    setShowConfirmPaste(false);
    setCopiedData(null);
    console.log('Pasted entire week to current week');
};
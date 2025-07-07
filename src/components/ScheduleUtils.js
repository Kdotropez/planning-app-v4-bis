import { format } from 'date-fns';

export const calculateWeeklyHours = (employee, planning, timeSlots) => {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    let totalHours = 0;
    days.forEach((day) => {
        const allSlots = getAllTimeSlots(timeSlots);
        allSlots.forEach((timeRange) => {
            const key = `${day}_${timeRange}_${employee}`;
            if (planning[key]) {
                const [start, end] = timeRange.split('-');
                const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
                const endMinutes = end === '24:00' ? 24 * 60 : parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
                totalHours += (endMinutes - startMinutes) / 60;
            }
        });
    });
    if (process.env.NODE_ENV !== 'production') {
        console.log(`calculateWeeklyHours: ${employee}: ${totalHours.toFixed(1)}h`);
    }
    return totalHours.toFixed(1);
};

export const getAllTimeSlots = (timeSlots) => {
    if (!timeSlots) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('getAllTimeSlots: Invalid timeSlots', timeSlots);
        }
        return [];
    }
    return [
        ...(timeSlots.morning || []),
        ...(timeSlots.afternoon || []),
        ...(timeSlots.evening || []),
        ...(timeSlots.earlyAfternoon || []),
        ...(timeSlots.lateAfternoon || []),
        ...(timeSlots.earlyEvening || []),
        ...(timeSlots.lateEvening || []),
    ].filter(slot => slot);
};

export const getEmployeeWeeklySchedule = (employee, planning, timeSlots, timeSlotConfig, days, getCouleurJour) => {
    if (!employee || !planning || !timeSlots || !timeSlotConfig || !days || !getCouleurJour) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('getEmployeeWeeklySchedule: Missing parameters');
        }
        return [];
    }

    const schedule = [];
    days.forEach((day, index) => {
        const allSlots = getAllTimeSlots(timeSlots);
        const dailySlots = allSlots.filter((timeRange) => planning[`${day}_${timeRange}_${employee}`]).sort();
        if (dailySlots.length === 0) {
            schedule.push({
                day,
                periods: [{ arrival: 'Repos', departure: '-', return: '-', end: '-' }],
                totalHours: '0.0',
                color: getCouleurJour(index, 'recap-table'),
            });
        } else {
            let arrival = dailySlots[0].split('-')[0];
            let end = dailySlots[dailySlots.length - 1].split('-')[1];
            let departure = '-';
            let returnTime = '-';
            for (let i = 0; i < dailySlots.length - 1; i++) {
                const currentEnd = dailySlots[i].split('-')[1];
                const nextStart = dailySlots[i + 1].split('-')[0];
                if (currentEnd !== nextStart) {
                    departure = currentEnd;
                    returnTime = nextStart;
                    break;
                }
            }
            const totalHours = dailySlots.reduce((sum, timeRange) => {
                const [start, end] = timeRange.split('-');
                const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
                const endMinutes = end === '24:00' ? 24 * 60 : parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
                return sum + (endMinutes - startMinutes) / 60;
            }, 0).toFixed(1);
            schedule.push({
                day,
                periods: [{ arrival, departure, return: returnTime, end }],
                totalHours,
                color: getCouleurJour(index, 'recap-table'),
            });
        }
    });
    if (process.env.NODE_ENV !== 'production') {
        console.log('getEmployeeWeeklySchedule:', schedule);
    }
    return schedule;
};

export const getShopDailySchedule = (employees, planning, timeSlots, timeSlotConfig, days, getCouleurJour) => {
    if (!employees || !planning || !timeSlots || !timeSlotConfig || !days || !getCouleurJour) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('getShopDailySchedule: Missing parameters');
        }
        return [];
    }

    const schedule = [];
    days.forEach((day, index) => {
        const dailyData = {
            day,
            employees: [],
            color: getCouleurJour(index, 'recap-table'),
        };
        employees.forEach((employee) => {
            const dailySlots = getAllTimeSlots(timeSlots).filter((timeRange) => planning[`${day}_${timeRange}_${employee}`]).sort();
            if (dailySlots.length === 0) {
                dailyData.employees.push({
                    name: employee,
                    periods: [{ arrival: 'Repos', departure: '-', return: '-', end: '-' }],
                    totalHours: '0.0',
                });
            } else {
                let arrival = dailySlots[0].split('-')[0];
                let end = dailySlots[dailySlots.length - 1].split('-')[1];
                let departure = '-';
                let returnTime = '-';
                for (let i = 0; i < dailySlots.length - 1; i++) {
                    const currentEnd = dailySlots[i].split('-')[1];
                    const nextStart = dailySlots[i + 1].split('-')[0];
                    if (currentEnd !== nextStart) {
                        departure = currentEnd;
                        returnTime = nextStart;
                        break;
                    }
                }
                const totalHours = dailySlots.reduce((sum, timeRange) => {
                    const [start, end] = timeRange.split('-');
                    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
                    const endMinutes = end === '24:00' ? 24 * 60 : parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
                    return sum + (endMinutes - startMinutes) / 60;
                }, 0).toFixed(1);
                dailyData.employees.push({
                    name: employee,
                    periods: [{ arrival, departure, return: returnTime, end }],
                    totalHours,
                });
            }
        });
        schedule.push(dailyData);
    });
    if (process.env.NODE_ENV !== 'production') {
        console.log('getShopDailySchedule:', schedule);
    }
    return schedule;
};
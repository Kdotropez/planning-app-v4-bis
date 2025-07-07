import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getEmployeeWeeklySchedule, getShopDailySchedule, getAllTimeSlots } from './ScheduleUtils';

// Fonction pour nettoyer les chaînes tout en préservant les accents français
const cleanString = (str) => {
    if (typeof str !== 'string') return str || '';
    // Supprimer uniquement les caractères de contrôle non-ASCII problématiques
    return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
};

const calculateDailyHoursForTable = (employee, day, planning, timeSlots) => {
    if (!timeSlots) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('PDFExport: Invalid timeSlots for calculateDailyHoursForTable:', timeSlots);
        }
        return 0;
    }
    const allSlots = getAllTimeSlots(timeSlots);
    let totalHours = 0;
    allSlots.forEach((timeRange) => {
        const key = `${cleanString(day)}_${cleanString(timeRange)}_${cleanString(employee)}`;
        if (planning[key]) {
            const [start, end] = timeRange.split('-');
            const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
            const endMinutes = end === '24:00' ? 24 * 60 : parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
            totalHours += (endMinutes - startMinutes) / 60;
        }
    });
    if (process.env.NODE_ENV !== 'production') {
        console.log(`PDFExport: calculateDailyHoursForTable: ${cleanString(employee)} on ${cleanString(day)}: ${totalHours.toFixed(1)}h, slots:`, allSlots, 'planning keys:', Object.keys(planning).filter(k => k.startsWith(cleanString(day))));
    }
    return totalHours.toFixed(1);
};

const exportEmployeeSummaryToPDF = (employee, planning, timeSlotConfig, selectedShop, selectedWeek, days, getCouleurJour, timeSlots) => {
    try {
        if (!employee || !planning || !timeSlotConfig || !selectedShop || !selectedWeek || !days || !getCouleurJour || !timeSlots) {
            throw new Error('Missing required parameters');
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generating employee summary for', { employee: cleanString(employee), selectedShop: cleanString(selectedShop), selectedWeek });
        }
        const doc = new jsPDF({ format: 'a4', unit: 'pt', orientation: 'portrait' });
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(51, 51, 51);
        doc.text(`Récapitulatif de ${cleanString(employee)}`, 10, 10);

        const schedule = getEmployeeWeeklySchedule(employee, planning, timeSlots, timeSlotConfig, days, getCouleurJour);
        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Employee schedule data:', JSON.stringify(schedule, null, 2));
        }
        const tableData = schedule.map(({ day, periods, totalHours }) => [
            cleanString(day),
            cleanString(periods[0].arrival),
            cleanString(periods[0].departure),
            cleanString(periods[0].return),
            cleanString(periods[0].end),
            `${totalHours} h`,
        ]);

        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Table data for employee summary:', JSON.stringify(tableData, null, 2));
        }

        autoTable(doc, {
            startY: 20,
            head: [['Jour', 'Arrivée', 'Sortie', 'Retour', 'Fin', 'Heures effectives']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, font: 'times' },
            styles: { font: 'times', fontSize: 9, cellPadding: 1.5, halign: 'left', valign: 'middle', overflow: 'linebreak' },
            margin: { top: 20, left: 10, right: 10 },
            columnStyles: {
                0: { halign: 'left' }, // Jour
                1: { halign: 'left' }, // Arrivée
                2: { halign: 'left' }, // Sortie
                3: { halign: 'left' }, // Retour
                4: { halign: 'left' }, // Fin
                5: { halign: 'left', fontStyle: 'bold', textColor: [0, 0, 0] }, // Heures effectives
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const dayIndex = days.indexOf(data.row.raw[0]);
                    if (dayIndex >= 0) {
                        const color = getCouleurJour(dayIndex, 'pdf-table');
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('PDFExport: Applying color for day', data.row.raw[0], ':', color);
                        }
                        data.row.cells[0].styles.fillColor = color;
                        data.row.cells[1].styles.fillColor = color;
                        data.row.cells[2].styles.fillColor = color;
                        data.row.cells[3].styles.fillColor = color;
                        data.row.cells[4].styles.fillColor = color;
                        data.row.cells[5].styles.fillColor = color;
                    }
                }
            },
            rowGap: 5,
        });

        doc.setFontSize(9);
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        const totalWeeklyHours = days.reduce((sum, day) => {
            return sum + parseFloat(calculateDailyHoursForTable(employee, day, planning, timeSlots) || 0);
        }, 0).toFixed(1);
        doc.text(`Total heures semaine: ${totalWeeklyHours} h`, 10, doc.lastAutoTable.finalY + 10);
        doc.setFont('times', 'normal');

        doc.setFontSize(7);
        doc.text('© Nicolas Lefevre 2025', 10, doc.lastAutoTable.finalY + 18);

        doc.save(`${cleanString(employee)}_summary_${selectedWeek}.pdf`);
        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generated employee summary PDF for', cleanString(employee), 'with font times');
        }
    } catch (error) {
        console.error('PDFExport: Error generating employee summary PDF:', error);
        alert('Erreur lors de la génération du PDF récapitulatif pour l’employé: ' + error.message);
    }
};

const exportEmployeeScheduleToPDF = (employee, planning, timeSlotConfig, selectedShop, selectedWeek, days, getCouleurJour, timeSlots) => {
    try {
        if (!employee || !planning || !timeSlotConfig || !selectedShop || !selectedWeek || !days || !getCouleurJour || !timeSlots) {
            throw new Error('Missing required parameters');
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generating employee schedule PDF for', cleanString(employee));
        }
        const doc = new jsPDF({ format: 'a4', unit: 'pt' });
        doc.setFont('times', 'normal');
        doc.setFontSize(24);

        doc.setTextColor(51, 51, 51);
        doc.text(`Planning de ${cleanString(employee)}`, 40, 40);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(`Boutique: ${cleanString(selectedShop)}`, 40, 60);
        doc.text(`Semaine du ${format(new Date(selectedWeek), 'dd MMMM yyyy', { locale: fr })}`, 40, 75);

        let y = 90;
        days.forEach((day, index) => {
            const color = getCouleurJour(index, 'pdf-schedule');
            if (process.env.NODE_ENV !== 'production') {
                console.log('PDFExport: Applying color for day', cleanString(day), ':', color);
            }
            doc.setFillColor(color);
            doc.rect(40, y, 190, 8, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text(cleanString(day), 42, y + 6);

            y += 10;
            const slots = getAllTimeSlots(timeSlots);
            const assignedSlots = slots.filter(slot => planning[`${cleanString(day)}_${cleanString(slot)}_${cleanString(employee)}`]);
            if (assignedSlots.length > 0) {
                assignedSlots.forEach((slot) => {
                    doc.text(cleanString(slot), 42, y);
                    y += 6;
                });
            } else {
                doc.text('Repos', 42, y);
                y += 6;
            }
            y += 5;
        });

        const totalHours = days.reduce((total, day) => {
            return total + parseFloat(calculateDailyHoursForTable(employee, day, planning, timeSlots) || 0);
        }, 0);

        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total heures: ${totalHours.toFixed(1)} h`, 40, y);
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.text('© Nicolas Lefevre 2025', 40, y + 15);

        doc.save(`${cleanString(employee)}_planning_${selectedWeek}.pdf`);
        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generated employee PDF for', cleanString(employee), 'with font times');
        }
    } catch (error) {
        console.error('PDFExport: Error generating employee PDF:', error);
        alert('Erreur lors de la génération du PDF pour l’employé: ' + error.message);
    }
};

const exportShopScheduleToPDF = (employees, planning, timeSlotConfig, selectedShop, selectedWeek, days, getCouleurJour, timeSlots) => {
    try {
        if (!employees || !planning || !timeSlotConfig || !selectedShop || !selectedWeek || !days || !getCouleurJour || !timeSlots) {
            throw new Error('Missing required parameters');
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generating shop schedule PDF for', cleanString(selectedShop));
        }
        const doc = new jsPDF({ format: 'a4', unit: 'pt' });
        doc.setFont('times', 'normal');
        doc.setFontSize(24);
        doc.text(`Planning de ${cleanString(selectedShop)}`, 40, 40);
        doc.setFontSize(14);
        doc.text(`Semaine du ${format(new Date(selectedWeek), 'dd MMMM yyyy', { locale: fr })}`, 40, 60);

        let y = 75;
        days.forEach((day, index) => {
            const color = getCouleurJour(index, 'pdf-schedule');
            if (process.env.NODE_ENV !== 'production') {
                console.log('PDFExport: Applying color for day', cleanString(day), ':', color);
            }
            doc.setFillColor(color);
            doc.rect(40, y, 190, 8, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text(cleanString(day), 42, y + 6);

            y += 10;
            employees.forEach((employee) => {
                doc.text(cleanString(employee), 42, y);
                let x = 80;
                const slots = getAllTimeSlots(timeSlots);
                const assignedSlots = slots.filter(slot => planning[`${cleanString(day)}_${cleanString(slot)}_${cleanString(employee)}`]);
                if (assignedSlots.length > 0) {
                    assignedSlots.forEach((slot) => {
                        doc.text(cleanString(slot), x, y);
                        x += 30;
                    });
                } else {
                    doc.text('Repos', x, y);
                }
                y += 6;
            });
            y += 5;
        });

        doc.setFontSize(10);
        doc.text('© Nicolas Lefevre 2025', 40, y + 15);
        doc.save(`${cleanString(selectedShop)}_planning_${selectedWeek}.pdf`);
        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generated shop PDF for', cleanString(selectedShop), 'with font times');
        }
    } catch (error) {
        console.error('PDFExport: Error generating shop PDF:', error);
        alert('Erreur lors de la génération du PDF pour la boutique: ' + error.message);
    }
};

const exportWeeklySummaryToPDF = (employees, planning, timeSlotConfig, selectedShop, selectedWeek, days, getCouleurJour, timeSlots) => {
    try {
        if (!employees || !planning || !timeSlotConfig || !selectedShop || !selectedWeek || !days || !getCouleurJour || !timeSlots) {
            throw new Error('Missing required parameters');
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generating weekly summary for', { selectedShop: cleanString(selectedShop), selectedWeek });
        }
        const doc = new jsPDF({ format: 'a4', unit: 'pt', orientation: 'landscape' });
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Récapitulatif de ${cleanString(selectedShop)}`, 10, 10);

        const schedule = getShopDailySchedule(employees, planning, timeSlots, timeSlotConfig, days, getCouleurJour);
        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Shop schedule data:', JSON.stringify(schedule, null, 2));
        }
        const tableData = schedule.flatMap((dayData, index) => {
            const dayRows = dayData.employees.map((emp) => [
                cleanString(dayData.day),
                cleanString(emp.name),
                cleanString(emp.periods[0].arrival),
                cleanString(emp.periods[0].departure),
                cleanString(emp.periods[0].return),
                cleanString(emp.periods[0].end),
                `${emp.totalHours} h`,
            ]);
            if (index < days.length - 1) {
                dayRows.push(['', '', '', '', '', '', '']); // Interligne vide entre jours
            }
            return dayRows;
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Table data for weekly summary:', JSON.stringify(tableData, null, 2));
        }

        autoTable(doc, {
            startY: 20,
            head: [['Jour', 'Employé', 'Arrivée', 'Sortie', 'Retour', 'Fin', 'Heures effectives']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, font: 'times' },
            styles: { font: 'times', fontSize: 8, cellPadding: 1, halign: 'left', valign: 'middle', overflow: 'linebreak' },
            margin: { top: 15, left: 10, right: 10 },
            columnStyles: {
                0: { halign: 'left' }, // Jour
                1: { halign: 'left' }, // Employé
                2: { halign: 'left' }, // Arrivée
                3: { halign: 'left' }, // Sortie
                4: { halign: 'left' }, // Retour
                5: { halign: 'left' }, // Fin
                6: { halign: 'left', fontStyle: 'bold', textColor: [0, 0, 0] }, // Heures effectives
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.raw[0]) {
                    const dayIndex = days.indexOf(data.row.raw[0]);
                    if (dayIndex >= 0) {
                        const color = getCouleurJour(dayIndex, 'pdf-table');
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('PDFExport: Applying color for day', data.row.raw[0], ':', color);
                        }
                        data.row.cells[0].styles.fillColor = color;
                        data.row.cells[1].styles.fillColor = color;
                        data.row.cells[2].styles.fillColor = color;
                        data.row.cells[3].styles.fillColor = color;
                        data.row.cells[4].styles.fillColor = color;
                        data.row.cells[5].styles.fillColor = color;
                        data.row.cells[6].styles.fillColor = color;
                    }
                }
            },
            rowGap: 5,
        });

        doc.setFontSize(8);
        doc.setFont('times', 'normal');
        doc.text('© Nicolas Lefevre 2025', 10, doc.lastAutoTable.finalY + 10);

        doc.save(`${cleanString(selectedShop)}_weekly_summary_${selectedWeek}.pdf`);
        if (process.env.NODE_ENV !== 'production') {
            console.log('PDFExport: Generated weekly summary PDF for', cleanString(selectedShop), 'with font times');
        }
    } catch (error) {
        console.error('PDFExport: Error generating weekly summary PDF:', error);
        alert('Erreur lors de la génération du PDF récapitulatif hebdomadaire: ' + error.message);
    }
};

export {
    calculateDailyHoursForTable,
    exportEmployeeSummaryToPDF,
    exportEmployeeScheduleToPDF,
    exportShopScheduleToPDF,
    exportWeeklySummaryToPDF
};
import express from 'express';
import { generateTimetable } from '../lib/generator.js';
import { exportToPDF, exportToExcel, exportToICS } from '../lib/exporter.js';
import { getMasterJson } from '../lib/parser.js';

const router = express.Router();

router.post('/pdf', async (req, res, next) => {
  try {
    const { department, semester, selectedTheory, selectedLabs } = req.body;
    const master = await getMasterJson();
    const selectedSlots = generateTimetable(department, Number(semester), selectedTheory, selectedLabs, master);

    const pdfBuffer = await exportToPDF(selectedSlots, department, semester);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${department.replace(/\s+/g, '_')}_sem_${semester}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Export error:", error);
    res.status(500).send('Error generating PDF');
  }
});

router.post('/excel', async (req, res, next) => {
  try {
    const { department, semester, selectedTheory, selectedLabs } = req.body;
    const master = await getMasterJson();
    const selectedSlots = generateTimetable(department, Number(semester), selectedTheory, selectedLabs, master);

    const excelBuffer = await exportToExcel(selectedSlots, department, semester);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${department.replace(/\s+/g, '_')}_sem_${semester}.xlsx`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("Excel Export error:", error);
    res.status(500).send('Error generating Excel');
  }
});

router.post('/ics', async (req, res, next) => {
  try {
    const { department, semester, selectedTheory, selectedLabs } = req.body;
    const master = await getMasterJson();
    const selectedSlots = generateTimetable(department, Number(semester), selectedTheory, selectedLabs, master);

    const icsString = await exportToICS(selectedSlots);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${department.replace(/\s+/g, '_')}_sem_${semester}.ics`);
    res.send(icsString);
  } catch (error) {
    console.error("ICS Export error:", error);
    res.status(500).send('Error generating Calendar file');
  }
});

export default router;

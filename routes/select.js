import express from 'express';
import { getTheorySubjectsForDeptAndSem, getLabSubjectsForDeptAndSem, generateTimetable } from '../lib/generator.js';
import { detectConflicts } from '../lib/conflict.js';
import { calculateStatistics } from '../lib/statistics.js';
import { loadTimetable } from '../lib/storage.js';
import { getMasterJson } from '../lib/parser.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { department, semester, savedId } = req.query;
    if (!department || !semester) {
      return res.redirect('/');
    }

    const master = await getMasterJson();
    
    const theorySubjects = getTheorySubjectsForDeptAndSem(department, Number(semester), master);
    const labSubjects = getLabSubjectsForDeptAndSem(department, Number(semester), master);

    // Initial selections
    let selectedTheory = {};
    let selectedLabs = {};
    
    if (savedId) {
      const saved = await loadTimetable(savedId);
      if (saved) {
        selectedTheory = saved.selectedTheory || {};
        selectedLabs = saved.selectedLabs || {};
      }
    }

    res.render('select', {
      title: 'Generate Timetable',
      department,
      semester,
      savedId: savedId || '',
      theorySubjects,
      labSubjects,
      selectedTheory,
      selectedLabs
    });
  } catch (error) {
    next(error);
  }
});

// Post endpoint for instant AJAX updates
router.post('/preview', async (req, res, next) => {
  try {
    const { department, semester, selectedTheory, selectedLabs } = req.body;
    
    const master = await getMasterJson();
    const selectedSlots = generateTimetable(department, Number(semester), selectedTheory, selectedLabs, master);
    const conflicts = detectConflicts(selectedSlots);
    const stats = calculateStatistics(selectedSlots);
    
    // Render parts
    res.render('partials/preview', { selectedSlots, conflicts, layout: false }, (err, timetableHtml) => {
      if (err) {
        console.error("Error rendering preview:", err);
        return res.status(500).json({ success: false, error: err.message });
      }
      
      res.render('partials/statistics', { stats, layout: false }, (err2, statisticsHtml) => {
        if (err2) {
          console.error("Error rendering stats:", err2);
          return res.status(500).json({ success: false, error: err2.message });
        }
        
        res.render('partials/conflicts', { conflicts, layout: false }, (err3, conflictsHtml) => {
          if (err3) {
            console.error("Error rendering conflicts:", err3);
            return res.status(500).json({ success: false, error: err3.message });
          }
          
          res.json({
            success: true,
            timetableHtml,
            statisticsHtml,
            conflictsHtml,
            conflictsCount: conflicts.length
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

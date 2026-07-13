import express from 'express';
import { saveTimetable, deleteTimetable } from '../lib/storage.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { department, semester, selectedTheory, selectedLabs } = req.body;
    if (!department || !semester) {
      return res.status(400).json({ success: false, error: 'Missing department or semester' });
    }

    const id = await saveTimetable({
      department,
      semester,
      selectedTheory,
      selectedLabs
    });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTimetable(id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Timetable not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

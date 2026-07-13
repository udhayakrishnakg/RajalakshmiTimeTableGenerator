import express from 'express';
import fs from 'fs-extra';
import { getAllSavedTimetables } from '../lib/storage.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const masterExists = await fs.pathExists('data/master.json');
    let departments = [];
    let semesters = [];
    
    if (masterExists) {
      const master = await fs.readJson('data/master.json');
      departments = master.departments || [];
      semesters = master.semesters || [];
    }
    
    const savedTimetables = await getAllSavedTimetables();
    
    res.render('home', {
      title: 'University Timetable Generator',
      departments,
      semesters,
      savedTimetables
    });
  } catch (error) {
    next(error);
  }
});

export default router;

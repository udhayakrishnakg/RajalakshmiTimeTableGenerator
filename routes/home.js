import express from 'express';
import fs from 'fs-extra';
import { getAllSavedTimetables } from '../lib/storage.js';
import { getMasterJson } from '../lib/parser.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const master = await getMasterJson();
    const departments = master.departments || [];
    const semesters = master.semesters || [];
    
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

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SAVED_DIR = 'data/saved';

export async function initStorage() {
  await fs.ensureDir(SAVED_DIR);
}

export async function saveTimetable(timetableData) {
  await initStorage();
  const id = uuidv4();
  const filePath = path.join(SAVED_DIR, `${id}.json`);
  
  const payload = {
    id,
    department: timetableData.department,
    semester: timetableData.semester,
    selectedTheory: timetableData.selectedTheory || {},
    selectedLabs: timetableData.selectedLabs || {},
    createdAt: new Date().toISOString()
  };

  await fs.writeJson(filePath, payload, { spaces: 2 });
  return id;
}

export async function loadTimetable(id) {
  await initStorage();
  const filePath = path.join(SAVED_DIR, `${id}.json`);
  if (!(await fs.pathExists(filePath))) {
    return null;
  }
  return fs.readJson(filePath);
}

export async function deleteTimetable(id) {
  await initStorage();
  const filePath = path.join(SAVED_DIR, `${id}.json`);
  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
    return true;
  }
  return false;
}

export async function getAllSavedTimetables() {
  await initStorage();
  const files = await fs.readdir(SAVED_DIR);
  const timetables = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(SAVED_DIR, file);
        const data = await fs.readJson(filePath);
        timetables.push({
          id: data.id || path.basename(file, '.json'),
          department: data.department,
          semester: data.semester,
          createdAt: data.createdAt,
          selectedTheoryCount: Object.keys(data.selectedTheory || {}).length,
          selectedLabsCount: Object.keys(data.selectedLabs || {}).length
        });
      } catch (err) {
        console.error(`Error reading saved timetable file ${file}:`, err.message);
      }
    }
  }

  // Sort by createdAt descending
  return timetables.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

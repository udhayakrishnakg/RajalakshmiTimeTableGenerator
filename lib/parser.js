import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

// Map raw day names to standard capitalized days
const DAY_MAP = {
  'monday': 'Monday',
  'tuesday': 'Tuesday',
  'wed': 'Wednesday',
  'wednesday': 'Wednesday',
  'thur': 'Thursday',
  'thursday': 'Thursday',
  'fri': 'Friday',
  'friday': 'Friday',
  'saturday': 'Saturday',
  'sat': 'Saturday'
};

export function normalizeDay(day) {
  if (!day) return 'Monday';
  const lowered = day.toLowerCase().trim();
  return DAY_MAP[lowered] || 'Monday';
}

export async function downloadSchedulesIfMissing() {
  await fs.ensureDir('data');
  const theoryPath = 'data/theory_schedule.json';
  const labPath = 'data/lab_schedule.json';

  if (!(await fs.pathExists(theoryPath))) {
    console.log('Downloading theory_schedule.json...');
    const response = await axios.get('https://timetable-viewer-3952776694.vercel.app/data/theory_schedule.json');
    await fs.writeJson(theoryPath, response.data);
  }

  if (!(await fs.pathExists(labPath))) {
    console.log('Downloading lab_schedule.json...');
    const response = await axios.get('https://timetable-viewer-3952776694.vercel.app/data/lab_schedule.json');
    await fs.writeJson(labPath, response.data);
  }
}

export async function buildMasterJson() {
  await downloadSchedulesIfMissing();

  const theoryData = await fs.readJson('data/theory_schedule.json');
  const labData = await fs.readJson('data/lab_schedule.json');

  const depts = new Set();
  const sems = new Set();
  const teachersSet = new Set();

  // Maps for aggregating subjects and labs by key (course_code + department + semester)
  const subjectsMap = {};
  const labsMap = {};

  // Process theory subjects
  for (const item of theoryData) {
    if (!item.course_code || !item.department) continue;
    
    depts.add(item.department);
    if (item.semester) sems.add(item.semester);
    if (item.teacher_name) teachersSet.add(item.teacher_name.trim());

    const key = `${item.course_code}_${item.department}_${item.semester}`;
    if (!subjectsMap[key]) {
      subjectsMap[key] = {
        course_code: item.course_code.trim(),
        course_name: (item.course_name || '').trim(),
        department: item.department.trim(),
        semester: item.semester,
        teachers: [],
        slots: []
      };
    }

    const sub = subjectsMap[key];
    const tName = item.teacher_name ? item.teacher_name.trim() : null;
    if (tName && !sub.teachers.includes(tName)) {
      sub.teachers.push(tName);
    }

    sub.slots.push({
      day: normalizeDay(item.day),
      time_slot: item.time_slot,
      slot_index: item.slot_index,
      teacher_name: tName,
      room_number: item.room_number || 'N/A',
      group_name: item.group_name || 'N/A'
    });
  }

  // Process lab subjects
  for (const item of labData) {
    if (!item.course_code || !item.department) continue;

    depts.add(item.department);
    if (item.semester) sems.add(item.semester);
    if (item.teacher_name) teachersSet.add(item.teacher_name.trim());

    const key = `${item.course_code}_${item.department}_${item.semester}`;
    if (!labsMap[key]) {
      labsMap[key] = {
        course_code: item.course_code.trim(),
        course_name: (item.course_name || '').trim(),
        department: item.department.trim(),
        semester: item.semester,
        teachers: [],
        slots: []
      };
    }

    const lab = labsMap[key];
    const tName = item.teacher_name ? item.teacher_name.trim() : null;
    if (tName && !lab.teachers.includes(tName)) {
      lab.teachers.push(tName);
    }

    // Capture batch labels
    let bLabel = item.batch_label ? item.batch_label.trim() : null;
    if (!bLabel && item.batch_number) {
      bLabel = `Batch ${item.batch_number}`;
    }

    lab.slots.push({
      day: normalizeDay(item.day),
      time_range: item.time_range,
      teacher_name: tName,
      room_number: item.room_number || 'N/A',
      group_name: item.group_name || 'N/A',
      batch_label: bLabel,
      batch_number: item.batch_number || null,
      is_batched: item.is_batched || 0
    });
  }

  const departments = Array.from(depts).sort();
  const semesters = Array.from(sems).sort((a, b) => Number(a) - Number(b));
  const teachers = Array.from(teachersSet).sort();

  const subjects = Object.values(subjectsMap);
  const labs = Object.values(labsMap);

  const master = {
    departments,
    semesters,
    subjects,
    teachers,
    labs
  };

  await fs.writeJson('data/master.json', master, { spaces: 2 });
  console.log('master.json created successfully with:', {
    departments: departments.length,
    semesters: semesters.length,
    subjects: subjects.length,
    labs: labs.length,
    teachers: teachers.length
  });

  return master;
}

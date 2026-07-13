export function generateTimetable(department, semester, selectedTheory = {}, selectedLabs = {}, master) {
  const selectedSlots = [];

  // Parse theory selections
  for (const [courseCode, teacherName] of Object.entries(selectedTheory)) {
    if (!teacherName) continue;
    const subject = master.subjects.find(sub => 
      sub.course_code === courseCode && 
      sub.department === department && 
      sub.semester == semester
    );

    if (subject) {
      const matchingSlots = subject.slots.filter(slot => slot.teacher_name === teacherName);
      matchingSlots.forEach(slot => {
        selectedSlots.push({
          ...slot,
          course_code: subject.course_code,
          course_name: subject.course_name,
          type: 'theory'
        });
      });
    }
  }

  // Parse lab selections
  for (const [courseCode, labSelection] of Object.entries(selectedLabs)) {
    if (!labSelection || !labSelection.teacher) continue;
    const { teacher, batch } = labSelection;

    const labSubject = master.labs.find(lab => 
      lab.course_code === courseCode && 
      lab.department === department && 
      lab.semester == semester
    );

    if (labSubject) {
      const matchingSlots = labSubject.slots.filter(slot => {
        // Teacher must match
        if (slot.teacher_name !== teacher) return false;

        // If batch is specified and this session is batched, filter by batch
        if (slot.is_batched === 1 && batch) {
          return slot.batch_label === batch;
        }

        // Otherwise (non-batched or batch not selected), keep it
        return true;
      });

      matchingSlots.forEach(slot => {
        selectedSlots.push({
          ...slot,
          course_code: labSubject.course_code,
          course_name: labSubject.course_name,
          type: 'lab'
        });
      });
    }
  }

  return selectedSlots;
}

// Helper to retrieve all theory subjects and their available teachers for a department and semester
export function getTheorySubjectsForDeptAndSem(department, semester, master) {
  return master.subjects.filter(sub => 
    sub.department === department && 
    sub.semester == semester
  );
}

// Helper to retrieve all lab subjects, their available teachers, and available batches for a department and semester
export function getLabSubjectsForDeptAndSem(department, semester, master) {
  const labs = master.labs.filter(lab => 
    lab.department === department && 
    lab.semester == semester
  );

  return labs.map(lab => {
    // For each teacher, collect available batches
    const teacherBatches = {};
    lab.teachers.forEach(teacher => {
      const batches = new Set();
      lab.slots.forEach(slot => {
        if (slot.teacher_name === teacher && slot.batch_label) {
          batches.add(slot.batch_label);
        }
      });
      teacherBatches[teacher] = Array.from(batches).sort();
    });

    return {
      ...lab,
      teacherBatches
    };
  });
}

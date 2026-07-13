import { parseTimeRange } from './conflict.js';

export function minutesToTimeStr(minutes) {
  if (minutes === undefined || minutes === null) return 'N/A';
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mStr = m < 10 ? `0${m}` : m;
  return `${h}:${mStr} ${ampm}`;
}

export function calculateStatistics(selectedSlots) {
  let theoryMinutes = 0;
  let labMinutes = 0;
  let totalClasses = selectedSlots.length;
  
  let morningClasses = 0;
  let eveningClasses = 0;
  let before10AM = 0;
  let after3PM = 0;

  let minTime = null;
  let maxTime = null;

  // Group slots by day for break and free hour calculations
  const slotsByDay = {};
  const standardDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  standardDays.forEach(day => {
    slotsByDay[day] = [];
  });

  selectedSlots.forEach(slot => {
    const r = parseTimeRange(slot.time_slot || slot.time_range);
    if (!r) return;

    const isTheory = !!slot.time_slot;
    const duration = r.end - r.start;

    if (isTheory) {
      theoryMinutes += duration;
    } else {
      labMinutes += duration;
    }

    // Class times checks
    if (r.start < 720) { // Before 12 PM
      morningClasses++;
    } else {
      eveningClasses++;
    }

    if (r.start < 600) { // Before 10 AM
      before10AM++;
    }

    if (r.start >= 900) { // After 3 PM
      after3PM++;
    }

    // Earliest and latest overall times
    if (minTime === null || r.start < minTime) minTime = r.start;
    if (maxTime === null || r.end > maxTime) maxTime = r.end;

    const dayName = slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase();
    if (slotsByDay[dayName]) {
      slotsByDay[dayName].push(r);
    } else {
      slotsByDay[dayName] = [r];
    }
  });

  // Calculate free hours and longest break per day
  let longestBreakMinutes = 0;
  let totalClassMinutes = theoryMinutes + labMinutes;
  
  // Standard academic day is 8:00 AM to 5:00 PM (9 hours per day)
  // Across 6 days (Mon-Sat), that is 54 hours.
  const totalAcademicMinutes = 54 * 60; // 3240 minutes
  const freeMinutes = Math.max(0, totalAcademicMinutes - totalClassMinutes);
  const freeHours = (freeMinutes / 60).toFixed(1);

  standardDays.forEach(day => {
    const daySlots = slotsByDay[day];
    if (daySlots.length <= 1) return;

    // Sort slots chronologically
    daySlots.sort((a, b) => a.start - b.start);

    // Measure breaks between consecutive classes
    for (let i = 0; i < daySlots.length - 1; i++) {
      const currentEnd = daySlots[i].end;
      const nextStart = daySlots[i+1].start;
      const breakDuration = nextStart - currentEnd;
      if (breakDuration > longestBreakMinutes) {
        longestBreakMinutes = breakDuration;
      }
    }
  });

  const formatDuration = (minutes) => {
    if (minutes === 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return {
    totalTheoryHours: (theoryMinutes / 60).toFixed(1),
    totalLabHours: (labMinutes / 60).toFixed(1),
    totalClasses,
    morningClasses,
    eveningClasses,
    before10AM,
    after3PM,
    freeHours,
    longestBreak: formatDuration(longestBreakMinutes),
    dailyStartTime: minTime !== null ? minutesToTimeStr(minTime) : 'N/A',
    dailyEndTime: maxTime !== null ? minutesToTimeStr(maxTime) : 'N/A'
  };
}

export function parseTimeRange(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split('-').map(p => p.trim());
  if (parts.length !== 2) return null;
  
  const parsePart = (part) => {
    const [hStr, mStr] = part.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    // Standard rule: hours 1 to 7 are afternoon/PM
    if (h >= 1 && h <= 7) {
      h += 12;
    }
    return h * 60 + m;
  };

  try {
    return {
      start: parsePart(parts[0]),
      end: parsePart(parts[1])
    };
  } catch (err) {
    return null;
  }
}

export function detectConflicts(selectedSlots) {
  const conflicts = [];
  const checkedPairs = new Set();

  for (let i = 0; i < selectedSlots.length; i++) {
    for (let j = i + 1; j < selectedSlots.length; j++) {
      const s1 = selectedSlots[i];
      const s2 = selectedSlots[j];

      if (s1.day.toLowerCase() === s2.day.toLowerCase()) {
        const timeStr1 = s1.time_slot || s1.time_range;
        const timeStr2 = s2.time_slot || s2.time_range;

        const r1 = parseTimeRange(timeStr1);
        const r2 = parseTimeRange(timeStr2);

        if (r1 && r2) {
          // Check for overlap: max(start1, start2) < min(end1, end2)
          const overlapStart = Math.max(r1.start, r2.start);
          const overlapEnd = Math.min(r1.end, r2.end);

          if (overlapStart < overlapEnd) {
            const pairId = [s1.course_code, s2.course_code].sort().join('-');
            
            conflicts.push({
              code1: s1.course_code,
              code2: s2.course_code,
              day: s1.day,
              time1: timeStr1,
              time2: timeStr2,
              slot1: s1,
              slot2: s2,
              message: `${s1.course_code} (${s1.day} ${timeStr1}) conflicts with ${s2.course_code} (${s2.day} ${timeStr2})`
            });
          }
        }
      }
    }
  }

  return conflicts;
}

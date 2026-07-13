import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { parseTimeRange } from './conflict.js';

// Convert day string to calendar day offset (0 = Sunday, 1 = Monday, etc.)
const DAY_INDEXES = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

// Map day names to standard names
const DAY_MAP = {
  'Monday': 'Monday',
  'Tuesday': 'Tuesday',
  'Wednesday': 'Wednesday',
  'Thursday': 'Thursday',
  'Friday': 'Friday',
  'Saturday': 'Saturday'
};

// 9 Standard Theory slots
const SLOTS_TIMES = [
  "8:00 - 8:50",
  "9:00 - 9:50",
  "10:00 - 10:50",
  "11:00 - 11:50",
  "12:00 - 12:50",
  "1:00 - 1:50",
  "2:00 - 2:50",
  "3:10 - 4:00",
  "4:10 - 5:00"
];

// Helper to convert time "8:00" to hour and minute
function parseTimeStr(timeStr) {
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (h >= 1 && h <= 7) {
    h += 12;
  }
  return { h, m };
}

// Format date into ICS format YYYYMMDDTHHMMSS
function formatICSDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

export async function exportToICS(selectedSlots) {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//University Timetable Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  // Start date for classes (let's say July 9, 2026, or current date)
  const baseDate = new Date();
  // Set semester end date: 12 weeks from today
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 84); // 12 weeks

  selectedSlots.forEach((slot, idx) => {
    const dayName = slot.day.toLowerCase().trim();
    const dayTarget = DAY_INDEXES[dayName];
    if (dayTarget === undefined) return;

    // Parse start and end times
    const timeStr = slot.time_slot || slot.time_range;
    const parts = timeStr.split('-').map(p => p.trim());
    if (parts.length !== 2) return;

    const startParse = parseTimeStr(parts[0]);
    const endParse = parseTimeStr(parts[1]);

    // Find the next occurrence of that weekday
    const eventDate = new Date(baseDate);
    const currentDay = eventDate.getDay();
    let diff = dayTarget - currentDay;
    if (diff < 0) diff += 7; // Next week
    eventDate.setDate(eventDate.getDate() + diff);

    // Set times
    const startEvent = new Date(eventDate);
    startEvent.setHours(startParse.h, startParse.m, 0, 0);

    const endEvent = new Date(eventDate);
    endEvent.setHours(endParse.h, endParse.m, 0, 0);

    const summary = `[${slot.type.toUpperCase()}] ${slot.course_code} - ${slot.course_name}`;
    const desc = `Teacher: ${slot.teacher_name || 'N/A'}\\nRoom: ${slot.room_number || 'N/A'}\\nGroup: ${slot.group_name || 'N/A'}${slot.batch_label ? `\\nBatch: ${slot.batch_label}` : ''}`;
    const loc = slot.room_number || 'N/A';

    const recurrenceEnd = formatICSDate(endDate);

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:event-${idx}-${slot.course_code}@timetablegenerator`);
    ics.push(`DTSTAMP:${formatICSDate(new Date())}`);
    ics.push(`DTSTART;TZID=Asia/Kolkata:${formatICSDate(startEvent).replace('Z', '')}`);
    ics.push(`DTEND;TZID=Asia/Kolkata:${formatICSDate(endEvent).replace('Z', '')}`);
    ics.push(`RRULE:FREQ=WEEKLY;UNTIL=${recurrenceEnd}`);
    ics.push(`SUMMARY:${summary}`);
    ics.push(`DESCRIPTION:${desc}`);
    ics.push(`LOCATION:${loc}`);
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

export async function exportToExcel(selectedSlots, department, semester) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timetable');

  // Title formatting
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `UNIVERSITY TIMETABLE - ${department.toUpperCase()} (SEMESTER ${semester})`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F497D' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 40;

  // Header row
  const headers = ['Time Slot', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  sheet.getRow(3).values = headers;
  sheet.getRow(3).height = 25;

  headers.forEach((_, colIndex) => {
    const cell = sheet.getCell(3, colIndex + 1);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Create grid rows for 9 slots
  SLOTS_TIMES.forEach((timeRange, index) => {
    const rowNum = 4 + index;
    sheet.getCell(rowNum, 1).value = timeRange;
    sheet.getCell(rowNum, 1).font = { name: 'Arial', size: 9, bold: true };
    sheet.getCell(rowNum, 1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(rowNum, 1).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    sheet.getRow(rowNum).height = 65;

    // Style other empty cells
    for (let c = 2; c <= 7; c++) {
      const cell = sheet.getCell(rowNum, c);
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
  });

  // Map slots into the sheet grid
  const dayCols = { 'monday': 2, 'tuesday': 3, 'wednesday': 4, 'thursday': 5, 'friday': 6, 'saturday': 7 };

  // Helper to find which theory slots are spanned by a lab
  const getSpannedSlots = (timeRange) => {
    const r = parseTimeRange(timeRange);
    if (!r) return [];
    
    // Theory slot hours map
    const theoryRanges = [
      { idx: 0, start: 480, end: 530 },
      { idx: 1, start: 540, end: 590 },
      { idx: 2, start: 600, end: 650 },
      { idx: 3, start: 660, end: 710 },
      { idx: 4, start: 720, end: 770 },
      { idx: 5, start: 780, end: 830 },
      { idx: 6, start: 840, end: 890 },
      { idx: 7, start: 910, end: 960 },
      { idx: 8, start: 970, end: 1020 }
    ];

    const indices = [];
    theoryRanges.forEach(tr => {
      const overlapStart = Math.max(r.start, tr.start);
      const overlapEnd = Math.min(r.end, tr.end);
      if (overlapStart < overlapEnd) {
        indices.push(tr.idx);
      }
    });
    return indices;
  };

  selectedSlots.forEach((slot) => {
    const dayLower = slot.day.toLowerCase().trim();
    const colIdx = dayCols[dayLower];
    if (!colIdx) return;

    if (slot.type === 'theory') {
      const slotIdx = slot.slot_index;
      if (slotIdx === undefined || slotIdx === null) return;
      const rowNum = 4 + slotIdx;

      const cell = sheet.getCell(rowNum, colIdx);
      cell.value = `${slot.course_code}\n${slot.teacher_name || 'N/A'}\nRoom: ${slot.room_number || 'N/A'}`;
      cell.font = { name: 'Arial', size: 8, color: { argb: '0F243E' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCE6F1' } }; // Light blue for theory
    } else {
      // Lab: can span multiple cells
      const timeStr = slot.time_range;
      const slotIndices = getSpannedSlots(timeStr);
      if (slotIndices.length === 0) return;

      const firstRow = 4 + slotIndices[0];
      const lastRow = 4 + slotIndices[slotIndices.length - 1];

      // Merge cells for lab rowspan effect
      try {
        if (firstRow !== lastRow) {
          sheet.mergeCells(firstRow, colIdx, lastRow, colIdx);
        }
      } catch (err) {
        // Cells might already be merged or conflict
      }

      const cell = sheet.getCell(firstRow, colIdx);
      cell.value = `${slot.course_code}\n${slot.teacher_name || 'N/A'}\nRoom: ${slot.room_number || 'N/A'}${slot.batch_label ? `\n[${slot.batch_label}]` : ''}`;
      cell.font = { name: 'Arial', size: 8, color: { argb: '274E13' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } }; // Light green for labs
    }
  });

  // Set widths
  sheet.getColumn(1).width = 15;
  for (let c = 2; c <= 7; c++) {
    sheet.getColumn(c).width = 22;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export function exportToPDF(selectedSlots, department, semester) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // Draw Title Header
    doc.fillColor('#1F497D')
       .rect(30, 30, 782, 45)
       .fill();

    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(`UNIVERSITY TIMETABLE GENERATOR`, 40, 42, { align: 'center', width: 762 });

    doc.fillColor('#333333')
       .fontSize(10)
       .font('Helvetica')
       .text(`Department: ${department}     |     Semester: ${semester}     |     Generated: ${new Date().toLocaleDateString()}`, 30, 85, { align: 'left' });

    // Draw Timetable Grid Headers
    const days = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const colWidths = [82, 116, 116, 116, 116, 116, 116];
    const startX = 30;
    const startY = 105;
    const rowHeight = 35;

    // Draw header cells
    let currentX = startX;
    doc.fillColor('#366092')
       .rect(startX, startY, 782, 22)
       .fill();

    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(9);

    days.forEach((day, idx) => {
      doc.text(day, currentX, startY + 6, { width: colWidths[idx], align: 'center' });
      currentX += colWidths[idx];
    });

    // Draw Slots
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(8);

    // Build grid structure for lookup
    const dayIndexes = { 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
    const grid = Array(9).fill(null).map(() => Array(7).fill(null));

    // Fill grid with theory slots
    selectedSlots.forEach(slot => {
      if (slot.type === 'theory') {
        const dIdx = dayIndexes[slot.day.toLowerCase().trim()];
        const sIdx = slot.slot_index;
        if (dIdx && sIdx !== undefined && sIdx !== null) {
          grid[sIdx][dIdx] = {
            type: 'theory',
            code: slot.course_code,
            teacher: slot.teacher_name,
            room: slot.room_number
          };
        }
      }
    });

    // Helper to find spanned slots
    const getSpannedSlots = (timeRange) => {
      const r = parseTimeRange(timeRange);
      if (!r) return [];
      const theoryRanges = [
        { idx: 0, start: 480, end: 530 },
        { idx: 1, start: 540, end: 590 },
        { idx: 2, start: 600, end: 650 },
        { idx: 3, start: 660, end: 710 },
        { idx: 4, start: 720, end: 770 },
        { idx: 5, start: 780, end: 830 },
        { idx: 6, start: 840, end: 890 },
        { idx: 7, start: 910, end: 960 },
        { idx: 8, start: 970, end: 1020 }
      ];
      const indices = [];
      theoryRanges.forEach(tr => {
        const overlapStart = Math.max(r.start, tr.start);
        const overlapEnd = Math.min(r.end, tr.end);
        if (overlapStart < overlapEnd) {
          indices.push(tr.idx);
        }
      });
      return indices;
    };

    // Fill labs in grid (labs can cover multiple slots)
    selectedSlots.forEach(slot => {
      if (slot.type === 'lab') {
        const dIdx = dayIndexes[slot.day.toLowerCase().trim()];
        const spans = getSpannedSlots(slot.time_range);
        if (dIdx && spans.length > 0) {
          spans.forEach((sIdx, sOrder) => {
            grid[sIdx][dIdx] = {
              type: 'lab',
              code: slot.course_code,
              teacher: slot.teacher_name,
              room: slot.room_number,
              batch: slot.batch_label,
              isFirst: sOrder === 0,
              spanCount: spans.length
            };
          });
        }
      }
    });

    // Render Grid Rows
    let currentY = startY + 22;
    for (let r = 0; r < 9; r++) {
      // Draw grid line borders
      doc.lineWidth(0.5).strokeColor('#CCCCCC');
      doc.lineCap('butt');

      // Draw Time Slot labels in column 0
      doc.fillColor('#EFEFEF')
         .rect(startX, currentY, colWidths[0], rowHeight)
         .fill();
      doc.fillColor('#333333')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text(SLOTS_TIMES[r], startX, currentY + 12, { width: colWidths[0], align: 'center' });

      // Draw each column cell
      let cellX = startX + colWidths[0];
      for (let c = 1; c < 7; c++) {
        const cellData = grid[r][c];
        
        if (cellData) {
          if (cellData.type === 'theory') {
            doc.fillColor('#DCE6F1')
               .rect(cellX, currentY, colWidths[c], rowHeight)
               .fill();
            
            doc.fillColor('#0F243E')
               .font('Helvetica-Bold')
               .fontSize(7)
               .text(cellData.code, cellX + 4, currentY + 4, { width: colWidths[c] - 8, align: 'center' })
               .font('Helvetica')
               .fontSize(6)
               .text(cellData.teacher || 'N/A', cellX + 4, currentY + 14, { width: colWidths[c] - 8, align: 'center', height: 10, ellipsis: true })
               .text(`Rm: ${cellData.room || 'N/A'}`, cellX + 4, currentY + 24, { width: colWidths[c] - 8, align: 'center' });
          } else if (cellData.type === 'lab') {
            // Lab drawing
            if (cellData.isFirst) {
              const fullLabHeight = rowHeight * cellData.spanCount;
              doc.fillColor('#E2EFDA')
                 .rect(cellX, currentY, colWidths[c], fullLabHeight)
                 .fill();

              doc.fillColor('#274E13')
                 .font('Helvetica-Bold')
                 .fontSize(7)
                 .text(`${cellData.code} [LAB]`, cellX + 4, currentY + (fullLabHeight / 2) - 15, { width: colWidths[c] - 8, align: 'center' })
                 .font('Helvetica')
                 .fontSize(6)
                 .text(cellData.teacher || 'N/A', cellX + 4, currentY + (fullLabHeight / 2) - 4, { width: colWidths[c] - 8, align: 'center', height: 10, ellipsis: true })
                 .text(`Rm: ${cellData.room || 'N/A'} ${cellData.batch ? `[${cellData.batch}]` : ''}`, cellX + 4, currentY + (fullLabHeight / 2) + 6, { width: colWidths[c] - 8, align: 'center' });
            }
          }
        }

        // Draw individual cell outlines
        doc.lineWidth(0.5)
           .strokeColor('#DDDDDD')
           .rect(cellX, currentY, colWidths[c], rowHeight)
           .stroke();

        cellX += colWidths[c];
      }

      // Draw time slot cell border
      doc.strokeColor('#DDDDDD')
         .rect(startX, currentY, colWidths[0], rowHeight)
         .stroke();

      currentY += rowHeight;
    }

    doc.end();
  });
}

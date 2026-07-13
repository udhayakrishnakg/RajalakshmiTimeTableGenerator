// Client Sidebar Interactivity

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLabTeacherListeners);
} else {
  setupLabTeacherListeners();
}

function setupLabTeacherListeners() {
  const labTeacherSelects = document.querySelectorAll('.select-lab-teacher');

  labTeacherSelects.forEach(select => {
    select.addEventListener('change', (e) => {
      const selectEl = e.target;
      const courseCode = selectEl.getAttribute('data-course');
      const teacherName = selectEl.value;

      // Find the batch select container for this subject card
      const parentCard = selectEl.closest('.subject-card');
      const batchContainer = parentCard.querySelector('.div-batch-select');
      const batchSelect = parentCard.querySelector('.select-lab-batch');

      if (!teacherName) {
        // No teacher selected, hide batch selection and reset
        if (batchContainer) batchContainer.style.display = 'none';
        if (batchSelect) {
          batchSelect.value = '';
          batchSelect.innerHTML = '<option value="">-- Common Session / Select --</option>';
        }
      } else {
        // Teacher selected, read batches from JSON attribute
        const batchesDataStr = selectEl.getAttribute('data-teacher-batches');
        let batches = [];
        try {
          const teacherBatches = JSON.parse(batchesDataStr || '{}');
          batches = teacherBatches[teacherName] || [];
        } catch (err) {
          console.error('Error parsing teacher batches data:', err);
        }

        if (batchSelect) {
          // Clear and rebuild options
          batchSelect.innerHTML = '<option value="">-- Common Session / Select --</option>';
          batches.forEach(batch => {
            const opt = document.createElement('option');
            opt.value = batch;
            opt.textContent = batch;
            batchSelect.appendChild(opt);
          });
        }

        // Show the batch select element
        if (batchContainer) {
          batchContainer.style.display = 'block';
        }
      }

      // Trigger preview update
      if (typeof window.updateTimetablePreview === 'function') {
        window.updateTimetablePreview();
      }
    });
  });

  // Listen to batch selections too
  const labBatchSelects = document.querySelectorAll('.select-lab-batch');
  labBatchSelects.forEach(select => {
    select.addEventListener('change', () => {
      if (typeof window.updateTimetablePreview === 'function') {
        window.updateTimetablePreview();
      }
    });
  });

  // Clean name helper to match theory and lab names
  function getCleanName(name) {
    return name.toLowerCase()
      .replace(/\blab\b/g, '')
      .replace(/\blaboratory\b/g, '')
      .replace(/\bpractical\b/g, '')
      .replace(/\bpracticals\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // Find matching lab card for a theory card
  function findMatchingLabCard(theoryCard) {
    const theoryNameEl = theoryCard.querySelector('.fw-semibold');
    if (!theoryNameEl) return null;
    const theoryName = theoryNameEl.textContent;
    const cleanTheory = getCleanName(theoryName);
    
    let bestMatch = null;
    document.querySelectorAll('.select-lab-teacher').forEach(labSelect => {
      const labCard = labSelect.closest('.subject-card');
      const labNameEl = labCard ? labCard.querySelector('.fw-semibold') : null;
      if (labNameEl) {
        const labName = labNameEl.textContent;
        const cleanLab = getCleanName(labName);
        if (cleanLab === cleanTheory || cleanLab.includes(cleanTheory) || cleanTheory.includes(cleanLab)) {
          bestMatch = labCard;
        }
      }
    });
    return bestMatch;
  }

  // Listen to theory teacher selections
  const theoryTeacherSelects = document.querySelectorAll('.select-theory-teacher');
  theoryTeacherSelects.forEach(select => {
    select.addEventListener('change', (e) => {
      const theorySelect = e.target;
      const theoryCard = theorySelect.closest('.subject-card');
      const selectedTeacher = theorySelect.value;

      if (theoryCard) {
        const labCard = findMatchingLabCard(theoryCard);
        if (labCard) {
          const labTeacherSelect = labCard.querySelector('.select-lab-teacher');
          if (labTeacherSelect) {
            // Check if this teacher exists in the lab teacher options
            let optionExists = false;
            for (let i = 0; i < labTeacherSelect.options.length; i++) {
              if (labTeacherSelect.options[i].value === selectedTeacher) {
                optionExists = true;
                break;
              }
            }

            if (optionExists) {
              // Auto-select the teacher for the lab and trigger change to rebuild batches
              labTeacherSelect.value = selectedTeacher;
              labTeacherSelect.dispatchEvent(new Event('change'));
            } else if (!selectedTeacher) {
              // If theory teacher was cleared, clear the lab teacher too
              labTeacherSelect.value = '';
              labTeacherSelect.dispatchEvent(new Event('change'));
            }
          }
        }
      }

      if (typeof window.updateTimetablePreview === 'function') {
        window.updateTimetablePreview();
      }
    });
  });
}

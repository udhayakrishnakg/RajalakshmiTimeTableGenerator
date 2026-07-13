// Main Client Application Controller

let autoSaveTimeout = null;

function initializeApp() {
  // Initialize Auto Save Toggle from localStorage (defaults to false)
  const autoSaveToggle = document.getElementById('auto-save-toggle');
  if (autoSaveToggle) {
    const autoSaveEnabled = localStorage.getItem('timetable_autosave_enabled');
    autoSaveToggle.checked = autoSaveEnabled === 'true';
    
    autoSaveToggle.addEventListener('change', () => {
      localStorage.setItem('timetable_autosave_enabled', autoSaveToggle.checked ? 'true' : 'false');
      if (autoSaveToggle.checked) {
        triggerSilentAutoSave();
      }
    });
  }

  // Load selections from localStorage if there is no savedId in the URL
  loadFromLocalStorage();

  // Trigger initial rendering to load cached/saved values
  updateTimetablePreview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Gathers all user selections into a clean, structured payload
window.getSelections = function() {
  const meta = document.getElementById('metadata-params');
  const department = meta ? meta.getAttribute('data-department') : '';
  const semester = meta ? meta.getAttribute('data-semester') : '';
  
  const selectedTheory = {};
  const selectedLabs = {};

  // Collect Theory Selections
  document.querySelectorAll('.select-theory-teacher').forEach(select => {
    const courseCode = select.getAttribute('data-course');
    const teacherName = select.value;
    if (courseCode && teacherName) {
      selectedTheory[courseCode] = teacherName;
    }
  });

  // Collect Lab Selections
  document.querySelectorAll('.select-lab-teacher').forEach(select => {
    const courseCode = select.getAttribute('data-course');
    const teacherName = select.value;
    if (courseCode && teacherName) {
      // Find matching batch selection
      const parentCard = select.closest('.subject-card');
      const batchSelect = parentCard ? parentCard.querySelector('.select-lab-batch') : null;
      const batchLabel = batchSelect ? batchSelect.value : '';

      selectedLabs[courseCode] = {
        teacher: teacherName,
        batch: batchLabel || null
      };
    }
  });

  return {
    department,
    semester,
    selectedTheory,
    selectedLabs
  };
};

// Saves current selections to localStorage
window.saveCurrentStateToLocalStorage = function() {
  if (typeof window.getSelections !== 'function') return;
  const payload = window.getSelections();
  if (!payload.department || !payload.semester) return;

  const key = `timetable_selections_${payload.department}_${payload.semester}`;
  localStorage.setItem(key, JSON.stringify(payload));
};

// Loads saved selections from localStorage if no savedId is present
window.loadFromLocalStorage = function() {
  const meta = document.getElementById('metadata-params');
  if (!meta) return;
  const department = meta.getAttribute('data-department');
  const semester = meta.getAttribute('data-semester');
  const savedId = meta.getAttribute('data-saved-id');

  // If there is a savedId in the URL, prioritize server state, but save it locally
  if (savedId) {
    saveCurrentStateToLocalStorage();
    return;
  }

  const key = `timetable_selections_${department}_${semester}`;
  const cached = localStorage.getItem(key);
  if (!cached) return;

  try {
    const data = JSON.parse(cached);
    if (!data) return;

    // Apply theory selections
    if (data.selectedTheory) {
      for (const [courseCode, teacherName] of Object.entries(data.selectedTheory)) {
        const select = document.querySelector(`.select-theory-teacher[data-course="${courseCode}"]`);
        if (select) {
          select.value = teacherName;
        }
      }
    }

    // Apply lab selections
    if (data.selectedLabs) {
      for (const [courseCode, labData] of Object.entries(data.selectedLabs)) {
        const selectTeacher = document.querySelector(`.select-lab-teacher[data-course="${courseCode}"]`);
        if (selectTeacher) {
          selectTeacher.value = labData.teacher;
          
          // Rebuild batch options for this teacher
          const parentCard = selectTeacher.closest('.subject-card');
          const batchContainer = parentCard ? parentCard.querySelector('.div-batch-select') : null;
          const batchSelect = parentCard ? parentCard.querySelector('.select-lab-batch') : null;
          
          if (labData.teacher) {
            const batchesDataStr = selectTeacher.getAttribute('data-teacher-batches');
            let batches = [];
            try {
              const teacherBatches = JSON.parse(batchesDataStr || '{}');
              batches = teacherBatches[labData.teacher] || [];
            } catch (err) {
              console.error('Error parsing teacher batches:', err);
            }

            if (batchSelect) {
              batchSelect.innerHTML = '<option value="">-- Common Session / Select --</option>';
              batches.forEach(batch => {
                const opt = document.createElement('option');
                opt.value = batch;
                opt.textContent = batch;
                batchSelect.appendChild(opt);
              });
              
              if (labData.batch) {
                batchSelect.value = labData.batch;
              }
            }
            if (batchContainer) batchContainer.style.display = 'block';
          } else {
            if (batchContainer) batchContainer.style.display = 'none';
            if (batchSelect) {
              batchSelect.value = '';
              batchSelect.innerHTML = '<option value="">-- Common Session / Select --</option>';
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse cached selections from localStorage:', err);
  }
};

// Triggers debounced silent auto-save to cloud
window.triggerSilentAutoSave = function() {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  const badge = document.getElementById('live-sync-badge');
  if (badge) {
    badge.className = 'badge bg-warning text-white font-mono px-2.5 py-1.5 text-xs text-uppercase d-flex align-items-center';
    badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1.5" style="width: 0.7rem; height: 0.7rem; border-width: 0.15em;"></span> Saving...';
  }

  autoSaveTimeout = setTimeout(async () => {
    if (typeof window.getSelections !== 'function') return;
    const payload = window.getSelections();

    try {
      const res = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // Update metadata-params and URL query param
        const meta = document.getElementById('metadata-params');
        if (meta) {
          meta.setAttribute('data-saved-id', data.id);
        }
        
        const url = new URL(window.location.href);
        if (url.searchParams.get('savedId') !== data.id) {
          url.searchParams.set('savedId', data.id);
          window.history.pushState({}, '', url);
        }

        if (badge) {
          badge.className = 'badge bg-success text-white font-mono px-2.5 py-1.5 text-xs text-uppercase d-flex align-items-center';
          badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Auto-Saved';
          
          setTimeout(() => {
            if (badge.innerHTML.includes('Auto-Saved')) {
              badge.className = 'badge bg-secondary font-mono px-2.5 py-1.5 text-xs text-uppercase d-flex align-items-center';
              badge.innerHTML = '<i class="bi bi-dot text-success me-0.5 fs-5"></i> Live Sync';
            }
          }, 3000);
        }
      } else {
        if (badge) {
          badge.className = 'badge bg-danger text-white font-mono px-2.5 py-1.5 text-xs text-uppercase d-flex align-items-center';
          badge.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Save Error';
        }
      }
    } catch (err) {
      console.error('Silent auto-save failed:', err);
      if (badge) {
        badge.className = 'badge bg-danger text-white font-mono px-2.5 py-1.5 text-xs text-uppercase d-flex align-items-center';
        badge.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Save Error';
      }
    }
  }, 1200); // 1.2 second debounce
};

// Triggers an immediate server-side partial rerender of the grid, stats, and conflicts panels
window.updateTimetablePreview = async function() {
  const payload = window.getSelections();
  
  const gridContainer = document.getElementById('timetable-grid-container');
  const statsContainer = document.getElementById('statistics-container');
  const conflictsContainer = document.getElementById('conflicts-container');

  if (!gridContainer) return;

  // Always store selections in localStorage whenever they change
  window.saveCurrentStateToLocalStorage();

  // If auto save is enabled, trigger silent server auto save
  const autoSaveToggle = document.getElementById('auto-save-toggle');
  if (autoSaveToggle && autoSaveToggle.checked) {
    window.triggerSilentAutoSave();
  }

  try {
    const res = await fetch('/select/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      // Ingest partial EJS-rendered HTML chunks
      gridContainer.innerHTML = data.timetableHtml;
      if (statsContainer) statsContainer.innerHTML = data.statisticsHtml;
      if (conflictsContainer) conflictsContainer.innerHTML = data.conflictsHtml;

      // Re-apply filter states (hiding teachers, compact view, show only conflicts, etc.)
      if (typeof window.applyTimetableFilters === 'function') {
        window.applyTimetableFilters();
      }
    } else {
      console.error('Failed to update preview:', data.error);
    }
  } catch (err) {
    console.error('Error fetching preview data:', err.message);
  }
};

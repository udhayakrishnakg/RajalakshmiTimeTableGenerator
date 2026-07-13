// Client-side Save & Export Interactions

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupActionListeners);
} else {
  setupActionListeners();
}

function setupActionListeners() {
  console.log('Setting up timetable action listeners...');
  
  const btnSave = document.getElementById('btn-save');
  const btnPng = document.getElementById('btn-export-png');

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      console.log('Save schedule button clicked.');
      await saveCurrentTimetable();
    });
  }

  if (btnPng) {
    btnPng.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Save as PNG button clicked.');
      exportTimetableToPNG();
    });
  }
}

async function saveCurrentTimetable() {
  if (typeof window.getSelections !== 'function') {
    alert('Application is still initializing. Please try again in a moment.');
    return;
  }
  const payload = window.getSelections();

  // Validate that at least one subject/lab is selected
  const hasTheory = payload.selectedTheory && Object.keys(payload.selectedTheory).length > 0;
  const hasLabs = payload.selectedLabs && Object.keys(payload.selectedLabs).length > 0;
  if (!hasTheory && !hasLabs) {
    alert('Validation Error: No subjects selected. Please select at least one theory or lab subject before saving your schedule.');
    return;
  }

  const btnSave = document.getElementById('btn-save');
  const originalText = btnSave ? btnSave.innerHTML : 'Save Schedule';
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
  }

  try {
    console.log('Saving timetable to server with payload:', payload);
    const res = await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('Timetable saved successfully!');
      // Set savedId in metadata and refresh query param to keep URL correct
      const meta = document.getElementById('metadata-params');
      if (meta) {
        meta.setAttribute('data-saved-id', data.id);
      }
      const url = new URL(window.location.href);
      url.searchParams.set('savedId', data.id);
      window.history.pushState({}, '', url);
    } else {
      alert('Save failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error saving timetable:', err);
    alert('Error saving schedule: ' + err.message);
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = originalText;
    }
  }
}

function exportTimetableToPNG() {
  const node = document.getElementById('main-timetable');
  if (!node) {
    alert('Timetable element not found!');
    return;
  }

  if (typeof htmlToImage === 'undefined') {
    alert('html-to-image library is still loading. Please try again in a moment.');
    return;
  }

  if (typeof window.getSelections !== 'function') {
    alert('Application is still initializing. Please try again in a moment.');
    return;
  }
  const payload = window.getSelections();

  // Validate that at least one subject/lab is selected
  const hasTheory = payload.selectedTheory && Object.keys(payload.selectedTheory).length > 0;
  const hasLabs = payload.selectedLabs && Object.keys(payload.selectedLabs).length > 0;
  if (!hasTheory && !hasLabs) {
    alert('Validation Error: No subjects selected. Please select at least one theory or lab subject before exporting.');
    return;
  }

  // Highlight downloading state
  const btn = document.getElementById('btn-export-png');
  const originalText = btn ? btn.innerHTML : 'Save as PNG';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Capturing...';
  }

  console.log('Capturing timetable element to PNG...');

  // Apply a small timeout to let any rendering settle
  setTimeout(() => {
    htmlToImage.toPng(node, {
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        margin: '0',
        borderRadius: '0'
      }
    })
    .then((dataUrl) => {
      const link = document.createElement('a');
      const sanitizedDept = (payload.department || 'department').replace(/\s+/g, '_');
      const semValue = payload.semester || '1';
      link.download = `timetable_${sanitizedDept}_sem_${semValue}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('PNG export completed successfully.');
    })
    .catch((error) => {
      console.error('html-to-image failed:', error);
      alert('Failed to generate PNG. Please try again.');
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }, 300);
}

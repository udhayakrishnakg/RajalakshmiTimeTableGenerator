// Client-side Filters and Layout Adjustments

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFilterListeners);
} else {
  setupFilterListeners();
}

function setupFilterListeners() {
  const checkboxes = document.querySelectorAll('.filter-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      applyTimetableFilters();
    });
  });
}

window.applyTimetableFilters = function() {
  const hideTeachers = document.getElementById('hide-teachers')?.checked;
  const hideRooms = document.getElementById('hide-rooms')?.checked;
  const hideBatches = document.getElementById('hide-batches')?.checked;
  const compactView = document.getElementById('compact-view')?.checked;
  const onlyConflicts = document.getElementById('only-conflicts')?.checked;

  const grid = document.getElementById('main-timetable');
  
  if (grid) {
    // 1. Compact View Class Toggle
    if (compactView) {
      grid.classList.add('compact-grid-view');
    } else {
      grid.classList.remove('compact-grid-view');
    }

    // 2. Hide Teachers
    document.querySelectorAll('.card-teacher-name').forEach(el => {
      if (hideTeachers) {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
      }
    });

    // 3. Hide Rooms
    document.querySelectorAll('.card-room-number').forEach(el => {
      if (hideRooms) {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
      }
    });

    // 4. Hide Batches
    document.querySelectorAll('.card-batch-label').forEach(el => {
      if (hideBatches) {
        el.style.display = 'none';
      } else {
        el.style.display = 'inline-block';
      }
    });

    // 5. Show Only Conflicts
    if (onlyConflicts) {
      document.querySelectorAll('.timetable-card').forEach(el => {
        if (!el.classList.contains('conflict-highlight')) {
          el.style.opacity = '0.15';
          el.style.pointerEvents = 'none';
        } else {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        }
      });
    } else {
      document.querySelectorAll('.timetable-card').forEach(el => {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      });
    }
  }
};

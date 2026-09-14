// Set today's date automatically on load
document.getElementById('dateInput').valueAsDate = new Date();
updateHistoryView();

function logSet() {
  const date = document.getElementById('dateInput').value;
  const exercise = document.getElementById('exerciseInput').value;
  const setType = document.getElementById('setType').value;
  const weight = document.getElementById('weightInput').value || 0;
  const reps = document.getElementById('repsInput').value || 0;

  if (!date || !exercise) {
    alert("Date and Exercise are required.");
    return;
  }

  // Determine standard FitNotes Category based on lift
  let category = "Strength";
  if (exercise.includes("Rowing")) category = "Cardio";

  const newSet = { date, exercise, category, setType, weight, reps };
  
  let workouts = JSON.parse(localStorage.getItem('myWorkouts')) || [];
  workouts.push(newSet);
  localStorage.setItem('myWorkouts', JSON.stringify(workouts));

  // Clear inputs for the next set (keep date and exercise)
  document.getElementById('weightInput').value = '';
  document.getElementById('repsInput').value = '';
  
  updateHistoryView();
}

function updateHistoryView() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';
  let workouts = JSON.parse(localStorage.getItem('myWorkouts')) || [];
  
  // Show the last 5 sets
  workouts.slice(-5).reverse().forEach(set => {
    const li = document.createElement('li');
    li.textContent = `${set.date} | ${set.exercise} (${set.setType}) - ${set.weight}lbs x ${set.reps}`;
    historyList.appendChild(li);
  });
}

function exportFitNotesCSV() {
  let workouts = JSON.parse(localStorage.getItem('myWorkouts')) || [];
  
  // FitNotes exact header requirement
  let csvContent = "Date, Exercise, Category, Weight (lbs), Reps, Distance, Time\n";
  
  workouts.forEach(set => {
    // Standardizing empty distance and time for strength sets
    csvContent += `${set.date}, ${set.exercise}, ${set.category}, ${set.weight}, ${set.reps}, ,\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "FitNotes_Export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importFitNotesCSV() {
  const fileInput = document.getElementById('csvFileInput');
  if (!fileInput.files.length) {
    alert("Please select a file first.");
    return;
  }

  Papa.parse(fileInput.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      let workouts = JSON.parse(localStorage.getItem('myWorkouts')) || [];
      
      results.data.forEach(row => {
        // Map FitNotes headers to our app format
        if(row['Date'] && row['Exercise']) {
          workouts.push({
            date: row['Date'],
            exercise: row['Exercise'],
            category: row['Category'] || 'Strength',
            setType: "Imported", // FitNotes doesn't track base/volume sets
            weight: row['Weight (lbs)'] || 0,
            reps: row['Reps'] || 0
          });
        }
      });

      localStorage.setItem('myWorkouts', JSON.stringify(workouts));
      updateHistoryView();
      alert("Import complete!");
    }
  });
}

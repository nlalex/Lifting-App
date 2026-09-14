document.getElementById('dateInput').valueAsDate = new Date();
let workouts = JSON.parse(localStorage.getItem('myWorkouts')) || [];

updateHistoryView();
updateMetrics();

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

  const category = exercise.includes("Rowing") ? "Cardio" : "Strength";
  const newSet = { date, exercise, category, setType, weight, reps };
  
  workouts.push(newSet);
  localStorage.setItem('myWorkouts', JSON.stringify(workouts));

  document.getElementById('weightInput').value = '';
  document.getElementById('repsInput').value = '';
  
  updateHistoryView();
  updateMetrics();
}

function updateHistoryView() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';
  
  // Display 5 most recent sets
  workouts.slice(-5).reverse().forEach(set => {
    const li = document.createElement('li');
    li.textContent = `${set.date} | ${set.exercise} (${set.setType}) - ${set.weight}lbs x ${set.reps}`;
    historyList.appendChild(li);
  });
}

function updateMetrics() {
  const targetEx = document.getElementById('metricExercise').value;
  const exWorkouts = workouts.filter(w => w.exercise === targetEx && w.weight > 0 && w.reps > 0);
  
  if(exWorkouts.length === 0) {
     document.getElementById('metric1RM').textContent = '--';
     document.getElementById('metricMax').textContent = '--';
     document.getElementById('metricVol').textContent = '--';
     return;
  }
  
  let maxWeight = 0;
  let max1RM = 0;
  let totalVol30 = 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  exWorkouts.forEach(w => {
     const weight = parseFloat(w.weight);
     const reps = parseInt(w.reps);
     
     if (weight > maxWeight) maxWeight = weight;
     
     // Epley Formula for 1RM Calculation
     const e1rm = weight * (1 + (reps / 30));
     if (e1rm > max1RM) max1RM = e1rm;
     
     const wDate = new Date(w.date);
     if (wDate >= thirtyDaysAgo) {
         totalVol30 += (weight * reps);
     }
  });
  
  document.getElementById('metric1RM').textContent = Math.round(max1RM) + ' lbs';
  document.getElementById('metricMax').textContent = maxWeight + ' lbs';
  document.getElementById('metricVol').textContent = totalVol30 + ' lbs';
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.name.endsWith('.fitnotes')) {
    // 1. Initialize WebAssembly SQLite
    const SQL = await initSqlJs({ locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${filename}` });
    let dbBuffer = await file.arrayBuffer();
    
    // 2. FitNotes sometimes compresses SQLite backups. Attempt unzip first.
    try {
      const zip = await JSZip.loadAsync(dbBuffer);
      const firstFilename = Object.keys(zip.files)[0];
      dbBuffer = await zip.files[firstFilename].async("arraybuffer");
    } catch(e) {
      // Proceed as raw SQLite if not zipped
    }

    // 3. Query the Database
    try {
      const db = new SQL.Database(new Uint8Array(dbBuffer));
      const result = db.exec(`
        SELECT date, exercise.name as exercise, weight, reps 
        FROM training_log 
        JOIN exercise ON training_log.exercise_id = exercise.id
      `);
      
      if (result.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values;
        
        const importedWorkouts = values.map(row => {
          let dateStr = row[columns.indexOf('date')];
          // Strip timestamp to match YYYY-MM-DD
          if (typeof dateStr === 'string') dateStr = dateStr.split(' ')[0]; 
          return {
            date: dateStr,
            exercise: row[columns.indexOf('exercise')],
            category: 'Strength',
            setType: 'Imported',
            weight: row[columns.indexOf('weight')] || 0,
            reps: row[columns.indexOf('reps')] || 0
          };
        });
        
        workouts = workouts.concat(importedWorkouts);
        localStorage.setItem('myWorkouts', JSON.stringify(workouts));
        updateHistoryView();
        updateMetrics();
        alert(`Imported ${importedWorkouts.length} sets from FitNotes DB!`);
      }
    } catch(err) {
      alert("Error reading .fitnotes SQLite structure. Make sure this is a valid FitNotes backup.");
      console.error(err);
    }

  } else if (file.name.endsWith('.csv')) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: function(results) {
        results.data.forEach(row => {
          if(row['Date'] && row['Exercise']) {
            workouts.push({
              date: row['Date'],
              exercise: row['Exercise'],
              category: row['Category'] || 'Strength',
              setType: "Imported",
              weight: row['Weight (lbs)'] || 0,
              reps: row['Reps'] || 0
            });
          }
        });
        localStorage.setItem('myWorkouts', JSON.stringify(workouts));
        updateHistoryView();
        updateMetrics();
        alert("CSV Import complete!");
      }
    });
  }
}

function clearData() {
  if(confirm("Are you sure you want to delete all local workout data?")) {
    workouts = [];
    localStorage.removeItem('myWorkouts');
    updateHistoryView();
    updateMetrics();
  }
}

function exportFitNotesCSV() {
  let csvContent = "Date, Exercise, Category, Weight (lbs), Reps, Distance, Time\n";
  workouts.forEach(set => {
    csvContent += `${set.date}, ${set.exercise}, ${set.category}, ${set.weight}, ${set.reps}, ,\n`;
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "FitNotes_Export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

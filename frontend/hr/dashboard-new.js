// ================================
// DASHBOARD NEW - JavaScript Logic
// ================================

const API_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:5000';

let statusChart = null;
let scoreChart = null;

/**
 * Load Dashboard Statistics
 */
async function loadDashboardStats() {
  try {
    const token = window.auth.getToken();
    const response = await fetch(`${API_URL}/api/hr/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    const data = result.data;
    updateSummaryCards(data.statistics, data.weeklyStats);
    updateWeeklyMetrics(data.weeklyStats);
    updateStatusDonutChart(data.statistics.applications);
    updateStatusBars(data.statistics.applications);
    updateApplicationsTable(data.recentActivities);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Failed to load dashboard data: ' + error.message);
  }
}

/**
 * Update Summary Cards (Executive Summary style)
 */
function updateSummaryCards(statistics, weeklyStats) {
  const apps = statistics.applications;
  const jobs = statistics.jobs;

  // Card 1 — Applications
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
  set('totalApplications', apps.total);
  set('pendingCount',      apps.pending);
  set('shortlistedCount',  apps.shortlisted);

  // Card 2 — Active Jobs
  set('activeJobs',   jobs.active);
  set('jobsTrendVal', weeklyStats?.jobs ?? 0);

  // Card 4 — Status
  set('reviewedCount',    apps.reviewed);
  set('shortlistedCount2', apps.shortlisted);
  set('rejectedCount',    apps.rejected);

  // Trend labels
  const appTrend = document.getElementById('applicationsTrend');
  if (appTrend && weeklyStats) appTrend.textContent = `+${weeklyStats.applications || 0} this week`;
  const jobTrend = document.getElementById('jobsTrend');
  if (jobTrend && weeklyStats) jobTrend.textContent = `+${weeklyStats.jobs || 0} this week`;
}

/**
 * Drive horizontal status bar chart
 */
function updateStatusBars(apps) {
  const s = apps.shortlisted || 0;
  const r = apps.rejected   || 0;
  const total = s + r;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setW  = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; };

  if (total === 0) {
    setEl('barShortlistedCount', 0); setEl('barShortlistedPct', '0%');
    setEl('barRejectedCount',    0); setEl('barRejectedPct',    '0%');
    setEl('barTotal', 0);
    return;
  }

  const pct = v => Math.max(3, Math.round((v / total) * 100));

  setW('barShortlisted', pct(s));
  setEl('barShortlistedCount', s);
  setEl('barShortlistedPct', pct(s) + '%');

  setW('barRejected', pct(r));
  setEl('barRejectedCount', r);
  setEl('barRejectedPct', pct(r) + '%');

  setEl('barTotal', total);
}


/**
 * Update Weekly Metrics
 */
function updateWeeklyMetrics(weeklyStats) {
  const weeklyApplicationsEl = document.getElementById('weeklyApplications');
  const weeklyHighMatchesEl = document.getElementById('weeklyHighMatches');
  const weeklyJobsEl = document.getElementById('weeklyJobs');
  const weeklyInterviewsEl = document.getElementById('weeklyInterviews');

  if (weeklyApplicationsEl) {
    weeklyApplicationsEl.textContent = weeklyStats.applications || 0;
  }

  if (weeklyHighMatchesEl) {
    weeklyHighMatchesEl.textContent = weeklyStats.highMatches || 0;
  }

  if (weeklyJobsEl) {
    weeklyJobsEl.textContent = weeklyStats.jobs || 0;
  }

  if (weeklyInterviewsEl) {
    weeklyInterviewsEl.textContent = weeklyStats.interviews || weeklyStats.shortlisted || 0;
  }
}

/**
 * Update Status Donut Chart
 */
function updateStatusDonutChart(applicationsData) {
  const ctx = document.getElementById('statusDonutChart');
  if (!ctx) return;

  const shortlisted = applicationsData.shortlisted || 0;
  const rejected    = applicationsData.rejected    || 0;
  const total       = shortlisted + rejected;

  // Populate center total and custom legend pills
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('donutTotal',        total);
  setEl('legendShortlisted', shortlisted);
  setEl('legendRejected',    rejected);

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Shortlisted', 'Rejected'],
      datasets: [{
        data: [shortlisted, rejected],
        backgroundColor: [
          'rgba(74, 158, 255, 0.85)',   // Blue
          'rgba(239, 68,  68,  0.85)'   // Red
        ],
        borderColor: [
          'rgba(74, 158, 255, 1)',
          'rgba(239, 68,  68,  1)'
        ],
        borderWidth: 2,
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },   // hide built-in legend — we use our own pills
        tooltip: {
          backgroundColor: 'rgba(10,22,40,0.92)',
          padding: 12,
          titleFont: { size: 13 },
          bodyFont:  { size: 13 },
          callbacks: {
            label: function(context) {
              const value = context.parsed || 0;
              const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `  ${context.label}: ${value} (${pct}%)`;
            }
          }
        }
      },
      cutout: '68%'
    }
  });
}

/**
 * Update Match Score Distribution Chart
 */
function updateScoreDistributionChart(scoreDistribution) {
  const ctx = document.getElementById('scoreDistributionChart');
  if (!ctx) return;

  // Destroy existing chart
  if (scoreChart) {
    scoreChart.destroy();
  }

  // Create new bar chart
  scoreChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'],
      datasets: [{
        label: 'Number of Candidates',
        data: [
          scoreDistribution['0-20'] || 0,
          scoreDistribution['20-40'] || 0,
          scoreDistribution['40-60'] || 0,
          scoreDistribution['60-80'] || 0,
          scoreDistribution['80-100'] || 0
        ],
        backgroundColor: [
          'rgba(255, 71, 87, 0.7)',    // Red - Very Low
          'rgba(255, 159, 67, 0.7)',   // Orange - Low
          'rgba(255, 234, 167, 0.7)',  // Yellow - Medium
          'rgba(74, 158, 255, 0.7)',   // Blue - Good
          'rgba(46, 213, 115, 0.7)'    // Green - Excellent
        ],
        borderColor: [
          'rgba(255, 71, 87, 1)',
          'rgba(255, 159, 67, 1)',
          'rgba(255, 234, 167, 1)',
          'rgba(74, 158, 255, 1)',
          'rgba(46, 213, 115, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0,
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          title: {
            display: true,
            text: 'Number of Candidates',
            color: 'rgba(255, 255, 255, 0.8)',
            font: {
              size: 12
            }
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            display: false
          },
          title: {
            display: true,
            text: 'Match Score Range',
            color: 'rgba(255, 255, 255, 0.8)',
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

/**
 * Update Applications Table
 */
function updateApplicationsTable(recentActivities) {
  const tableBody = document.getElementById('applicationsTableBody');
  const tableCount = document.getElementById('tableCount');
  const tableEmpty = document.getElementById('tableEmpty');

  if (!tableBody) return;

  // Filter only application activities
  const applications = recentActivities.filter(activity => activity.type === 'application');

  if (applications.length === 0) {
    if (tableEmpty) tableEmpty.style.display = 'block';
    if (tableCount) tableCount.textContent = 'No applications yet';
    tableBody.innerHTML = '';
    return;
  }

  if (tableEmpty) tableEmpty.style.display = 'none';
  if (tableCount) tableCount.textContent = `Showing ${applications.length} applications`;

  // Build table rows
  tableBody.innerHTML = applications.map(app => {
    const matchScore = app.matchScore || 0;
    const matchClass = getMatchScoreClass(matchScore);
    
    // Use actual status from API data
    const status = app.status || 'PENDING';
    const statusClass = getStatusClass(status);
    const statusDisplay = status.charAt(0) + status.slice(1).toLowerCase();
    
    // Extract candidate name from description
    const candidateName = app.description.split(' applied')[0] || 'Unknown';
    const jobTitle = app.jobTitle || 'Unknown Position';
    const appliedDate = formatDate(app.timestamp);

    return `
      <tr>
        <td>${candidateName}</td>
        <td>${jobTitle}</td>
        <td class="text-center">
          <span class="match-score ${matchClass}">${Math.round(matchScore)}%</span>
        </td>
        <td class="text-center">
          <span class="status-badge ${statusClass}">${statusDisplay}</span>
        </td>
        <td>${appliedDate}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Get Match Score CSS Class
 */
function getMatchScoreClass(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Get Status CSS Class
 */
function getStatusClass(status) {
  return status.toLowerCase();
}

/**
 * Format Date
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-MY', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Show Error Message
 */
function showError(message) {
  console.error(message);
  // You can add a toast notification here
}

/**
 * Export All Data (Placeholder)
 */
function exportAllData() {
  alert('Export feature coming soon!');
}

/**
 * Initialize Dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
  loadDashboardStats();
  
  // Auto-refresh every 60 seconds
  setInterval(loadDashboardStats, 60000);
  
  console.log('✅ New Dashboard loaded successfully');
});

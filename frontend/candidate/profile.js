// Candidate Profile Page

let currentSkills = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadStats();
});

// ─────────────────────────────────────────
// LOAD PROFILE
// ─────────────────────────────────────────
async function loadProfile() {
  try {
    const res  = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/candidates/profile`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to load profile');

    const profile = data.data?.candidateProfile;
    const user    = profile?.userId || {};

    // Avatar initials
    const name = user.fullName || 'Candidate';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('avatarInitials').textContent = initials;

    // Header
    document.getElementById('profileName').textContent  = name;
    document.getElementById('profileEmail').textContent = user.email || '';

    // Read-only fields
    document.getElementById('fieldName').value  = name;
    document.getElementById('fieldEmail').value = user.email  || '';
    document.getElementById('fieldPhone').value = user.phone  || '';

    // Editable fields
    const educationLevel = profile?.education?.level || '';
    document.getElementById('fieldEducation').value  = educationLevel;
    document.getElementById('fieldExperience').value = profile?.yearsOfExperience ?? '';
    document.getElementById('fieldLinkedin').value   = profile?.linkedinUrl || '';

    // Skills
    currentSkills = profile?.skills || [];
    renderSkillTags();

    // Resume status — show a clean label, not the raw UUID filename
    const resumeEl = document.getElementById('resumeStatus');
    if (profile?.resumePath) {
      const raw  = profile.resumePath.split(/[\\/]/).pop();          // e.g. resume_abc123.pdf
      const ext  = raw.includes('.') ? raw.split('.').pop().toUpperCase() : 'FILE'; // PDF / DOCX
      const code = raw.replace(/^resume_/i, '').substring(0, 8);    // short identifier
      resumeEl.innerHTML = `
        <div class="rb-value" style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.1rem;">📄</span>
          <div>
            <div style="font-size:0.85rem;font-weight:600;color:#4ade80;">Resume uploaded ✅</div>
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.3);margin-top:0.1rem;">${ext} · ID: ${code}…</div>
          </div>
        </div>`;
    } else {
      resumeEl.innerHTML = '<span class="rb-none">⚠️ No resume uploaded yet</span>';
    }

  } catch (err) {
    console.error('Load profile error:', err);
    showToast('Could not load profile: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────
// LOAD STATS (applications count)
// ─────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/candidates/applications`);
    const data = await res.json();

    if (res.ok && data.success) {
      const apps = data.data?.applications || [];
      document.getElementById('statApplications').textContent = apps.length;
      document.getElementById('statShortlisted').textContent  = apps.filter(a => a.status === 'SHORTLISTED').length;
    }
  } catch (e) {
    // Non-critical — leave as —
  }
}

// ─────────────────────────────────────────
// SKILLS TAG INPUT
// ─────────────────────────────────────────
function handleSkillKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    addSkill(val);
    e.target.value = '';
  }
}

function addSkill(skill) {
  if (!skill || currentSkills.map(s => s.toLowerCase()).includes(skill.toLowerCase())) return;
  currentSkills.push(skill);
  renderSkillTags();
  document.getElementById('statSkills').textContent = currentSkills.length;
}

function removeSkill(index) {
  currentSkills.splice(index, 1);
  renderSkillTags();
  document.getElementById('statSkills').textContent = currentSkills.length;
}

function renderSkillTags() {
  const container = document.getElementById('skillsTags');
  document.getElementById('statSkills').textContent = currentSkills.length;
  container.innerHTML = currentSkills.map((skill, i) => `
    <span class="skill-tag">
      ${skill}
      <button onclick="removeSkill(${i})" title="Remove">✕</button>
    </span>`).join('');
}

// ─────────────────────────────────────────
// SAVE PROFILE
// ─────────────────────────────────────────
async function saveProfile() {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const payload = {
    education:         { level: document.getElementById('fieldEducation').value },
    yearsOfExperience: Number(document.getElementById('fieldExperience').value) || 0,
    linkedinUrl:       document.getElementById('fieldLinkedin').value.trim(),
    skills:            currentSkills
  };

  try {
    const res  = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/candidates/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');

    showToast('✅ Profile saved successfully!', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save Changes';
  }
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

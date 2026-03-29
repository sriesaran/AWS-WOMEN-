/* ============================================================
   HerDay AI - app.js  (emoji-safe: all emoji as \uXXXX escapes)
   ============================================================ */

// ===== STATE =====
let state = {
  user: null, tasks: [], habits: [], goals: [], wellness: [],
  safetyContacts: [], reminders: { water:true, meals:true, medicine:false, exercise:true, meditation:true, sleep:true },
  theme: 'default', onboardingData: {}
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadState(); applyTheme(state.theme);
  if (state.user) launchApp(); else showPage('page-landing');
  startReminderEngine();
});

// ===== PERSISTENCE =====
function saveState() { localStorage.setItem('herday_state', JSON.stringify(state)); }
function loadState() {
  const s = localStorage.getItem('herday_state');
  if (s) { try { state = { ...state, ...JSON.parse(s) }; } catch(e) {} }
}

// ===== PAGE NAV =====
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById(id); if (p) p.classList.add('active');
}

// ===== AUTH =====
function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) return showToast('Please fill all fields', 'error');
  state.user = { name, email, password, createdAt: Date.now() };
  saveState();
  showToast('Welcome, ' + name + '! Let\'s set up your profile');
  initOnboarding(); showPage('page-onboarding');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!state.user) return showToast('No account found. Please sign up.', 'error');
  if (state.user.email !== email || state.user.password !== password)
    return showToast('Invalid email or password', 'error');
  showToast('Welcome back, ' + state.user.name + '!');
  launchApp();
}

function handleLogout() {
  showToast('See you soon!');
  setTimeout(() => {
    document.getElementById('main-app').classList.add('hidden');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    showPage('page-landing');
  }, 800);
}

function launchApp() {
  if (!state.tasks.length) seedSampleData();
  document.getElementById('main-app').classList.remove('hidden');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  updateNavUser(); switchTab('dashboard');
}

// ===== ONBOARDING =====
let onboardingStep = 0;
const onboardingSteps = [
  {
    title: 'Tell us about yourself',
    subtitle: 'Help us personalize your experience',
    fields: `
      <div class="form-group"><label>Your Name</label><input type="text" id="ob-name" placeholder="What should we call you?" /></div>
      <div class="form-group"><label>I am a...</label>
        <div class="chip-group" id="ob-type-chips">
          <div class="chip" onclick="selectChip(this,'ob-type')">Student</div>
          <div class="chip" onclick="selectChip(this,'ob-type')">Working Woman</div>
          <div class="chip" onclick="selectChip(this,'ob-type')">Homemaker</div>
          <div class="chip" onclick="selectChip(this,'ob-type')">Freelancer</div>
          <div class="chip" onclick="selectChip(this,'ob-type')">Entrepreneur</div>
        </div>
        <input type="hidden" id="ob-type" />
      </div>`
  },
  {
    title: 'Your daily schedule',
    subtitle: 'We\'ll plan around your natural rhythm',
    fields: `
      <div class="form-row">
        <div class="form-group"><label>Wake-up Time</label><input type="time" id="ob-wake" value="07:00" /></div>
        <div class="form-group"><label>Sleep Time</label><input type="time" id="ob-sleep" value="23:00" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Work/Study Start</label><input type="time" id="ob-work-start" value="09:00" /></div>
        <div class="form-group"><label>Work/Study End</label><input type="time" id="ob-work-end" value="17:00" /></div>
      </div>`
  },
  {
    title: 'Health & wellness',
    subtitle: 'Your wellbeing is our priority',
    fields: `
      <div class="form-group"><label>Health preferences</label>
        <div class="chip-group" id="ob-health-chips">
          <div class="chip" onclick="selectChip(this,'ob-health','multi')">Meditation</div>
          <div class="chip" onclick="selectChip(this,'ob-health','multi')">Exercise</div>
          <div class="chip" onclick="selectChip(this,'ob-health','multi')">Medicine reminders</div>
          <div class="chip" onclick="selectChip(this,'ob-health','multi')">Water tracking</div>
          <div class="chip" onclick="selectChip(this,'ob-health','multi')">Sleep tracking</div>
          <div class="chip" onclick="selectChip(this,'ob-health','multi')">Cycle tracking</div>
        </div>
        <input type="hidden" id="ob-health" />
      </div>
      <div class="form-group"><label>Emergency Contact Number</label><input type="tel" id="ob-safety" placeholder="+1 234 567 8900" /></div>`
  },
  {
    title: 'Your goals',
    subtitle: 'What do you want to achieve?',
    fields: `
      <div class="form-group"><label>My main goals are...</label>
        <div class="chip-group" id="ob-goals-chips">
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Career growth</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Learning</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Health &amp; fitness</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Financial freedom</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Mental wellness</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Family &amp; relationships</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Travel</div>
          <div class="chip" onclick="selectChip(this,'ob-goals','multi')">Creativity</div>
        </div>
        <input type="hidden" id="ob-goals" />
      </div>`
  }
];

function initOnboarding() { onboardingStep = 0; renderOnboardingStep(); }

function renderOnboardingStep() {
  const step = onboardingSteps[onboardingStep];
  const fill = ((onboardingStep + 1) / onboardingSteps.length) * 100;
  document.getElementById('onboarding-progress-fill').style.width = fill + '%';
  document.getElementById('onboarding-step-label').textContent = 'Step ' + (onboardingStep+1) + ' of ' + onboardingSteps.length;
  document.getElementById('onboarding-steps').innerHTML = `
    <div class="onboarding-step">
      <h2>${step.title}</h2><p>${step.subtitle}</p>
      ${step.fields}
      <div class="onboarding-nav">
        ${onboardingStep > 0 ? '<button class="btn-ghost" onclick="prevOnboarding()">Back</button>' : '<div></div>'}
        <button class="btn-primary" onclick="nextOnboarding()">${onboardingStep === onboardingSteps.length-1 ? 'Get Started' : 'Continue'}</button>
      </div>
    </div>`;
  const d = state.onboardingData;
  if (d.name && document.getElementById('ob-name')) document.getElementById('ob-name').value = d.name;
  if (d.wake && document.getElementById('ob-wake')) document.getElementById('ob-wake').value = d.wake;
  if (d.sleep && document.getElementById('ob-sleep')) document.getElementById('ob-sleep').value = d.sleep;
}

function selectChip(el, fieldId, mode) {
  if (mode === 'multi') {
    el.classList.toggle('selected');
    const sel = [...el.closest('.chip-group').querySelectorAll('.chip.selected')].map(c => c.textContent.trim());
    document.getElementById(fieldId).value = sel.join(',');
  } else {
    el.closest('.chip-group').querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById(fieldId).value = el.textContent.trim();
  }
}

function nextOnboarding() {
  const d = state.onboardingData;
  if (onboardingStep === 0) {
    d.name = document.getElementById('ob-name')?.value || state.user.name;
    d.type = document.getElementById('ob-type')?.value || 'Working Woman';
    if (d.name) state.user.name = d.name;
  } else if (onboardingStep === 1) {
    d.wake = document.getElementById('ob-wake')?.value || '07:00';
    d.sleep = document.getElementById('ob-sleep')?.value || '23:00';
    d.workStart = document.getElementById('ob-work-start')?.value || '09:00';
    d.workEnd = document.getElementById('ob-work-end')?.value || '17:00';
  } else if (onboardingStep === 2) {
    d.health = document.getElementById('ob-health')?.value || '';
    const safetyNum = document.getElementById('ob-safety')?.value;
    if (safetyNum) state.safetyContacts = [{ name: 'Emergency Contact', phone: safetyNum, id: Date.now() }];
  } else if (onboardingStep === 3) {
    d.goals = document.getElementById('ob-goals')?.value || '';
  }
  saveState();
  if (onboardingStep < onboardingSteps.length - 1) { onboardingStep++; renderOnboardingStep(); }
  else { showToast('You\'re all set, ' + state.user.name + '!'); launchApp(); }
}

function prevOnboarding() { if (onboardingStep > 0) { onboardingStep--; renderOnboardingStep(); } }

// ===== SAMPLE DATA =====
function seedSampleData() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  state.tasks = [
    { id:1, title:'Prepare quarterly report', priority:'high', category:'work', deadline:today, duration:90, completed:false, createdAt:Date.now() },
    { id:2, title:'Morning yoga session', priority:'medium', category:'health', deadline:today, duration:30, completed:true, createdAt:Date.now() },
    { id:3, title:'Review project proposal', priority:'high', category:'work', deadline:tomorrow, duration:60, completed:false, createdAt:Date.now() },
    { id:4, title:'Call mom', priority:'medium', category:'family', deadline:today, duration:20, completed:false, createdAt:Date.now() },
    { id:5, title:'Read 20 pages', priority:'low', category:'personal', deadline:today, duration:30, completed:false, createdAt:Date.now() },
    { id:6, title:'Grocery shopping', priority:'medium', category:'home', deadline:tomorrow, duration:45, completed:false, createdAt:Date.now() },
  ];
  state.habits = [
    { id:1, name:'Morning Meditation', icon:'&#129497;', streak:7,  completedDays:[1,1,1,1,1,1,1], todayDone:false },
    { id:2, name:'Exercise',           icon:'&#127939;', streak:4,  completedDays:[1,0,1,1,1,0,1], todayDone:false },
    { id:3, name:'Reading',            icon:'&#128218;', streak:12, completedDays:[1,1,1,1,1,1,1], todayDone:true  },
    { id:4, name:'Journaling',         icon:'&#128211;', streak:3,  completedDays:[0,0,0,0,1,1,1], todayDone:false },
    { id:5, name:'Skincare',           icon:'&#10024;',  streak:21, completedDays:[1,1,1,1,1,1,1], todayDone:true  },
    { id:6, name:'Save Money',         icon:'&#128176;', streak:5,  completedDays:[0,1,1,1,1,1,0], todayDone:false },
  ];
  state.goals = [
    { id:1, title:'Launch my online course', category:'career', deadline:'2026-06-30', description:'Create and publish a course on digital marketing', progress:45, milestones:['Research done','Outline created','Module 1 recorded'] },
    { id:2, title:'Run a 5K', category:'health', deadline:'2026-05-15', description:'Train consistently and complete a 5K race', progress:60, milestones:['Started training','Running 2km','Running 3.5km'] },
    { id:3, title:'Save $5,000', category:'finance', deadline:'2026-12-31', description:'Build emergency fund', progress:30, milestones:['Opened savings account','Saved $1,500'] },
  ];
  state.wellness = [{ date:today, mood:'Happy', stress:3, sleep:7.5, water:6, selfCare:true }];
  if (!state.safetyContacts.length) {
    state.safetyContacts = [
      { id:1, name:'Mom', phone:'+1 555 0101', relation:'Family' },
      { id:2, name:'Best Friend Sara', phone:'+1 555 0202', relation:'Friend' },
    ];
  }
  saveState();
}

// ===== NAV =====
function updateNavUser() {
  if (!state.user) return;
  const name = state.user.name || 'Her';
  document.getElementById('nav-username').textContent = name;
  document.getElementById('nav-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('nav-role').textContent = (state.onboardingData?.type || 'HerDay User').replace(/[^\w\s]/g,'').trim();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('hidden');
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.tab === tabName));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabName);
  if (tab) tab.classList.add('active');
  const titles = { dashboard:'Dashboard', tasks:'Task Manager', planner:'AI Daily Planner', calendar:'Calendar', wellness:'Wellness Tracker', habits:'Habit Tracker', goals:'Goals Tracker', safety:'Safety Center', chat:'AI Chat', analytics:'Analytics', settings:'Settings' };
  document.getElementById('topbar-title').textContent = titles[tabName] || tabName;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
  const renderers = { dashboard:renderDashboard, tasks:renderTasks, planner:renderPlanner, calendar:renderCalendar, wellness:renderWellness, habits:renderHabits, goals:renderGoals, safety:renderSafety, chat:initChat, analytics:renderAnalytics, settings:renderSettings };
  if (renderers[tabName]) renderers[tabName]();
}

// ===== TOAST =====
function showToast(msg, type='success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
}

// ===== MODAL =====
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.add('hidden');
}

// ===== THEME =====
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme);
  state.theme = theme;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const name = state.user?.name || 'Her';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = greeting + ', ' + name + '!';
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const pending = state.tasks.filter(t => !t.completed).sort((a,b) => priorityScore(b)-priorityScore(a)).slice(0,3);
  const taskEl = document.getElementById('dash-top-tasks');
  taskEl.innerHTML = pending.length ? pending.map(t => `
    <div class="task-item" style="margin-bottom:8px;">
      <div class="task-check ${t.completed?'done':''}" onclick="toggleTask(${t.id})">${t.completed?'&#10003;':''}</div>
      <div class="task-body">
        <div class="task-title">${t.title}</div>
        <div class="task-meta"><span class="tag tag-${t.priority}">${t.priority}</span><span class="tag tag-cat">${t.category}</span></div>
      </div>
    </div>`).join('') : '<p style="color:var(--text3);font-size:14px;">All tasks done!</p>';

  document.getElementById('dash-habits').innerHTML = state.habits.slice(0,4).map(h => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="font-size:18px;">${h.icon}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:var(--text);">${h.name}</div>
        <div style="font-size:11px;color:var(--text3);">Streak: ${h.streak} days</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--primary);">${h.todayDone?'Done':'Pending'}</div>
    </div>`).join('');

  const plan = generateAIPlan();
  document.getElementById('dash-ai-plan').innerHTML = plan.slice(0,3).map(p => `
    <div style="display:flex;gap:10px;margin-bottom:8px;align-items:center;">
      <span style="font-size:12px;font-weight:800;color:var(--primary);min-width:60px;">${p.time}</span>
      <span style="font-size:13px;color:var(--text);">${p.title}</span>
    </div>`).join('') + '<p style="font-size:12px;color:var(--text3);margin-top:6px;">+' + Math.max(0,plan.length-3) + ' more items</p>';

  const total = state.tasks.length, done = state.tasks.filter(t=>t.completed).length;
  const pct = total ? Math.round((done/total)*100) : 0;
  document.getElementById('dash-progress').innerHTML = `
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:36px;font-weight:800;color:var(--primary);">${pct}%</div>
      <div style="font-size:13px;color:var(--text2);">${done} of ${total} tasks done</div>
    </div>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>`;
}

function quickMood(emoji) {
  document.querySelectorAll('.mood-quick button').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
  const today = new Date().toISOString().split('T')[0];
  let entry = state.wellness.find(w => w.date === today);
  if (!entry) { entry = { date:today, mood:emoji, stress:3, sleep:7, water:4, selfCare:false }; state.wellness.push(entry); }
  else entry.mood = emoji;
  saveState(); showToast('Mood logged!');
}

function quickAddTask() {
  const input = document.getElementById('quick-task-input');
  const title = input.value.trim(); if (!title) return;
  state.tasks.push({ id:Date.now(), title, priority:'medium', category:'personal', deadline:new Date().toISOString().split('T')[0], duration:30, completed:false, createdAt:Date.now() });
  saveState(); input.value = ''; showToast('Task added!'); renderDashboard();
}

// ===== TASKS =====
function priorityScore(task) {
  const p = { high:3, medium:2, low:1 };
  const daysLeft = task.deadline ? Math.max(0,(new Date(task.deadline)-new Date())/86400000) : 99;
  return (p[task.priority]||1)*10 - daysLeft;
}

function renderTasks() {
  const search = document.getElementById('task-search')?.value.toLowerCase()||'';
  const fp = document.getElementById('task-filter-priority')?.value||'';
  const fc = document.getElementById('task-filter-category')?.value||'';
  const fs = document.getElementById('task-filter-status')?.value||'';
  let tasks = [...state.tasks];
  if (search) tasks = tasks.filter(t => t.title.toLowerCase().includes(search));
  if (fp) tasks = tasks.filter(t => t.priority===fp);
  if (fc) tasks = tasks.filter(t => t.category===fc);
  if (fs==='completed') tasks = tasks.filter(t => t.completed);
  if (fs==='pending') tasks = tasks.filter(t => !t.completed);
  tasks.sort((a,b) => priorityScore(b)-priorityScore(a));
  const el = document.getElementById('task-list');
  if (!tasks.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">&#128203;</div><p>No tasks found. Add one to get started!</p></div>'; return; }
  el.innerHTML = tasks.map(t => `
    <div class="task-item ${t.completed?'completed':''}">
      <div class="task-check ${t.completed?'done':''}" onclick="toggleTask(${t.id})">${t.completed?'&#10003;':''}</div>
      <div class="task-body">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          <span class="tag tag-${t.priority}">${t.priority}</span>
          <span class="tag tag-cat">${t.category}</span>
          ${t.deadline?'<span class="tag tag-date">Due: '+t.deadline+'</span>':''}
          ${t.duration?'<span class="tag tag-date">'+t.duration+'min</span>':''}
        </div>
      </div>
      <div class="task-actions">
        <button onclick="editTask(${t.id})">Edit</button>
        <button onclick="deleteTask(${t.id})">Delete</button>
      </div>
    </div>`).join('');
}

function toggleTask(id) {
  const t = state.tasks.find(t=>t.id===id);
  if (t) { t.completed=!t.completed; saveState(); renderTasks(); renderDashboard(); }
}
function deleteTask(id) { state.tasks=state.tasks.filter(t=>t.id!==id); saveState(); renderTasks(); showToast('Task deleted'); }
function editTask(id) { openTaskModal(id); }

function openTaskModal(id) {
  const task = id ? state.tasks.find(t=>t.id===id) : null;
  openModal(`
    <h3>${task?'Edit Task':'New Task'}</h3>
    <form onsubmit="saveTask(event,${id||'null'})">
      <div class="form-group"><label>Task Title</label><input type="text" id="t-title" value="${task?.title||''}" placeholder="What needs to be done?" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Priority</label>
          <select id="t-priority">
            <option value="high" ${task?.priority==='high'?'selected':''}>High</option>
            <option value="medium" ${task?.priority==='medium'||!task?'selected':''}>Medium</option>
            <option value="low" ${task?.priority==='low'?'selected':''}>Low</option>
          </select>
        </div>
        <div class="form-group"><label>Category</label>
          <select id="t-category">
            ${['work','study','home','family','self-care','health','personal'].map(c=>`<option value="${c}" ${task?.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Deadline</label><input type="date" id="t-deadline" value="${task?.deadline||''}" /></div>
        <div class="form-group"><label>Duration (minutes)</label><input type="number" id="t-duration" value="${task?.duration||30}" min="5" /></div>
      </div>
      <button type="submit" class="btn-primary full">${task?'Update Task':'Add Task'}</button>
    </form>`);
}

function saveTask(e, id) {
  e.preventDefault();
  const title = document.getElementById('t-title').value.trim();
  if (!title) return showToast('Please enter a task title','error');
  const data = { title, priority:document.getElementById('t-priority').value, category:document.getElementById('t-category').value, deadline:document.getElementById('t-deadline').value, duration:parseInt(document.getElementById('t-duration').value)||30 };
  if (id) { const t=state.tasks.find(t=>t.id===id); if(t) Object.assign(t,data); showToast('Task updated'); }
  else { state.tasks.push({id:Date.now(),...data,completed:false,createdAt:Date.now()}); showToast('Task added'); }
  saveState(); closeModal(); renderTasks();
}

// ===== AI PLANNER =====
function generateAIPlan() {
  const d = state.onboardingData;
  const wakeTime = d.wake||'07:00', workStart = d.workStart||'09:00', workEnd = d.workEnd||'17:00', sleepTime = d.sleep||'23:00';
  const pending = state.tasks.filter(t=>!t.completed).sort((a,b)=>priorityScore(b)-priorityScore(a));
  const plan = [];
  plan.push({time:wakeTime, title:'Morning Routine', note:'Wake up, hydrate, stretch', type:'routine'});
  plan.push({time:addMinutes(wakeTime,30), title:'Meditation & Mindfulness', note:'10 minutes of calm breathing', type:'wellness'});
  plan.push({time:addMinutes(wakeTime,45), title:'Breakfast', note:'Nourish your body for the day', type:'break'});
  let cursor = workStart, taskIdx = 0;
  while (cursor < workEnd && taskIdx < pending.length) {
    const task = pending[taskIdx], dur = task.duration||30;
    plan.push({time:cursor, title:task.title, note:dur+'min - '+task.category+' - '+task.priority+' priority', type:'task', taskId:task.id});
    cursor = addMinutes(cursor, dur); taskIdx++;
    if (taskIdx%2===0 && cursor<workEnd) { plan.push({time:cursor, title:'Short Break', note:'Rest your eyes, stretch, hydrate', type:'break'}); cursor=addMinutes(cursor,15); }
  }
  plan.push({time:'13:00', title:'Lunch Break', note:'Step away from work, eat mindfully', type:'break'});
  cursor = '14:00';
  while (cursor < workEnd && taskIdx < pending.length) {
    const task = pending[taskIdx], dur = task.duration||30;
    plan.push({time:cursor, title:task.title, note:dur+'min - '+task.category, type:'task', taskId:task.id});
    cursor = addMinutes(cursor, dur+15); taskIdx++;
  }
  plan.push({time:workEnd, title:'Wind Down', note:'Review your day, plan tomorrow', type:'wellness'});
  plan.push({time:addMinutes(workEnd,30), title:'Exercise / Walk', note:'Move your body, clear your mind', type:'wellness'});
  plan.push({time:addMinutes(sleepTime,-60), title:'Personal Time', note:'Reading, journaling, or hobby', type:'routine'});
  plan.push({time:addMinutes(sleepTime,-30), title:'Sleep Prep', note:'No screens, relax and unwind', type:'routine'});
  plan.push({time:sleepTime, title:'Bedtime', note:'Rest well, you deserve it!', type:'routine'});
  return plan.sort((a,b)=>a.time.localeCompare(b.time));
}

function addMinutes(time, mins) {
  const [h,m] = time.split(':').map(Number), total = h*60+m+mins;
  return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}

function renderPlanner() {
  const plan = generateAIPlan();
  const d = state.onboardingData;
  const pending = state.tasks.filter(t=>!t.completed).length;
  document.getElementById('planner-content').innerHTML = `
    <div class="plan-why">
      <strong>Why this plan?</strong> Based on your schedule (${d.wake||'07:00'} - ${d.sleep||'23:00'}),
      I've prioritized your ${pending} pending tasks by urgency and deadline, added breaks every 90 minutes,
      and protected time for wellness and personal growth.
    </div>
    ${plan.map(p=>`
      <div class="plan-block ${p.type==='break'||p.type==='wellness'?'plan-break':''}">
        <div class="plan-time">${p.time}</div>
        <div class="plan-body"><div class="plan-title">${p.title}</div><div class="plan-note">${p.note}</div></div>
      </div>`).join('')}`;
}

function generatePlan() { renderPlanner(); showToast('Your AI plan has been generated!'); }

// ===== CALENDAR =====
let calYear = new Date().getFullYear(), calMonth = new Date().getMonth();

function renderCalendar() {
  const el = document.getElementById('calendar-container');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(calYear,calMonth,1).getDay();
  const daysInMonth = new Date(calYear,calMonth+1,0).getDate();
  const today = new Date();
  const taskDates = new Set(state.tasks.map(t=>t.deadline));
  let html = `<div class="calendar-nav"><button onclick="changeMonth(-1)">&#8249;</button><h3>${months[calMonth]} ${calYear}</h3><button onclick="changeMonth(1)">&#8250;</button></div><div class="calendar-grid">`;
  days.forEach(d => html += '<div class="cal-header">'+d+'</div>');
  for (let i=0;i<firstDay;i++) html += '<div class="cal-day other-month"></div>';
  for (let d=1;d<=daysInMonth;d++) {
    const ds = calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isToday = d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
    html += `<div class="cal-day ${isToday?'today':''} ${taskDates.has(ds)?'has-event':''}" onclick="showCalDay('${ds}')">${d}</div>`;
  }
  html += '</div>';
  el.innerHTML = html;
  showCalDay(new Date().toISOString().split('T')[0]);
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth>11){calMonth=0;calYear++;} if (calMonth<0){calMonth=11;calYear--;}
  renderCalendar();
}

function showCalDay(dateStr) {
  const tasks = state.tasks.filter(t=>t.deadline===dateStr);
  const el = document.getElementById('calendar-events');
  const label = new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  el.innerHTML = tasks.length
    ? `<div class="calendar-events-list"><h4 style="color:var(--text2);font-size:14px;margin-bottom:10px;">${label} - ${tasks.length} task${tasks.length>1?'s':''}</h4>${tasks.map(t=>`<div class="event-item"><div><div style="font-size:14px;font-weight:700;color:var(--text);">${t.title}</div><div style="font-size:12px;color:var(--text3);">${t.category} - ${t.duration}min</div></div><span class="tag tag-${t.priority}">${t.priority}</span></div>`).join('')}</div>`
    : `<div class="calendar-events-list"><h4 style="color:var(--text2);font-size:14px;margin-bottom:10px;">${label}</h4><div class="empty-state" style="padding:24px;"><div class="empty-icon">&#128197;</div><p>No tasks on this day</p></div></div>`;
}

// ===== WELLNESS =====
function renderWellness() {
  const today = new Date().toISOString().split('T')[0];
  const todayEntry = state.wellness.find(w=>w.date===today)||{};
  const last7 = getLast7Days().map(d=>state.wellness.find(w=>w.date===d)||{date:d});
  document.getElementById('wellness-content').innerHTML = `
    <div class="wellness-grid">
      <div class="wellness-card"><div class="w-icon">&#128522;</div><div class="w-label">Today's Mood</div><div class="w-value">${todayEntry.mood||'--'}</div><div class="w-sub">How you're feeling</div></div>
      <div class="wellness-card"><div class="w-icon">&#128564;</div><div class="w-label">Sleep</div><div class="w-value">${todayEntry.sleep||'--'}<span style="font-size:14px;">h</span></div><div class="w-sub">Hours last night</div></div>
      <div class="wellness-card"><div class="w-icon">&#128167;</div><div class="w-label">Water</div><div class="w-value">${todayEntry.water||0}<span style="font-size:14px;">/8</span></div><div class="w-sub">Glasses today</div></div>
      <div class="wellness-card"><div class="w-icon">&#129496;</div><div class="w-label">Stress Level</div><div class="w-value">${todayEntry.stress||'--'}<span style="font-size:14px;">/10</span></div><div class="w-sub">Lower is better</div></div>
    </div>
    <div style="background:var(--bg2);border-radius:var(--radius);padding:20px;border:1px solid var(--border);margin-bottom:16px;">
      <h4 style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:16px;">7-Day Sleep Trend</h4>
      <div class="bar-chart">${last7.map(d=>{const h=d.sleep||0,pct=Math.min(100,(h/10)*100),label=d.date?d.date.slice(5):'';return '<div class="bar-item"><div class="bar" style="height:'+pct+'%"></div><div class="bar-label">'+label+'</div></div>';}).join('')}</div>
    </div>
    <div style="background:var(--bg2);border-radius:var(--radius);padding:20px;border:1px solid var(--border);margin-bottom:16px;">
      <h4 style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:16px;">7-Day Mood Log</h4>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">${last7.map(d=>'<div style="text-align:center;"><div style="font-size:22px;">'+(d.mood||'--')+'</div><div style="font-size:11px;color:var(--text3);">'+(d.date?d.date.slice(5):'')+'</div></div>').join('')}</div>
    </div>
    <div class="cycle-section">
      <h4>Cycle Tracker</h4>
      <div class="form-row">
        <div class="form-group"><label>Last Period Start</label><input type="date" id="cycle-start" value="${state.wellness.find(w=>w.cycleStart)?.cycleStart||''}" onchange="saveCycle()" /></div>
        <div class="form-group"><label>Cycle Length (days)</label><input type="number" id="cycle-len" value="${state.cycleLength||28}" min="21" max="35" onchange="saveCycle()" /></div>
      </div>
      <div id="cycle-prediction" style="font-size:14px;color:var(--text2);margin-top:8px;"></div>
    </div>`;
  updateCyclePrediction();
}

function saveCycle() {
  const start = document.getElementById('cycle-start')?.value;
  const len = parseInt(document.getElementById('cycle-len')?.value)||28;
  state.cycleLength = len;
  if (start) { const today=new Date().toISOString().split('T')[0]; let e=state.wellness.find(w=>w.date===today); if(!e){e={date:today};state.wellness.push(e);} e.cycleStart=start; }
  saveState(); updateCyclePrediction();
}

function updateCyclePrediction() {
  const el = document.getElementById('cycle-prediction'); if (!el) return;
  const start = document.getElementById('cycle-start')?.value;
  if (!start) { el.textContent='Enter your last period start date for predictions.'; return; }
  const len = parseInt(document.getElementById('cycle-len')?.value)||28;
  const next = new Date(start); next.setDate(next.getDate()+len);
  const ovul = new Date(start); ovul.setDate(ovul.getDate()+Math.round(len/2)-2);
  el.innerHTML = 'Next period: <strong>'+next.toLocaleDateString()+'</strong> &nbsp;|&nbsp; Estimated ovulation: <strong>'+ovul.toLocaleDateString()+'</strong>';
}

function getLast7Days() {
  return Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split('T')[0]; });
}

function openWellnessModal() {
  const today = new Date().toISOString().split('T')[0];
  const entry = state.wellness.find(w=>w.date===today)||{};
  const moods = ['Happy','Calm','Sad','Stressed','Tired','Excited','Anxious'];
  openModal(`
    <h3>Log Today's Wellness</h3>
    <form onsubmit="saveWellness(event)">
      <div class="form-group"><label>Mood</label>
        <div class="chip-group" id="w-mood-chips">
          ${moods.map(m=>'<div class="chip '+(entry.mood===m?'selected':'')+'" onclick="selectChip(this,\'w-mood\')">'+m+'</div>').join('')}
        </div>
        <input type="hidden" id="w-mood" value="${entry.mood||''}" />
      </div>
      <div class="form-row">
        <div class="form-group"><label>Sleep Hours</label><input type="number" id="w-sleep" value="${entry.sleep||7}" min="0" max="24" step="0.5" /></div>
        <div class="form-group"><label>Water Glasses</label><input type="number" id="w-water" value="${entry.water||0}" min="0" max="20" /></div>
      </div>
      <div class="form-group"><label>Stress Level (1-10)</label><input type="range" id="w-stress" min="1" max="10" value="${entry.stress||5}" oninput="document.getElementById('w-stress-val').textContent=this.value" /></div>
      <div style="text-align:center;font-size:18px;font-weight:800;color:var(--primary);margin-bottom:12px;" id="w-stress-val">${entry.stress||5}</div>
      <div class="form-group"><label>Self-Care Done Today?</label>
        <div class="chip-group">
          <div class="chip ${entry.selfCare?'selected':''}" onclick="selectChip(this,'w-selfcare')">Yes</div>
          <div class="chip ${!entry.selfCare?'selected':''}" onclick="selectChip(this,'w-selfcare')">Not yet</div>
        </div>
        <input type="hidden" id="w-selfcare" value="${entry.selfCare?'yes':'no'}" />
      </div>
      <button type="submit" class="btn-primary full">Save Wellness Log</button>
    </form>`);
}

function saveWellness(e) {
  e.preventDefault();
  const today = new Date().toISOString().split('T')[0];
  const data = { date:today, mood:document.getElementById('w-mood').value, sleep:parseFloat(document.getElementById('w-sleep').value), water:parseInt(document.getElementById('w-water').value), stress:parseInt(document.getElementById('w-stress').value), selfCare:document.getElementById('w-selfcare').value==='yes' };
  const idx = state.wellness.findIndex(w=>w.date===today);
  if (idx>=0) state.wellness[idx]={...state.wellness[idx],...data}; else state.wellness.push(data);
  saveState(); closeModal(); renderWellness(); showToast('Wellness logged!');
}

// ===== HABITS =====
function renderHabits() {
  const el = document.getElementById('habits-content');
  if (!state.habits.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">&#128293;</div><p>No habits yet. Add one to start building streaks!</p></div>'; return; }
  el.innerHTML = state.habits.map(h => {
    const dots = h.completedDays.slice(-7).map(d=>'<div class="habit-dot '+(d?'done':'')+'"></div>').join('');
    const rate = h.completedDays.length ? Math.round((h.completedDays.filter(Boolean).length/h.completedDays.length)*100) : 0;
    return `<div class="habit-item">
      <div class="habit-icon">${h.icon}</div>
      <div class="habit-body">
        <div class="habit-name">${h.name}</div>
        <div class="habit-streak">Streak: ${h.streak} days &nbsp;|&nbsp; ${rate}% completion</div>
        <div class="habit-dots">${dots}</div>
      </div>
      <button class="habit-check-btn ${h.todayDone?'checked':''}" onclick="toggleHabit(${h.id})">${h.todayDone?'&#10003;':'&#9675;'}</button>
      <button onclick="deleteHabit(${h.id})" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--text3);">&#128465;</button>
    </div>`;
  }).join('');
}

function toggleHabit(id) {
  const h = state.habits.find(h=>h.id===id); if (!h) return;
  h.todayDone = !h.todayDone;
  if (h.todayDone) { h.streak++; h.completedDays.push(1); showToast(h.name + ' - streak: ' + h.streak + ' days!'); }
  else { h.streak=Math.max(0,h.streak-1); h.completedDays.push(0); showToast(h.name+' unchecked'); }
  saveState(); renderHabits();
}

function deleteHabit(id) { state.habits=state.habits.filter(h=>h.id!==id); saveState(); renderHabits(); showToast('Habit removed'); }

function openHabitModal() {
  const icons = [
    {code:'&#129496;',label:'Meditation'},{code:'&#127939;',label:'Running'},{code:'&#128218;',label:'Reading'},
    {code:'&#128211;',label:'Journal'},{code:'&#10024;',label:'Sparkle'},{code:'&#128176;',label:'Money'},
    {code:'&#127775;',label:'Star'},{code:'&#127926;',label:'Music'},{code:'&#129367;',label:'Salad'},
    {code:'&#128138;',label:'Pill'},{code:'&#127807;',label:'Plant'},{code:'&#127947;',label:'Gym'}
  ];
  openModal(`
    <h3>New Habit</h3>
    <form onsubmit="saveHabit(event)">
      <div class="form-group"><label>Habit Name</label><input type="text" id="h-name" placeholder="e.g. Morning Meditation" required /></div>
      <div class="form-group"><label>Choose Icon</label>
        <div class="chip-group" id="h-icon-chips">
          ${icons.map(i=>'<div class="chip" onclick="selectChip(this,\'h-icon\')" style="font-size:20px;">'+i.code+'</div>').join('')}
        </div>
        <input type="hidden" id="h-icon" value="&#127775;" />
      </div>
      <button type="submit" class="btn-primary full">Add Habit</button>
    </form>`);
}

function saveHabit(e) {
  e.preventDefault();
  const name = document.getElementById('h-name').value.trim();
  if (!name) return showToast('Please enter a habit name','error');
  state.habits.push({id:Date.now(),name,icon:document.getElementById('h-icon').value||'&#127775;',streak:0,completedDays:[],todayDone:false});
  saveState(); closeModal(); renderHabits(); showToast('Habit added! Start your streak today');
}

// ===== GOALS =====
function renderGoals() {
  const el = document.getElementById('goals-content');
  if (!state.goals.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">&#127919;</div><p>No goals yet. Set your first goal!</p></div>'; return; }
  el.innerHTML = state.goals.map(g => `
    <div class="goal-item">
      <div class="goal-header"><div class="goal-title">&#127919; ${g.title}</div><div class="goal-deadline">Due: ${g.deadline}</div></div>
      <div class="goal-desc">${g.description}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${g.progress}%"></div></div>
      <div class="goal-progress-label">${g.progress}% complete</div>
      ${g.milestones?.length?'<div style="margin-top:10px;"><div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;">MILESTONES</div>'+g.milestones.map(m=>'<div style="font-size:13px;color:var(--text2);margin-bottom:3px;">&#10003; '+m+'</div>').join('')+'</div>':''}
      <div class="goal-actions">
        <button class="btn-sm" onclick="updateGoalProgress(${g.id})">Update Progress</button>
        <button class="btn-danger" onclick="deleteGoal(${g.id})">Delete</button>
      </div>
    </div>`).join('');
}

function openGoalModal() {
  openModal(`
    <h3>New Goal</h3>
    <form onsubmit="saveGoal(event)">
      <div class="form-group"><label>Goal Title</label><input type="text" id="g-title" placeholder="What do you want to achieve?" required /></div>
      <div class="form-group"><label>Description</label><textarea id="g-desc" rows="2" placeholder="Describe your goal..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Category</label>
          <select id="g-cat"><option value="career">Career</option><option value="health">Health</option><option value="finance">Finance</option><option value="personal">Personal</option><option value="education">Education</option><option value="relationships">Relationships</option></select>
        </div>
        <div class="form-group"><label>Deadline</label><input type="date" id="g-deadline" required /></div>
      </div>
      <div class="form-group"><label>First Milestone</label><input type="text" id="g-milestone" placeholder="First step..." /></div>
      <button type="submit" class="btn-primary full">Add Goal</button>
    </form>`);
}

function saveGoal(e) {
  e.preventDefault();
  const title = document.getElementById('g-title').value.trim();
  if (!title) return showToast('Please enter a goal title','error');
  const ms = document.getElementById('g-milestone').value.trim();
  state.goals.push({id:Date.now(),title,description:document.getElementById('g-desc').value,category:document.getElementById('g-cat').value,deadline:document.getElementById('g-deadline').value,progress:0,milestones:ms?[ms]:[]});
  saveState(); closeModal(); renderGoals(); showToast('Goal added! You\'ve got this');
}

function updateGoalProgress(id) {
  const g = state.goals.find(g=>g.id===id); if (!g) return;
  openModal(`
    <h3>Update Progress</h3>
    <p style="color:var(--text2);margin-bottom:16px;">${g.title}</p>
    <div class="form-group"><label>Progress: <span id="prog-val">${g.progress}</span>%</label>
      <input type="range" id="prog-slider" min="0" max="100" value="${g.progress}" oninput="document.getElementById('prog-val').textContent=this.value" />
    </div>
    <div class="form-group"><label>Add Milestone</label><input type="text" id="prog-milestone" placeholder="What did you accomplish?" /></div>
    <button class="btn-primary full" onclick="saveGoalProgress(${id})">Save Progress</button>`);
}

function saveGoalProgress(id) {
  const g = state.goals.find(g=>g.id===id); if (!g) return;
  g.progress = parseInt(document.getElementById('prog-slider').value);
  const ms = document.getElementById('prog-milestone').value.trim();
  if (ms) g.milestones.push(ms);
  saveState(); closeModal(); renderGoals();
  showToast(g.progress===100?'Goal completed! Amazing work!':'Progress updated!');
}

function deleteGoal(id) { state.goals=state.goals.filter(g=>g.id!==id); saveState(); renderGoals(); showToast('Goal removed'); }

// ===== SAFETY =====
function renderSafety() {
  document.getElementById('safety-content').innerHTML = `
    <button class="sos-btn" style="width:100%;padding:24px;font-size:20px;font-weight:800;border-radius:var(--radius);margin-bottom:20px;background:linear-gradient(135deg,#1f2937,#111827);color:#fff;border:none;cursor:pointer;" onclick="triggerSOS()">
      SOS - EMERGENCY ALERT - Tap to Alert Contacts
    </button>
    <div class="safety-contacts">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h4 style="font-size:15px;font-weight:700;color:var(--text);">Emergency Contacts</h4>
        <button class="btn-sm" onclick="openContactModal()">+ Add Contact</button>
      </div>
      ${state.safetyContacts.length ? state.safetyContacts.map(c=>`
        <div class="contact-item">
          <div><div class="contact-name">${c.name}</div><div class="contact-phone">${c.phone}${c.relation?' - '+c.relation:''}</div></div>
          <div style="display:flex;gap:8px;">
            <a href="tel:${c.phone}" class="btn-sm">Call</a>
            <button class="btn-danger" onclick="deleteContact(${c.id})">Remove</button>
          </div>
        </div>`).join('') : '<p style="color:var(--text3);font-size:14px;">No contacts added yet.</p>'}
    </div>
    <div class="helplines">
      <div class="helpline-card"><div class="h-name">Emergency</div><div class="h-num">911</div><div class="h-desc">Police / Fire / Medical</div></div>
      <div class="helpline-card"><div class="h-name">Women's Helpline</div><div class="h-num">1-800-799-7233</div><div class="h-desc">Domestic Violence Hotline</div></div>
      <div class="helpline-card"><div class="h-name">Crisis Text Line</div><div class="h-num">Text HOME to 741741</div><div class="h-desc">24/7 Crisis Support</div></div>
      <div class="helpline-card"><div class="h-name">RAINN Hotline</div><div class="h-num">1-800-656-4673</div><div class="h-desc">Sexual Assault Support</div></div>
    </div>
    <div class="safety-tips">
      <h4>Safety Tips</h4>
      <ul style="list-style:none;padding:0;">
        <li>Share your live location with a trusted contact when traveling alone</li>
        <li>Keep your phone charged when going out</li>
        <li>Let someone know your plans and expected return time</li>
        <li>Trust your instincts - if something feels wrong, leave</li>
        <li>Save emergency numbers in your phone's favorites</li>
        <li>Have a code word with family/friends for emergencies</li>
        <li>Consider taking a self-defense class</li>
      </ul>
    </div>`;
}

function triggerSOS() {
  const contacts = state.safetyContacts;
  if (!contacts.length) { showToast('No emergency contacts set. Go to Safety Center to add contacts.','warning'); return; }
  showToast('SOS Alert sent to ' + contacts.map(c=>c.name).join(', ') + '!','error');
  openModal(`
    <div style="text-align:center;padding:20px;">
      <div style="font-size:48px;margin-bottom:16px;">&#128680;</div>
      <h3 style="color:#dc2626;margin-bottom:12px;">SOS Alert Triggered</h3>
      <p style="color:var(--text2);margin-bottom:20px;">Alert has been sent to your emergency contacts:</p>
      ${contacts.map(c=>'<div style="background:#fee2e2;border-radius:10px;padding:10px;margin-bottom:8px;font-weight:700;color:#dc2626;">'+c.name+' - '+c.phone+'</div>').join('')}
      <p style="font-size:13px;color:var(--text3);margin-top:16px;">Stay calm. Help is on the way.</p>
      <button class="btn-primary full" style="margin-top:16px;" onclick="closeModal()">I'm Safe Now</button>
    </div>`);
}

function openContactModal() {
  openModal(`
    <h3>Add Emergency Contact</h3>
    <form onsubmit="saveContact(event)">
      <div class="form-group"><label>Name</label><input type="text" id="c-name" placeholder="Contact name" required /></div>
      <div class="form-group"><label>Phone Number</label><input type="tel" id="c-phone" placeholder="+1 234 567 8900" required /></div>
      <div class="form-group"><label>Relationship</label><input type="text" id="c-relation" placeholder="e.g. Mom, Friend, Partner" /></div>
      <button type="submit" class="btn-primary full">Add Contact</button>
    </form>`);
}

function saveContact(e) {
  e.preventDefault();
  state.safetyContacts.push({id:Date.now(),name:document.getElementById('c-name').value.trim(),phone:document.getElementById('c-phone').value.trim(),relation:document.getElementById('c-relation').value.trim()});
  saveState(); closeModal(); renderSafety(); showToast('Contact added');
}

function deleteContact(id) { state.safetyContacts=state.safetyContacts.filter(c=>c.id!==id); saveState(); renderSafety(); showToast('Contact removed'); }

// ===== AI CHAT (main tab) =====
const chatResponses = {
  'plan my day': () => { const plan=generateAIPlan().slice(0,5); return 'Here\'s your plan for today!\n\n'+plan.map(p=>p.time+' - '+p.title).join('\n')+'\n\nWant me to adjust anything?'; },
  'what should i do first': () => { const top=state.tasks.filter(t=>!t.completed).sort((a,b)=>priorityScore(b)-priorityScore(a))[0]; return top?'Your top priority: "'+top.title+'" - '+top.priority+' priority'+(top.deadline?' due '+top.deadline:''):'No pending tasks! Time to add new goals or take a break.'; },
  'pending tasks': () => { const p=state.tasks.filter(t=>!t.completed); return p.length?'You have '+p.length+' pending tasks:\n\n'+p.slice(0,5).map(t=>'- '+t.title+' ('+t.priority+')').join('\n')+(p.length>5?'\n...and '+(p.length-5)+' more':''):'All tasks done! You\'re crushing it today!'; },
  'work and self-care': () => 'Balancing work and self-care is so important!\n\n- Block 30 min in the morning for yourself before work\n- Take a proper lunch break\n- Schedule one self-care activity daily\n- Set a hard stop time for work\n- Your wellbeing is not a luxury, it\'s a necessity',
  'habits': () => { const done=state.habits.filter(h=>h.todayDone).length; return 'Today\'s habit progress: '+done+'/'+state.habits.length+' completed\n\n'+state.habits.map(h=>(h.todayDone?'[Done] ':'[    ] ')+h.name+' ('+h.streak+' day streak)').join('\n'); },
  'wellness': () => { const today=new Date().toISOString().split('T')[0]; const e=state.wellness.find(w=>w.date===today); return e?'Today\'s wellness:\nMood: '+(e.mood||'Not logged')+'\nSleep: '+(e.sleep||'--')+'h\nWater: '+(e.water||0)+'/8 glasses\nStress: '+(e.stress||'--')+'/10':'You haven\'t logged wellness today yet. Head to the Wellness tab!'; },
  'goals': () => state.goals.length?'Your goals:\n\n'+state.goals.map(g=>'- '+g.title+': '+g.progress+'% complete').join('\n'):'No goals set yet. Head to the Goals tab!',
  'motivate': () => ['You are capable of amazing things. One step at a time.','Progress, not perfection. You\'re doing better than you think!','Every expert was once a beginner. Keep going!','Your only competition is who you were yesterday.','Small consistent actions create massive results. Trust the process!'][Math.floor(Math.random()*5)],
  'hello': () => 'Hello! I\'m Hera, your AI assistant. I\'m here to help you plan your day, track your progress, and support your wellbeing. What can I help you with today?',
  'hi': () => 'Hi there! How can I help you today?',
  'help': () => 'Here\'s what I can help with:\n\n- "Plan my day"\n- "What should I do first?"\n- "Pending tasks"\n- "Work and self-care"\n- "Habits"\n- "Wellness"\n- "Goals"\n- "Motivate me"',
};

function initChat() {
  const el = document.getElementById('chat-messages');
  if (el.children.length===0) addChatMessage('hera','Hi '+( state.user?.name||'there')+'! I\'m Hera, your AI assistant. I\'m here to help you plan your day, stay on track, and support your wellbeing. What can I help you with today?');
  renderChatSuggestions();
}

function renderChatSuggestions() {
  const s = ['Plan my day','What should I do first?','Pending tasks','Motivate me','Wellness check'];
  document.getElementById('chat-suggestions').innerHTML = s.map(q=>'<button class="chat-suggestion" onclick="sendChatMessage(\''+q+'\')">'+q+'</button>').join('');
}

function sendChat() { const i=document.getElementById('chat-input'); const m=i.value.trim(); if(!m)return; i.value=''; sendChatMessage(m); }

function sendChatMessage(msg) {
  addChatMessage('user',msg);
  const tid='typing-'+Date.now();
  const el=document.getElementById('chat-messages');
  el.innerHTML+='<div id="'+tid+'" class="chat-msg"><div class="chat-msg-avatar">H</div><div class="chat-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';
  el.scrollTop=el.scrollHeight;
  setTimeout(()=>{ document.getElementById(tid)?.remove(); addChatMessage('hera',getAIResponse(msg.toLowerCase())); }, 800+Math.random()*600);
}

function getAIResponse(msg) {
  for (const [key,fn] of Object.entries(chatResponses)) { if (msg.includes(key)) return fn(); }
  if (msg.includes('stress')||msg.includes('anxious')||msg.includes('overwhelm')) return 'I hear you. Feeling overwhelmed is completely normal. Try this: take 3 deep breaths, write down your top 3 priorities, and tackle just one thing at a time. You don\'t have to do everything at once.';
  if (msg.includes('tired')||msg.includes('sleep')) return 'Rest is productive too! Make sure you\'re getting 7-9 hours of sleep. Try to wind down 30 minutes before bed - no screens, maybe some light reading or journaling.';
  if (msg.includes('thank')) return 'You\'re so welcome! That\'s what I\'m here for. Keep being amazing!';
  return 'That\'s a great question! I can help you with planning your day, checking tasks, tracking habits, wellness updates, and motivation. Try asking "help" to see what I can do!';
}

function addChatMessage(sender, text) {
  const el=document.getElementById('chat-messages'); if(!el)return;
  const isUser=sender==='user';
  const formatted=text.replace(/\n/g,'<br>');
  el.innerHTML+=`<div class="chat-msg ${isUser?'user':''}"><div class="chat-msg-avatar">${isUser?(state.user?.name?.charAt(0)||'U'):'H'}</div><div class="chat-bubble">${formatted}</div></div>`;
  el.scrollTop=el.scrollHeight;
}

// ===== ANALYTICS =====
function renderAnalytics() {
  const total=state.tasks.length, done=state.tasks.filter(t=>t.completed).length, pending=total-done;
  const pct=total?Math.round((done/total)*100):0;
  const habitsDone=state.habits.filter(h=>h.todayDone).length;
  const avgStreak=state.habits.length?Math.round(state.habits.reduce((s,h)=>s+h.streak,0)/state.habits.length):0;
  const avgGoal=state.goals.length?Math.round(state.goals.reduce((s,g)=>s+g.progress,0)/state.goals.length):0;
  const last7=getLast7Days(), weekW=last7.map(d=>state.wellness.find(w=>w.date===d));
  const sleepArr=weekW.filter(w=>w?.sleep); const avgSleep=sleepArr.length?(sleepArr.reduce((s,w)=>s+w.sleep,0)/sleepArr.length):0;
  document.getElementById('analytics-content').innerHTML = `
    <div class="analytics-grid">
      <div class="stat-card"><div class="stat-icon">&#10003;</div><div class="stat-value">${done}</div><div class="stat-label">Tasks Completed</div></div>
      <div class="stat-card"><div class="stat-icon">&#128203;</div><div class="stat-value">${pending}</div><div class="stat-label">Tasks Pending</div></div>
      <div class="stat-card"><div class="stat-icon">&#9889;</div><div class="stat-value">${pct}%</div><div class="stat-label">Productivity Score</div></div>
      <div class="stat-card"><div class="stat-icon">&#128293;</div><div class="stat-value">${avgStreak}</div><div class="stat-label">Avg Habit Streak</div></div>
      <div class="stat-card"><div class="stat-icon">&#127919;</div><div class="stat-value">${avgGoal}%</div><div class="stat-label">Goals Progress</div></div>
      <div class="stat-card"><div class="stat-icon">&#128564;</div><div class="stat-value">${avgSleep?avgSleep.toFixed(1):'--'}</div><div class="stat-label">Avg Sleep (hrs)</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div style="background:var(--bg2);border-radius:var(--radius);padding:20px;border:1px solid var(--border);">
        <h4 style="font-size:14px;font-weight:700;color:var(--text2);margin-bottom:16px;">Task Completion</h4>
        <div style="display:flex;justify-content:center;">
          <div class="donut-chart">
            <svg class="donut-svg" width="100" height="100" viewBox="0 0 100 100">
              <circle class="donut-bg" cx="50" cy="50" r="40"/>
              <circle class="donut-fill" cx="50" cy="50" r="40" stroke-dasharray="${pct*2.51} ${(100-pct)*2.51}" stroke-dashoffset="0"/>
            </svg>
            <div class="donut-label">${pct}%</div>
          </div>
        </div>
        <p style="text-align:center;font-size:13px;color:var(--text2);margin-top:8px;">${done} done - ${pending} pending</p>
      </div>
      <div style="background:var(--bg2);border-radius:var(--radius);padding:20px;border:1px solid var(--border);">
        <h4 style="font-size:14px;font-weight:700;color:var(--text2);margin-bottom:16px;">Habits Today</h4>
        <div style="display:flex;justify-content:center;">
          <div class="donut-chart">
            <svg class="donut-svg" width="100" height="100" viewBox="0 0 100 100">
              <circle class="donut-bg" cx="50" cy="50" r="40"/>
              <circle class="donut-fill" cx="50" cy="50" r="40" stroke="#fca5a5"
                stroke-dasharray="${state.habits.length?(habitsDone/state.habits.length)*251:0} ${state.habits.length?(1-habitsDone/state.habits.length)*251:251}"
                stroke-dashoffset="0"/>
            </svg>
            <div class="donut-label">${habitsDone}</div>
          </div>
        </div>
        <p style="text-align:center;font-size:13px;color:var(--text2);margin-top:8px;">${habitsDone} of ${state.habits.length} habits done</p>
      </div>
    </div>
    <div style="background:var(--bg2);border-radius:var(--radius);padding:20px;border:1px solid var(--border);margin-bottom:16px;">
      <h4 style="font-size:14px;font-weight:700;color:var(--text2);margin-bottom:16px;">Tasks by Category</h4>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${['work','study','home','family','self-care','health','personal'].map(cat=>{const c=state.tasks.filter(t=>t.category===cat).length;return c?'<div style="background:var(--primary-light);border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;color:var(--primary-dark);">'+cat+': '+c+'</div>':''}).join('')}
      </div>
    </div>
    <div style="background:var(--bg2);border-radius:var(--radius);padding:20px;border:1px solid var(--border);">
      <h4 style="font-size:14px;font-weight:700;color:var(--text2);margin-bottom:16px;">Goals Overview</h4>
      ${state.goals.map(g=>'<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:700;color:var(--text);">'+g.title+'</span><span style="font-size:13px;color:var(--text2);">'+g.progress+'%</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:'+g.progress+'%"></div></div></div>').join('')||'<p style="color:var(--text3);font-size:14px;">No goals set yet.</p>'}
    </div>`;
}

// ===== SETTINGS =====
function renderSettings() {
  const u=state.user||{}, d=state.onboardingData;
  document.getElementById('settings-content').innerHTML = `
    <div class="settings-section">
      <h4>Profile</h4>
      <div class="form-group"><label>Name</label><input type="text" id="s-name" value="${u.name||''}" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="s-email" value="${u.email||''}" /></div>
      <div class="form-group"><label>Role</label><input type="text" id="s-role" value="${d?.type||''}" /></div>
      <button class="btn-primary" onclick="saveProfile()">Save Profile</button>
    </div>
    <div class="settings-section">
      <h4>Theme</h4>
      <div class="theme-swatches">
        <div class="theme-swatch ${state.theme==='default'?'active':''}" style="background:linear-gradient(135deg,#ef4444,#fca5a5);" onclick="applyTheme('default');saveState();renderSettings();" title="Red (Default)"></div>
        <div class="theme-swatch ${state.theme==='crimson'?'active':''}" style="background:linear-gradient(135deg,#e11d48,#fda4af);" onclick="applyTheme('crimson');saveState();renderSettings();" title="Crimson"></div>
        <div class="theme-swatch ${state.theme==='rose'?'active':''}" style="background:linear-gradient(135deg,#fb7185,#fda4af);" onclick="applyTheme('rose');saveState();renderSettings();" title="Rose"></div>
        <div class="theme-swatch ${state.theme==='sage'?'active':''}" style="background:linear-gradient(135deg,#4ade80,#86efac);" onclick="applyTheme('sage');saveState();renderSettings();" title="Sage"></div>
        <div class="theme-swatch ${state.theme==='sky'?'active':''}" style="background:linear-gradient(135deg,#38bdf8,#7dd3fc);" onclick="applyTheme('sky');saveState();renderSettings();" title="Sky"></div>
        <div class="theme-swatch ${state.theme==='dark'?'active':''}" style="background:linear-gradient(135deg,#2d0a0a,#7f1d1d);" onclick="applyTheme('dark');saveState();renderSettings();" title="Dark Red"></div>
      </div>
    </div>
    <div class="settings-section">
      <h4>Reminders</h4>
      ${Object.entries(state.reminders).map(([k,v])=>`<div class="setting-row"><div><div class="setting-label">${k.charAt(0).toUpperCase()+k.slice(1)} Reminder</div></div><button class="toggle ${v?'on':''}" onclick="toggleReminder('${k}')"></button></div>`).join('')}
    </div>
    <div class="settings-section">
      <h4>Schedule</h4>
      <div class="form-row">
        <div class="form-group"><label>Wake-up Time</label><input type="time" id="s-wake" value="${d?.wake||'07:00'}" /></div>
        <div class="form-group"><label>Sleep Time</label><input type="time" id="s-sleep" value="${d?.sleep||'23:00'}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Work Start</label><input type="time" id="s-wstart" value="${d?.workStart||'09:00'}" /></div>
        <div class="form-group"><label>Work End</label><input type="time" id="s-wend" value="${d?.workEnd||'17:00'}" /></div>
      </div>
      <button class="btn-primary" onclick="saveSchedule()">Save Schedule</button>
    </div>
    <div class="settings-section">
      <h4>Privacy &amp; Data</h4>
      <div class="setting-row"><div><div class="setting-label">All data is stored locally</div><div class="setting-desc">Your data never leaves your device</div></div><span>&#128274;</span></div>
      <button class="btn-danger" style="margin-top:12px;width:100%;padding:12px;" onclick="clearAllData()">Clear All App Data</button>
    </div>`;
}

function saveProfile() {
  state.user.name=document.getElementById('s-name').value.trim()||state.user.name;
  state.user.email=document.getElementById('s-email').value.trim()||state.user.email;
  state.onboardingData.type=document.getElementById('s-role').value.trim();
  saveState(); updateNavUser(); showToast('Profile saved');
}

function saveSchedule() {
  state.onboardingData.wake=document.getElementById('s-wake').value;
  state.onboardingData.sleep=document.getElementById('s-sleep').value;
  state.onboardingData.workStart=document.getElementById('s-wstart').value;
  state.onboardingData.workEnd=document.getElementById('s-wend').value;
  saveState(); showToast('Schedule saved');
}

function toggleReminder(key) { state.reminders[key]=!state.reminders[key]; saveState(); renderSettings(); }

function clearAllData() {
  if (!confirm('Are you sure? This will delete all your data and cannot be undone.')) return;
  localStorage.removeItem('herday_state'); location.reload();
}

// ===== REMINDER ENGINE =====
function startReminderEngine() { setInterval(checkReminders, 60000); }
function checkReminders() {
  if (!state.user) return;
  const now=new Date(), timeStr=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const d=state.onboardingData;
  if (state.reminders.water && now.getMinutes()===0 && now.getHours()%2===0) showToast('Time to drink some water! Stay hydrated');
  if (state.reminders.sleep && d.sleep && timeStr===addMinutes(d.sleep,-30)) showToast('Bedtime in 30 minutes. Start winding down!');
  if (state.reminders.exercise && timeStr==='18:00') showToast('Time for your evening exercise! Move that body');
  if (state.reminders.meditation && d.wake && timeStr===addMinutes(d.wake,15)) showToast('Good morning! Time for your meditation session');
}

/* ============================================================
   FLOATING ASSISTANT WIDGET - Hera (always-on)
   DOM scraper + live state reader
   ============================================================ */

let fabOpen = false, fabInitialized = false;

function scrapePageContent() {
  const getText = sel => { const el=document.querySelector(sel); return el?el.innerText.replace(/\s+/g,' ').trim():''; };
  const getAll  = sel => [...document.querySelectorAll(sel)].map(el=>el.innerText.replace(/\s+/g,' ').trim()).filter(Boolean);
  return {
    dashboard:   getText('#tab-dashboard'),
    tasks:       getText('#tab-tasks'),
    planner:     getText('#tab-planner'),
    calendar:    getText('#tab-calendar'),
    wellness:    getText('#tab-wellness'),
    habits:      getText('#tab-habits'),
    goals:       getText('#tab-goals'),
    safety:      getText('#tab-safety'),
    analytics:   getText('#tab-analytics'),
    settings:    getText('#tab-settings'),
    taskTitles:  getAll('.task-title'),
    habitNames:  getAll('.habit-name'),
    goalTitles:  getAll('.goal-title'),
    planBlocks:  getAll('.plan-title'),
    contactNames:getAll('.contact-name'),
    navLinks:    getAll('.nav-link'),
    fullPage:    document.getElementById('app')?.innerText?.replace(/\s+/g,' ').trim()||'',
  };
}

function toggleFAB() {
  fabOpen = !fabOpen;
  const panel=document.getElementById('fab-panel'), btn=document.getElementById('fab-btn'), badge=document.getElementById('fab-badge');
  panel.classList.toggle('hidden',!fabOpen);
  btn.classList.toggle('open',fabOpen);
  badge.classList.add('hidden');
  if (fabOpen && !fabInitialized) { fabInitialized=true; fabWelcome(); renderFABQuickBtns(); }
  if (fabOpen) setTimeout(()=>document.getElementById('fab-input')?.focus(),200);
}

function fabWelcome() {
  const name = state.user?.name ? ', '+state.user.name : '';
  fabAddMsg('bot','Hi'+name+'! I\'m Hera. I can read everything on this page and answer your questions about it.\n\nTry: "Show my tasks", "My habits", "My stats", "What\'s on the dashboard?", or ask anything!');
}

function renderFABQuickBtns() {
  const qs = ['What can I do here?','Show my tasks','Show my habits','My wellness data','My stats','What is in the planner?','Safety contacts','My goals'];
  document.getElementById('fab-quick-btns').innerHTML = qs.map(q=>'<button class="fab-quick" onclick="sendFABMsg(\''+q+'\')">'+q+'</button>').join('');
}

function sendFAB() {
  const input=document.getElementById('fab-input'), msg=input.value.trim(); if(!msg)return; input.value=''; sendFABMsg(msg);
}

function sendFABMsg(msg) {
  fabAddMsg('user',msg);
  const tid='fab-typing-'+Date.now(), el=document.getElementById('fab-messages');
  el.innerHTML+='<div id="'+tid+'" class="fab-msg"><div class="fab-msg-av">H</div><div class="fab-bubble"><div class="fab-typing"><div class="fab-dot"></div><div class="fab-dot"></div><div class="fab-dot"></div></div></div></div>';
  el.scrollTop=el.scrollHeight;
  setTimeout(()=>{ document.getElementById(tid)?.remove(); fabAddMsg('bot',getFABResponse(msg.toLowerCase().trim())); }, 500+Math.random()*500);
}

function fabAddMsg(sender, text) {
  const el=document.getElementById('fab-messages'); if(!el)return;
  const isUser=sender==='user';
  const initials=isUser?(state.user?.name?.charAt(0)||'U'):'H';
  const formatted=text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  el.innerHTML+='<div class="fab-msg '+(isUser?'fab-user':'')+'"><div class="fab-msg-av">'+initials+'</div><div class="fab-bubble">'+formatted+'</div></div>';
  el.scrollTop=el.scrollHeight;
  if (!fabOpen && !isUser) { const b=document.getElementById('fab-badge'); if(b) b.classList.remove('hidden'); }
}

function match(query, keywords) { return keywords.some(k=>query.includes(k)); }

function getFABResponse(q) {
  const page = scrapePageContent();

  // Greetings
  if (match(q,['hi','hello','hey','good morning','good afternoon','good evening','howdy'])) {
    const name=state.user?.name?', '+state.user.name:'';
    return 'Hi'+name+'! I\'m Hera. I can read everything on this page and answer your questions.\n\nTry:\n- "Show my tasks"\n- "Show my habits"\n- "My wellness data"\n- "Read the dashboard"\n- "My stats"\n- Or ask anything about any section!';
  }

  if (match(q,['thank','thanks','thank you','awesome','great','perfect','nice','cool'])) return 'You\'re so welcome! Ask me anything else about what\'s on the page!';

  // Live state: all tasks
  if (match(q,['list my tasks','show my tasks','all tasks','what tasks','my tasks','show tasks'])) {
    if (!state.tasks.length) return 'You have no tasks yet. Go to the Tasks tab and click "+ New Task" to add one!';
    const pending=state.tasks.filter(t=>!t.completed), completed=state.tasks.filter(t=>t.completed);
    let r='Your Tasks ('+state.tasks.length+' total)\n\n';
    if (pending.length) r+='Pending ('+pending.length+'):\n'+pending.map(t=>'- '+t.title+' ['+t.priority+', '+t.category+(t.deadline?', due '+t.deadline:'')+']').join('\n');
    if (completed.length) r+='\n\nCompleted ('+completed.length+'):\n'+completed.map(t=>'[Done] '+t.title).join('\n');
    return r;
  }

  // Pending tasks
  if (match(q,['pending tasks','incomplete','not done','what is left','remaining tasks','unfinished'])) {
    const p=state.tasks.filter(t=>!t.completed).sort((a,b)=>priorityScore(b)-priorityScore(a));
    if (!p.length) return 'No pending tasks! You\'ve completed everything. Time to add new ones or take a break!';
    return 'Pending Tasks ('+p.length+')\n\n'+p.map((t,i)=>(i+1)+'. '+t.title+'\n   Priority: '+t.priority+' | Category: '+t.category+(t.deadline?' | Due: '+t.deadline:'')+(t.duration?' | '+t.duration+'min':'')).join('\n\n');
  }

  // High priority
  if (match(q,['high priority','urgent tasks','important tasks','most important'])) {
    const h=state.tasks.filter(t=>t.priority==='high'&&!t.completed);
    return h.length?'High Priority Tasks:\n\n'+h.map(t=>'- '+t.title+(t.deadline?' (due '+t.deadline+')':'')).join('\n'):'No high priority pending tasks right now!';
  }

  // Today
  if (match(q,["today's tasks",'due today','what should i do today','tasks for today','focus today','what today'])) {
    const today=new Date().toISOString().split('T')[0];
    const todayTasks=state.tasks.filter(t=>t.deadline===today&&!t.completed);
    const top=state.tasks.filter(t=>!t.completed).sort((a,b)=>priorityScore(b)-priorityScore(a)).slice(0,3);
    let r='Today - '+new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+'\n\n';
    if (todayTasks.length) r+='Due today ('+todayTasks.length+'):\n'+todayTasks.map(t=>'- '+t.title+' ('+t.priority+')').join('\n')+'\n\n';
    if (top.length) r+='Top priorities:\n'+top.map((t,i)=>(i+1)+'. '+t.title).join('\n');
    if (!todayTasks.length&&!top.length) r+='Nothing due today and no pending tasks!';
    return r;
  }

  // Habits
  if (match(q,['habit','habits','streak','my habits','show habits','list habits','habit tracker'])) {
    if (!state.habits.length) return 'No habits tracked yet. Go to the Habits tab and click "+ New Habit" to start building streaks!';
    const done=state.habits.filter(h=>h.todayDone), notDone=state.habits.filter(h=>!h.todayDone);
    let r='Your Habits ('+state.habits.length+' total)\n\n';
    if (done.length) r+='Done today:\n'+done.map(h=>'[Done] '+h.name+' - '+h.streak+' day streak').join('\n')+'\n\n';
    if (notDone.length) r+='Still to do today:\n'+notDone.map(h=>'[    ] '+h.name+' - '+h.streak+' day streak').join('\n');
    return r;
  }

  // Goals
  if (match(q,['goal','goals','my goals','show goals','list goals','goal progress','goal tracker'])) {
    if (!state.goals.length) return 'No goals set yet. Go to the Goals tab and click "+ New Goal" to set your first one!';
    return 'Your Goals ('+state.goals.length+' total)\n\n'+state.goals.map(g=>{
      const bar='['+('#'.repeat(Math.round(g.progress/10)))+('.'.repeat(10-Math.round(g.progress/10)))+'] '+g.progress+'%';
      return g.title+'\n'+bar+'\nDeadline: '+g.deadline+(g.milestones?.length?'\nMilestones: '+g.milestones.join(', '):'');
    }).join('\n\n');
  }

  // Wellness
  if (match(q,['wellness','mood','sleep','water','stress','how am i feeling','my wellness','health data','wellbeing','wellness data'])) {
    const today=new Date().toISOString().split('T')[0], entry=state.wellness.find(w=>w.date===today);
    const last7=getLast7Days().map(d=>state.wellness.find(w=>w.date===d)).filter(Boolean);
    let r='Wellness Data\n\n';
    if (entry) {
      r+='Today ('+today+'):\nMood: '+(entry.mood||'Not logged')+'\nSleep: '+(entry.sleep?entry.sleep+'h':'Not logged')+'\nWater: '+(entry.water||0)+'/8 glasses\nStress: '+(entry.stress?entry.stress+'/10':'Not logged')+'\nSelf-care: '+(entry.selfCare?'Done':'Not yet')+'\n\n';
    } else { r+='You have not logged wellness today yet. Click "+ Log Today" in the Wellness tab!\n\n'; }
    if (last7.length>1) {
      const ws=last7.filter(w=>w.sleep); const avg=ws.length?(ws.reduce((s,w)=>s+w.sleep,0)/ws.length).toFixed(1):null;
      if (avg) r+='7-day average sleep: '+avg+'h\n';
      const moods=last7.filter(w=>w.mood).map(w=>w.mood);
      if (moods.length) r+='Recent moods: '+moods.join(', ');
    }
    return r;
  }

  // Safety
  if (match(q,['safety','sos','emergency contact','my contacts','safety center','helpline','emergency number'])) {
    let r='Safety Center\n\n';
    if (state.safetyContacts.length) r+='Your Emergency Contacts:\n'+state.safetyContacts.map(c=>'- '+c.name+' - '+c.phone+(c.relation?' ('+c.relation+')':'')).join('\n')+'\n\n';
    else r+='No emergency contacts added yet. Go to Safety Center and click "+ Add Contact"\n\n';
    r+='Helplines:\n- Emergency: 911\n- Women\'s Helpline: 1-800-799-7233\n- Crisis Text Line: Text HOME to 741741\n- RAINN: 1-800-656-4673\n\nThe SOS button (top-right) instantly alerts all your contacts.';
    return r;
  }

  // AI Planner
  if (match(q,['planner','daily plan','my plan','time slots','what is planned','show plan','ai plan','generate plan'])) {
    const plan=generateAIPlan(), d=state.onboardingData;
    let r='Your AI Daily Plan\n\nBased on your schedule ('+( d.wake||'07:00')+' - '+(d.sleep||'23:00')+'):\n\n';
    r+=plan.slice(0,10).map(p=>p.time+' - '+p.title+'\n   '+p.note).join('\n\n');
    if (plan.length>10) r+='\n\n...and '+(plan.length-10)+' more items. Open the AI Planner tab for the full schedule!';
    return r;
  }

  // Analytics
  if (match(q,['analytics','stats','statistics','my progress','productivity','score','insights','overview','summary','my stats','show stats'])) {
    const total=state.tasks.length, done=state.tasks.filter(t=>t.completed).length, pct=total?Math.round((done/total)*100):0;
    const habitsDone=state.habits.filter(h=>h.todayDone).length;
    const avgStreak=state.habits.length?Math.round(state.habits.reduce((s,h)=>s+h.streak,0)/state.habits.length):0;
    const avgGoal=state.goals.length?Math.round(state.goals.reduce((s,g)=>s+g.progress,0)/state.goals.length):0;
    const todayW=state.wellness.find(w=>w.date===new Date().toISOString().split('T')[0]);
    return 'Your Analytics Snapshot\n\nProductivity Score: '+pct+'% ('+done+'/'+total+' tasks done)\nPending tasks: '+(total-done)+'\nHabits today: '+habitsDone+'/'+state.habits.length+' done\nAvg habit streak: '+avgStreak+' days\nGoals avg progress: '+avgGoal+'%\nToday\'s mood: '+(todayW?.mood||'Not logged')+'\nLast sleep: '+(todayW?.sleep?todayW.sleep+'h':'Not logged')+'\nWater today: '+(todayW?.water||0)+'/8 glasses\n\nOpen the Analytics tab for full charts!';
  }

  // Settings
  if (match(q,['settings','my profile','my name','my email','theme','reminders','wake up time','sleep time','work hours','my schedule'])) {
    const d=state.onboardingData, u=state.user||{};
    const on=Object.entries(state.reminders).filter(([,v])=>v).map(([k])=>k);
    return 'Your Settings & Profile\n\nName: '+(u.name||'Not set')+'\nEmail: '+(u.email||'Not set')+'\nRole: '+(d.type||'Not set')+'\n\nSchedule:\n  Wake-up: '+(d.wake||'07:00')+'\n  Work: '+(d.workStart||'09:00')+' - '+(d.workEnd||'17:00')+'\n  Sleep: '+(d.sleep||'23:00')+'\n\nTheme: '+(state.theme||'default (red)')+'\n\nActive reminders: '+(on.length?on.join(', '):'None')+'\n\nUpdate anything in the Settings tab!';
  }

  // DOM section scoring
  const words=q.split(' ').filter(w=>w.length>2);
  const sectionMap={'Dashboard':page.dashboard,'Tasks':page.tasks,'AI Planner':page.planner,'Calendar':page.calendar,'Wellness':page.wellness,'Habits':page.habits,'Goals':page.goals,'Safety':page.safety,'Analytics':page.analytics,'Settings':page.settings};
  let bestSection=null, bestScore=0, bestText='';
  for (const [name,text] of Object.entries(sectionMap)) {
    if (!text) continue;
    const lower=text.toLowerCase(), score=words.reduce((s,w)=>s+(lower.includes(w)?1:0),0);
    if (score>bestScore) { bestScore=score; bestSection=name; bestText=text; }
  }
  if (bestScore>=1&&bestText) {
    const sentences=bestText.split(/[.!?\n]+/).filter(s=>s.trim().length>10);
    const relevant=sentences.filter(s=>words.some(w=>s.toLowerCase().includes(w)));
    const snippet=relevant.slice(0,5).join('. ').trim();
    if (snippet.length>20) return 'Here\'s what I found in the '+bestSection+' section:\n\n'+snippet+'\n\nNavigate to the '+bestSection+' tab to see the full content!';
  }

  // Direct reads
  if (match(q,['read dashboard','what is on dashboard','dashboard content','show dashboard'])) { const t=page.dashboard; return t?'Dashboard content:\n\n'+t.slice(0,600)+(t.length>600?'...':''):'Dashboard not rendered yet. Click the Dashboard tab first!'; }
  if (match(q,['read tasks','task content','show task list','what tasks are listed'])) return page.taskTitles.length?'Tasks on the page:\n\n'+page.taskTitles.map((t,i)=>(i+1)+'. '+t).join('\n'):'No tasks rendered yet. Open the Tasks tab first!';
  if (match(q,['read habits','habit content','what habits are listed'])) return page.habitNames.length?'Habits on the page:\n\n'+page.habitNames.map((h,i)=>(i+1)+'. '+h).join('\n'):'No habits rendered yet. Open the Habits tab first!';
  if (match(q,['read goals','goal content','what goals are listed'])) return page.goalTitles.length?'Goals on the page:\n\n'+page.goalTitles.map((g,i)=>(i+1)+'. '+g).join('\n'):'No goals rendered yet. Open the Goals tab first!';
  if (match(q,['read planner','planner content','what is in planner','show planner items'])) return page.planBlocks.length?'Planner items:\n\n'+page.planBlocks.map((p,i)=>(i+1)+'. '+p).join('\n'):'Planner not generated yet. Open the AI Planner tab and click Generate Plan!';
  if (match(q,['navigation','menu items','what sections','what pages','sidebar content','app sections'])) return page.navLinks.length?'App sections:\n\n'+page.navLinks.map(l=>'- '+l).join('\n'):'Sidebar not visible yet.';

  // Full page fuzzy search
  const fullText=page.fullPage.toLowerCase();
  if (words.some(w=>w.length>3&&fullText.includes(w))) {
    const allS=page.fullPage.split(/[.!?\n]+/).filter(s=>s.trim().length>15);
    const hits=allS.filter(s=>words.some(w=>w.length>3&&s.toLowerCase().includes(w)));
    if (hits.length) return 'I found this on the page related to "'+q+'":\n\n'+hits.slice(0,4).join('. ').trim()+'\n\nNavigate to the relevant tab to see the full section!';
  }

  // Feature knowledge base fallback
  if (match(q,['what can i do','what is herday','about this app','features','overview'])) return 'HerDay AI is your all-in-one daily productivity companion for women!\n\nSections:\n- Tasks: Add, edit, prioritize and track tasks\n- AI Planner: Smart daily schedule\n- Calendar: Tasks by date\n- Wellness: Mood, sleep, water and cycle\n- Habits: Daily habit streaks\n- Goals: Personal and professional goals\n- Safety: SOS and emergency contacts\n- AI Chat: Full assistant in the Chat tab\n- Analytics: Productivity insights\n- Settings: Themes, reminders, profile';
  if (match(q,['how to','how do i','how can i','how does'])) return 'I can help! Be more specific, for example:\n- "How do I add a task?"\n- "How do I track habits?"\n- "How does the AI Planner work?"\n- "How do I log wellness?"\n\nOr ask me to read a section:\n- "Show my tasks"\n- "Read my goals"\n- "What\'s on the dashboard?"';

  return 'I searched the page for "'+q+'" but could not find a specific match.\n\nHere\'s what I can read for you:\n- "Show my tasks"\n- "Show my habits"\n- "Show my goals"\n- "My wellness data"\n- "My stats"\n- "My plan"\n- "My settings"\n- "Safety contacts"\n\nOr ask me to read any section directly!';
}

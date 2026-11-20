/*
 * Patient Health Monitoring Dashboard — V2.1
 *
 * Educational demo with SYNTHETIC data only. Not a medical device, EHR, or
 * clinical decision-support tool. Do not enter real patient information.
 *
 * Security notes for reviewers:
 *  - All user-controlled values are rendered with textContent (see node()).
 *  - No third-party JavaScript: the trend chart is drawn as SVG below, so
 *    index.html can enforce a strict Content-Security-Policy.
 *  - Records read back from localStorage are validated before use, and demo
 *    flags are recomputed from the values instead of trusting stored flags.
 */
(() => {
  'use strict';

  const STORE = { patients: 'pht_v2_patients', vitals: 'pht_v2_vitals' };
  const $ = (id) => document.getElementById(id);

  // -------------------------------------------------------------------------
  // Dates and times (always LOCAL time, 24-hour "HH:MM")
  // -------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');

  /** YYYY-MM-DD in the user's local time zone (not UTC). */
  function localDate(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  /** HH:MM, 24-hour, local time — sorts correctly as text. */
  function localTime(d = new Date()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return localDate(d);
  }
  /** Convert legacy "10:15 PM" values (saved by V2.0) to "22:15". */
  function normalizeTime(t) {
    if (typeof t !== 'string') return null;
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return t;
    const m = t.trim().match(/^(\d{1,2}):([0-5]\d)\s*([AP])\.?M\.?$/i);
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'P') h += 12;
    return `${pad(h)}:${m[2]}`;
  }
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const stamp = (v) => `${v.date}T${v.time}`;

  // -------------------------------------------------------------------------
  // Synthetic seed data (dates are relative to today so the demo never looks stale)
  // -------------------------------------------------------------------------
  const seedPatients = () => [
    { id: 'p1', demoId: 'DEMO-101', firstName: 'Jordan', lastName: 'Lee', dob: '1988-04-12', notes: 'Synthetic demonstration record.' },
    { id: 'p2', demoId: 'DEMO-102', firstName: 'Taylor', lastName: 'Morgan', dob: '1976-09-03', notes: 'Synthetic demonstration record.' },
    { id: 'p3', demoId: 'DEMO-103', firstName: 'Casey', lastName: 'Rivera', dob: '1994-01-22', notes: 'Synthetic demonstration record.' },
  ];
  const seedVitals = () => [
    { id: 'v1', patientId: 'p1', date: daysAgo(3), time: '09:15', heartRate: 76, systolic: 118, diastolic: 76, temperature: 98.4, notes: 'Routine synthetic observation.' },
    { id: 'v2', patientId: 'p2', date: daysAgo(2), time: '11:30', heartRate: 126, systolic: 146, diastolic: 92, temperature: 99.1, notes: 'Synthetic values to demonstrate flags.' },
    { id: 'v3', patientId: 'p3', date: daysAgo(1), time: '14:10', heartRate: 68, systolic: 122, diastolic: 78, temperature: 100.6, notes: 'Synthetic values to demonstrate temperature flag.' },
    { id: 'v4', patientId: 'p1', date: daysAgo(0), time: '08:45', heartRate: 72, systolic: 116, diastolic: 74, temperature: 98.2, notes: 'Routine synthetic observation.' },
  ].map((v) => ({ ...v, flags: flagsFor(v.heartRate, v.systolic, v.diastolic, v.temperature) }));

  // -------------------------------------------------------------------------
  // Demo flag rules (simplified; NOT clinical guidance)
  // -------------------------------------------------------------------------
  function flagsFor(hr, sys, dia, temp) {
    const flags = [];
    if (hr < 50 || hr > 120) flags.push('Heart rate demo flag');
    if (sys >= 140 || dia >= 90) flags.push('Blood pressure demo flag');
    if (temp < 95 || temp >= 100.4) flags.push('Temperature demo flag');
    return flags;
  }

  // -------------------------------------------------------------------------
  // Storage with validation
  // -------------------------------------------------------------------------
  const isStr = (x, max = 240) => typeof x === 'string' && x.length <= max;
  const isNum = (x, lo, hi) => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;

  function cleanPatient(p) {
    if (!p || typeof p !== 'object') return null;
    if (!isStr(p.id, 64) || !isStr(p.demoId, 20) || !/^[A-Z0-9-]+$/.test(p.demoId)) return null;
    if (!isStr(p.firstName, 40) || !isStr(p.lastName, 40) || !p.firstName || !p.lastName) return null;
    if (!DATE_RE.test(p.dob)) return null;
    return { id: p.id, demoId: p.demoId, firstName: p.firstName, lastName: p.lastName, dob: p.dob,
      notes: isStr(p.notes) ? p.notes : '' };
  }

  function cleanVital(v) {
    if (!v || typeof v !== 'object') return null;
    const time = normalizeTime(v.time);
    if (!isStr(v.id, 64) || !isStr(v.patientId, 64) || !DATE_RE.test(v.date) || !time) return null;
    if (!isNum(v.heartRate, 20, 250) || !isNum(v.systolic, 50, 260) ||
        !isNum(v.diastolic, 30, 180) || !isNum(v.temperature, 85, 115)) return null;
    return { id: v.id, patientId: v.patientId, date: v.date, time,
      heartRate: v.heartRate, systolic: v.systolic, diastolic: v.diastolic, temperature: v.temperature,
      notes: isStr(v.notes) ? v.notes : '',
      // Recompute instead of trusting whatever was stored.
      flags: flagsFor(v.heartRate, v.systolic, v.diastolic, v.temperature) };
  }

  function load(key, seed, clean) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return seed();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return seed();
      const valid = parsed.map(clean).filter(Boolean);
      if (valid.length !== parsed.length) {
        console.warn(`Dropped ${parsed.length - valid.length} invalid record(s) from ${key}.`);
      }
      return valid;
    } catch {
      return seed();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE.patients, JSON.stringify(patients));
      localStorage.setItem(STORE.vitals, JSON.stringify(vitals));
    } catch (err) {
      console.warn('Could not save demo data (storage blocked or full).', err);
    }
  }

  let patients = load(STORE.patients, seedPatients, cleanPatient);
  const patientIds = new Set(patients.map((p) => p.id));
  // Drop observations that point at a patient who no longer exists.
  let vitals = load(STORE.vitals, seedVitals, cleanVital).filter((v) => patientIds.has(v.patientId));

  // -------------------------------------------------------------------------
  // Safe DOM helpers
  // -------------------------------------------------------------------------
  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = String(text ?? '');
    if (cls) el.className = cls;
    return el;
  }
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}, text) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text !== undefined) el.textContent = String(text);
    return el;
  }

  const fullName = (p) => `${p.firstName} ${p.lastName}`;
  const vitalsFor = (patientId) => vitals.filter((v) => v.patientId === patientId);
  const latestVital = (patientId) =>
    vitalsFor(patientId).sort((a, b) => stamp(b).localeCompare(stamp(a)))[0];

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  function setView(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('active', b.dataset.view === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'dashboard') renderDashboard();
    if (id === 'patients') renderPatients();
    if (id === 'record') renderPatientSelect();
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  function renderDashboard() {
    $('patientCount').textContent = patients.length;
    $('observationCount').textContent = vitals.length;
    $('flaggedCount').textContent = vitals.filter((v) => v.flags.length).length;
    const latestDate = [...vitals].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    const latest = vitals.filter((v) => v.date === latestDate);
    $('avgHeartRate').textContent = latest.length
      ? Math.round(latest.reduce((s, v) => s + v.heartRate, 0) / latest.length) : '—';
    $('lastUpdated').textContent = `Updated ${new Date().toLocaleDateString()}`;
    renderAlerts();
    renderRecent();
    renderChart();
  }

  function renderAlerts() {
    const box = $('alertsList');
    box.replaceChildren();
    const flagged = vitals.filter((v) => v.flags.length)
      .sort((a, b) => stamp(b).localeCompare(stamp(a))).slice(0, 4);
    if (!flagged.length) { box.append(node('div', 'No flagged demo observations.', 'empty')); return; }
    flagged.forEach((v) => {
      const p = patients.find((x) => x.id === v.patientId);
      const item = node('div', undefined, 'alert-item');
      item.append(node('strong', p ? fullName(p) : 'Unknown demo patient'),
        node('span', `${v.date} ${v.time} • ${v.flags.join(' • ')}`));
      box.append(item);
    });
  }

  function renderRecent() {
    const wrap = $('recentPatients');
    wrap.replaceChildren();
    if (!patients.length) { wrap.append(node('div', 'No synthetic patient records.', 'empty')); return; }
    const table = node('table');
    const head = node('thead');
    const hr = node('tr');
    ['Patient', 'Demo ID', 'Latest observation', 'Status'].forEach((x) => hr.append(node('th', x)));
    head.append(hr);
    const body = node('tbody');
    patients.slice(-5).reverse().forEach((p) => {
      const v = latestVital(p.id);
      const tr = node('tr');
      tr.append(node('td', fullName(p)), node('td', p.demoId),
        node('td', v ? `${v.date} ${v.time} • ${v.heartRate} bpm` : 'None'));
      const td = node('td');
      td.append(node('span', v?.flags.length ? 'Flagged' : 'No active flag', `status ${v?.flags.length ? 'flag' : 'ok'}`));
      tr.append(td);
      body.append(tr);
    });
    table.append(head, body);
    wrap.append(table);
  }

  /** Average heart rate per day, drawn as an SVG line chart (no library). */
  function renderChart() {
    const box = $('healthChart');
    const grouped = {};
    vitals.forEach((v) => { (grouped[v.date] ??= []).push(v.heartRate); });
    const dates = Object.keys(grouped).sort();
    const values = dates.map((d) => Math.round(grouped[d].reduce((a, b) => a + b, 0) / grouped[d].length));
    if (!dates.length) { box.replaceChildren(node('div', 'No observations to chart yet.', 'empty')); return; }

    const W = 640, H = 260, P = { l: 40, r: 24, t: 16, b: 34 };
    const lo = Math.min(40, Math.floor(Math.min(...values) / 20) * 20);
    const hi = Math.max(140, Math.ceil(Math.max(...values) / 20) * 20);
    const x = (i) => dates.length === 1 ? (P.l + W - P.r) / 2 : P.l + (i * (W - P.l - P.r)) / (dates.length - 1);
    const y = (v) => H - P.b - ((v - lo) / (hi - lo)) * (H - P.t - P.b);
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const label = (d) => fmt.format(new Date(`${d}T00:00:00`));

    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': `Average heart rate by day: ${dates.map((d, i) => `${label(d)} ${values[i]} bpm`).join(', ')}` });
    for (let v = lo; v <= hi; v += 20) {
      chart.append(svg('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), class: 'grid' }),
        svg('text', { x: P.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, v));
    }
    // Shade the demo "normal" heart-rate band (50–120 bpm, matches the flag rule).
    chart.append(svg('rect', { x: P.l, y: y(120), width: W - P.l - P.r, height: y(50) - y(120), class: 'band' }));
    chart.append(svg('polyline', { points: values.map((v, i) => `${x(i)},${y(v)}`).join(' '), class: 'line' }));
    values.forEach((v, i) => {
      const dot = svg('circle', { cx: x(i), cy: y(v), r: 4.5, class: v < 50 || v > 120 ? 'dot flagged' : 'dot' });
      dot.append(svg('title', {}, `${label(dates[i])}: ${v} bpm average`));
      chart.append(dot, svg('text', { x: x(i), y: H - 10, 'text-anchor': 'middle', class: 'axis' }, label(dates[i])));
    });
    box.replaceChildren(chart);
  }

  // -------------------------------------------------------------------------
  // Patients
  // -------------------------------------------------------------------------
  function renderPatients() {
    const query = $('patientSearch').value.trim().toLowerCase();
    const filtered = patients.filter((p) => `${fullName(p)} ${p.demoId}`.toLowerCase().includes(query));
    $('patientResultCount').textContent = `${filtered.length} record${filtered.length === 1 ? '' : 's'}`;
    const box = $('patientCards');
    box.replaceChildren();
    if (!filtered.length) { box.append(node('div', 'No matching synthetic records.', 'empty')); return; }

    filtered.forEach((p) => {
      const v = latestVital(p.id);
      const card = node('article', undefined, 'patient-card');
      const top = node('div', undefined, 'patient-top');
      const left = node('div');
      left.append(node('h3', fullName(p)), node('p', `${p.demoId} • DOB ${p.dob}`));
      top.append(left, node('div', `${p.firstName[0] || ''}${p.lastName[0] || ''}`, 'avatar'));
      card.append(top);
      if (p.notes) card.append(node('p', p.notes, 'card-note'));

      const latest = node('div', undefined, 'latest');
      [['Heart rate', v ? `${v.heartRate} bpm` : '—'],
        ['Blood pressure', v ? `${v.systolic}/${v.diastolic}` : '—'],
        ['Temperature', v ? `${v.temperature.toFixed(1)}°F` : '—'],
        ['Status', v?.flags.length ? 'Flagged' : 'No active flag']].forEach(([a, b]) => {
        const d = node('div');
        d.append(node('span', a), node('strong', b));
        latest.append(d);
      });
      card.append(latest);
      if (v) card.append(node('p', `Latest: ${v.date} ${v.time}${v.notes ? ` — ${v.notes}` : ''}`, 'card-note'));

      const actions = node('div', undefined, 'card-actions');
      const exportBtn = node('button', 'Export FHIR', 'ghost');
      exportBtn.type = 'button';
      exportBtn.title = 'Download this synthetic record as a FHIR R4 Bundle (JSON)';
      exportBtn.addEventListener('click', () => downloadFhir(p));
      const delBtn = node('button', 'Delete', 'ghost danger');
      delBtn.type = 'button';
      delBtn.addEventListener('click', () => deletePatient(p.id));
      actions.append(exportBtn, delBtn);
      card.append(actions);
      box.append(card);
    });
  }

  function deletePatient(id) {
    const p = patients.find((x) => x.id === id);
    if (!p) return;
    const n = vitalsFor(id).length;
    if (!confirm(`Delete ${fullName(p)} (${p.demoId}) and ${n} observation${n === 1 ? '' : 's'}? This cannot be undone.`)) return;
    patients = patients.filter((x) => x.id !== id);
    vitals = vitals.filter((v) => v.patientId !== id);
    save();
    renderPatients();
    renderPatientSelect();
    renderDashboard();
  }

  function renderPatientSelect() {
    const s = $('vitalPatient');
    s.replaceChildren(new Option('Choose a synthetic patient…', ''));
    patients.forEach((p) => s.append(new Option(`${fullName(p)} (${p.demoId})`, p.id)));
  }

  // -------------------------------------------------------------------------
  // Forms
  // -------------------------------------------------------------------------
  function message(id, text, type = '') {
    const el = $(id);
    el.textContent = text;
    el.className = `form-message ${type}`;
  }

  function addPatient(e) {
    e.preventDefault();
    const first = $('firstName').value.trim();
    const last = $('lastName').value.trim();
    const dob = $('dob').value;
    const demoId = $('demoId').value.trim().toUpperCase();
    const notes = $('patientNotes').value.trim();
    if (!first || !last || !dob || !demoId) { message('patientMessage', 'Complete all required fields.', 'error'); return; }
    if (!/^[A-Z0-9-]+$/.test(demoId)) { message('patientMessage', 'Demo ID may contain letters, numbers, and hyphens only.', 'error'); return; }
    if (!DATE_RE.test(dob) || dob > localDate() || dob < '1900-01-01') {
      message('patientMessage', 'Date of birth must be a real date between 1900 and today.', 'error'); return;
    }
    if (patients.some((p) => p.demoId === demoId)) { message('patientMessage', 'That demo ID already exists.', 'error'); return; }
    patients.push({ id: crypto.randomUUID(), demoId, firstName: first, lastName: last, dob, notes });
    save();
    e.target.reset();
    message('patientMessage', '');
    $('patientDialog').close();
    renderPatients();
    renderPatientSelect();
    renderDashboard();
  }

  function addVitals(e) {
    e.preventDefault();
    const patientId = $('vitalPatient').value;
    const hr = Number($('heartRate').value);
    const temp = Number($('temperature').value);
    const sys = Number($('systolic').value);
    const dia = Number($('diastolic').value);
    const notes = $('notes').value.trim();
    const filled = ['heartRate', 'temperature', 'systolic', 'diastolic'].every((id) => $(id).value !== '');
    if (!patientId || !filled || ![hr, temp, sys, dia].every(Number.isFinite)) {
      message('formMessage', 'Complete all required observation fields.', 'error'); return;
    }
    if (hr < 20 || hr > 250 || temp < 85 || temp > 115 || sys < 50 || sys > 260 || dia < 30 || dia > 180) {
      message('formMessage', "One or more values fall outside this demo application's accepted input range.", 'error'); return;
    }
    if (dia >= sys) { message('formMessage', 'Diastolic must be lower than systolic.', 'error'); return; }
    const flags = flagsFor(hr, sys, dia, temp);
    const now = new Date();
    vitals.push({ id: crypto.randomUUID(), patientId, date: localDate(now), time: localTime(now),
      heartRate: hr, systolic: sys, diastolic: dia, temperature: temp, notes, flags });
    save();
    e.target.reset();
    renderPatientSelect();
    message('formMessage', flags.length ? `Observation saved with ${flags.length} demo flag(s).` : 'Observation saved. No demo flags generated.',
      flags.length ? 'error' : 'success');
    renderDashboard();
  }

  function resetDemo() {
    if (!confirm('Reset this browser to the original synthetic demo data?')) return;
    patients = seedPatients();
    vitals = seedVitals();
    save();
    renderDashboard();
    renderPatients();
    renderPatientSelect();
  }

  // -------------------------------------------------------------------------
  // FHIR R4 export
  // -------------------------------------------------------------------------
  // Every resource is tagged HTEST ("test health data") so no system mistakes
  // the export for real clinical data.
  const HTEST = { system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason', code: 'HTEST', display: 'test health data' };
  const VITAL_SIGNS = [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }];
  const loinc = (code, display) => ({ coding: [{ system: 'http://loinc.org', code, display }], text: display });
  const qty = (value, unit, code) => ({ value, unit, system: 'http://unitsofmeasure.org', code });

  /** Local date + time as an ISO 8601 dateTime with the browser's UTC offset. */
  function fhirDateTime(date, time) {
    const off = -new Date(`${date}T${time}:00`).getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    return `${date}T${time}:00${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  }

  function toFhirBundle(p) {
    const patientUrl = `urn:uuid:${crypto.randomUUID()}`;
    const entry = (resource) => ({ fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource });
    const observation = (v, profile, code, rest) => ({
      resourceType: 'Observation',
      meta: { profile: [`http://hl7.org/fhir/StructureDefinition/${profile}`], security: [HTEST] },
      status: 'final',
      category: VITAL_SIGNS,
      code,
      subject: { reference: patientUrl, display: fullName(p) },
      effectiveDateTime: fhirDateTime(v.date, v.time),
      ...rest,
      ...(v.notes ? { note: [{ text: v.notes }] } : {}),
    });

    const resources = vitalsFor(p.id).sort((a, b) => stamp(a).localeCompare(stamp(b))).flatMap((v) => [
      observation(v, 'heartrate', loinc('8867-4', 'Heart rate'),
        { valueQuantity: qty(v.heartRate, 'beats/minute', '/min') }),
      observation(v, 'bodytemp', loinc('8310-5', 'Body temperature'),
        { valueQuantity: qty(v.temperature, 'degF', '[degF]') }),
      observation(v, 'bp', loinc('85354-9', 'Blood pressure panel with all children optional'), {
        component: [
          { code: loinc('8480-6', 'Systolic blood pressure'), valueQuantity: qty(v.systolic, 'mmHg', 'mm[Hg]') },
          { code: loinc('8462-4', 'Diastolic blood pressure'), valueQuantity: qty(v.diastolic, 'mmHg', 'mm[Hg]') },
        ],
      }),
    ]);

    return {
      resourceType: 'Bundle',
      meta: { security: [HTEST] },
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        { fullUrl: patientUrl, resource: {
          resourceType: 'Patient',
          meta: { security: [HTEST] },
          identifier: [{ system: 'urn:example:patient-health-tracker:demo-id', value: p.demoId }],
          name: [{ family: p.lastName, given: [p.firstName] }],
          birthDate: p.dob,
        } },
        ...resources.map(entry),
      ],
    };
  }

  function downloadFhir(p) {
    const json = JSON.stringify(toFhirBundle(p), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/fhir+json' }));
    const a = node('a');
    a.href = url;
    a.download = `fhir-${p.demoId}.json`;  // demoId is restricted to A-Z, 0-9 and "-"
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
    document.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.jump)));
    $('patientSearch').addEventListener('input', renderPatients);
    $('showAddPatient').addEventListener('click', () => $('patientDialog').showModal());
    $('closeDialog').addEventListener('click', () => $('patientDialog').close());
    $('cancelPatient').addEventListener('click', () => $('patientDialog').close());
    $('patientForm').addEventListener('submit', addPatient);
    $('vitalsForm').addEventListener('submit', addVitals);
    $('resetDemo').addEventListener('click', resetDemo);
    $('dob').max = localDate();
    save();
    renderDashboard();
    renderPatients();
    renderPatientSelect();
  });
})();

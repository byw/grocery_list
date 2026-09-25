const key = (s) => s.trim().toLowerCase();

export function addItem(state, raw) {
  const name = raw.trim();
  if (!name) return state;
  const k = key(name);
  const existing = state.items.find((i) => key(i.name) === k);
  if (existing) existing.doneAt = null;
  else state.items.push({ name, doneAt: null });
  state.history[k] = (state.history[k] || 0) + 1;
  return state;
}

export function toggle(state, name) {
  const item = state.items.find((i) => i.name === name);
  if (item) item.doneAt = item.doneAt ? null : new Date().toISOString();
  return state;
}

export function remove(state, name) {
  state.items = state.items.filter((i) => i.name !== name);
  return state;
}

// Done items live until the next local calendar day.
export function archive(state, now = new Date()) {
  const today = now.toDateString();
  state.items = state.items.filter((i) => !i.doneAt || new Date(i.doneAt).toDateString() === today);
  return state;
}

export function suggestions(state) {
  return Object.entries(state.history)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

if (typeof document !== "undefined") {
  const STORE = "grocery";
  let state = { items: [], history: {}, prefs: {}, ...JSON.parse(localStorage.getItem(STORE)) };
  const $ = (id) => document.getElementById(id);

  const save = () => localStorage.setItem(STORE, JSON.stringify(state));

  let audio;
  function chime() {
    audio ??= new AudioContext();
    const t0 = audio.currentTime;
    [[880, 0], [1320, 0.12]].forEach(([hz, dt]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = hz;
      o.connect(g).connect(audio.destination);
      g.gain.setValueAtTime(0.2, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.25);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.25);
    });
  }
  // ponytail: navigator.vibrate is Android-only; iOS Safari ignores it silently.
  const vibrate = () => navigator.vibrate?.(40);
  const feedback = { chime, vibrate };
  const onDone = () => { for (const k in feedback) if (state.prefs[k]) feedback[k](); };

  function render() {
    archive(state);
    save();
    const open = state.items.filter((i) => !i.doneAt);
    const done = state.items.filter((i) => i.doneAt);
    $("list").replaceChildren(
      ...[...open, ...done].map((i) => {
        const li = document.createElement("li");
        li.className = i.doneAt ? "done" : "";
        const span = document.createElement("span");
        span.textContent = i.name;
        span.onclick = () => { const wasOpen = !i.doneAt; toggle(state, i.name); if (wasOpen) onDone(); render(); };
        const x = document.createElement("button");
        x.textContent = "×";
        x.setAttribute("aria-label", `Remove ${i.name}`);
        x.onclick = () => { remove(state, i.name); render(); };
        li.append(span, x);
        return li;
      })
    );
    $("hist").replaceChildren(
      ...suggestions(state).map((n) => Object.assign(document.createElement("option"), { value: n }))
    );
  }

  $("add").onsubmit = (e) => {
    e.preventDefault();
    addItem(state, $("name").value);
    $("name").value = "";
    $("name").focus();
    render();
  };
  for (const k in feedback) {
    $(k).checked = !!state.prefs[k];
    $(k).onchange = (e) => { state.prefs[k] = e.target.checked; save(); if (e.target.checked) feedback[k](); };
  }
  document.addEventListener("visibilitychange", () => !document.hidden && render());
  render();
  navigator.serviceWorker?.register("sw.js");
  navigator.serviceWorker?.addEventListener("controllerchange", () => location.reload());
  $("reload").onclick = async () => {
    await (await navigator.serviceWorker?.getRegistration())?.update();
    location.reload();
  };
}

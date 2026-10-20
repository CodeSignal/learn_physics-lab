import Modal from './design-system/components/modal/modal.js';
import { SimulationRuntime } from './simulation-runtime.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { GraphManager } from './instrumentation/graph-manager.js';
import { validateScene } from './config-validator.js';

const $ = (selector) => document.querySelector(selector);
const SETTINGS_URL = new URL('/runtime-config/physics-lab.settings.json', window.location.origin);

let runtime;
let renderer;
let graphs;
let activeScene;
let scenes = [];
let measurementNodes = [];

const fmt = (value) => Number(value).toFixed(2);
const formatControlValue = (value, step) => Number(value.toFixed((`${step}`.split('.')[1] || '').length)).toString();

async function fetchJson(path, label) {
  let response;
  try {
    response = await fetch(path, { cache: 'no-store' });
  } catch (error) {
    throw new Error(`Could not load ${label} at ${path}.`);
  }
  if (!response.ok) throw new Error(`Could not load ${label} at ${path} (${response.status}).`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${label} at ${path} is not valid JSON.`);
  }
}

function normalizeSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('physics-lab.settings.json must contain a JSON object.');
  }

  if (settings.experimentPaths != null && !Array.isArray(settings.experimentPaths)) {
    throw new Error('experimentPaths must be an array when provided.');
  }
  const paths = [settings.experimentPath, ...(settings.experimentPaths || [])]
    .filter((path) => path != null);
  if (paths.some((path) => typeof path !== 'string' || !path.trim())) {
    throw new Error('Experiment paths in physics-lab.settings.json must be non-empty strings.');
  }
  if (settings.experimentId != null && typeof settings.experimentId !== 'string') {
    throw new Error('experimentId must be a string or null.');
  }

  return {
    experimentId: settings.experimentId || null,
    experimentPaths: [...new Set(paths)],
    showExperimentPicker: settings.showExperimentPicker === true,
  };
}

async function loadRuntimeConfiguration() {
  const settings = normalizeSettings(await fetchJson(SETTINGS_URL, 'Physics Lab settings'));
  const loadedScenes = await Promise.all(settings.experimentPaths.map(async (path) => {
    const experimentUrl = new URL(path, SETTINGS_URL);
    const scene = await fetchJson(experimentUrl, 'experiment configuration');
    try {
      return validateScene(scene);
    } catch (error) {
      throw new Error(`Invalid experiment at ${experimentUrl.pathname}: ${error.message}`);
    }
  }));

  const ids = new Set();
  loadedScenes.forEach((scene) => {
    if (ids.has(scene.id)) throw new Error(`Duplicate experiment id: ${scene.id}.`);
    ids.add(scene.id);
  });
  return { settings, scenes: loadedScenes };
}

function renderControls(scene) {
  const host = $('#parameter-controls');
  host.replaceChildren();

  scene.learnerControls.forEach((control) => {
    const item = document.createElement('div');
    item.className = 'parameter';
    const initial = formatControlValue(control.value, control.step);
    item.innerHTML = `<div class="parameter-label"><label for="${control.id}">${control.label}</label><span><output class="parameter-value" role="button" tabindex="0" aria-label="Edit ${control.label}">${initial}</output><input class="input parameter-value-input" type="text" inputmode="decimal" aria-label="${control.label}" value="${initial}" hidden> <small>${control.unit}</small></span></div><input id="${control.id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}"><div class="range-labels"><span>${control.min}</span><span>${control.max} ${control.unit}</span></div>`;

    const range = item.querySelector('input[type="range"]');
    const output = item.querySelector('output');
    const editor = item.querySelector('.parameter-value-input');
    const closeEditor = () => { editor.hidden = true; output.hidden = false; };
    const commit = () => {
      const value = Number(editor.value.trim());
      if (runtime.setParameter(control.id, value)) {
        const applied = formatControlValue(runtime.parameters.get(control.id), control.step);
        range.value = applied;
        editor.value = applied;
        output.textContent = applied;
      } else {
        editor.value = output.textContent;
      }
      closeEditor();
      syncUI();
    };
    const edit = () => { output.hidden = true; editor.hidden = false; editor.focus(); editor.select(); };

    range.addEventListener('input', () => {
      runtime.setParameter(control.id, Number(range.value));
      const applied = formatControlValue(runtime.parameters.get(control.id), control.step);
      editor.value = applied;
      output.textContent = applied;
      syncUI();
    });
    output.addEventListener('click', edit);
    output.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(); }
    });
    editor.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); editor.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); editor.value = range.value; closeEditor(); }
    });
    editor.addEventListener('blur', commit);
    host.append(item);
  });
}

function buildMeasurements() {
  const host = $('#measurement-grid');
  host.replaceChildren();
  measurementNodes = runtime.getMeasurements().map(({ label, unit }) => {
    const item = document.createElement('article');
    const name = document.createElement('span');
    const value = document.createElement('strong');
    const unitLabel = document.createElement('small');
    name.textContent = label;
    unitLabel.textContent = unit;
    value.append(document.createTextNode('0.00 '), unitLabel);
    item.append(name, value);
    host.append(item);
    return { value, unit: unitLabel };
  });
}

function renderMeasurements() {
  runtime.getMeasurements().forEach(({ value, unit }, index) => {
    const node = measurementNodes[index];
    if (!node) return;
    node.value.firstChild.data = `${fmt(value)} `;
    node.unit.textContent = unit;
  });
}

function syncUI() {
  if (!runtime) return;
  const state = runtime.getState();
  renderer.render(state);
  renderMeasurements();
  graphs.update(runtime);
  $('#time-display').textContent = `${fmt(state.time)} s`;
  const running = state.status === 'running';
  $('#status-label').textContent = running ? 'Running' : state.status === 'paused' ? 'Paused' : state.status === 'complete' ? 'Complete' : 'Ready';
  $('#status-pill').classList.toggle('running', running);
  $('#pause-button').disabled = !running;
  $('#run-button').textContent = state.status === 'paused' ? 'Resume' : state.status === 'complete' ? 'Run again' : 'Run simulation';
}

function setControlsDisabled(disabled) {
  ['run-button', 'pause-button', 'reset-button', 'center-view-button'].forEach((id) => { $(`#${id}`).disabled = disabled; });
}

function showEmptyState(title, description, status = 'Not configured') {
  $('#scene-title').textContent = title;
  $('#scene-subtitle').textContent = description;
  $('#scene-description').textContent = description;
  $('#parameter-controls').replaceChildren();
  $('#empty-state').hidden = false;
  $('#simulation-canvas').hidden = true;
  $('#lower-panels').hidden = true;
  $('#status-label').textContent = status;
  $('#time-display').textContent = '—';
  setControlsDisabled(true);
}

async function loadScene(id) {
  activeScene = scenes.find((scene) => scene.id === id);
  if (!activeScene) throw new Error(`Configured experiment id does not exist: ${id}.`);
  if (runtime) runtime.destroy();
  runtime = await SimulationRuntime.create(activeScene);
  $('#empty-state').hidden = true;
  $('#simulation-canvas').hidden = false;
  $('#lower-panels').hidden = false;
  setControlsDisabled(false);
  renderControls(activeScene);
  buildMeasurements();
  const graph = activeScene.instrumentation?.graph;
  graphs.load(graph, runtime);
  $('#graphs-panel').hidden = !graph;
  $('#graph-title').textContent = graph?.title || 'Measurement graph';
  $('#scene-title').textContent = activeScene.title.replace(/^\d+ · /, '');
  $('#scene-subtitle').textContent = activeScene.description;
  $('#scene-description').textContent = activeScene.description;
  syncUI();
}

async function initialiseHelp() {
  try {
    const content = await (await fetch('./help-content.html')).text();
    const modal = Modal.createHelpModal({ title: 'Using Physics Lab', content });
    $('#btn-help').addEventListener('click', () => modal.open());
  } catch (error) {
    console.error(error);
  }
}

async function init() {
  renderer = new CanvasRenderer($('#simulation-canvas'));
  graphs = new GraphManager($('#graph-canvas'));
  $('#run-button').addEventListener('click', () => {
    if (!runtime) return;
    runtime.toggle();
    syncUI();
  });
  $('#pause-button').addEventListener('click', () => {
    if (!runtime) return;
    runtime.pause();
    syncUI();
  });
  $('#reset-button').addEventListener('click', () => {
    if (!runtime) return;
    runtime.reset();
    syncUI();
  });
  $('#center-view-button').addEventListener('click', () => {
    if (!runtime) return;
    renderer.centerOnObject(runtime.getState());
    syncUI();
  });
  await initialiseHelp();

  const configuration = await loadRuntimeConfiguration();
  scenes = configuration.scenes;
  const picker = $('#scene-select');
  picker.closest('.scene-picker').hidden = !configuration.settings.showExperimentPicker || scenes.length < 2;
  picker.replaceChildren(...scenes.map((scene) => new Option(scene.title, scene.id)));
  picker.addEventListener('change', async (event) => {
    try {
      await loadScene(event.target.value);
    } catch (error) {
      console.error(error);
      showEmptyState('Experiment could not load', error.message, 'Configuration error');
    }
  });

  if (scenes.length === 0) {
    showEmptyState('No experiment configured', 'Add an experiment JSON file to runtime-config/experiments and reference it from runtime-config/physics-lab.settings.json.');
    return;
  }

  const selected = configuration.settings.experimentId || scenes[0].id;
  picker.value = selected;
  await loadScene(selected);
  const loop = (now) => {
    runtime.frame(now);
    syncUI();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

init().catch((error) => {
  console.error(error);
  showEmptyState('Physics Lab configuration error', error.message, 'Configuration error');
});

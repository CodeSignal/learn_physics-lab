import Chart from 'chart.js/auto';

const RUN_COLORS = ['#2563eb', '#e53600', '#0b8f72', '#a855f7', '#d97706', '#db2777'];

export class GraphManager {
  constructor(host) {
    this.host = host;
    this.definition = null;
    this.chart = null;
    this.runtime = null;
    this.comparisonsEnabled = false;
    this.controls = [];
    this.savedRuns = [];
    this.labels = new Map();
  }

  load(definition, runtime, { comparisonsEnabled = false, controls = [] } = {}) {
    this.destroy();
    this.definition = definition;
    this.runtime = runtime;
    this.comparisonsEnabled = comparisonsEnabled;
    this.controls = controls;
    if (!definition) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', definition.title);
    this.host.replaceChildren(canvas);
    this.labels = new Map(runtime.instrumentation.definitions.map((item) => [item.id, item.label || item.id]));
    this.chart = new Chart(canvas, {
      type: definition.type || 'line',
      data: { datasets: [] },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Time (s)' } },
          y: { title: { display: true, text: definition.yAxis || '' } },
        },
      },
    });
  }

  parameterSummary(runtime) {
    return this.controls.map((control) => {
      const value = runtime.parameters.get(control.id);
      return `${control.label}: ${value}${control.unit ? ` ${control.unit}` : ''}`;
    }).join(', ');
  }

  createRun(runtime) {
    return {
      parameters: this.parameterSummary(runtime),
      series: this.definition.series.map((id) => ({
        id,
        label: this.labels.get(id) || id,
        data: runtime.getSeries(id).map((sample) => ({ x: sample.time, y: sample.value })),
      })),
    };
  }

  datasetsForRun(run, index, isCurrent) {
    const runLabel = isCurrent ? 'Current run' : `Run ${index + 1}`;
    const detail = run.parameters ? ` · ${run.parameters}` : '';
    const color = RUN_COLORS[index % RUN_COLORS.length];
    const includeSeriesLabel = run.series.length > 1;
    return run.series.map((series, seriesIndex) => {
      const dataset = { label: this.comparisonsEnabled ? `${runLabel}${includeSeriesLabel ? ` · ${series.label}` : ''}${detail}` : series.label, data: series.data, borderWidth: 2, pointRadius: 0, tension: .15 };
      if (this.comparisonsEnabled) Object.assign(dataset, { borderColor: color, backgroundColor: color, borderDash: seriesIndex ? [6, 4] : [] });
      return dataset;
    });
  }

  archiveRun(runtime) {
    if (!this.comparisonsEnabled || !this.chart) return false;
    const run = this.createRun(runtime);
    if (!run.series.some((series) => series.data.length > 1)) return false;
    this.savedRuns.push(run);
    return true;
  }

  hasComparisons() {
    return this.savedRuns.length > 0;
  }

  clearComparisons() {
    this.savedRuns = [];
  }

  update(runtime) {
    if (!this.chart) return;
    this.runtime = runtime;
    const currentRun = this.createRun(runtime);
    const historicalDatasets = this.savedRuns.flatMap((run, index) => this.datasetsForRun(run, index, false));
    const currentDatasets = this.datasetsForRun(currentRun, this.savedRuns.length, true);
    this.chart.data.datasets = [...historicalDatasets, ...currentDatasets];
    this.chart.update('none');
  }

  destroy() {
    this.chart?.destroy();
    this.chart = null;
    this.savedRuns = [];
    this.host.replaceChildren();
  }
}

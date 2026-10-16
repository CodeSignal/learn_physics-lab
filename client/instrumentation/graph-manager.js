import Chart from 'chart.js/auto';
export class GraphManager {
  constructor(host) { this.host = host; this.definition = null; this.chart = null; this.runtime = null; }
  load(definition, runtime) { this.destroy(); this.definition = definition; this.runtime = runtime; if (!definition) return; const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', definition.title); this.host.replaceChildren(canvas); const labels = new Map(runtime.instrumentation.definitions.map((item) => [item.id, item.label || item.id])); this.chart = new Chart(canvas, { type: definition.type || 'line', data: { datasets: definition.series.map((id) => ({ label: labels.get(id) || id, data: [], borderWidth: 2, pointRadius: 0, tension: .15 })) }, options: { animation: false, responsive: true, maintainAspectRatio: false, parsing: false, scales: { x: { type: 'linear', title: { display: true, text: 'Time (s)' } }, y: { title: { display: true, text: definition.yAxis || '' } } } } }); }
  update(runtime) { if (!this.chart) return; this.chart.data.datasets.forEach((dataset, index) => { dataset.data = runtime.getSeries(this.definition.series[index]).map((sample) => ({ x: sample.time, y: sample.value })); }); this.chart.update('none'); }
  destroy() { this.chart?.destroy(); this.chart = null; this.host.replaceChildren(); }
}

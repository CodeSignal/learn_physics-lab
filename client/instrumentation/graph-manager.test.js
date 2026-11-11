import { beforeEach, describe, expect, it, vi } from 'vitest';

const { charts } = vi.hoisted(() => ({ charts: [] }));

vi.mock('chart.js/auto', () => ({
  default: class Chart {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.data = config.data;
      this.update = vi.fn();
      this.destroy = vi.fn();
      charts.push(this);
    }
  },
}));

import { GraphManager } from './graph-manager.js';

const graph = { id: 'speed-graph', type: 'line', title: 'Speed', yAxis: 'm/s', series: ['speed'] };
const controls = [{ id: 'mass', label: 'Mass', unit: 'kg' }];
const runtime = (mass, samples) => ({
  parameters: new Map([['mass', mass]]),
  instrumentation: { definitions: [{ id: 'speed', label: 'Speed' }] },
  getSeries: () => samples,
});

describe('GraphManager comparison runs', () => {
  beforeEach(() => {
    charts.length = 0;
    globalThis.document = { createElement: vi.fn(() => ({ setAttribute: vi.fn() })) };
  });

  it('keeps an archived parameterized run while drawing the current run in a new color', () => {
    const host = { replaceChildren: vi.fn() };
    const manager = new GraphManager(host);
    const firstRun = runtime(1, [{ time: 0, value: 0 }, { time: 1, value: 2 }]);
    manager.load(graph, firstRun, { comparisonsEnabled: true, controls });

    expect(manager.archiveRun(firstRun)).toBe(true);
    manager.update(runtime(2, [{ time: 0, value: 0 }, { time: 1, value: 1 }]));

    expect(charts[0].data.datasets).toHaveLength(2);
    expect(charts[0].data.datasets[0]).toMatchObject({ label: 'Run 1 · Mass: 1 kg', borderColor: '#2563eb' });
    expect(charts[0].data.datasets[1]).toMatchObject({ label: 'Current run · Mass: 2 kg', borderColor: '#e53600' });
  });

  it('does not archive or expose comparisons when the experiment has no configurable parameters', () => {
    const manager = new GraphManager({ replaceChildren: vi.fn() });
    const activeRun = runtime(1, [{ time: 0, value: 0 }, { time: 1, value: 2 }]);
    manager.load(graph, activeRun);

    expect(manager.archiveRun(activeRun)).toBe(false);
    expect(manager.hasComparisons()).toBe(false);
  });

  it('clears archived runs without removing the current run', () => {
    const manager = new GraphManager({ replaceChildren: vi.fn() });
    const firstRun = runtime(1, [{ time: 0, value: 0 }, { time: 1, value: 2 }]);
    manager.load(graph, firstRun, { comparisonsEnabled: true, controls });
    manager.archiveRun(firstRun);
    manager.clearComparisons();
    manager.update(runtime(2, [{ time: 0, value: 0 }, { time: 1, value: 1 }]));

    expect(manager.hasComparisons()).toBe(false);
    expect(charts[0].data.datasets).toHaveLength(1);
  });
});

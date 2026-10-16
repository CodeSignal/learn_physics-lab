import { describe, expect, it } from 'vitest';
import { Instrumentation } from './instrumentation.js';
import { measurementRegistry } from './measurement-registry.js';

const state = (time, x = 0, vx = 3, vy = 4) => ({ time, timestep: .1, gravity: { x: 0, y: -10 }, forces: [{ target: 'ball', type: 'constant-force', continuous: true, vector: { x: 2, y: 0 } }], objects: { ball: { id: 'ball', shape: 'circle', mass: 2, radius: 1, x, y: 3, rotation: 0, angularVelocity: 2, velocity: { x: vx, y: vy } } } });
const config = { instrumentation: { recording: { enabled: true, sampleInterval: .1, maxSamples: 2 }, measurements: [{ id: 'speed', target: 'ball', quantity: 'speed', display: 'both' }, { id: 'distance', target: 'ball', quantity: 'distance', display: 'graph' }] } };

describe('instrumentation', () => {
  it('calculates physically defined scalar quantities', () => {
    const context = { object: state(0).objects.ball, initial: { x: 0, y: 3 }, distance: 0, acceleration: { x: 0, y: 0 }, forces: state(0).forces, gravity: { x: 0, y: -10 }, referenceHeight: 0, time: 0 };
    expect(measurementRegistry.get('speed').calculate(context)).toBe(5);
    expect(measurementRegistry.get('momentum').calculate(context)).toBe(10);
    expect(measurementRegistry.get('kineticEnergy').calculate(context)).toBe(25);
    expect(measurementRegistry.get('rotationalKineticEnergy').calculate(context)).toBe(2);
    expect(measurementRegistry.get('potentialEnergy').calculate(context)).toBe(60);
  });
  it('records by simulation time with bounded history and resets trails/history', () => {
    const instrumentation = new Instrumentation(config); instrumentation.reset(state(0)); instrumentation.observe(state(.1, .3)); instrumentation.observe(state(.2, .6)); instrumentation.observe(state(.3, .9));
    expect(instrumentation.getSeries('speed')).toHaveLength(2);
    expect(instrumentation.getSeries('speed')[0].time).toBeCloseTo(.2);
    expect(instrumentation.values(state(.3, .9)).find((value) => value.quantity === 'distance').value).toBeCloseTo(.9);
    instrumentation.reset(state(0)); expect(instrumentation.getSeries('speed')).toHaveLength(0);
  });
  it('keeps the latest fixed-step acceleration available for live measurements', () => {
    const instrumentation = new Instrumentation(config); instrumentation.reset(state(0, 0, 0, 0)); instrumentation.observe(state(.1, 0, 1, 0));
    expect(instrumentation.context(state(.1, 0, 1, 0), 'ball').acceleration.x).toBeCloseTo(10);
  });
});

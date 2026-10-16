import { describe, expect, it } from 'vitest';
import { SimulationRuntime } from './simulation-runtime.js';

const scene = () => ({
  schemaVersion: 1, id: 'runtime-test', title: 'Runtime test',
  environment: { gravity: { x: 0, y: -10 }, duration: 10, timestep: 1 / 60, bounds: { left: -10, right: 10, bottom: -10, top: 10 } },
  objects: [
    { id: 'fixed', label: 'Fixed', shape: 'platform', bodyType: 'fixed', position: { x: 0, y: -5 }, width: 10, height: .5, friction: .5 },
    { id: 'body', label: 'Body', shape: 'rectangle', bodyType: 'dynamic', position: { x: 0, y: 2 }, width: 1, height: 1, mass: 2, friction: 0 }
  ],
  forces: [{ id: 'push', target: 'body', type: 'constant-force', vector: { x: 4, y: 0 }, continuous: true }],
  learnerControls: [{ id: 'mass', label: 'Mass', targetType: 'object', targetId: 'body', property: 'mass', min: 1, max: 4, step: 1, unit: 'kg', value: 2 }],
  measurements: [{ objectId: 'body', property: 'x', label: 'X', unit: 'm' }]
});

describe('Rapier simulation runtime', () => {
  it('accelerates a dynamic body under gravity and leaves fixed bodies stationary', async () => {
    const runtime = await SimulationRuntime.create(scene());
    const before = runtime.getState();
    for (let index = 0; index < 80; index += 1) runtime.step();
    const after = runtime.getState();
    expect(after.objects.body.y).toBeLessThan(before.objects.body.y - 1);
    expect(after.objects.body.y).toBeGreaterThanOrEqual(-4.26);
    expect(after.objects.fixed.y).toBe(before.objects.fixed.y);
    runtime.destroy();
  });
  it('uses continuous force and resets to the authored initial state', async () => {
    const runtime = await SimulationRuntime.create(scene());
    for (let index = 0; index < 30; index += 1) runtime.step();
    expect(runtime.getState().objects.body.velocity.x).toBeGreaterThan(.5);
    runtime.reset();
    expect(runtime.getState().objects.body.x).toBeCloseTo(0, 6);
    expect(runtime.getState().objects.body.velocity.x).toBeCloseTo(0, 6);
    runtime.destroy();
  });
  it('preserves an allowed parameter through reset and rejects invalid values', async () => {
    const runtime = await SimulationRuntime.create(scene());
    expect(runtime.setParameter('mass', 4)).toBe(true);
    expect(runtime.getState().objects.body.mass).toBe(4);
    expect(runtime.setParameter('mass', 99)).toBe(false);
    runtime.destroy();
  });
  it('resets a completed simulation before running it again', async () => {
    const config = scene(); config.environment.duration = 1 / 60;
    const runtime = await SimulationRuntime.create(config);
    runtime.step(); runtime.step();
    expect(runtime.getState().status).toBe('complete');
    runtime.start();
    expect(runtime.getState().status).toBe('running');
    expect(runtime.getState().time).toBe(0);
    expect(runtime.getState().objects.body.x).toBeCloseTo(0, 6);
    runtime.destroy();
  });
});

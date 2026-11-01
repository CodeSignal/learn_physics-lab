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
  it('rebuilds with a nested starting-position control', async () => {
    const config = scene();
    config.learnerControls = [{ id: 'starting-x', label: 'Starting X', targetType: 'object', targetId: 'body', property: 'position.x', min: -3, max: 3, step: 6, unit: 'm', value: -3 }];
    const runtime = await SimulationRuntime.create(config);
    expect(runtime.getState().objects.body.x).toBeCloseTo(-3, 6);
    expect(runtime.setParameter('starting-x', 3)).toBe(true);
    expect(runtime.getState().objects.body.x).toBeCloseTo(3, 6);
    runtime.destroy();
  });
  it('supports legacy initial-position and initial-velocity aliases', async () => {
    const config = scene();
    config.learnerControls = [
      { id: 'starting-x', label: 'Starting X', targetType: 'object', targetId: 'body', property: 'initialPositionX', min: -2, max: 2, step: 4, unit: 'm', value: -2 },
      { id: 'launch-x', label: 'Launch X', targetType: 'object', targetId: 'body', property: 'initialVelocityX', min: 0, max: 4, step: 4, unit: 'm/s', value: 4 }
    ];
    const runtime = await SimulationRuntime.create(config);
    expect(runtime.getState().objects.body.x).toBeCloseTo(-2, 6);
    expect(runtime.getState().objects.body.velocity.x).toBeCloseTo(4, 6);
    runtime.destroy();
  });
  it('applies a nested property to every object target', async () => {
    const config = scene();
    config.objects.push({ id: 'second-body', label: 'Second body', shape: 'rectangle', bodyType: 'dynamic', position: { x: 1, y: 2 }, width: 1, height: 1, mass: 2, friction: 0 });
    config.learnerControls = [{ id: 'starting-y', label: 'Starting Y', targetType: 'objects', targetId: 'body, second-body', property: 'position.y', min: 1, max: 3, step: 2, unit: 'm', value: 3 }];
    const runtime = await SimulationRuntime.create(config);
    expect(runtime.getState().objects.body.y).toBeCloseTo(3, 6);
    expect(runtime.getState().objects['second-body'].y).toBeCloseTo(3, 6);
    runtime.destroy();
  });
  it('applies nested initial velocity and existing force and gravity controls', async () => {
    const config = scene();
    config.learnerControls = [
      { id: 'launch-y', label: 'Launch Y', targetType: 'object', targetId: 'body', property: 'initialVelocity.y', min: -3, max: 3, step: 6, unit: 'm/s', value: 3 },
      { id: 'push', label: 'Push', targetType: 'force', targetId: 'push', property: 'magnitude', min: 0, max: 8, step: 8, unit: 'N', value: 8 },
      { id: 'gravity', label: 'Gravity', targetType: 'environment', property: 'gravityMagnitude', min: 0, max: 20, step: 20, unit: 'm/s²', value: 20 }
    ];
    const runtime = await SimulationRuntime.create(config);
    const state = runtime.getState();
    expect(state.objects.body.velocity.y).toBeCloseTo(3, 6);
    expect(state.forces.find((force) => force.id === 'push').vector.x).toBeCloseTo(8, 6);
    expect(state.gravity.y).toBe(-20);
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
  it('exposes visual annotations without adding physics bodies', async () => {
    const config = scene();
    config.environment.coordinateSystem = { axes: true, labels: true };
    config.annotations = [{ id: 'reference', type: 'point', position: { x: 3, y: 1 }, showCoordinates: true }];
    const runtime = await SimulationRuntime.create(config);
    const state = runtime.getState();
    expect(state.annotations).toEqual(config.annotations);
    expect(state.coordinateSystem).toEqual(config.environment.coordinateSystem);
    expect(Object.keys(state.objects)).toHaveLength(2);
    runtime.destroy();
  });
});

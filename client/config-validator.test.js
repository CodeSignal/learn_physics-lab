import { describe, expect, it } from 'vitest';
import { validateScene } from './config-validator.js';
import { SCENES } from './scenes.js';

const baseScene = () => ({
  schemaVersion: 1, id: 'test', title: 'Test',
  environment: { gravity: { x: 0, y: -9.81 }, duration: 5, timestep: 1 / 60, bounds: { left: -4, right: 4, bottom: -4, top: 4 } },
  objects: [], forces: [], learnerControls: [], measurements: []
});

describe('scene configuration', () => {
  it('accepts all supplied mechanics scenes', () => SCENES.forEach(scene => expect(validateScene(scene)).toBe(scene)));
  it('rejects forces with missing targets', () => {
    const scene = baseScene(); scene.objects = [{ id: 'present', shape: 'rectangle', bodyType: 'fixed', position: { x: 0, y: 0 }, width: 1, height: 1 }]; scene.forces = [{ id: 'push', target: 'none', type: 'constant-force', vector: { x: 1, y: 0 } }];
    expect(() => validateScene(scene)).toThrow('unknown force target');
  });
  it('rejects invalid dynamic bodies before they reach the engine', () => {
    const scene = baseScene(); scene.objects = [{ id: 'a', shape: 'rectangle', bodyType: 'dynamic', position: { x: 0, y: 0 }, width: 1, height: 1, mass: 0 }];
    expect(() => validateScene(scene)).toThrow('positive mass');
  });
  it('rejects learner controls that expose an unknown object', () => {
    const scene = baseScene(); scene.objects = [{ id: 'a', shape: 'rectangle', bodyType: 'fixed', position: { x: 0, y: 0 }, width: 1, height: 1 }];
    scene.learnerControls = [{ id: 'bad', targetType: 'object', targetId: 'missing', property: 'mass', min: 1, max: 2, step: 1, value: 1 }];
    expect(() => validateScene(scene)).toThrow('unknown object control target');
  });
});

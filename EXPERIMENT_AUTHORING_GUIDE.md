# Adding a physics experiment

This guide explains how to add a complete experiment to Physics Lab. You do not need prior knowledge of Vite, Rapier, or the application code to create an experiment that uses the currently supported features.

An experiment is a JSON file. The application reads that file, validates it, creates the physics objects, renders them, exposes the controls you configure, and shows the measurements and graph you configure. No HTML, CSS, or JavaScript changes are needed for an ordinary experiment.

## Before you start

Install dependencies and start the app from this folder:

```bash
npm install
npm run dev:vite
```

Open the local URL printed by Vite. Run these checks after adding an experiment:

```bash
npm test
npm run build
```

## The two files you change

1. Create `client/experiments/my-experiment.json`.
2. Import it and add it to `SCENES` in `client/scenes.js`.

For example:

```js
import myExperiment from './experiments/my-experiment.json';

export const SCENES = Object.freeze([
  myExperiment,
]);
```

The order in `SCENES` is the order in the Experiment menu.

## Choose the learner-facing experiment

`client/lab-settings.js` is the application-level settings file. It selects the one experiment shown to learners:

```js
export const labSettings = Object.freeze({
  experimentId: 'my-experiment',
  showExperimentPicker: false,
});
```

Use the JSON scene's `id` as `experimentId`. Set `showExperimentPicker: true` while developing or QA-testing multiple scenes. Set it to `false` for a learner-facing practice: the selected experiment loads directly and the experiment selector is hidden. The application fails visibly at startup if the configured id does not exist, rather than silently showing a different experiment.

## Copyable starter experiment

Copy this into `client/experiments/my-experiment.json`, then change the names, positions, and values to create your experiment.

```json
{
  "schemaVersion": 1,
  "id": "my-experiment",
  "title": "5 · My experiment",
  "description": "Describe what learners can change and observe.",
  "concepts": ["Concept one", "Concept two"],
  "environment": {
    "gravity": { "x": 0, "y": -9.81 },
    "duration": 10,
    "timestep": 0.016666666666666666,
    "bounds": { "left": -8, "right": 8, "bottom": -4, "top": 5 }
  },
  "objects": [
    {
      "id": "floor",
      "label": "Floor",
      "shape": "platform",
      "bodyType": "fixed",
      "position": { "x": 0, "y": -3 },
      "width": 16,
      "height": 0.4,
      "friction": 0.8,
      "render": { "color": "#56627c" }
    },
    {
      "id": "object",
      "label": "Object",
      "shape": "circle",
      "bodyType": "dynamic",
      "position": { "x": -3, "y": 0 },
      "radius": 0.5,
      "mass": 1,
      "friction": 0.2,
      "restitution": 0.2,
      "render": { "color": "#377dff" }
    }
  ],
  "forces": [],
  "learnerControls": [],
  "measurements": [],
  "instrumentation": {
    "recording": { "enabled": true, "sampleInterval": 0.033333333, "maxSamples": 1200 },
    "measurements": [],
    "trails": [],
    "vectors": [],
    "graph": null
  }
}
```

## Coordinate system and units

All physics values use SI units:

| Value | Unit |
| --- | --- |
| Position, dimensions, displacement, distance | metres (`m`) |
| Time | seconds (`s`) |
| Mass | kilograms (`kg`) |
| Velocity | metres per second (`m/s`) |
| Acceleration | metres per second squared (`m/s²`) |
| Force | newtons (`N`) |
| Impulse | newton seconds (`N·s`) |
| Torque | newton metres (`N·m`) |
| Energy | joules (`J`) |
| Angles in object rotation | radians |

World positive X points right and positive Y points up. The canvas flips Y for display automatically. `bounds` set the initial camera framing; they do not restrict the procedural grid or stop bodies from leaving the view.

## Scene fields

Every scene needs the following top-level fields.

| Field | Required | Purpose |
| --- | --- | --- |
| `schemaVersion` | Yes | Use `1`. |
| `id` | Yes | Unique kebab-case experiment identifier. |
| `title` | Yes | Menu/display title. Prefix with a number to control visible order. |
| `description` | Recommended | Explains the experiment and appears in the UI. |
| `concepts` | Recommended | Short conceptual tags retained for future use. |
| `environment` | Yes | Gravity, duration, fixed physics time step, and initial bounds. |
| `objects` | Yes | At least one body. |
| `forces` | No | Forces, torques, and impulses. |
| `learnerControls` | No | The only properties learners may alter. |
| `measurements` | No | Legacy live-value configuration; preserve it when editing older scenes. |
| `instrumentation` | Recommended | Modern values, recording, trails, vectors, and graph. |

Use a fixed `timestep` of `0.016666666666666666` (1/60 second) unless there is a concrete reason to change it. A larger step makes contacts and impacts less stable.

## Objects

Each object must have a unique `id`, a `shape`, a `bodyType`, and a centre `position`.

### Supported shapes

| Shape | Required dimensions | Typical use |
| --- | --- | --- |
| `circle` | `radius` | Balls, disks, projectiles. |
| `rectangle` | `width`, `height` | Blocks and boxes. |
| `platform` | `width`, `height` | Fixed floor or wall; physically a rectangle. |
| `ramp` | `width`, `height` | Fixed inclined surface; physically a rectangle. |

### Supported body types

| Type | Behaviour |
| --- | --- |
| `dynamic` | Moved by gravity, forces, impulses, and collisions. Requires positive `mass`. |
| `fixed` | Does not move; use for floors, ramps, and targets. |
| `kinematic` | Application-positioned body; currently use only if you later add runtime support for moving it. |

Common optional object properties are `rotation` (radians), `friction`, `restitution` (bounce, 0–1), `linearDamping`, `angularDamping`, `initialVelocity`, `initialAngularVelocity`, and `render.color`.

```json
{
  "id": "ball",
  "label": "Launch ball",
  "shape": "circle",
  "bodyType": "dynamic",
  "position": { "x": -2, "y": 0 },
  "radius": 0.45,
  "mass": 1,
  "friction": 0.2,
  "restitution": 0.35,
  "initialVelocity": { "x": 4, "y": 7 },
  "render": { "color": "#a33ad8" }
}
```

Place bodies so their colliders do not overlap at time zero. For a horizontal floor at height `y`, put a circle centre at least `floor y + floor height/2 + radius` and a rectangle centre at least `floor y + floor height/2 + rectangle height/2`. Align a block's `rotation` with a ramp when it should begin resting on that ramp.

## Forces, torque, and impulse

Every force needs a unique `id`, `target` object id, and `type`.

### Continuous force

Applied on every physics step while the simulation runs:

```json
{ "id": "push", "target": "block", "type": "constant-force", "vector": { "x": 16, "y": 0 }, "continuous": true }
```

### One-time impulse

Applied once when the simulation begins. Use `N·s`, not `N`. It is useful for launches and collisions.

```json
{ "id": "launch", "target": "ball", "type": "impulse", "vector": { "x": 9, "y": 8 }, "continuous": false }
```

### Continuous torque

```json
{ "id": "motor", "target": "wheel", "type": "constant-torque", "torque": 2, "continuous": true }
```

Configured impulse arrows become dashed after firing so they are visually distinct from active forces.

## Learner controls

Controls create sliders and are the only configuration values learners can change. Each needs `id`, `label`, `targetType`, `targetId` where applicable, `property`, `min`, `max`, `step`, `unit`, and `value`.

### Force magnitude and angle

```json
{ "id": "force", "label": "Applied force", "targetType": "force", "targetId": "push", "property": "magnitude", "min": 0, "max": 50, "step": 1, "unit": "N", "value": 16 }
{ "id": "angle", "label": "Launch angle", "targetType": "force", "targetId": "launch", "property": "angle", "min": 15, "max": 75, "step": 1, "unit": "°", "value": 40 }
```

`angle` is configured in degrees and rotates the force/impulse vector while preserving its magnitude.

### Object and environment controls

```json
{ "id": "mass", "label": "Mass", "targetType": "object", "targetId": "block", "property": "mass", "min": 1, "max": 15, "step": 0.5, "unit": "kg", "value": 5 }
{ "id": "bounce", "label": "Restitution", "targetType": "objects", "targetId": "a,b", "property": "restitution", "min": 0, "max": 1, "step": 0.05, "unit": "e", "value": 0.5 }
{ "id": "gravity", "label": "Gravity", "targetType": "environment", "property": "gravityMagnitude", "min": 0, "max": 20, "step": 0.5, "unit": "m/s²", "value": 9.8 }
```

Changing a control resets the simulation with the selected values. Supported custom object property handling is currently `initialVelocityX`; ordinary properties such as `mass`, `friction`, and `restitution` are applied directly.

## Instrumentation

Use `instrumentation` for modern learner-facing values, history, trails, vectors, and one graph. Only explicitly configured instruments appear.

### Recording

```json
"recording": {
  "enabled": true,
  "sampleInterval": 0.033333333,
  "maxSamples": 1200
}
```

Sampling is tied to physics time, so rendering frame rate does not change the measurement timeline. When the limit is reached, the oldest samples are discarded. Reset clears history and trails; pause preserves them.

### Measurements

```json
"measurements": [
  {
    "id": "ball-vy",
    "target": "ball",
    "quantity": "velocity.y",
    "label": "Vertical velocity",
    "display": "both"
  }
]
```

`display` is `value`, `graph`, `both`, or `hidden`. `value`/`both` appear in live measurements; `graph`, `both`, and `hidden` can be recorded for the configured graph.

Supported quantities:

| Category | Quantity ids |
| --- | --- |
| Position/displacement | `position.x`, `position.y`, `displacement.x`, `displacement.y`, `displacement`, `distance` |
| Motion | `velocity.x`, `velocity.y`, `speed`, `angle`, `angularVelocity`, `acceleration.x`, `acceleration.y`, `acceleration` |
| Dynamics | `mass`, `appliedForce.x`, `appliedForce.y`, `appliedForce`, `appliedTorque`, `momentum.x`, `momentum.y`, `momentum`, `angularMomentum` |
| Energy | `kineticEnergy`, `rotationalKineticEnergy`, `totalKineticEnergy`, `potentialEnergy`, `mechanicalEnergy` |
| Time | `time` |

Acceleration is estimated from the change in velocity between fixed physics samples, so collision values can be noisy. `appliedForce` is only the configured continuous external force. The application deliberately does not expose a so-called net force because Rapier contact impulses are not reported as a simple reliable force. Potential energy uses `-m g·(r-r₀)` and `instrumentation.referenceHeight` as `r₀` (0 by default). Angular momentum is about the body's centre of mass.

### Motion trails

```json
"trails": [
  {
    "target": "ball",
    "enabled": true,
    "sampleInterval": 0.016666667,
    "maxPoints": 500,
    "fade": true
  }
]
```

Trail points are stored in world coordinates, so they stay correct while panning and zooming. Trails are dotted, semi-transparent versions of the tracked object's render color. `color` may still be included for future uses, but the object color is the displayed color.

### Vectors

```json
"vectors": [
  { "target": "ball", "quantity": "velocity", "enabled": true, "color": "#0b8f72", "scale": 0.3 }
]
```

The currently supported configured vector quantity is `velocity`. It remains attached to the body and scales with the camera. Configured force and impulse arrows are rendered automatically from `forces`.

### Graph

There is one graph per experiment, displayed directly in the graph panel. It must reference configured measurement ids.

```json
"graph": {
  "id": "projectile-velocity",
  "type": "line",
  "title": "Velocity vs. time",
  "series": ["ball-vx", "ball-vy"],
  "yAxis": "Velocity (m/s)"
}
```

Supported graph `type` values are `line`, `bar`, and `scatter`. Line graphs are the usual choice for measurements over time.

## A complete projectile example

Use the starter configuration above as the basis for an experiment with an impulse, magnitude and angle controls, a trail, velocity vector, history recording, values, and a graph.

## Troubleshooting checklist

1. Run `npm test`; the validator reports invalid ids, dimensions, force targets, controls, instrumentation targets, quantities, and graphs.
2. Confirm every object and force id is unique.
3. Confirm every `target`, `targetId`, trail target, vector target, and graph series id exists.
4. Check object dimensions are positive and dynamic bodies have positive mass.
5. Check `min`, `max`, `value`, and `step` for every control. The value must be exactly reachable from `min` using `step`.
6. If a scene starts by jumping, separate overlapping colliders or align resting bodies with the surface.
7. If an object vanishes, increase initial `environment.bounds` or pan/zoom the canvas.
8. If a graph is empty, confirm recording is enabled and each graph series is configured with `display: "graph"`, `"both"`, or `"hidden"`.

## When code changes are required

JSON is enough for supported bodies, forces, controls, measurements, trails, velocity vectors, and graphs. Change application code only to add a new capability:

- Add a shape: update `client/scene-builder.js`, `client/canvas-renderer.js`, and `client/config-validator.js`.
- Add a measurement: register it in `client/instrumentation/measurement-registry.js`, give it an SI unit and a scientifically defined calculation, then add tests.
- Add a new vector quantity: extend `client/canvas-renderer.js` using state supplied by the instrumentation layer.
- Add a control behavior: extend `SimulationRuntime.applyControl()` and validation/tests.

Keep the simulation runtime responsible for physics, the instrumentation layer responsible for observation/history, and the renderer responsible only for drawing. This separation keeps experiments reusable and prevents visual code from changing physics.

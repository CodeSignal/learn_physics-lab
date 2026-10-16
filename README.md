# Physics Lab

Physics Lab is a browser-based, configuration-driven collection of interactive
2D mechanics experiments. Learners adjust the parameters chosen by an author,
run a Rapier physics simulation, inspect live measurements, and view the one
graph configured for that experiment.

The application uses Vite, vanilla JavaScript modules, Canvas 2D, Rapier 2D,
and Chart.js. It does not require a backend for the simulation itself.

## Included experiments

- Horizontal applied force
- Block on an inclined plane
- Two-body collision lab
- Projectile launch

While authoring, the experiment picker is visible. A production practice loads
one selected experiment only, with no learner-facing picker.

## Run locally

Use Node.js 22.13.1 or a compatible current Node 22 release.

```bash
npm install
npm run dev:vite -- --port 3000
```

Open [http://localhost:3000](http://localhost:3000). The usual quality checks
are:

```bash
npm test
npm run build
```

`npm run start:prod` serves a completed production build. `npm run start:dev`
also starts the template's WebSocket server; it is not needed for normal
physics-lab development.

## What learners can do

- Change only the sliders and values explicitly exposed by the experiment.
- Click a displayed slider value to type an exact number; press Enter or click
  away to apply it.
- Run, pause, reset, or run again after a simulation completes.
- Pan the canvas and zoom with a mouse wheel or trackpad pinch gesture.
- Use **Center view** to restore the experiment's initial camera framing.
- Observe dotted, translucent motion trails, force/velocity vectors, live
  measurement values, and the experiment's configured chart.

## How it works

```text
Experiment JSON
  -> configuration validation
  -> Rapier bodies, colliders, and forces
  -> fixed-timestep simulation runtime
  -> Canvas renderer + controls + instrumentation + chart
```

All experiment definitions live in `client/experiments/`. The shared runtime
means an ordinary new experiment is authored as configuration, rather than as
a new UI or JavaScript implementation.

| Location | Responsibility |
| --- | --- |
| `client/lab-settings.js` | Selects the production experiment and whether the authoring picker is visible. |
| `client/scenes.js` | Imports the available experiment JSON files. |
| `client/experiments/*.json` | Experiment physics, objects, learner controls, measurements, trails, vectors, and graph settings. |
| `client/config-validator.js` | Validates scene configuration before it is used. |
| `client/scene-builder.js` | Converts scene objects into Rapier bodies and colliders. |
| `client/simulation-runtime.js` | Runs the fixed-step physics loop, controls forces and reset behavior, and exposes state. |
| `client/canvas-renderer.js` | Draws the responsive, panable, zoomable world grid and physics objects. |
| `client/instrumentation/` | Records samples, produces live measurements, and renders the configured Chart.js graph. |
| `client/app.js` | Connects the selected scene, controls, simulation, renderer, and page. |

## Configure a learner-facing practice

Set the scene ID in `client/lab-settings.js` and hide the picker:

```js
export const labSettings = Object.freeze({
  experimentId: 'projectile-launch',
  showExperimentPicker: false,
});
```

The ID must match an experiment registered in `client/scenes.js`. Keeping
`showExperimentPicker: true` is useful when testing multiple experiments.

## Add an experiment

The complete beginner-friendly authoring guide is in
[EXPERIMENT_AUTHORING_GUIDE.md](EXPERIMENT_AUTHORING_GUIDE.md). It covers the
JSON schema, coordinate system and units, supported objects and forces,
learner controls, measurements, trails, vectors, and graph configuration.

At a high level:

1. Add `client/experiments/my-experiment.json`.
2. Import and add it to `SCENES` in `client/scenes.js`.
3. Set its `id` as `experimentId` in `client/lab-settings.js`.
4. Test it in the browser, then run `npm test` and `npm run build`.

World values use SI units: metres, seconds, kilograms, newtons, joules, and
radians. Positive X points right and positive Y points up. Dynamic bodies are
authored to start at `y: 0`; single-object experiments also start at `x: 0`.

## Build and release

`.github/workflows/build-release.yml` runs on each push to `main`. It
initializes the design-system submodule, installs dependencies, builds the
project, packages `dist/` with the production server dependencies, and
publishes `release.tar.gz` as a GitHub Release asset tagged with the workflow
run number.

## Notes and limits

- Rapier uses a numerical rigid-body solver. Contacts and static friction can
  differ slightly from idealized textbook calculations.
- Displayed acceleration is derived from fixed-step velocity changes.
- Applied force represents configured external forces; it does not attempt to
  infer every contact force from the solver.
- The supported authoring primitives are circles, rectangles, platforms, and
  ramps, with dynamic, fixed, or kinematic bodies. Joints, ropes, and custom
  analytic solvers are outside the current scope.

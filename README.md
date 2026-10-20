# Physics Lab

Physics Lab is a browser-based, configuration-driven collection of interactive
2D mechanics experiments. Learners adjust the parameters chosen by an author,
run a Rapier physics simulation, inspect live measurements, and view the one
graph configured for that experiment.

The application uses Vite, vanilla JavaScript modules, Canvas 2D, Rapier 2D,
and Chart.js. It does not require a backend for the simulation itself.

## Starter repository

This repository intentionally includes no learner-facing experiments. Every
release contains a `runtime-config.example/` template. On its first start, the
server copies it to a user-owned `runtime-config/` folder. Create experiments
there after extracting the release; later release updates do not overwrite that
folder.

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

In a release, experiment definitions live in `runtime-config/experiments/` and
are loaded over HTTP when the application starts. The shared runtime means an
ordinary new experiment is authored as configuration, rather than as a new UI
or JavaScript implementation.

| Location | Responsibility |
| --- | --- |
| `runtime-config.example/` | Versioned template copied once into user-owned runtime configuration. |
| `runtime-config/` | Ignored, user-owned settings and experiment JSON files. Never included in a release archive. |
| `client/config-validator.js` | Validates scene configuration before it is used. |
| `client/scene-builder.js` | Converts scene objects into Rapier bodies and colliders. |
| `client/simulation-runtime.js` | Runs the fixed-step physics loop, controls forces and reset behavior, and exposes state. |
| `client/canvas-renderer.js` | Draws the responsive, panable, zoomable world grid and physics objects. |
| `client/instrumentation/` | Records samples, produces live measurements, and renders the configured Chart.js graph. |
| `client/app.js` | Connects the selected scene, controls, simulation, renderer, and page. |

## Configure a learner-facing practice

Set the scene path and ID in `runtime-config/physics-lab.settings.json` and hide the picker:

```json
{
  "experimentPath": "./experiments/my-experiment.json",
  "experimentId": "my-experiment",
  "showExperimentPicker": false
}
```

The ID must match the `id` inside that JSON experiment. To test several
experiments, use an `experimentPaths` array and set `showExperimentPicker` to
`true`.

## Add an experiment

The complete beginner-friendly authoring guide is in
[EXPERIMENT_AUTHORING_GUIDE.md](EXPERIMENT_AUTHORING_GUIDE.md). It covers the
JSON schema, coordinate system and units, supported objects and forces,
learner controls, measurements, trails, vectors, and graph configuration.

At a high level:

1. Copy `runtime-config.example/` to `runtime-config/` if it does not already exist.
2. Add `runtime-config/experiments/my-experiment.json`.
3. Set its path and ID in `runtime-config/physics-lab.settings.json`.
4. Test it in the browser, then run `npm test` and `npm run build` when working from source.

## Run an extracted release

After extracting `release.tar.gz`, work from the release root, not from its
`dist/` folder:

```bash
cd bespoke-simulation
npm run start:prod
```

On first start, the server creates `runtime-config/` from the included template.
Then add an experiment JSON file to `runtime-config/experiments/` and point
`runtime-config/physics-lab.settings.json` at it. The production server serves
that folder at `/runtime-config/`.

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

// Vite discovers every experiment configuration at build time. Add a JSON file
// to client/experiments/; no registry edit is required.
const experimentModules = import.meta.glob('./experiments/*.json', {
  eager: true,
  import: 'default',
});

export const SCENES = Object.freeze(
  Object.entries(experimentModules)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .map(([, scene]) => scene),
);

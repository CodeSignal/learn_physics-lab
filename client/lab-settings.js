// Select an experiment ID after adding one to client/experiments. Leave null
// for the intentionally empty starter state.
export const labSettings = Object.freeze({
  experimentId: null,
  // Keep true while authoring or testing several scenes. Set false for a learner-facing practice.
  showExperimentPicker: true,
});

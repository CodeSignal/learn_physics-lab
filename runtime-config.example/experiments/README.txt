Add experiment JSON files to this folder. This directory is user-owned and is
not replaced when a new Physics Lab release is extracted.

Then edit ../physics-lab.settings.json. For one learner-facing experiment:

{
  "experimentPath": "./experiments/my-experiment.json",
  "experimentId": "my-experiment",
  "showExperimentPicker": false
}

See EXPERIMENT_AUTHORING_GUIDE.md in the release root for the JSON schema.

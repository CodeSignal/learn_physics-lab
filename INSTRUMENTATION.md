# Scientific instrumentation

Scenes may opt into instrumentation with an `instrumentation` object. Each measurement declares an `id`, a target body, a registry `quantity`, and a display mode: `value`, `graph`, `both`, or `hidden`. Recording is sampled in simulation time—not animation-frame time—and uses a rolling window once `maxSamples` is reached.

Supported quantities include position and displacement, distance traveled, velocity and speed, angular position/velocity, estimated acceleration, mass, configured continuous applied force/torque, linear/angular momentum, translational/rotational kinetic energy, gravitational potential energy, mechanical energy, and time. Potential energy is `-m·g·(r-r₀)` with `r₀` at `referenceHeight` (default 0). Acceleration is a finite-difference estimate and can be noisy during impacts. Contact forces are not exposed as “net force”; `appliedForce` only represents configured continuous external forces.

`trails` record world-coordinate points at their own bounded interval. `vectors` currently supports velocity arrows. Configured impulse arrows are dashed after firing so they are not confused with an active force.

`graph` references measurement ids and is rendered by Chart.js from recorded history. Each experiment declares the graph `type` (currently `line`, `bar`, or `scatter`) and one graph is shown directly in the instrument panel. Reset clears history and trails; pause does not advance physics or produce samples.

To add a quantity, register it in `client/instrumentation/measurement-registry.js`, including its label, SI unit, and calculation. Add schema validation if it needs new configuration fields.

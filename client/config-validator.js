import { hasQuantity } from './instrumentation/measurement-registry.js';
const bodyTypes = new Set(['dynamic', 'fixed', 'kinematic']);
const shapes = new Set(['rectangle', 'circle', 'platform', 'ramp']);
const forceTypes = new Set(['constant-force', 'constant-torque', 'impulse']);
const annotationTypes = new Set(['text', 'point', 'line']);
const textAlignments = new Set(['left', 'center', 'right']);
const numeric = value => Number.isFinite(value);
const positive = value => numeric(value) && value > 0;
const error = (id, message) => new Error(id + ': ' + message);
const validPosition = position => numeric(position?.x) && numeric(position?.y);

export function validateScene(scene) {
  if (!scene || scene.schemaVersion !== 1 || typeof scene.id !== 'string' || !scene.id) throw new Error('Scene requires schemaVersion 1 and a unique id.');
  if (!Array.isArray(scene.objects) || !scene.objects.length) throw error(scene.id, 'objects must be a non-empty array.');
  const environment = scene.environment;
  if (!environment || !numeric(environment.gravity?.x) || !numeric(environment.gravity?.y)) throw error(scene.id, 'environment.gravity must be a finite vector.');
  if (!positive(environment.timestep) || !positive(environment.duration)) throw error(scene.id, 'duration and timestep must be positive.');
  const bounds = environment.bounds;
  if (!bounds || !numeric(bounds.left) || !numeric(bounds.right) || !numeric(bounds.bottom) || !numeric(bounds.top) || bounds.left >= bounds.right || bounds.bottom >= bounds.top) throw error(scene.id, 'bounds must be valid.');
  const coordinateSystem = environment.coordinateSystem;
  if (coordinateSystem != null) {
    if (typeof coordinateSystem !== 'object' || Array.isArray(coordinateSystem)) throw error(scene.id, 'coordinateSystem must be an object.');
    ['enabled', 'grid', 'axes', 'labels'].forEach((key) => { if (coordinateSystem[key] != null && typeof coordinateSystem[key] !== 'boolean') throw error(scene.id, `coordinateSystem.${key} must be true or false.`); });
    if (coordinateSystem.step != null && !positive(coordinateSystem.step)) throw error(scene.id, 'coordinateSystem.step must be positive.');
  }
  const objectIds = new Set();
  scene.objects.forEach(object => {
    if (!object.id || objectIds.has(object.id)) throw error(scene.id, 'object ids must be unique.');
    objectIds.add(object.id);
    if (!bodyTypes.has(object.bodyType)) throw error(object.id, 'invalid body type.');
    if (!shapes.has(object.shape)) throw error(object.id, 'unsupported shape.');
    if (!numeric(object.position?.x) || !numeric(object.position?.y)) throw error(object.id, 'position is required.');
    if (object.shape === 'circle' ? !positive(object.radius) : !(positive(object.width) && positive(object.height))) throw error(object.id, 'dimensions must be positive.');
    if (object.bodyType === 'dynamic' && !positive(object.mass)) throw error(object.id, 'dynamic objects require a positive mass.');
    ['friction', 'restitution', 'rotation', 'linearDamping', 'angularDamping'].forEach(key => { if (object[key] != null && !numeric(object[key])) throw error(object.id, key + ' must be finite.'); });
  });
  const forceIds = new Set();
  (scene.forces || []).forEach(force => {
    if (!force.id || forceIds.has(force.id)) throw error(scene.id, 'force ids must be unique.');
    forceIds.add(force.id);
    if (!objectIds.has(force.target)) throw error(force.id, 'unknown force target.');
    if (!forceTypes.has(force.type)) throw error(force.id, 'unsupported force type.');
    if (force.type === 'constant-torque' ? !numeric(force.torque) : !numeric(force.vector?.x) || !numeric(force.vector?.y)) throw error(force.id, 'invalid force value.');
  });
  const annotationIds = new Set();
  (scene.annotations || []).forEach((annotation, index) => {
    const label = annotation?.id || `annotation ${index + 1}`;
    if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) throw error(scene.id, `${label} must be an object.`);
    if (annotation.id != null && (typeof annotation.id !== 'string' || !annotation.id || annotationIds.has(annotation.id))) throw error(scene.id, 'annotation ids must be unique non-empty strings.');
    if (annotation.id) annotationIds.add(annotation.id);
    if (!annotationTypes.has(annotation.type)) throw error(label, 'unsupported annotation type.');
    if (annotation.type === 'line') {
      if (!validPosition(annotation.from) || !validPosition(annotation.to)) throw error(label, 'line annotations require finite from and to positions.');
    } else {
      if (!validPosition(annotation.position)) throw error(label, 'annotations require a finite position.');
      if (annotation.type === 'text' && (typeof annotation.text !== 'string' || !annotation.text.trim())) throw error(label, 'text annotations require non-empty text.');
      if (annotation.type === 'point' && annotation.radius != null && !positive(annotation.radius)) throw error(label, 'point radius must be positive.');
      if (annotation.type === 'point' && annotation.showCoordinates != null && typeof annotation.showCoordinates !== 'boolean') throw error(label, 'showCoordinates must be true or false.');
    }
    if (annotation.color != null && typeof annotation.color !== 'string') throw error(label, 'annotation color must be a string.');
    if (annotation.label != null && typeof annotation.label !== 'string') throw error(label, 'annotation label must be a string.');
    if (annotation.dashed != null && typeof annotation.dashed !== 'boolean') throw error(label, 'annotation dashed must be true or false.');
    if (annotation.fontSize != null && (!positive(annotation.fontSize) || annotation.fontSize > 72)) throw error(label, 'annotation fontSize must be between 0 and 72.');
    if (annotation.align != null && !textAlignments.has(annotation.align)) throw error(label, 'annotation align must be left, center, or right.');
    if (annotation.offset != null && !validPosition(annotation.offset)) throw error(label, 'annotation offset must be a finite vector.');
    if (annotation.lineWidth != null && !positive(annotation.lineWidth)) throw error(label, 'annotation lineWidth must be positive.');
  });
  const controlIds = new Set();
  (scene.learnerControls || []).forEach(control => {
    if (!control.id || controlIds.has(control.id)) throw error(scene.id, 'learner control ids must be unique.');
    controlIds.add(control.id);
    if (!(positive(control.step) && numeric(control.min) && numeric(control.max) && numeric(control.value) && control.min <= control.value && control.value <= control.max && Math.abs((control.value - control.min) / control.step - Math.round((control.value - control.min) / control.step)) < 1e-8)) throw error(control.id, 'invalid learner-control range.');
    if (control.targetType === 'force' && !forceIds.has(control.targetId)) throw error(control.id, 'unknown force control target.');
    if (['object', 'objects'].includes(control.targetType) && !control.targetId.split(',').every(id => objectIds.has(id))) throw error(control.id, 'unknown object control target.');
    if (!['force', 'object', 'objects', 'environment'].includes(control.targetType)) throw error(control.id, 'unsupported learner-control target.');
  });
  (scene.measurements || []).forEach(measurement => { if (!objectIds.has(measurement.objectId) || !measurement.property || !measurement.unit) throw error(scene.id, 'invalid measurement.'); });
  const instruments = scene.instrumentation;
  if (instruments) {
    if (instruments.recording && (!(positive(instruments.recording.sampleInterval)) || !Number.isInteger(instruments.recording.maxSamples) || instruments.recording.maxSamples < 1)) throw error(scene.id, 'invalid instrumentation recording configuration.');
    (instruments.measurements || []).forEach((measurement) => { if (!measurement.id || !objectIds.has(measurement.target) || !hasQuantity(measurement.quantity) || !['value', 'graph', 'both', 'hidden'].includes(measurement.display || 'value')) throw error(scene.id, 'invalid instrumentation measurement.'); });
    (instruments.trails || []).forEach((trail) => { if (!objectIds.has(trail.target) || (trail.sampleInterval != null && !positive(trail.sampleInterval)) || (trail.maxPoints != null && (!Number.isInteger(trail.maxPoints) || trail.maxPoints < 1))) throw error(scene.id, 'invalid instrumentation trail.'); });
    const ids = new Set((instruments.measurements || []).map((measurement) => measurement.id));
    if (instruments.graph && (!['line', 'bar', 'scatter'].includes(instruments.graph.type) || !instruments.graph.id || !Array.isArray(instruments.graph.series) || !instruments.graph.series.length || instruments.graph.series.some((id) => !ids.has(id)))) throw error(scene.id, 'invalid instrumentation graph.');
  }
  return scene;
}

const objectPropertyAliases = new Map([
  ['initialPositionX', 'position.x'],
  ['initialPositionY', 'position.y'],
  ['initialVelocityX', 'initialVelocity.x'],
  ['initialVelocityY', 'initialVelocity.y'],
]);

const objectProperties = new Set([
  'position.x', 'position.y',
  'initialVelocity.x', 'initialVelocity.y', 'initialAngularVelocity',
  'rotation', 'mass', 'friction', 'restitution',
  'linearDamping', 'angularDamping', 'width', 'height', 'radius',
]);
const vectorForceProperties = new Set(['magnitude', 'angle', 'vector.x', 'vector.y']);
const torqueForceProperties = new Set(['torque']);
const environmentProperties = new Set(['gravityMagnitude', 'gravity.x', 'gravity.y']);

export function normalizedControlProperty(control) {
  const property = control?.property;
  if (typeof property !== 'string') return null;
  return control.targetType === 'object' || control.targetType === 'objects'
    ? objectPropertyAliases.get(property) || property
    : property;
}

export function objectPropertyIsSupported(object, property) {
  if (!objectProperties.has(property)) return false;
  if (property === 'radius') return object.shape === 'circle';
  if (property === 'width' || property === 'height') return object.shape !== 'circle';
  if (property === 'mass') return object.bodyType === 'dynamic';
  return true;
}

export function controlPropertyIsSupported(control, targets = []) {
  const property = normalizedControlProperty(control);
  if (!property) return false;
  if (control.targetType === 'object' || control.targetType === 'objects') {
    return targets.every((object) => objectPropertyIsSupported(object, property));
  }
  if (control.targetType === 'force') {
    return targets.every((force) => force.type === 'constant-torque'
      ? torqueForceProperties.has(property)
      : vectorForceProperties.has(property));
  }
  return control.targetType === 'environment' && environmentProperties.has(property);
}

export function splitControlTargetIds(targetId) {
  return typeof targetId === 'string'
    ? targetId.split(',').map((id) => id.trim()).filter(Boolean)
    : [];
}

export function setNumericPath(target, property, value) {
  const parts = property.split('.');
  let current = target;
  parts.slice(0, -1).forEach((part) => {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    current = current[part];
  });
  current[parts.at(-1)] = value;
}

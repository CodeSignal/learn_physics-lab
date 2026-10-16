import RAPIER from '@dimforge/rapier2d-compat';
import { validateScene } from './config-validator.js';
const clone = value => structuredClone(value);
export class SceneBuilder {
  constructor(config) { this.config = clone(validateScene(config)); this.bodies = new Map(); this.colliders = new Map(); }
  build() { const { gravity, timestep } = this.config.environment; this.world = new RAPIER.World(gravity); this.world.timestep = timestep; this.config.objects.forEach(object => this.createObject(object)); return this; }
  createObject(object) {
    const desc = (object.bodyType === 'fixed' ? RAPIER.RigidBodyDesc.fixed() : object.bodyType === 'kinematic' ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.dynamic()).setTranslation(object.position.x, object.position.y).setRotation(object.rotation || 0);
    if (object.initialVelocity) desc.setLinvel(object.initialVelocity.x || 0, object.initialVelocity.y || 0);
    if (object.initialAngularVelocity) desc.setAngvel(object.initialAngularVelocity);
    if (object.linearDamping != null) desc.setLinearDamping(object.linearDamping);
    if (object.angularDamping != null) desc.setAngularDamping(object.angularDamping);
    const body = this.world.createRigidBody(desc);
    const collider = object.shape === 'circle' ? RAPIER.ColliderDesc.ball(object.radius) : RAPIER.ColliderDesc.cuboid(object.width / 2, object.height / 2);
    collider.setFriction(object.friction ?? .5).setRestitution(object.restitution ?? 0);
    if (object.bodyType === 'dynamic') { const area = object.shape === 'circle' ? Math.PI * object.radius ** 2 : object.width * object.height; collider.setDensity(object.mass / area); }
    this.colliders.set(object.id, this.world.createCollider(collider, body)); this.bodies.set(object.id, body);
  }
  state() { const objects = {}; this.config.objects.forEach(object => { const body = this.bodies.get(object.id), p = body.translation(), v = body.linvel(); objects[object.id] = { ...object, x: p.x, y: p.y, rotation: body.rotation(), angularVelocity: body.angvel(), velocity: { x: v.x, y: v.y }, mass: object.mass || 0 }; }); return objects; }
  destroy() { this.world?.free(); this.world = null; this.bodies.clear(); this.colliders.clear(); }
}

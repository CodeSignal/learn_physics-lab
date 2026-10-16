export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = null;
    this.drag = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    canvas.addEventListener('wheel', (event) => this.zoomAt(event), { passive: false });
    canvas.addEventListener('pointerdown', (event) => this.startPan(event));
    canvas.addEventListener('pointermove', (event) => this.pan(event));
    canvas.addEventListener('pointerup', () => this.endPan());
    canvas.addEventListener('pointercancel', () => this.endPan());
    this.resize();
  }

  resize() {
    const ratio = devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const width = parent.clientWidth;
    const height = Math.max(1, parent.clientHeight);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.ceil(width * ratio);
    this.canvas.height = Math.ceil(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  startPan(event) { this.drag = { x: event.clientX, y: event.clientY }; this.canvas.setPointerCapture(event.pointerId); }
  pan(event) {
    if (!this.drag || !this.view) return;
    this.view.centerX -= (event.clientX - this.drag.x) / this.view.scale;
    this.view.centerY += (event.clientY - this.drag.y) / this.view.scale;
    this.drag = { x: event.clientX, y: event.clientY };
  }
  endPan() { this.drag = null; }

  zoomAt(event) {
    if (!this.view) return;
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const before = this.toWorld(x, y);
    const sensitivity = event.ctrlKey ? 0.025 : 0.006;
    this.view.scale = Math.min(500, Math.max(12, this.view.scale * Math.exp(-event.deltaY * sensitivity)));
    const after = this.toWorld(x, y);
    this.view.centerX += before.x - after.x;
    this.view.centerY += before.y - after.y;
  }

  toWorld(x, y) { return { x: this.view.centerX + (x - this.canvas.clientWidth / 2) / this.view.scale, y: this.view.centerY - (y - this.canvas.clientHeight / 2) / this.view.scale }; }
  gridStep() {
    const raw = 56 / this.view.scale, power = 10 ** Math.floor(Math.log10(raw)), unit = raw / power;
    return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * power;
  }

  starterScale(bounds) {
    return Math.min(this.canvas.clientWidth / (bounds.right - bounds.left), this.canvas.clientHeight / (bounds.top - bounds.bottom));
  }

  centerOnObject(state) {
    const target = Object.values(state.objects).find((object) => object.bodyType === 'dynamic');
    if (!target) return;
    this.view = { centerX: target.x, centerY: target.y, scale: this.starterScale(state.bounds) };
  }

  render(state) {
    const { ctx, canvas } = this;
    const w = canvas.clientWidth, h = canvas.clientHeight, b = state.bounds;
    if (!this.view) this.view = { centerX: (b.left + b.right) / 2, centerY: (b.bottom + b.top) / 2, scale: this.starterScale(b) };
    const point = (x, y) => [(x - this.view.centerX) * this.view.scale + w / 2, h / 2 - (y - this.view.centerY) * this.view.scale];
    const visible = { left: this.view.centerX - w / 2 / this.view.scale, right: this.view.centerX + w / 2 / this.view.scale, bottom: this.view.centerY - h / 2 / this.view.scale, top: this.view.centerY + h / 2 / this.view.scale };

    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#f9fbff'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(105,124,166,.13)'; ctx.lineWidth = 1;
    const step = this.gridStep();
    for (let x = Math.ceil(visible.left / step) * step; x <= visible.right; x += step) { const [sx] = point(x, 0); ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke(); }
    for (let y = Math.ceil(visible.bottom / step) * step; y <= visible.top; y += step) { const [, sy] = point(0, y); ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke(); }
    state.trails.forEach((trail) => { if (trail.points.length < 2) return; const parent = state.objects[trail.target]; ctx.save(); ctx.strokeStyle = parent?.render?.color || trail.color || '#38bdf8'; ctx.lineWidth = 2; ctx.globalAlpha = .48; ctx.setLineDash([3, 5]); ctx.beginPath(); trail.points.forEach((p, index) => { const [x, y] = point(p.x, p.y); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); });

    Object.values(state.objects).forEach((o) => {
      const [x, y] = point(o.x, o.y);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-o.rotation); ctx.fillStyle = o.render?.color || '#377dff'; ctx.strokeStyle = o.bodyType === 'fixed' ? '#34415f' : '#173b85'; ctx.lineWidth = 2;
      if (o.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, o.radius * this.view.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(-o.width * this.view.scale / 2, -o.height * this.view.scale / 2, o.width * this.view.scale, o.height * this.view.scale); ctx.strokeRect(-o.width * this.view.scale / 2, -o.height * this.view.scale / 2, o.width * this.view.scale, o.height * this.view.scale); }
      ctx.restore();
      if (o.bodyType === 'dynamic') { ctx.fillStyle = '#29385b'; ctx.font = '12px Work Sans'; ctx.fillText(o.label, x - 22, y - (o.height || o.radius * 2) * this.view.scale / 2 - 10); }
    });
    state.forces.forEach((force) => {
      const o = state.objects[force.target];
      if (!o || !force.vector || !Math.hypot(force.vector.x, force.vector.y)) return;
      const [centerX, centerY] = point(o.x, o.y);
      const angle = Math.atan2(-force.vector.y, force.vector.x);
      const objectRadius = o.shape === 'circle' ? o.radius * this.view.scale : Math.max(o.width, o.height) * this.view.scale / 2;
      const length = Math.min(240, Math.max(18, Math.hypot(force.vector.x, force.vector.y) * this.view.scale * 0.12));
      const x = centerX + Math.cos(angle) * objectRadius, y = centerY + Math.sin(angle) * objectRadius;
      const headLength = 10; ctx.save(); ctx.strokeStyle = '#e53600'; ctx.fillStyle = '#e53600'; ctx.lineWidth = 3; if (force.type === 'impulse' && state.appliedImpulses?.has(force.id)) ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * Math.max(0, length - headLength), y + Math.sin(angle) * Math.max(0, length - headLength)); ctx.stroke(); ctx.setLineDash([]); ctx.translate(x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-headLength, -5); ctx.lineTo(-headLength, 5); ctx.fill(); ctx.restore();
    });
    state.vectors.filter((vector) => vector.enabled !== false && vector.quantity === 'velocity').forEach((vector) => { const object = state.objects[vector.target]; if (!object) return; const speed = Math.hypot(object.velocity.x, object.velocity.y); if (!speed) return; const [x, y] = point(object.x, object.y), angle = Math.atan2(-object.velocity.y, object.velocity.x), radius = object.shape === 'circle' ? object.radius * this.view.scale : Math.max(object.width, object.height) * this.view.scale / 2, length = Math.min(180, Math.max(16, speed * this.view.scale * (vector.scale || .3))), headLength = 8; ctx.save(); ctx.strokeStyle = vector.color || '#0b8f72'; ctx.fillStyle = vector.color || '#0b8f72'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius); ctx.lineTo(x + Math.cos(angle) * (radius + Math.max(0, length - headLength)), y + Math.sin(angle) * (radius + Math.max(0, length - headLength))); ctx.stroke(); ctx.translate(x + Math.cos(angle) * (radius + length), y + Math.sin(angle) * (radius + length)); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-headLength, -4); ctx.lineTo(-headLength, 4); ctx.fill(); ctx.restore(); });
  }
}

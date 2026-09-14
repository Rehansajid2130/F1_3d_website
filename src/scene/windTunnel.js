import * as THREE from 'three';

export class WindTunnel {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.particleCount = 1200;
    this.group = new THREE.Group();
    this.streamlines = [];
    this.opacity = 0;
    this.targetOpacity = 0;

    this.initStreamlines();
    this.scene.add(this.group);
  }

  initStreamlines() {
    // Generate curved streamlines around an F1 aerodynamic envelope
    const lineCount = 90;
    const pointsPerLine = 35;

    for (let i = 0; i < lineCount; i++) {
      // Spawn points spread across front cross-section
      const startX = (Math.random() - 0.5) * 2.8;
      const startY = 0.05 + Math.random() * 1.35;
      const startZ = 4.2; // In front of nose

      const points = [];
      const colors = [];

      let curX = startX;
      let curY = startY;
      let curZ = startZ;

      const stepZ = (startZ - -4.2) / pointsPerLine;

      for (let j = 0; j < pointsPerLine; j++) {
        const z = startZ - j * stepZ;
        let x = curX;
        let y = curY;

        // Nose cone diversion (z between 2.0 and 4.0)
        if (z > 1.8 && z < 3.8) {
          const distToCenter = Math.sqrt(x * x + y * y);
          if (distToCenter < 0.65) {
            x += Math.sign(x || 1) * 0.05;
            y += 0.035;
          }
        }

        // Cockpit & Halo diversion (z between 0.2 and 1.8)
        if (z > 0.0 && z < 1.8) {
          if (Math.abs(x) < 0.55 && y < 1.1) {
            y += 0.045; // Up over helmet and roll hoop
          }
        }

        // Sidepods diversion (z between -1.5 and 0.5)
        if (z > -1.5 && z < 0.5) {
          if (Math.abs(x) < 0.95 && y < 0.65) {
            // Coke-bottle taper towards rear
            x += Math.sign(x || 1) * 0.035;
          }
        }

        // Floor diffuser upwash at rear (z < -1.8)
        if (z < -1.6 && y < 0.45) {
          y += (-1.6 - z) * 0.12; // Diffuser expansion kick
        }

        // Rear wing downwash (z between -3.0 and -2.0)
        if (z < -2.0 && z > -3.2 && y > 0.8) {
          y -= 0.035;
        }

        points.push(new THREE.Vector3(x, y, z));

        // Speed/Pressure coloring: Cyan = laminar high speed, Red/Gold = pressure build, Magenta = vortex
        const speed = 1.0 + Math.abs(startX) * 0.3;
        const color = new THREE.Color();
        if (z > 2.0) {
          color.setRGB(0.0, 0.95, 1.0); // Clean intake
        } else if (z > 0.0) {
          color.setRGB(0.2, 1.0, 0.4); // Acceleration over cockpit
        } else if (z > -2.0) {
          color.setRGB(1.0, 0.7, 0.1); // Compression along engine cover
        } else {
          color.setRGB(0.85, 0.1, 0.95); // Wake vortex
        }
        colors.push(color.r, color.g, color.b);

        curX = x;
        curY = y;
        curZ = z;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 1.5
      });

      const line = new THREE.Line(geometry, material);
      this.group.add(line);
      this.streamlines.push({
        line,
        material,
        originalPoints: points,
        speedOffset: Math.random() * 0.08 + 0.04,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Also add flowing particle sparks along the streamlines
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(this.particleCount * 3);
    const sparkColors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      sparkPos[i * 3 + 0] = (Math.random() - 0.5) * 2.6;
      sparkPos[i * 3 + 1] = 0.05 + Math.random() * 1.3;
      sparkPos[i * 3 + 2] = -4.0 + Math.random() * 8.0;

      sparkColors[i * 3 + 0] = 0.0;
      sparkColors[i * 3 + 1] = 0.9;
      sparkColors[i * 3 + 2] = 1.0;
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

    this.sparkMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparks = new THREE.Points(sparkGeo, this.sparkMat);
    this.group.add(this.sparks);
  }

  toggle(enable) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    this.targetOpacity = this.enabled ? 0.75 : 0;
    return this.enabled;
  }

  update(deltaTime) {
    // Smooth lerp opacity
    this.opacity += (this.targetOpacity - this.opacity) * Math.min(deltaTime * 5, 1);
    this.group.visible = this.opacity > 0.005;

    if (!this.group.visible) return;

    this.sparkMat.opacity = this.opacity * 0.9;

    // Update lines opacity
    for (let s of this.streamlines) {
      s.material.opacity = this.opacity * 0.55;
    }

    // Animate sparks rushing from front (Z: +4.2) to rear (Z: -4.2)
    const positions = this.sparks.geometry.attributes.position.array;
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      positions[idx + 2] -= deltaTime * 12.5; // Flow backward

      // Reset when exiting out the rear
      if (positions[idx + 2] < -4.2) {
        positions[idx + 2] = 4.2;
        positions[idx + 0] = (Math.random() - 0.5) * 2.6;
        positions[idx + 1] = 0.05 + Math.random() * 1.3;
      }
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;
  }
}

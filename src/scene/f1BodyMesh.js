import * as THREE from 'three';

/**
 * Procedural Seamless Formula 1 Monocoque & Body Shell Generator
 * Generates a single, continuous, aerodynamically contoured carbon fiber composite shell.
 * Features:
 * - Drooping aerodynamic nose cone
 * - Deep sidepod forward undercuts
 * - Top "water-slide" downwash gulleys
 * - Severe "Coke-bottle" rear waist taper
 * - Integrated Shark Fin vertical stabilizer along the spine
 * - Upward-sweeping rear diffuser integration
 * ZERO boxy seams, ZERO cylindrical intersections, ZERO Lego appearance.
 */
export function createSeamlessF1BodyGeometry() {
  const numZ = 40;     // Longitudinal stations from nose to tail
  const numPerim = 40; // Radial points around perimeter

  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= numZ; i++) {
    const tz = i / numZ; // 0 = nose tip (+3.05), 1 = rear diffuser (-2.45)
    const z = 3.05 - tz * 5.5;

    for (let j = 0; j <= numPerim; j++) {
      const u = j / numPerim;
      const angle = u * Math.PI * 2; // 0 = top spine, PI/2 = right, PI = bottom, 3PI/2 = left

      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const signX = Math.sign(sinA) || 1;
      const absSin = Math.abs(sinA);

      let x = 0;
      let y = 0.25;

      if (z >= 1.7) {
        // === REGION 1: DROOPING NOSE CONE (z: 1.7 to 3.05) ===
        const tn = (3.05 - z) / 1.35; // 0 at tip, 1 at front bulkhead
        const centerY = 0.18 + 0.22 * Math.pow(tn, 0.7);
        const radiusX = 0.08 + 0.18 * Math.pow(tn, 0.85);
        const radiusY = 0.07 + 0.16 * Math.pow(tn, 0.85);

        x = radiusX * sinA;
        y = centerY + radiusY * cosA;

        // Slight flat bottom on nose
        if (cosA < -0.6) {
          y = Math.max(y, centerY - radiusY * 0.75);
        }
      } else if (z >= 0.7) {
        // === REGION 2: CHASSIS TRANSITION & COCKPIT BULKHEAD (z: 0.7 to 1.7) ===
        const tc = (1.7 - z) / 1.0; // 0 at nose joint, 1 at front of cockpit
        const centerY = 0.38 + 0.08 * tc;
        const widthX = 0.26 + 0.16 * tc;
        const heightY = 0.22 + 0.06 * tc;

        x = widthX * sinA;
        y = centerY + heightY * cosA;

        // Flat bottom for floor transition
        if (y < 0.1) y = 0.1;
      } else if (z >= -0.4) {
        // === REGION 3: COCKPIT, AIRBOX & SIDEPODS (z: -0.4 to 0.7) ===
        // Modern F1 ground effect: Wide sidepods with deep undercuts & top downwash gulleys
        const ts = (0.7 - z) / 1.1; // 0 at intake entrance, 1 at mid-sidepod
        const maxPodWidth = 0.88;

        // Airbox roll hoop peaking in center
        let spineY = 0.54;
        if (z < 0.15 && z > -0.35) {
          // Airbox elevation
          const airboxT = Math.sin(((0.15 - z) / 0.5) * Math.PI);
          spineY += 0.52 * airboxT; // Rises to 1.06m
        }

        if (cosA >= 0) {
          // --- UPPER BODYWORK (Shoulder, Cockpit & Water-slide downwash) ---
          // Interpolate width from center cockpit out to wide sidepods
          const podShoulderY = 0.52 - 0.06 * Math.sin(ts * Math.PI); // Downwash depression
          const topProfileY = THREE.MathUtils.lerp(spineY, podShoulderY, Math.pow(absSin, 0.8));

          x = maxPodWidth * sinA;
          y = THREE.MathUtils.lerp(0.35, topProfileY, cosA);

          // Cockpit opening cavity
          if (z > 0.0 && z < 0.65 && absSin < 0.35 && cosA > 0.5) {
            y = Math.min(y, 0.38); // Dip into cockpit seat
          }
        } else {
          // --- LOWER BODYWORK (Deep Aerodynamic Undercut Tunnel) ---
          // Modern F1 cars have extreme undercuts pulling air in from the front wheels to the floor
          const undercutFactor = 0.55 + 0.45 * Math.pow(-cosA, 1.2); // Squeezes in at mid-height
          x = maxPodWidth * sinA * undercutFactor;
          y = THREE.MathUtils.lerp(0.35, 0.09, -cosA); // Floor bottom
        }
      } else if (z >= -1.6) {
        // === REGION 4: COKE-BOTTLE WAIST TAPER & SHARK FIN (z: -1.6 to -0.4) ===
        const tcb = (-0.4 - z) / 1.2; // 0 at wide sidepod, 1 at narrow gearbox
        // Smooth exponential Coke-bottle waist narrowing
        const waistWidth = 0.88 - 0.56 * Math.pow(tcb, 0.75); // Tapers from 0.88 down to 0.32

        // Shark Fin vertical stabilizer along the top spine
        const finHeight = 0.96 - 0.35 * tcb; // Tapers toward rear
        const spineTop = absSin < 0.04 ? finHeight : THREE.MathUtils.lerp(finHeight, 0.48 - 0.12 * tcb, Math.min(absSin * 10, 1.0));

        if (cosA >= 0) {
          x = waistWidth * sinA;
          y = THREE.MathUtils.lerp(0.32, spineTop, cosA);
        } else {
          x = waistWidth * sinA * 0.9;
          y = THREE.MathUtils.lerp(0.32, 0.09, -cosA);
        }
      } else {
        // === REGION 5: GEARBOX, EXHAUST TAIL & VENTURI DIFFUSER (z: -2.45 to -1.6) ===
        const tr = (-1.6 - z) / 0.85; // 0 to 1
        const tailWidth = 0.32 - 0.1 * tr;

        const tailTop = 0.48 - 0.15 * tr;
        const tailBottom = 0.09 + 0.22 * Math.pow(tr, 1.3); // Upward diffuser expansion ramp!

        if (cosA >= 0) {
          x = tailWidth * sinA;
          y = THREE.MathUtils.lerp((tailTop + tailBottom) / 2, tailTop, cosA);
        } else {
          x = tailWidth * sinA;
          y = THREE.MathUtils.lerp((tailTop + tailBottom) / 2, tailBottom, -cosA);
        }
      }

      vertices.push(x, y, z);
      uvs.push(u, tz);
    }
  }

  // Generate quad-triangles between rings
  for (let i = 0; i < numZ; i++) {
    for (let j = 0; j < numPerim; j++) {
      const a = i * (numPerim + 1) + j;
      const b = (i + 1) * (numPerim + 1) + j;
      const c = (i + 1) * (numPerim + 1) + (j + 1);
      const d = i * (numPerim + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class F1CarModel {
  constructor(theme, onLoadedCallback = null) {
    this.theme = theme;
    this.onLoadedCallback = onLoadedCallback;
    this.group = new THREE.Group();

    // Assemblies for Exploded View & DRS animation
    this.parts = {
      body: new THREE.Group(),
      rearWing: new THREE.Group(),
      frontWing: new THREE.Group(),
      halo: new THREE.Group(),
      wheels: new THREE.Group(),
      engineBay: new THREE.Group()
    };

    this.carPaintMaterials = [];
    this.accentMaterials = [];
    this.wheelMeshes = [];
    this.wheelNodes = [];   // Deduplicated parent nodes for rotating whole wheel assemblies
    this.wheelMaterials = []; // Actual wheel materials from GLB for brake glow
    this.brakeGlow = 0;
    this.drsFlapMesh = null;
    this.steeringWheelMesh = null;
    this.rainLightMesh = null;

    this.isModelLoaded = false;
    this.drsOpen = false;
    this.isExploded = false;
    this.explodeFactor = 0;
    this.targetExplodeFactor = 0;
    this.rainLightTimer = 0;

    this.initLoaders();
    this.loadRealF1Car();
  }

  initLoaders() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  loadRealF1Car() {
    this.gltfLoader.load(
      '/models/f1_car.glb',
      (gltf) => {
        const carScene = gltf.scene;

        // Compute Bounding Box to center and normalize scale
        const box = new THREE.Box3().setFromObject(carScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Standard F1 length is approx 5.4m. Scale model accordingly
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetLength = 5.2;
        const scaleFactor = targetLength / maxDim;
        carScene.scale.setScalar(scaleFactor);

        // Center on X and Z, and place floor on Y = 0.08
        box.setFromObject(carScene);
        carScene.position.x = -center.x * scaleFactor;
        carScene.position.z = -center.z * scaleFactor;
        carScene.position.y = -box.min.y;

        // Traverse all meshes to configure PBR materials and tag modular assemblies
        carScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const matName = child.material?.name?.toLowerCase() || '';
            const nodeName = child.name?.toLowerCase() || '';

            // 1. Car Body Paint Materials (Authentic F1 Satin Aerodynamic Finish)
            if (
              matName.includes('paint') ||
              matName.includes('drivercolor') ||
              nodeName.includes('redbull_27_sub0') ||
              nodeName.includes('body')
            ) {
              const originalMap = child.material.map;
              child.material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(this.theme.carBaseColor),
                map: originalMap,
                metalness: 0.08,
                roughness: 0.42, // Authentic F1 satin finish: eliminates blinding glare
                clearcoat: 0.18,
                clearcoatRoughness: 0.4,
                reflectivity: 0.5
              });
              child.material.userData.originalMap = originalMap;
              this.carPaintMaterials.push(child.material);
            }

            // 2. Secondary Accent Materials (Wings, mirrors, trim)
            if (
              matName.includes('decals') ||
              matName.includes('detail') ||
              nodeName.includes('cowl')
            ) {
              if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                child.material.roughness = 0.4;
                child.material.metalness = 0.15;
              }
              this.accentMaterials.push(child.material);
            }

            // 3. Carbon Fiber Elements
            if (matName.includes('carbon')) {
              child.material.roughness = 0.45;
              child.material.metalness = 0.35;
            }

            // 4. Wheels and Rims — collect meshes; pivots built after traverse when matrices are ready
            if (matName.includes('wheel') || nodeName.includes('wheel') || nodeName.includes('tire') || nodeName.includes('rim')) {
              this.wheelMeshes.push(child);

              if (child.material) {
                child.material.roughness = 0.65;
                // Enable emissive on wheel material for thermal brake glow effect
                if (!child.material.emissive) {
                  child.material.emissive = new THREE.Color(0xff3b00);
                } else {
                  child.material.emissive.set(0xff3b00);
                }
                child.material.emissiveIntensity = 0.0;
                // Keep a unique reference per material (avoid duplicates)
                if (!this.wheelMaterials.includes(child.material)) {
                  this.wheelMaterials.push(child.material);
                }
              }
            }

            // 5. Rear Wing / DRS Flap
            if (nodeName.includes('rearwing') || nodeName.includes('wing_011') || nodeName.includes('wing')) {
              this.drsFlapMesh = child;
            }

            // 6. Cockpit Steering Wheel
            if (nodeName.includes('steer') || matName.includes('steer') || nodeName.includes('lcd')) {
              this.steeringWheelMesh = child;
            }

            // 7. Rear Rain Safety Light
            if (matName.includes('rearlight') || nodeName.includes('rearlight')) {
              this.rainLightMesh = child;
              if (child.material) {
                child.material.emissive = new THREE.Color(0xff0022);
                child.material.emissiveIntensity = 2.0;
              }
            }
          }
        });

        this.realCar = carScene;
        this.group.add(this.realCar);

        // Force world matrix update so bounding boxes below use real world coords
        this.group.updateMatrixWorld(true);

        // Build wheel pivot Groups: cluster wheel meshes by proximity (4 clusters = 4 wheels)
        // then create a pivot at each cluster's center and reparent meshes into it.
        if (this.wheelMeshes.length > 0) {
          this._buildWheelPivots(carScene);
        }

        this.isModelLoaded = true;

        // Debug logs
        console.log(`[F1Car] Wheel meshes detected: ${this.wheelMeshes.length}`);
        console.log(`[F1Car] Wheel pivot nodes built: ${this.wheelNodes.length}`,
          this.wheelNodes.map(n => `${n.name} pos:(${n.position.x.toFixed(2)},${n.position.y.toFixed(2)},${n.position.z.toFixed(2)})`) );

        this.updateTheme(this.theme);

        if (this.onLoadedCallback) {
          this.onLoadedCallback(this);
        }
      },
      undefined,
      (error) => {
        console.error('Error loading real F1 GLB model:', error);
      }
    );
  }

  updateTheme(theme) {
    this.theme = theme;

    // Update real car paint materials
    this.carPaintMaterials.forEach((mat) => {
      mat.color.set(theme.carBaseColor);
    });

    // Update secondary accents
    this.accentMaterials.forEach((mat) => {
      if (mat.color) {
        mat.color.set(theme.carSecondaryColor);
      }
    });
  }

  /**
   * Cluster wheel meshes into 4 groups (FL, FR, RL, RR) by world-space proximity.
   * Build a pivot Group at each cluster centroid, then use .attach() to reparent
   * meshes — .attach() preserves world transform automatically, no manual math.
   */
  _buildWheelPivots(carScene) {
    if (this.wheelMeshes.length === 0) return;

    // Update matrices so all world positions are accurate
    this.group.updateMatrixWorld(true);

    // 1. Collect world-space bounding box centers for all wheel meshes
    const tmpBox = new THREE.Box3();
    const tmpCenter = new THREE.Vector3();
    const meshCenters = this.wheelMeshes.map(m => {
      tmpBox.setFromObject(m);
      tmpBox.getCenter(tmpCenter);
      return { mesh: m, wx: tmpCenter.x, wy: tmpCenter.y, wz: tmpCenter.z };
    });

    // 2. Split by X (left/right) then Z (front/rear) to get 4 clusters
    const sorted = [...meshCenters].sort((a, b) => a.wx - b.wx);
    const half = Math.floor(sorted.length / 2);
    const leftGroup  = sorted.slice(0, half);
    const rightGroup = sorted.slice(half);

    const splitFrontRear = (group) => {
      if (group.length === 0) return { front: [], rear: [] };
      const byZ = [...group].sort((a, b) => b.wz - a.wz); // descending Z = front first
      const mid = Math.ceil(byZ.length / 2);
      return { front: byZ.slice(0, mid), rear: byZ.slice(mid) };
    };

    const { front: lf, rear: lr } = splitFrontRear(leftGroup);
    const { front: rf, rear: rr } = splitFrontRear(rightGroup);
    const clusters = [lf, lr, rf, rr].filter(c => c.length > 0);
    const clusterNames = ['wheel_pivot_FL', 'wheel_pivot_RL', 'wheel_pivot_FR', 'wheel_pivot_RR'];

    clusters.forEach((cluster, idx) => {
      if (cluster.length === 0) return;

      // World-space centroid of this cluster
      const cx = cluster.reduce((s, e) => s + e.wx, 0) / cluster.length;
      const cy = cluster.reduce((s, e) => s + e.wy, 0) / cluster.length;
      const cz = cluster.reduce((s, e) => s + e.wz, 0) / cluster.length;

      // Create a pivot Group positioned at the cluster centroid in carScene local space
      const pivot = new THREE.Group();
      pivot.name = clusterNames[idx] || `wheel_pivot_${idx}`;

      // Convert world centroid → carScene local space
      const worldCentroid = new THREE.Vector3(cx, cy, cz);
      const localCentroid = carScene.worldToLocal(worldCentroid.clone());
      pivot.position.copy(localCentroid);

      carScene.add(pivot);
      this.group.updateMatrixWorld(true); // ensure pivot's matrixWorld is fresh before attach()

      // Store initial local position for exploded view

      pivot.userData.wheelInitialX = pivot.position.x;
      pivot.userData.wheelInitialY = pivot.position.y;
      pivot.userData.wheelInitialZ = pivot.position.z;

      // .attach() reparents each mesh under pivot while preserving its world transform.
      // No manual position/quaternion/scale math needed.
      cluster.forEach(({ mesh }) => {
        pivot.attach(mesh);
      });

      this.wheelNodes.push(pivot);
    });

    console.log(`[F1Car] Built ${this.wheelNodes.length} wheel pivots:`,
      this.wheelNodes.map(n =>
        `${n.name} pos(${n.position.x.toFixed(2)}, ${n.position.y.toFixed(2)}, ${n.position.z.toFixed(2)}) meshes:${n.children.length}`
      )
    );
  }


  setDRS(open) {
    this.drsOpen = open;
  }

  setExploded(exploded) {
    this.isExploded = exploded;
    this.targetExplodeFactor = exploded ? 1 : 0;
  }

  update(deltaTime, engineRevving = false) {
    // 1. Exploded View animation
    this.explodeFactor += (this.targetExplodeFactor - this.explodeFactor) * Math.min(deltaTime * 4.5, 1.0);
    const ef = this.explodeFactor;

    if (this.drsFlapMesh) {
      this.drsFlapMesh.position.y = (this.drsOpen ? 0.08 : 0) + ef * 0.45;
      this.drsFlapMesh.position.z = -ef * 0.7;
    }

    // Exploded view: offset wheel pivot nodes from their stored initial positions
    if (this.wheelNodes.length > 0) {
      this.wheelNodes.forEach((node) => {
        const initX = node.userData.wheelInitialX ?? 0;
        const sign = initX >= 0 ? 1 : -1; // positive X = right side, negative = left
        node.position.x = initX + sign * ef * 0.45;
      });
    }

    // 2. DRS Flap angle animation
    if (this.drsFlapMesh) {
      const targetDRSRot = this.drsOpen ? -0.28 : 0;
      this.drsFlapMesh.rotation.x += (targetDRSRot - this.drsFlapMesh.rotation.x) * Math.min(deltaTime * 12, 1.0);
    }

    // 3. FIA Rain Light blinking (4Hz)
    if (this.rainLightMesh) {
      this.rainLightTimer += deltaTime;
      const isLit = Math.floor(this.rainLightTimer * 8) % 2 === 0;
      if (this.rainLightMesh.material) {
        this.rainLightMesh.material.emissiveIntensity = isLit ? 3.0 : 0.2;
      }
    }
  }

  setDriveState(speedKmh, isBraking, deltaTime) {
    // Wheel spin: rotate PARENT NODES so entire wheel assembly spins as one unit
    if (speedKmh > 0.1 && this.wheelNodes.length > 0) {
      const speedMs = speedKmh / 3.6;
      const tireRadius = 0.36; // 720mm F1 Pirelli tire radius
      const rotDelta = (speedMs / tireRadius) * deltaTime;

      for (let i = 0; i < this.wheelNodes.length; i++) {
        // Try X axis first (most common for Y-up GLB car wheels)
        this.wheelNodes[i].rotation.x += rotDelta;
      }
    }

    // Dynamic Carbon-Ceramic Brake Glow applied directly to actual wheel materials
    const targetGlow = (isBraking && speedKmh > 10)
      ? Math.min(2.4, 0.8 + (speedKmh / 100))
      : 0.0;
    const rate = isBraking ? 10.0 : 2.5; // Fast thermal heating, gradual cooling
    this.brakeGlow += (targetGlow - this.brakeGlow) * Math.min(deltaTime * rate, 1.0);

    // Apply glow to all detected wheel materials (rim + tire from GLB)
    for (let i = 0; i < this.wheelMaterials.length; i++) {
      this.wheelMaterials[i].emissiveIntensity = this.brakeGlow;
    }
  }
}


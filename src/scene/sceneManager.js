import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TrackEnvironment } from './trackEnvironment.js';

export class SceneManager {
  constructor(canvasContainer, theme) {
    this.container = canvasContainer;
    this.theme = theme;

    // Mode state
    this.mode = 'showroom'; // 'showroom' | 'track'

    // Camera state & targets for smooth interpolation
    this.cameraMode = 'orbit'; // 'orbit' | 'cockpit' | 'focus' | 'chase'
    this.camPos = new THREE.Vector3(3.8, 1.7, 4.2);
    this.targetCamPos = new THREE.Vector3(3.8, 1.7, 4.2);
    this.lookAtPos = new THREE.Vector3(0, 0.4, 0);
    this.targetLookAtPos = new THREE.Vector3(0, 0.4, 0);

    // Orbit angles
    this.orbitRadius = 5.6;
    this.orbitTheta = 0.8; // Azimuth
    this.orbitPhi = 1.25;  // Polar
    this.targetOrbitRadius = 5.6;
    this.targetOrbitTheta = 0.8;
    this.targetOrbitPhi = 1.25;

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.autoRotate = true;
    this.autoRotateSpeed = 0.25;

    this.initScene();
    this.initLights();
    this.initShowroomStage();
    this.trackEnvironment = new TrackEnvironment(this.scene);
    this.initEventListeners();
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Very gentle subtle atmospheric fog (does not darken the car)
    this.scene.fog = new THREE.FogExp2(0x06080e, 0.018);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.lookAtPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Generate Studio Room Environment for photorealistic PBR reflections & lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.container.appendChild(this.renderer.domElement);
  }

  initLights() {
    // 1. Soft Ambient Fill
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // 2. Main Overhead Studio Softbox Light
    this.topLight = new THREE.DirectionalLight(0xffffff, 1.25);
    this.topLight.position.set(0, 8.5, 0);
    this.topLight.castShadow = true;
    this.topLight.shadow.mapSize.width = 2048;
    this.topLight.shadow.mapSize.height = 2048;
    this.topLight.shadow.camera.near = 1;
    this.topLight.shadow.camera.far = 16;
    this.topLight.shadow.camera.left = -5;
    this.topLight.shadow.camera.right = 5;
    this.topLight.shadow.camera.top = 5;
    this.topLight.shadow.camera.bottom = -5;
    this.topLight.shadow.bias = -0.0005;
    this.scene.add(this.topLight);

    // 3. Front Key Fill
    this.frontFill = new THREE.DirectionalLight(0xffffff, 0.85);
    this.frontFill.position.set(0, 3.5, 6.5);
    this.scene.add(this.frontFill);

    // 4. Side Studio Fill Lights
    this.leftFill = new THREE.DirectionalLight(0xffffff, 0.65);
    this.leftFill.position.set(-6.0, 3.0, 0);
    this.scene.add(this.leftFill);

    this.rightFill = new THREE.DirectionalLight(0xffffff, 0.65);
    this.rightFill.position.set(6.0, 3.0, 0);
    this.scene.add(this.rightFill);

    // 5. Rear Studio Backlight
    this.rearFill = new THREE.DirectionalLight(0xffffff, 0.6);
    this.rearFill.position.set(0, 4.0, -6.0);
    this.scene.add(this.rearFill);

    // 6. Dynamic Theme Spotlights
    this.keySpot = new THREE.SpotLight(this.theme.spotlightColor, 1.8);
    this.keySpot.position.set(4.5, 4.0, 4.5);
    this.keySpot.angle = Math.PI / 3.5;
    this.keySpot.penumbra = 0.6;
    this.keySpot.decay = 1.2;
    this.keySpot.distance = 20;
    this.scene.add(this.keySpot);

    this.rimSpot = new THREE.SpotLight(this.theme.spotlightColor, 1.4);
    this.rimSpot.position.set(-4.5, 3.5, -4.5);
    this.rimSpot.angle = Math.PI / 3.5;
    this.rimSpot.penumbra = 0.5;
    this.rimSpot.decay = 1.2;
    this.rimSpot.distance = 20;
    this.scene.add(this.rimSpot);

    // Under-car neon glow point light
    this.underglow = new THREE.PointLight(this.theme.spotlightColor, 1.6, 5.0);
    this.underglow.position.set(0, 0.08, 0);
    this.scene.add(this.underglow);
  }

  initShowroomStage() {
    this.stageGroup = new THREE.Group();

    // 1. Reflective Carbon Circular Showroom Stage
    const stageGeo = new THREE.CylinderGeometry(5.4, 5.6, 0.16, 64);
    this.stageMat = new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      metalness: 0.85,
      roughness: 0.2
    });
    const stage = new THREE.Mesh(stageGeo, this.stageMat);
    stage.position.y = -0.08;
    stage.receiveShadow = true;
    this.stageGroup.add(stage);

    // 2. Stage Outer Glowing Bezel Ring
    const ringGeo = new THREE.TorusGeometry(5.5, 0.04, 16, 80);
    ringGeo.rotateX(Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: this.theme.spotlightColor
    });
    const ring = new THREE.Mesh(ringGeo, this.ringMat);
    ring.position.y = 0.005;
    this.stageGroup.add(ring);

    // 3. Grid rings on floor
    for (let r = 1.5; r <= 4.5; r += 1.0) {
      const gridRingGeo = new THREE.RingGeometry(r, r + 0.015, 64);
      gridRingGeo.rotateX(-Math.PI / 2);
      const gridRingMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.4
      });
      const gridRing = new THREE.Mesh(gridRingGeo, gridRingMat);
      gridRing.position.y = 0.002;
      this.stageGroup.add(gridRing);
    }

    // 4. Large Infinite Studio Floor underneath
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070a0f,
      roughness: 0.6,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.09;
    floor.receiveShadow = true;
    this.stageGroup.add(floor);

    this.scene.add(this.stageGroup);
  }

  updateTheme(theme) {
    this.theme = theme;
    this.keySpot.color.set(theme.spotlightColor);
    this.rimSpot.color.set(theme.spotlightColor);
    this.underglow.color.set(theme.spotlightColor);
    this.ringMat.color.set(theme.spotlightColor);
  }

  initEventListeners() {
    const el = this.renderer.domElement;

    // Mouse / Pointer Controls
    el.addEventListener('pointerdown', (e) => {
      if (this.cameraMode !== 'orbit') return;
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.autoRotate = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || this.cameraMode !== 'orbit') return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetOrbitTheta -= deltaX * 0.0065;
      this.targetOrbitPhi -= deltaY * 0.0065;

      // Restrict polar angle so camera doesn't flip or dip below floor
      this.targetOrbitPhi = Math.max(0.18, Math.min(Math.PI / 2 - 0.04, this.targetOrbitPhi));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Zoom via wheel
    el.addEventListener('wheel', (e) => {
      if (this.cameraMode !== 'orbit') return;
      e.preventDefault();
      this.targetOrbitRadius += e.deltaY * 0.0035;
      this.targetOrbitRadius = Math.max(2.4, Math.min(9.5, this.targetOrbitRadius));
    }, { passive: false });

    // Window resize
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'track') {
      this.stageGroup.visible = false;
      this.trackEnvironment.setVisible(true);
      this.autoRotate = false;
      this.setCameraMode('chase');
    } else {
      this.stageGroup.visible = true;
      this.trackEnvironment.setVisible(false);
      this.camera.fov = 42;
      this.camera.updateProjectionMatrix();
      this.setCameraMode('orbit');
    }
  }

  setCameraMode(mode, targetPos = null, lookAt = null) {
    this.cameraMode = mode;
    if (mode === 'cockpit') {
      // Driver's eye level POV
      this.targetCamPos.set(0, 0.78, 0.18);
      this.targetLookAtPos.set(0, 0.68, 2.5);
    } else if (mode === 'chase') {
      // Dynamic TV Broadcast Chase Cam Behind Car
      this.targetCamPos.set(0, 1.45, -4.8);
      this.targetLookAtPos.set(0, 0.72, 3.8);
    } else if (mode === 'focus' && targetPos && lookAt) {
      this.targetCamPos.copy(targetPos);
      this.targetLookAtPos.copy(lookAt);
    } else {
      // Reset to orbit
      this.targetLookAtPos.set(0, 0.4, 0);
      this.calculateOrbitPosition();
    }
  }

  calculateOrbitPosition() {
    this.targetCamPos.x = this.targetLookAtPos.x + this.targetOrbitRadius * Math.sin(this.targetOrbitPhi) * Math.sin(this.targetOrbitTheta);
    this.targetCamPos.y = this.targetLookAtPos.y + this.targetOrbitRadius * Math.cos(this.targetOrbitPhi);
    this.targetCamPos.z = this.targetLookAtPos.z + this.targetOrbitRadius * Math.sin(this.targetOrbitPhi) * Math.cos(this.targetOrbitTheta);
  }

  update(deltaTime, currentSpeedKmh = 0, isAccelerating = false, isBraking = false) {
    // 1. Auto-rotate in orbit mode when not dragging
    if (this.cameraMode === 'orbit' && this.autoRotate && !this.isDragging) {
      this.targetOrbitTheta += deltaTime * this.autoRotateSpeed;
    }

    if (this.cameraMode === 'orbit') {
      // Smooth lerp orbit angles
      this.orbitTheta += (this.targetOrbitTheta - this.orbitTheta) * Math.min(deltaTime * 8, 1);
      this.orbitPhi += (this.targetOrbitPhi - this.orbitPhi) * Math.min(deltaTime * 8, 1);
      this.orbitRadius += (this.targetOrbitRadius - this.orbitRadius) * Math.min(deltaTime * 8, 1);

      this.calculateOrbitPosition();
    }

    // 2. Track Mode Dynamic Camera & Texture Streaming
    if (this.mode === 'track') {
      this.trackEnvironment.update(deltaTime, currentSpeedKmh);

      const speedRatio = Math.min(1.0, currentSpeedKmh / 350);

      if (this.cameraMode === 'chase') {
        // Dynamic FOV Warp
        const targetFov = 42 + speedRatio * 14;
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(deltaTime * 4, 1);
        this.camera.updateProjectionMatrix();

        // Dynamic Chase Cam distance and pitch inertia
        const accelPull = isAccelerating ? -0.45 : (isBraking ? 0.35 : 0);
        this.targetCamPos.set(0, 1.42 + (isBraking ? 0.12 : 0), -4.7 + accelPull - speedRatio * 0.75);
        this.targetLookAtPos.set(0, 0.72, 3.8);
      } else if (this.cameraMode === 'cockpit') {
        const targetFov = 44 + speedRatio * 16;
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(deltaTime * 4, 1);
        this.camera.updateProjectionMatrix();
      }

      // High-speed chassis vibration
      if (currentSpeedKmh > 70) {
        const shakeMag = (currentSpeedKmh / 350) * 0.015;
        this.camPos.x += (Math.random() - 0.5) * shakeMag;
        this.camPos.y += (Math.random() - 0.5) * shakeMag;
      }
    }

    // 3. Smooth lerp camera position and lookAt target
    const lerpSpeed = (this.cameraMode === 'cockpit' || this.cameraMode === 'chase') ? 7.0 : 5.0;
    this.camPos.lerp(this.targetCamPos, Math.min(deltaTime * lerpSpeed, 1));
    this.lookAtPos.lerp(this.targetLookAtPos, Math.min(deltaTime * lerpSpeed, 1));

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.lookAtPos);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

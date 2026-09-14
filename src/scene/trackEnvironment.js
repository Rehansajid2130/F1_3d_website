import * as THREE from 'three';

export class TrackEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false; // Hidden by default in Showroom mode

    this.trackWidth = 14;
    this.trackLength = 120;
    this.speed = 0; // Current speed in m/s

    this.initAsphalt();
    this.initKerbs();
    this.initBarriersAndFences();
    this.initDistanceBoards();
    this.initFloodlights();

    this.scene.add(this.group);
  }

  initAsphalt() {
    // 1. Procedural Asphalt Canvas Texture with Racing Line Rubber and White Lines
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Dark asphalt base
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle asphalt tarmac grain noise
    for (let i = 0; i < 40000; i++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 1024;
      const shade = Math.floor(Math.random() * 25 + 15);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }

    // Racing line dark rubbering in center
    const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
    gradient.addColorStop(0, 'rgba(24, 27, 34, 0)');
    gradient.addColorStop(0.35, 'rgba(10, 12, 16, 0.7)');
    gradient.addColorStop(0.5, 'rgba(8, 9, 12, 0.85)');
    gradient.addColorStop(0.65, 'rgba(10, 12, 16, 0.7)');
    gradient.addColorStop(1, 'rgba(24, 27, 34, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    // White Track Boundary Edge Lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(60, 0, 18, 1024);
    ctx.fillRect(946, 0, 18, 1024);

    // Grid slots & starting box lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 14;
    for (let y = 120; y < 1024; y += 450) {
      ctx.strokeRect(340, y, 344, 220);
    }

    this.asphaltTexture = new THREE.CanvasTexture(canvas);
    this.asphaltTexture.wrapS = THREE.RepeatWrapping;
    this.asphaltTexture.wrapT = THREE.RepeatWrapping;
    this.asphaltTexture.repeat.set(1, 10);
    this.asphaltTexture.anisotropy = 16;

    const asphaltGeo = new THREE.PlaneGeometry(this.trackWidth, this.trackLength, 1, 32);
    this.asphaltMat = new THREE.MeshStandardMaterial({
      map: this.asphaltTexture,
      roughness: 0.82,
      metalness: 0.12
    });

    const asphaltMesh = new THREE.Mesh(asphaltGeo, this.asphaltMat);
    asphaltMesh.rotation.x = -Math.PI / 2;
    asphaltMesh.position.y = 0;
    asphaltMesh.receiveShadow = true;
    this.group.add(asphaltMesh);
  }

  initKerbs() {
    // 2. FIA Standard Red & White Ripple Rumble Kerbs along Track Edges
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 128;
    kerbCanvas.height = 512;
    const kCtx = kerbCanvas.getContext('2d');

    // Alternating Red and White diagonal stripes
    const stripeHeight = 64;
    for (let y = 0; y < 512; y += stripeHeight) {
      const isRed = Math.floor(y / stripeHeight) % 2 === 0;
      kCtx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
      kCtx.fillRect(0, y, 128, stripeHeight);
    }

    this.kerbTexture = new THREE.CanvasTexture(kerbCanvas);
    this.kerbTexture.wrapS = THREE.RepeatWrapping;
    this.kerbTexture.wrapT = THREE.RepeatWrapping;
    this.kerbTexture.repeat.set(1, 24);
    this.kerbTexture.anisotropy = 8;

    const kerbMat = new THREE.MeshStandardMaterial({
      map: this.kerbTexture,
      roughness: 0.5,
      metalness: 0.1
    });

    [-1, 1].forEach((dir) => {
      const kerbGeo = new THREE.BoxGeometry(0.85, 0.08, this.trackLength);
      const kerb = new THREE.Mesh(kerbGeo, kerbMat);
      kerb.position.set(dir * (this.trackWidth / 2 + 0.42), 0.04, 0);
      kerb.receiveShadow = true;
      this.group.add(kerb);
    });
  }

  initBarriersAndFences() {
    // 3. Armco Steel Barriers & Pit Wall Safety Catch Fences
    const armcoMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.3
    });

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.4
    });

    [-1, 1].forEach((dir) => {
      const barrierX = dir * (this.trackWidth / 2 + 2.5);

      // Armco corrugated guardrails (3 horizontal tiers)
      for (let tier = 0; tier < 3; tier++) {
        const railGeo = new THREE.BoxGeometry(0.08, 0.18, this.trackLength);
        const rail = new THREE.Mesh(railGeo, armcoMat);
        rail.position.set(barrierX, 0.35 + tier * 0.22, 0);
        this.group.add(rail);
      }

      // Vertical support posts every 6 meters
      for (let z = -this.trackLength / 2; z <= this.trackLength / 2; z += 6) {
        const postGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(barrierX, 0.55, z);
        this.group.add(post);

        // FIA Safety Catch Fence poles rising up to 3m
        const fencePoleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.0, 8);
        const fencePole = new THREE.Mesh(fencePoleGeo, postMat);
        fencePole.position.set(barrierX, 1.8, z);
        this.group.add(fencePole);
      }
    });

    // Outer Grass / Runoff verge
    [-1, 1].forEach((dir) => {
      const vergeGeo = new THREE.PlaneGeometry(16, this.trackLength);
      const vergeMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.9
      });
      const verge = new THREE.Mesh(vergeGeo, vergeMat);
      verge.rotation.x = -Math.PI / 2;
      verge.position.set(dir * (this.trackWidth / 2 + 9.0), -0.01, 0);
      this.group.add(verge);
    });
  }

  initDistanceBoards() {
    // 4. Grand Prix Distance Braking Boards: 200m, 150m, 100m, 50m
    this.boardsGroup = new THREE.Group();
    const distances = ['200', '150', '100', '50'];

    this.boardObjects = [];

    distances.forEach((dist, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const bCtx = canvas.getContext('2d');

      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(0, 0, 256, 256);
      bCtx.strokeStyle = '#ffffff';
      bCtx.lineWidth = 14;
      bCtx.strokeRect(10, 10, 236, 236);

      bCtx.fillStyle = '#ffffff';
      bCtx.font = 'bold 110px Orbitron, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(dist, 128, 130);

      const tex = new THREE.CanvasTexture(canvas);
      const boardGeo = new THREE.PlaneGeometry(1.2, 1.2);
      const boardMat = new THREE.MeshBasicMaterial({ map: tex });

      const boardMesh = new THREE.Mesh(boardGeo, boardMat);
      const initialZ = 35 - idx * 24;
      boardMesh.position.set(this.trackWidth / 2 + 1.2, 1.4, initialZ);
      boardMesh.rotation.y = -Math.PI / 2 + 0.15;

      const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(this.trackWidth / 2 + 1.2, 0.7, initialZ);

      const boardContainer = new THREE.Group();
      boardContainer.add(boardMesh);
      boardContainer.add(post);
      boardContainer.userData.z = initialZ;

      this.boardsGroup.add(boardContainer);
      this.boardObjects.push(boardContainer);
    });

    this.group.add(this.boardsGroup);
  }

  initFloodlights() {
    // 5. Track Gantry Floodlights for night racing brilliance
    this.trackLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    this.trackLight1.position.set(10, 15, 20);
    this.group.add(this.trackLight1);

    this.trackLight2 = new THREE.DirectionalLight(0x93c5fd, 1.6);
    this.trackLight2.position.set(-10, 15, -20);
    this.group.add(this.trackLight2);
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  update(deltaTime, currentSpeedKmh) {
    if (!this.group.visible) return;

    // Convert km/h to m/s
    const speedMs = (currentSpeedKmh / 3.6);

    // 1. Scroll asphalt & kerb textures backward with speed
    const scrollDelta = (speedMs * deltaTime) / 12.0;
    this.asphaltTexture.offset.y -= scrollDelta;
    this.kerbTexture.offset.y -= scrollDelta * 2.4;

    // 2. Animate distance braking boards flying past
    this.boardObjects.forEach((board) => {
      board.position.z -= speedMs * deltaTime;
      if (board.position.z < -this.trackLength / 2) {
        board.position.z += this.trackLength; // Loop back ahead
      }
    });
  }
}

import * as THREE from 'three';

export class AnnotationsManager {
  constructor(camera, domContainer, onSelectHotspot) {
    this.camera = camera;
    this.domContainer = domContainer;
    this.onSelectHotspot = onSelectHotspot;
    this.hotspots = [
      {
        id: 'front-wing',
        title: 'Front Aero Wing & Strakes',
        subtitle: 'Ground-Effect Aerodynamics',
        position: new THREE.Vector3(0, 0.26, 2.65),
        camTarget: new THREE.Vector3(0, 0.3, 2.65),
        camPosition: new THREE.Vector3(1.6, 0.8, 3.8),
        badge: 'AERO 38%',
        stats: [
          { label: 'Downforce Ratio', val: '38% Front' },
          { label: 'Airfoil Flaps', val: '4 Elements' },
          { label: 'Material', val: 'Pre-preg Carbon' },
          { label: 'Ground Clearance', val: '28 mm' }
        ],
        desc: 'Directs clean air underneath the floor Venturi tunnels while cascading outwash vortices around the spinning 18-inch front tires.'
      },
      {
        id: 'halo-cockpit',
        title: 'Titanium Halo & Cockpit Cell',
        subtitle: 'Driver Survival Monocoque',
        position: new THREE.Vector3(0, 0.85, 0.45),
        camTarget: new THREE.Vector3(0, 0.65, 0.45),
        camPosition: new THREE.Vector3(1.4, 1.35, 1.6),
        badge: '125 kN CERT',
        stats: [
          { label: 'Impact Rating', val: '125 kN Load' },
          { label: 'Structure', val: 'Grade 5 Titanium' },
          { label: 'Halo Weight', val: '9.0 kg' },
          { label: 'Cockpit Extraction', val: '< 7.0 sec' }
        ],
        desc: 'Surrounds the cockpit survival cell. Capable of supporting the weight of two London double-decker buses while minimizing aerodynamic drag.'
      },
      {
        id: 'power-unit',
        title: '1.6L V6 Turbo Hybrid Power Unit',
        subtitle: 'MGU-K / MGU-H Energy Recovery',
        position: new THREE.Vector3(0, 0.68, -0.85),
        camTarget: new THREE.Vector3(0, 0.55, -0.85),
        camPosition: new THREE.Vector3(1.8, 1.2, -0.6),
        badge: '1,050+ BHP',
        stats: [
          { label: 'Max Output', val: '1,050+ BHP' },
          { label: 'Thermal Efficiency', val: '> 52%' },
          { label: 'Max RPM', val: '15,000 RPM' },
          { label: 'Battery Deploy', val: '4.0 MJ / lap' }
        ],
        desc: 'The most thermally efficient internal combustion engine on Earth. Combines single-turbo V6 with electric motor generators for instant torque fill.'
      },
      {
        id: 'rear-wing-drs',
        title: 'Active DRS Wing & Diffuser',
        subtitle: 'Downforce & Drag Reduction',
        position: new THREE.Vector3(0, 0.98, -2.55),
        camTarget: new THREE.Vector3(0, 0.7, -2.55),
        camPosition: new THREE.Vector3(1.9, 1.4, -3.8),
        badge: 'DRS ACTIVE',
        stats: [
          { label: 'Drag Reduction', val: '-28% Drag' },
          { label: 'Top Speed Gain', val: '+18-22 km/h' },
          { label: 'Diffuser Expansion', val: '3200 kg @ 250kph' },
          { label: 'Actuator Time', val: '0.15 sec' }
        ],
        desc: 'Hydraulically actuated top flap opens an 85mm slot in designated DRS zones to slash aerodynamic drag down the straights.'
      },
      {
        id: 'tires-brakes',
        title: 'Pirelli Slicks & Carbon Brakes',
        subtitle: 'Extreme Thermal Management',
        position: new THREE.Vector3(0.92, 0.38, 1.65),
        camTarget: new THREE.Vector3(0.85, 0.35, 1.65),
        camPosition: new THREE.Vector3(2.1, 0.7, 2.1),
        badge: '5.5G DECEL',
        stats: [
          { label: 'Peak Brake Temp', val: '1,050 °C' },
          { label: 'Deceleration', val: '5.5 G' },
          { label: 'Rim Diameter', val: '18 inches' },
          { label: 'Compound Window', val: '100°C - 125°C' }
        ],
        desc: 'Over 1,400 miniature ventilation drillings per carbon rotor keep temperatures controlled during high-speed braking from 340 km/h.'
      }
    ];

    this.elements = [];
    this.createDomMarkers();
  }

  createDomMarkers() {
    this.hotspots.forEach((h, idx) => {
      const el = document.createElement('button');
      el.className = 'hotspot-marker';
      el.setAttribute('aria-label', h.title);
      el.innerHTML = `
        <div class="hotspot-pulse"></div>
        <div class="hotspot-core">${idx + 1}</div>
        <div class="hotspot-label">${h.badge}</div>
      `;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelectHotspot(h);
      });
      this.domContainer.appendChild(el);
      this.elements.push({ hotspot: h, el });
    });
  }

  update(camera, renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const tempVec = new THREE.Vector3();

    this.elements.forEach(({ hotspot, el }) => {
      tempVec.copy(hotspot.position);
      tempVec.project(camera);

      // Check if behind camera
      const isBehind = tempVec.z > 1.0;

      if (isBehind) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      const x = (tempVec.x * 0.5 + 0.5) * width;
      const y = (-(tempVec.y * 0.5) + 0.5) * height;

      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
    });
  }

  setVisible(visible) {
    this.elements.forEach(({ el }) => {
      el.style.display = visible ? 'flex' : 'none';
    });
  }
}

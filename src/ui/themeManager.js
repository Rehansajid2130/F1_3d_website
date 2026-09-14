// Dynamic Car-to-UI Theme Synchronizer
export const THEMES = {
  'oracle-crimson': {
    id: 'oracle-crimson',
    name: 'Oracle Stealth & Red',
    team: 'Oracle Red Racing',
    primaryColor: '#e10600',
    secondaryColor: '#ffd000',
    carBaseColor: '#1a2e56',     // Rich, distinct Midnight Racing Navy
    carSecondaryColor: '#e10600',// Blazing scarlet red
    carAccentColor: '#ffd000',   // Bright gold-yellow nosecone and airbox
    glowColor: 'rgba(225, 6, 0, 0.55)',
    bgGradient: 'radial-gradient(circle at 50% 20%, #171d33 0%, #080c18 70%, #03050a 100%)',
    spotlightColor: 0xff3b30,
    accentGlow: '#ff3344',
    borderGlow: 'rgba(225, 6, 0, 0.45)',
    badgeBg: 'rgba(225, 6, 0, 0.2)'
  },
  'silver-cyan': {
    id: 'silver-cyan',
    name: 'Silver Arrow & AMG Cyan',
    team: 'Mercedes-AMG F1',
    primaryColor: '#00f5d4',
    secondaryColor: '#ffffff',
    carBaseColor: '#dbe3ec',     // Brilliant Liquid Chrome Metallic Silver
    carSecondaryColor: '#00f5d4',// Vibrant Petronas Cyan
    carAccentColor: '#1e293b',   // Sleek carbon black trim
    glowColor: 'rgba(0, 245, 212, 0.55)',
    bgGradient: 'radial-gradient(circle at 50% 20%, #102428 0%, #071013 70%, #020507 100%)',
    spotlightColor: 0x00f5d4,
    accentGlow: '#38ef7d',
    borderGlow: 'rgba(0, 245, 212, 0.45)',
    badgeBg: 'rgba(0, 245, 212, 0.2)'
  },
  'papaya-velocity': {
    id: 'papaya-velocity',
    name: 'Papaya Velocity & Blue',
    team: 'McLaren Racing',
    primaryColor: '#ff7700',
    secondaryColor: '#00b4d8',
    carBaseColor: '#ff7700',     // Luminous McLaren Papaya Orange
    carSecondaryColor: '#00b4d8',// Aerodynamic Gulf Blue
    carAccentColor: '#1c1917',   // Carbon contrast
    glowColor: 'rgba(255, 119, 0, 0.55)',
    bgGradient: 'radial-gradient(circle at 50% 20%, #2e1804 0%, #120902 70%, #060301 100%)',
    spotlightColor: 0xff8c00,
    accentGlow: '#ffa94d',
    borderGlow: 'rgba(255, 119, 0, 0.45)',
    badgeBg: 'rgba(255, 119, 0, 0.2)'
  },
  'ferrari-rosso': {
    id: 'ferrari-rosso',
    name: 'Scuderia Corsa & Giallo',
    team: 'Scuderia Ferrari',
    primaryColor: '#ff1e1e',
    secondaryColor: '#ffd60a',
    carBaseColor: '#dc0000',     // High-Gloss Rosso Corsa
    carSecondaryColor: '#18181b',// Matte carbon sidepod undercuts
    carAccentColor: '#ffd60a',   // Giallo Modena yellow accents
    glowColor: 'rgba(255, 30, 30, 0.55)',
    bgGradient: 'radial-gradient(circle at 50% 20%, #280808 0%, #100303 70%, #050101 100%)',
    spotlightColor: 0xff3030,
    accentGlow: '#ff6b6b',
    borderGlow: 'rgba(255, 30, 30, 0.45)',
    badgeBg: 'rgba(255, 30, 30, 0.2)'
  },
  'racing-green': {
    id: 'racing-green',
    name: 'Aston Racing & Acid Lime',
    team: 'Aston Martin F1',
    primaryColor: '#007565',
    secondaryColor: '#ccff00',
    carBaseColor: '#007565',     // Vibrant British Racing Emerald Green
    carSecondaryColor: '#ccff00',// Electric Acid Lime
    carAccentColor: '#00332c',   // Deep green carbon shadow
    glowColor: 'rgba(204, 255, 0, 0.55)',
    bgGradient: 'radial-gradient(circle at 50% 20%, #092821 0%, #04120e 70%, #010604 100%)',
    spotlightColor: 0x00e6c3,
    accentGlow: '#ccff00',
    borderGlow: 'rgba(204, 255, 0, 0.45)',
    badgeBg: 'rgba(204, 255, 0, 0.2)'
  }
};

export class ThemeManager {
  constructor(initialThemeKey = 'oracle-crimson') {
    this.currentThemeKey = initialThemeKey;
    this.listeners = [];
  }

  getCurrentTheme() {
    return THEMES[this.currentThemeKey] || THEMES['oracle-crimson'];
  }

  setTheme(themeKey) {
    if (!THEMES[themeKey]) return;
    this.currentThemeKey = themeKey;
    const theme = THEMES[themeKey];

    // Update CSS custom variables on the document root
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent-glow', theme.accentGlow);
    root.style.setProperty('--color-glow', theme.glowColor);
    root.style.setProperty('--color-border-glow', theme.borderGlow);
    root.style.setProperty('--color-badge-bg', theme.badgeBg);
    root.style.setProperty('--bg-gradient', theme.bgGradient);

    // Notify registered listeners (e.g. 3D car materials, spotlight colors)
    this.listeners.forEach((callback) => callback(theme));
  }

  onThemeChange(callback) {
    this.listeners.push(callback);
  }
}

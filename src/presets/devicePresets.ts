export interface DevicePreset {
  id: string;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop' | 'watch' | 'paper' | 'social' | 'custom';
  width: number;
  height: number;
  density: number;
  bezelRadius: number;
  hasNotch?: boolean;
  hasDynamicIsland?: boolean;
  hasHomeIndicator?: boolean;
  hasWatchStrap?: boolean;
  iconName: string;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  // Phones
  {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 Pro Max',
    category: 'mobile',
    width: 440,
    height: 956,
    density: 3,
    bezelRadius: 55,
    hasDynamicIsland: true,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 / 15 Pro',
    category: 'mobile',
    width: 393,
    height: 852,
    density: 3,
    bezelRadius: 50,
    hasDynamicIsland: true,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'iphone-16-plus',
    name: 'iPhone 16 Plus / 15 Plus',
    category: 'mobile',
    width: 430,
    height: 932,
    density: 3,
    bezelRadius: 54,
    hasDynamicIsland: true,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'iphone-14',
    name: 'iPhone 14 / 13',
    category: 'mobile',
    width: 390,
    height: 844,
    density: 3,
    bezelRadius: 47,
    hasNotch: true,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE (3rd Gen)',
    category: 'mobile',
    width: 375,
    height: 667,
    density: 2,
    bezelRadius: 36,
    hasHomeIndicator: false,
    iconName: 'Smartphone'
  },
  {
    id: 'google-pixel-9-pro',
    name: 'Google Pixel 9 Pro',
    category: 'mobile',
    width: 412,
    height: 915,
    density: 3,
    bezelRadius: 44,
    hasDynamicIsland: false,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    category: 'mobile',
    width: 412,
    height: 919,
    density: 3.1,
    bezelRadius: 28,
    hasDynamicIsland: false,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'samsung-z-fold-5',
    name: 'Samsung Galaxy Z Fold (Open)',
    category: 'mobile',
    width: 768,
    height: 960,
    density: 2.5,
    bezelRadius: 24,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },
  {
    id: 'nothing-phone-2',
    name: 'Nothing Phone (2)',
    category: 'mobile',
    width: 412,
    height: 915,
    density: 2.6,
    bezelRadius: 40,
    hasHomeIndicator: true,
    iconName: 'Smartphone'
  },

  // Tablets
  {
    id: 'ipad-pro-13-m4',
    name: 'iPad Pro 13" (M4)',
    category: 'tablet',
    width: 1032,
    height: 1376,
    density: 2,
    bezelRadius: 36,
    hasHomeIndicator: true,
    iconName: 'Tablet'
  },
  {
    id: 'ipad-pro-11-m4',
    name: 'iPad Pro 11" (M4)',
    category: 'tablet',
    width: 834,
    height: 1210,
    density: 2,
    bezelRadius: 32,
    hasHomeIndicator: true,
    iconName: 'Tablet'
  },
  {
    id: 'ipad-air-11',
    name: 'iPad Air 11"',
    category: 'tablet',
    width: 820,
    height: 1180,
    density: 2,
    bezelRadius: 28,
    hasHomeIndicator: true,
    iconName: 'Tablet'
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini (6th Gen)',
    category: 'tablet',
    width: 744,
    height: 1133,
    density: 2,
    bezelRadius: 24,
    hasHomeIndicator: true,
    iconName: 'Tablet'
  },
  {
    id: 'surface-pro-9',
    name: 'Microsoft Surface Pro 9',
    category: 'tablet',
    width: 912,
    height: 1368,
    density: 2,
    bezelRadius: 20,
    hasHomeIndicator: false,
    iconName: 'Tablet'
  },
  {
    id: 'samsung-tab-s9',
    name: 'Samsung Galaxy Tab S9 Ultra',
    category: 'tablet',
    width: 1100,
    height: 1760,
    density: 2,
    bezelRadius: 26,
    hasNotch: true,
    hasHomeIndicator: true,
    iconName: 'Tablet'
  },

  // Desktop & Laptop
  {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16"',
    category: 'desktop',
    width: 1728,
    height: 1117,
    density: 2,
    bezelRadius: 24,
    hasNotch: true,
    iconName: 'Laptop'
  },
  {
    id: 'macbook-pro-14',
    name: 'MacBook Pro 14"',
    category: 'desktop',
    width: 1512,
    height: 982,
    density: 2,
    bezelRadius: 22,
    hasNotch: true,
    iconName: 'Laptop'
  },
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13"',
    category: 'desktop',
    width: 1280,
    height: 832,
    density: 2,
    bezelRadius: 20,
    hasNotch: true,
    iconName: 'Laptop'
  },
  {
    id: 'imac-24',
    name: 'iMac 24" (4.5K)',
    category: 'desktop',
    width: 2240,
    height: 1260,
    density: 2,
    bezelRadius: 18,
    iconName: 'Monitor'
  },
  {
    id: 'desktop-fhd',
    name: 'Desktop (1920 × 1080)',
    category: 'desktop',
    width: 1920,
    height: 1080,
    density: 1,
    bezelRadius: 12,
    iconName: 'Monitor'
  },
  {
    id: 'desktop-2k',
    name: 'Desktop 2K (2560 × 1440)',
    category: 'desktop',
    width: 2560,
    height: 1440,
    density: 1,
    bezelRadius: 12,
    iconName: 'Monitor'
  },
  {
    id: 'desktop-4k',
    name: 'Desktop 4K UHD (3840 × 2160)',
    category: 'desktop',
    width: 3840,
    height: 2160,
    density: 1,
    bezelRadius: 12,
    iconName: 'Tv'
  },
  {
    id: 'desktop-hd',
    name: 'Desktop (1440 × 900)',
    category: 'desktop',
    width: 1440,
    height: 900,
    density: 1,
    bezelRadius: 10,
    iconName: 'Monitor'
  },

  // Smartwatches & Wearables
  {
    id: 'apple-watch-ultra-49mm',
    name: 'Apple Watch Ultra 2 (49mm)',
    category: 'watch',
    width: 410,
    height: 502,
    density: 2,
    bezelRadius: 60,
    hasWatchStrap: true,
    iconName: 'Watch'
  },
  {
    id: 'apple-watch-46mm',
    name: 'Apple Watch Series 10 (46mm)',
    category: 'watch',
    width: 416,
    height: 496,
    density: 2,
    bezelRadius: 58,
    hasWatchStrap: true,
    iconName: 'Watch'
  },
  {
    id: 'pixel-watch-3',
    name: 'Google Pixel Watch 3 (45mm)',
    category: 'watch',
    width: 384,
    height: 384,
    density: 2,
    bezelRadius: 192,
    hasWatchStrap: true,
    iconName: 'Watch'
  },

  // Social Media & Presentation
  {
    id: 'presentation-16-9',
    name: 'Presentation Slide (16:9)',
    category: 'social',
    width: 1920,
    height: 1080,
    density: 1,
    bezelRadius: 8,
    iconName: 'Presentation'
  },
  {
    id: 'dribbble-shot',
    name: 'Dribbble Shot (1600 × 1200)',
    category: 'social',
    width: 1600,
    height: 1200,
    density: 1,
    bezelRadius: 12,
    iconName: 'Image'
  },
  {
    id: 'instagram-post',
    name: 'Instagram Post (1080 × 1080)',
    category: 'social',
    width: 1080,
    height: 1080,
    density: 1,
    bezelRadius: 8,
    iconName: 'Square'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story (1080 × 1920)',
    category: 'social',
    width: 1080,
    height: 1920,
    density: 1,
    bezelRadius: 8,
    iconName: 'Smartphone'
  },
  {
    id: 'twitter-header',
    name: 'Twitter / X Header (1500 × 500)',
    category: 'social',
    width: 1500,
    height: 500,
    density: 1,
    bezelRadius: 8,
    iconName: 'Layout'
  },

  // Paper Presets
  {
    id: 'paper-a4',
    name: 'A4 Document (595 × 842 pt)',
    category: 'paper',
    width: 595,
    height: 842,
    density: 1,
    bezelRadius: 4,
    iconName: 'FileText'
  },
  {
    id: 'paper-letter',
    name: 'US Letter (612 × 792 pt)',
    category: 'paper',
    width: 612,
    height: 792,
    density: 1,
    bezelRadius: 4,
    iconName: 'FileText'
  },

  // Custom Artboard
  {
    id: 'custom-artboard',
    name: 'Custom Frame (800 × 600)',
    category: 'custom',
    width: 800,
    height: 600,
    density: 1,
    bezelRadius: 16,
    iconName: 'Frame'
  }
];

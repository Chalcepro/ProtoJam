import { UIElementType, UIElement } from '../types/components';

export interface ComponentTemplate {
  type: UIElementType;
  title: string;
  category: 'Structure' | 'Navigation' | 'Forms & Inputs' | 'Actions' | 'Content & Media' | 'FigJam Tools';
  description: string;
  iconName: string;
  defaultWidth: number;
  defaultHeight: number;
  createDefaultElement: (id: string, x: number, y: number, parentId?: string) => UIElement;
}

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  // ---------------- SHAPES & VECTORS ----------------
  {
    type: 'section',
    title: 'Organizing Section',
    category: 'Structure',
    description: 'A large labeled area to sort, organize, and group artboards or screens',
    iconName: 'LayoutGrid',
    defaultWidth: 1000,
    defaultHeight: 950,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Section 1',
      type: 'section',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 1000,
        height: 950,
        fillColor: 'rgba(235, 235, 236, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.15)',
        textColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        label: 'Section: Onboarding & Auth'
      }
    })
  },
  {
    type: 'rectangle',
    title: 'Rectangle Shape',
    category: 'Structure',
    description: 'Basic geometric rectangle with corner radius and stroke',
    iconName: 'Square',
    defaultWidth: 120,
    defaultHeight: 120,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Rectangle',
      type: 'rectangle',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 120,
        height: 120,
        fillColor: 'rgb(235, 235, 236)',
        borderRadius: 12,
        borderWidth: 0,
        borderColor: 'transparent'
      },
      semanticProps: {}
    })
  },
  {
    type: 'ellipse',
    title: 'Ellipse / Circle',
    category: 'Structure',
    description: 'Circular geometric shape with vector fill and stroke',
    iconName: 'Circle',
    defaultWidth: 100,
    defaultHeight: 100,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Ellipse',
      type: 'ellipse',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 100,
        height: 100,
        fillColor: 'rgb(235, 235, 236)',
        borderRadius: 9999
      },
      semanticProps: {}
    })
  },
  {
    type: 'line',
    title: 'Line',
    category: 'Structure',
    description: 'Straight line with configurable stroke thickness, dash, and caps',
    iconName: 'Minus',
    defaultWidth: 160,
    defaultHeight: 2,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Line',
      type: 'line',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 160,
        height: 2,
        fillColor: 'rgb(235, 235, 236)',
        borderWidth: 0
      },
      semanticProps: {}
    })
  },
  {
    type: 'arrow',
    title: 'Arrow Line',
    category: 'Structure',
    description: 'Directional arrow with arrowhead endpoints',
    iconName: 'ArrowRight',
    defaultWidth: 160,
    defaultHeight: 24,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Arrow',
      type: 'arrow',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 160,
        height: 24,
        borderColor: 'rgb(235, 235, 236)',
        borderWidth: 2,
        textColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        connectorEndArrow: true
      }
    })
  },
  {
    type: 'polygon',
    title: 'Polygon / Triangle',
    category: 'Structure',
    description: 'Multi-sided polygon or triangle vector shape',
    iconName: 'Triangle',
    defaultWidth: 100,
    defaultHeight: 100,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Polygon',
      type: 'polygon',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 100,
        height: 100,
        fillColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        pointCount: 3
      }
    })
  },
  {
    type: 'star',
    title: 'Star Vector',
    category: 'Structure',
    description: 'Multi-point star vector shape with inner radius ratio',
    iconName: 'Star',
    defaultWidth: 100,
    defaultHeight: 100,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Star',
      type: 'star',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 100,
        height: 100,
        fillColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        pointCount: 5,
        innerRadius: 0.4
      }
    })
  },
  {
    type: 'text',
    title: 'Typography / Text',
    category: 'Content & Media',
    description: 'Standalone text block with direct inline editing and Google Fonts',
    iconName: 'Type',
    defaultWidth: 200,
    defaultHeight: 32,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Text',
      type: 'text',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 200,
        height: 32,
        fontSize: 16,
        fontWeight: 500,
        textColor: 'rgb(235, 235, 236)',
        fontFamily: 'Inter, sans-serif'
      },
      semanticProps: {
        label: ''
      }
    })
  },

  // ---------------- STRUCTURE ----------------
  {
    type: 'container',
    title: 'Container',
    category: 'Structure',
    description: 'Plain auto-layout box for grouping elements — no styling opinions, just structure',
    iconName: 'Frame',
    defaultWidth: 320,
    defaultHeight: 200,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Container',
      type: 'container',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 200,
        fillColor: 'rgba(235, 235, 236, 0.02)',
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(235, 235, 236, 0.15)',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      },
      semanticProps: {}
    })
  },
  {
    type: 'card',
    title: 'Container Card',
    category: 'Structure',
    description: 'Elevated card container for grouping UI elements',
    iconName: 'Square',
    defaultWidth: 350,
    defaultHeight: 180,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Container Card',
      type: 'card',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 350,
        height: 180,
        fillColor: 'rgba(235, 235, 236, 0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.1)',
        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      },
      semanticProps: {
        label: 'Card Title'
      }
    })
  },
  {
    type: 'modal',
    title: 'Dialog / Modal Overlay',
    category: 'Structure',
    description: 'Popup dialog overlay with header, body, and action buttons',
    iconName: 'AppWindow',
    defaultWidth: 340,
    defaultHeight: 240,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Modal Dialog',
      type: 'modal',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 340,
        height: 240,
        fillColor: 'rgb(20, 20, 19)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      },
      semanticProps: {
        label: 'Confirm Action',
        placeholder: 'Are you sure you want to proceed with this operation?'
      }
    })
  },
  {
    type: 'bottomSheet',
    title: 'Mobile Bottom Sheet',
    category: 'Structure',
    description: 'Draggable bottom sheet drawer with grab handle',
    iconName: 'PanelBottom',
    defaultWidth: 390,
    defaultHeight: 280,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Bottom Sheet',
      type: 'bottomSheet',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 390,
        height: 280,
        fillColor: 'rgb(20, 20, 19)',
        borderRadius: { tl: 24, tr: 24, bl: 0, br: 0 },
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.12)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
        padding: { top: 12, right: 20, bottom: 24, left: 20 },
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      },
      semanticProps: {
        label: 'Select Payment Method'
      }
    })
  },

  // ---------------- NAVIGATION ----------------
  {
    type: 'navbar',
    title: 'Header / Navbar',
    category: 'Navigation',
    description: 'Header bar with brand, page title, and action icons',
    iconName: 'PanelTop',
    defaultWidth: 393,
    defaultHeight: 56,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Top Navigation',
      type: 'navbar',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 393,
        height: 56,
        fillColor: 'rgba(235, 235, 236, 0.03)',
        borderColor: 'rgba(235, 235, 236, 0.1)',
        borderWidth: 1,
        padding: { top: 8, right: 16, bottom: 8, left: 16 },
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        textColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        label: 'Dashboard',
        iconName: 'ArrowLeft'
      }
    })
  },
  {
    type: 'bottomTabs',
    title: 'Bottom Tab Bar',
    category: 'Navigation',
    description: 'Mobile navigation bar with icons and badges',
    iconName: 'Navigation',
    defaultWidth: 393,
    defaultHeight: 68,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Bottom Tab Bar',
      type: 'bottomTabs',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 393,
        height: 68,
        fillColor: 'rgba(20, 20, 19, 0.95)',
        borderColor: 'rgba(235, 235, 236, 0.1)',
        borderWidth: 1,
        padding: { top: 8, right: 12, bottom: 8, left: 12 },
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        textColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        options: [
          { label: 'Home', value: 'home', icon: 'Home' },
          { label: 'Analytics', value: 'analytics', icon: 'BarChart3' },
          { label: 'Wallet', value: 'wallet', icon: 'Wallet' },
          { label: 'Profile', value: 'profile', icon: 'User' }
        ],
        value: 'home'
      }
    })
  },
  {
    type: 'segmentedControl',
    title: 'Segmented Pill Tabs',
    category: 'Navigation',
    description: 'iOS style toggleable tab segments',
    iconName: 'Columns3',
    defaultWidth: 340,
    defaultHeight: 40,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Segmented Control',
      type: 'segmentedControl',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 340,
        height: 40,
        fillColor: 'rgba(235, 235, 236, 0.05)',
        borderRadius: 12,
        padding: { top: 4, right: 4, bottom: 4, left: 4 },
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
      },
      semanticProps: {
        options: [
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' }
        ],
        value: 'daily'
      }
    })
  },

  // ---------------- FORMS & INPUTS ----------------
  {
    type: 'textInput',
    title: 'Text Input Field',
    category: 'Forms & Inputs',
    description: 'Input with floating label, placeholder, and icon',
    iconName: 'FormInput',
    defaultWidth: 320,
    defaultHeight: 52,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Text Input',
      type: 'textInput',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 52,
        fillColor: 'rgba(235, 235, 236, 0.04)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.15)',
        textColor: 'rgb(235, 235, 236)',
        fontSize: 14,
        padding: { top: 0, right: 14, bottom: 0, left: 14 }
      },
      semanticProps: {
        label: 'Email Address',
        placeholder: 'alex@example.com',
        value: '',
        iconName: 'Mail'
      }
    })
  },
  {
    type: 'passwordInput',
    title: 'Password Input',
    category: 'Forms & Inputs',
    description: 'Secure input with eye visibility toggle',
    iconName: 'KeyRound',
    defaultWidth: 320,
    defaultHeight: 52,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Password Input',
      type: 'passwordInput',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 52,
        fillColor: 'rgba(235, 235, 236, 0.04)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.15)',
        textColor: 'rgb(235, 235, 236)',
        fontSize: 14,
        padding: { top: 0, right: 14, bottom: 0, left: 14 }
      },
      semanticProps: {
        label: 'Password',
        placeholder: '••••••••••••',
        value: 'SecretPass123'
      }
    })
  },
  {
    type: 'searchBar',
    title: 'Search Bar',
    category: 'Forms & Inputs',
    description: 'Search field with magnifying glass and quick filter',
    iconName: 'Search',
    defaultWidth: 340,
    defaultHeight: 46,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Search Bar',
      type: 'searchBar',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 340,
        height: 46,
        fillColor: 'rgba(235, 235, 236, 0.05)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.15)',
        textColor: 'rgb(235, 235, 236)',
        fontSize: 14,
        padding: { top: 0, right: 16, bottom: 0, left: 16 }
      },
      semanticProps: {
        placeholder: 'Search transactions, users, screens...',
        iconName: 'Search'
      }
    })
  },
  {
    type: 'toggleSwitch',
    title: 'Switch Toggle',
    category: 'Forms & Inputs',
    description: 'Smooth toggle switch for settings and features',
    iconName: 'ToggleRight',
    defaultWidth: 260,
    defaultHeight: 40,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Toggle Switch',
      type: 'toggleSwitch',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 260,
        height: 40,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      },
      semanticProps: {
        label: 'Push Notifications',
        checked: true
      }
    })
  },
  {
    type: 'slider',
    title: 'Range Slider',
    category: 'Forms & Inputs',
    description: 'Interactive value slider with percentage display',
    iconName: 'SlidersHorizontal',
    defaultWidth: 300,
    defaultHeight: 48,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Range Slider',
      type: 'slider',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 300,
        height: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      },
      semanticProps: {
        label: 'Percentage Value',
        value: 75,
        min: 0,
        max: 100,
        step: 1
      }
    })
  },
  {
    type: 'selectDropdown',
    title: 'Select Dropdown',
    category: 'Forms & Inputs',
    description: 'Selection box with down chevron and options list',
    iconName: 'ChevronDownSquare',
    defaultWidth: 320,
    defaultHeight: 50,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Select Dropdown',
      type: 'selectDropdown',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 50,
        fillColor: 'rgba(235, 235, 236, 0.04)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.15)',
        textColor: 'rgb(235, 235, 236)',
        fontSize: 14,
        padding: { top: 0, right: 14, bottom: 0, left: 14 }
      },
      semanticProps: {
        label: 'Currency',
        value: 'USD ($)',
        options: [
          { label: 'USD ($)', value: 'USD' },
          { label: 'EUR (€)', value: 'EUR' },
          { label: 'GBP (£)', value: 'GBP' },
          { label: 'JPY (¥)', value: 'JPY' }
        ]
      }
    })
  },

  // ---------------- ACTIONS ----------------
  {
    type: 'button',
    title: 'Primary Button',
    category: 'Actions',
    description: 'Prominent call-to-action button with hover effect',
    iconName: 'MousePointerClick',
    defaultWidth: 320,
    defaultHeight: 50,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Primary Button',
      type: 'button',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 50,
        fillColor: 'rgb(235, 235, 236)',
        borderRadius: 14,
        textColor: 'rgb(20, 20, 19)',
        fontSize: 15,
        fontWeight: 700,
        boxShadow: '0 8px 24px -4px rgba(235, 235, 236, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      },
      semanticProps: {
        label: 'Continue',
        iconName: 'ArrowRight',
        iconPosition: 'right',
        variant: 'primary'
      }
    })
  },
  {
    type: 'button',
    title: 'Secondary / Outline Button',
    category: 'Actions',
    description: 'Subtle outline button for secondary choices',
    iconName: 'RectangleHorizontal',
    defaultWidth: 320,
    defaultHeight: 50,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Secondary Button',
      type: 'button',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 50,
        fillColor: 'transparent',
        borderWidth: 1.5,
        borderColor: 'rgba(235, 235, 236, 0.25)',
        borderRadius: 14,
        textColor: 'rgb(235, 235, 236)',
        fontSize: 15,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      },
      semanticProps: {
        label: 'Cancel / Return',
        variant: 'outline'
      }
    })
  },
  {
    type: 'fab',
    title: 'Floating Action Button (FAB)',
    category: 'Actions',
    description: 'Circular floating button with elevated drop shadow',
    iconName: 'PlusCircle',
    defaultWidth: 56,
    defaultHeight: 56,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'FAB Action',
      type: 'fab',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 56,
        height: 56,
        fillColor: 'rgb(235, 235, 236)',
        borderRadius: 28,
        textColor: 'rgb(20, 20, 19)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      semanticProps: {
        iconName: 'Plus'
      }
    })
  },

  // ---------------- CONTENT & MEDIA ----------------
  {
    type: 'heading',
    title: 'Display Typography',
    category: 'Content & Media',
    description: 'Bold expressive hero headline text',
    iconName: 'Heading1',
    defaultWidth: 320,
    defaultHeight: 48,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Headline',
      type: 'heading',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 320,
        height: 48,
        fontSize: 28,
        fontWeight: 700,
        textColor: 'rgb(235, 235, 236)',
        letterSpacing: -0.5
      },
      semanticProps: {
        label: 'NextGen Financial Suite'
      }
    })
  },
  {
    type: 'metricCard',
    title: 'Metric Stat Widget',
    category: 'Content & Media',
    description: 'Financial / SaaS metric card with sparkline & percentage change',
    iconName: 'TrendingUp',
    defaultWidth: 165,
    defaultHeight: 110,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Metric Card',
      type: 'metricCard',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 165,
        height: 110,
        fillColor: 'rgba(235, 235, 236, 0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.1)',
        padding: { top: 12, right: 14, bottom: 12, left: 14 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        label: 'Total Balance',
        value: '$48,920.50',
        placeholder: '+14.2% this week',
        variant: 'success'
      }
    })
  },
  {
    type: 'avatar',
    title: 'User Profile Avatar',
    category: 'Content & Media',
    description: 'Circular user avatar with online status indicator',
    iconName: 'UserCircle2',
    defaultWidth: 48,
    defaultHeight: 48,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'User Avatar',
      type: 'avatar',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgb(235, 235, 236)'
      },
      semanticProps: {
        src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        label: 'Sarah Connor',
        checked: true
      }
    })
  },
  {
    type: 'badge',
    title: 'Status Badge / Chip',
    category: 'Content & Media',
    description: 'Pill badge indicating status',
    iconName: 'Tag',
    defaultWidth: 84,
    defaultHeight: 28,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Status Badge',
      type: 'badge',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 84,
        height: 28,
        fillColor: 'rgba(235, 235, 236, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(235, 235, 236, 0.2)',
        borderRadius: 14,
        textColor: 'rgb(235, 235, 236)',
        fontSize: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      semanticProps: {
        label: 'Active',
        variant: 'success'
      }
    })
  },

  // ---------------- FIGJAM COLLABORATION & FLOW ----------------
  {
    type: 'stickyNote',
    title: 'FigJam Sticky Note',
    category: 'FigJam Tools',
    description: 'Handwritten ideation note with author and color styling',
    iconName: 'StickyNote',
    defaultWidth: 180,
    defaultHeight: 180,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Sticky Note',
      type: 'stickyNote',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 180,
        height: 180,
        fillColor: 'rgb(235, 235, 236)',
        borderRadius: 4,
        boxShadow: '3px 5px 15px rgba(0,0,0,0.4)',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        fontFamily: 'Caveat, cursive',
        fontSize: 18,
        textColor: 'rgb(20, 20, 19)'
      },
      semanticProps: {
        label: '💡 UX Note:\nUser should see instant biometrics authentication before pin screen.',
        author: 'Lead Designer',
        stickyColor: 'white'
      }
    })
  },
  {
    type: 'connector',
    title: 'Flow Connector Arrow',
    category: 'FigJam Tools',
    description: 'Curved flow diagram connector with arrow and description tag',
    iconName: 'GitFork',
    defaultWidth: 200,
    defaultHeight: 80,
    createDefaultElement: (id, x, y, parentId) => ({
      id,
      name: 'Flow Connector',
      type: 'connector',
      parentId,
      interactions: [],
      style: {
        x, y,
        width: 200,
        height: 80,
        borderColor: 'rgb(235, 235, 236)',
        borderWidth: 2
      },
      semanticProps: {
        connectorType: 'curved',
        connectorEndArrow: true,
        connectorLabel: 'On Success'
      }
    })
  }
];

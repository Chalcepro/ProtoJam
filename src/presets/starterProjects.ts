import { DeviceFrame, UIElement } from '../types/components';
import { PrototypeFlow } from '../types/prototype';

export interface StarterProject {
  id: string;
  name: string;
  description: string;
  category: 'Mobile' | 'Web & SaaS' | 'E-Commerce';
  thumbnailColor: string;
  frames: DeviceFrame[];
  elements: UIElement[];
  flows: PrototypeFlow[];
}

export const STARTER_PROJECTS: StarterProject[] = [
  {
    id: 'crypto-neobank-app',
    name: 'ApexPay - NextGen Mobile Banking',
    description: 'Complete multi-screen fintech flow: Onboarding, Dashboard, Send Money Modal, and Success Screen with interactive transitions.',
    category: 'Mobile',
    thumbnailColor: '#ebebec',
    flows: [
      {
        id: 'flow-main',
        name: 'Transfer Money Flow',
        startingFrameId: 'frame-screen-1',
        description: 'Complete money transfer journey from home screen to confirmation.'
      }
    ],
    frames: [
      {
        id: 'frame-screen-1',
        name: '1. Home Dashboard',
        deviceType: 'mobile',
        presetName: 'iPhone 16 / 15 Pro',
        x: 100,
        y: 100,
        width: 393,
        height: 852,
        orientation: 'portrait',
        backgroundColor: '#141413',
        isStartingFrame: true,
        showDeviceMockupBezel: true,
        elementIds: ['el-nav-1', 'el-balance-card', 'el-action-row', 'el-recent-header', 'el-tx-1', 'el-tx-2', 'el-bottom-nav']
      },
      {
        id: 'frame-screen-2',
        name: '2. Send Money / Transfer',
        deviceType: 'mobile',
        presetName: 'iPhone 16 / 15 Pro',
        x: 600,
        y: 100,
        width: 393,
        height: 852,
        orientation: 'portrait',
        backgroundColor: '#141413',
        showDeviceMockupBezel: true,
        elementIds: ['el-nav-2', 'el-recipient-card', 'el-amount-input', 'el-note-input', 'el-btn-confirm', 'el-btn-cancel-transfer']
      },
      {
        id: 'frame-screen-3',
        name: '3. Transfer Confirmed',
        deviceType: 'mobile',
        presetName: 'iPhone 16 / 15 Pro',
        x: 1100,
        y: 100,
        width: 393,
        height: 852,
        orientation: 'portrait',
        backgroundColor: '#141413',
        showDeviceMockupBezel: true,
        elementIds: ['el-success-badge', 'el-success-heading', 'el-success-amount', 'el-receipt-card', 'el-btn-done']
      }
    ],
    elements: [
      // ---------- SCREEN 1: HOME DASHBOARD ----------
      {
        id: 'el-nav-1',
        name: 'Home Header',
        type: 'navbar',
        parentId: 'frame-screen-1',
        interactions: [],
        style: {
          x: 20,
          y: 54,
          width: 353,
          height: 50,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Good morning, Alex ⚡',
          iconName: 'Bell'
        }
      },
      {
        id: 'el-balance-card',
        name: 'Total Portfolio Card',
        type: 'card',
        parentId: 'frame-screen-1',
        interactions: [],
        style: {
          x: 20,
          y: 120,
          width: 353,
          height: 190,
          fillColor: 'rgba(235, 235, 236, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.15)',
          borderRadius: 24,
          boxShadow: '0 20px 35px -10px rgba(0,0,0,0.6)',
          padding: { top: 20, right: 20, bottom: 20, left: 20 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Total Net Worth',
          value: '$84,392.80',
          placeholder: '+18.4% (+$12,450.00)'
        }
      },
      {
        id: 'el-action-row',
        name: 'Quick Action - Send Button',
        type: 'button',
        parentId: 'frame-screen-1',
        interactions: [
          {
            id: 'wire-to-screen-2',
            trigger: 'onClick',
            action: 'navigate',
            targetFrameId: 'frame-screen-2',
            transition: 'slideLeft',
            durationMs: 300,
            easing: 'spring'
          }
        ],
        style: {
          x: 20,
          y: 330,
          width: 353,
          height: 52,
          fillColor: '#ebebec',
          borderRadius: 16,
          textColor: '#141413',
          fontWeight: 700,
          fontSize: 15,
          boxShadow: '0 8px 24px -4px rgba(235, 235, 236, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        },
        semanticProps: {
          label: '💸 Send Money (Interactive)',
          iconName: 'Send',
          iconPosition: 'left'
        }
      },
      {
        id: 'el-recent-header',
        name: 'Recent Activity Label',
        type: 'heading',
        parentId: 'frame-screen-1',
        interactions: [],
        style: {
          x: 24,
          y: 410,
          width: 345,
          height: 28,
          fontSize: 18,
          fontWeight: 700,
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Recent Transactions'
        }
      },
      {
        id: 'el-tx-1',
        name: 'Apple Store Transaction',
        type: 'card',
        parentId: 'frame-screen-1',
        interactions: [],
        style: {
          x: 20,
          y: 450,
          width: 353,
          height: 72,
          fillColor: 'rgba(235, 235, 236, 0.04)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.1)',
          padding: { top: 12, right: 16, bottom: 12, left: 16 },
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Apple Store 5th Ave',
          placeholder: 'Hardware purchase • Today',
          value: '-$1,299.00',
          iconName: 'Laptop'
        }
      },
      {
        id: 'el-tx-2',
        name: 'Stripe Payout Transaction',
        type: 'card',
        parentId: 'frame-screen-1',
        interactions: [],
        style: {
          x: 20,
          y: 534,
          width: 353,
          height: 72,
          fillColor: 'rgba(235, 235, 236, 0.04)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.1)',
          padding: { top: 12, right: 16, bottom: 12, left: 16 },
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Stripe Direct Deposit',
          placeholder: 'Software sales payout',
          value: '+$4,580.00',
          iconName: 'CreditCard'
        }
      },
      {
        id: 'el-bottom-nav',
        name: 'Bottom Navigation Tabs',
        type: 'bottomTabs',
        parentId: 'frame-screen-1',
        interactions: [],
        style: {
          x: 0,
          y: 770,
          width: 393,
          height: 82,
          fillColor: 'rgba(20, 20, 19, 0.95)',
          backdropBlur: 20,
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.1)',
          padding: { top: 10, right: 24, bottom: 20, left: 24 },
          textColor: '#ebebec'
        },
        semanticProps: {
          value: 'home',
          options: [
            { label: 'Home', value: 'home', icon: 'Home' },
            { label: 'Cards', value: 'cards', icon: 'CreditCard' },
            { label: 'Analytics', value: 'analytics', icon: 'TrendingUp' },
            { label: 'Profile', value: 'profile', icon: 'User' }
          ]
        }
      },

      // ---------- SCREEN 2: SEND MONEY / TRANSFER ----------
      {
        id: 'el-nav-2',
        name: 'Transfer Header',
        type: 'navbar',
        parentId: 'frame-screen-2',
        interactions: [],
        style: {
          x: 20,
          y: 54,
          width: 353,
          height: 50,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Send Payment',
          iconName: 'ArrowLeft'
        }
      },
      {
        id: 'el-recipient-card',
        name: 'Recipient Profile Row',
        type: 'card',
        parentId: 'frame-screen-2',
        interactions: [],
        style: {
          x: 20,
          y: 120,
          width: 353,
          height: 80,
          fillColor: 'rgba(235, 235, 236, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.15)',
          borderRadius: 20,
          padding: { top: 14, right: 18, bottom: 14, left: 18 },
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Sending To: Sarah Jenkins',
          placeholder: 'sarah.j@designstudio.io • Verified',
          iconName: 'User'
        }
      },
      {
        id: 'el-amount-input',
        name: 'Transfer Amount Input',
        type: 'textInput',
        parentId: 'frame-screen-2',
        interactions: [],
        style: {
          x: 20,
          y: 220,
          width: 353,
          height: 90,
          fillColor: 'rgba(235, 235, 236, 0.04)',
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.15)',
          borderRadius: 20,
          padding: { top: 16, right: 20, bottom: 16, left: 20 },
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Transfer Amount (USD)',
          placeholder: '$500.00',
          value: '$500.00'
        }
      },
      {
        id: 'el-note-input',
        name: 'Payment Reference Note',
        type: 'textInput',
        parentId: 'frame-screen-2',
        interactions: [],
        style: {
          x: 20,
          y: 330,
          width: 353,
          height: 70,
          fillColor: 'rgba(235, 235, 236, 0.04)',
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.15)',
          borderRadius: 16,
          padding: { top: 12, right: 16, bottom: 12, left: 16 },
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Reference Note',
          placeholder: 'Freelance UI/UX Design Sprint'
        }
      },
      {
        id: 'el-btn-confirm',
        name: 'Confirm Transfer Button',
        type: 'button',
        parentId: 'frame-screen-2',
        interactions: [
          {
            id: 'wire-to-screen-3',
            trigger: 'onClick',
            action: 'navigate',
            targetFrameId: 'frame-screen-3',
            transition: 'slideLeft',
            durationMs: 300,
            easing: 'spring'
          }
        ],
        style: {
          x: 20,
          y: 650,
          width: 353,
          height: 56,
          fillColor: '#ebebec',
          borderRadius: 18,
          textColor: '#141413',
          fontWeight: 700,
          fontSize: 16,
          boxShadow: '0 10px 30px -5px rgba(235, 235, 236, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        semanticProps: {
          label: 'Confirm & Send $500.00 ➔',
          iconPosition: 'right'
        }
      },
      {
        id: 'el-btn-cancel-transfer',
        name: 'Back to Home Button',
        type: 'button',
        parentId: 'frame-screen-2',
        interactions: [
          {
            id: 'wire-back-home',
            trigger: 'onClick',
            action: 'navigate',
            targetFrameId: 'frame-screen-1',
            transition: 'slideRight',
            durationMs: 250
          }
        ],
        style: {
          x: 20,
          y: 720,
          width: 353,
          height: 48,
          fillColor: 'transparent',
          borderRadius: 14,
          textColor: 'rgba(235, 235, 236, 0.65)',
          fontWeight: 500,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        semanticProps: {
          label: 'Cancel & Return'
        }
      },

      // ---------- SCREEN 3: TRANSFER CONFIRMED ----------
      {
        id: 'el-success-badge',
        name: 'Success Icon Badge',
        type: 'badge',
        parentId: 'frame-screen-3',
        interactions: [],
        style: {
          x: 146,
          y: 120,
          width: 100,
          height: 100,
          fillColor: '#ebebec',
          borderRadius: 50,
          boxShadow: '0 20px 40px -10px rgba(235, 235, 236, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textColor: '#141413'
        },
        semanticProps: {
          iconName: 'Check',
          label: ''
        }
      },
      {
        id: 'el-success-heading',
        name: 'Success Heading',
        type: 'heading',
        parentId: 'frame-screen-3',
        interactions: [],
        style: {
          x: 20,
          y: 240,
          width: 353,
          height: 40,
          fontSize: 24,
          fontWeight: 800,
          textAlign: 'center',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Payment Sent Successfully!'
        }
      },
      {
        id: 'el-success-amount',
        name: 'Amount Big Display',
        type: 'text',
        parentId: 'frame-screen-3',
        interactions: [],
        style: {
          x: 20,
          y: 285,
          width: 353,
          height: 32,
          fontSize: 32,
          fontWeight: 900,
          textAlign: 'center',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: '$500.00 USD'
        }
      },
      {
        id: 'el-receipt-card',
        name: 'Transaction Receipt Details',
        type: 'card',
        parentId: 'frame-screen-3',
        interactions: [],
        style: {
          x: 20,
          y: 350,
          width: 353,
          height: 180,
          fillColor: 'rgba(235, 235, 236, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(235, 235, 236, 0.15)',
          borderRadius: 20,
          padding: { top: 20, right: 20, bottom: 20, left: 20 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          textColor: '#ebebec'
        },
        semanticProps: {
          label: 'Transaction ID: APX-99824',
          placeholder: 'Recipient: Sarah Jenkins\nFee: $0.00 (Instant Zero Fee)\nStatus: Settled'
        }
      },
      {
        id: 'el-btn-done',
        name: 'Done Button',
        type: 'button',
        parentId: 'frame-screen-3',
        interactions: [
          {
            id: 'wire-success-home',
            trigger: 'onClick',
            action: 'navigate',
            targetFrameId: 'frame-screen-1',
            transition: 'slideRight',
            durationMs: 300
          }
        ],
        style: {
          x: 20,
          y: 680,
          width: 353,
          height: 56,
          fillColor: '#ebebec',
          borderRadius: 18,
          textColor: '#141413',
          fontWeight: 700,
          fontSize: 16,
          boxShadow: '0 10px 30px -5px rgba(235, 235, 236, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        semanticProps: {
          label: 'Back to Home Dashboard ➔'
        }
      }
    ]
  }
];

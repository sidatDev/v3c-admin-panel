import localFont from 'next/font/local';

export const tasaDisplay = localFont({
  src: [
    {
      path: '../../public/assets/fonts/TASAOrbiterDisplay-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDisplay-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDisplay-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDisplay-Bold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDisplay-Black.otf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-tasa-display',
  display: 'swap',
});

export const tasaDeck = localFont({
  src: [
    {
      path: '../../public/assets/fonts/TASAOrbiterDeck-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDeck-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDeck-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterDeck-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-tasa-deck',
  display: 'swap',
});

export const tasaText = localFont({
  src: [
    {
      path: '../../public/assets/fonts/TASAOrbiterText-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterText-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterText-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/TASAOrbiterText-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-tasa-text',
  display: 'swap',
});

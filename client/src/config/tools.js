/**
 * PDFCraft Studio - Extensible Tool Registry
 * Add new PDF tools here to automatically render them in the dashboard and enable their routes.
 */

export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'organize', label: 'Organize & Manage' },
  { id: 'optimize', label: 'Optimize & Repair' },
  { id: 'convert', label: 'Convert & Export' },
  { id: 'security', label: 'Security & Sign' },
];

export const TOOLS = [
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    badge: 'Active',
    badgeType: 'active', // active | popular | coming-soon
    iconName: 'Files',
    accentColor: '#6366f1',
    description: 'Combine multiple PDF documents into a single unified file in your exact specified order.',
    category: 'organize',
    isAvailable: true,
    highlight: 'Instant reordering & live preview'
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    badge: 'Coming Soon',
    badgeType: 'coming-soon',
    iconName: 'Scissors',
    accentColor: '#ec4899',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    category: 'organize',
    isAvailable: false,
    highlight: 'Range & single-page extraction'
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    badge: 'Coming Soon',
    badgeType: 'coming-soon',
    iconName: 'Minimize2',
    accentColor: '#06b6d4',
    description: 'Reduce file size while optimizing for maximal PDF quality and fast web delivery.',
    category: 'optimize',
    isAvailable: false,
    highlight: 'Up to 80% size reduction'
  },
  {
    id: 'pdf-to-img',
    title: 'PDF to Image',
    badge: 'Coming Soon',
    badgeType: 'coming-soon',
    iconName: 'Image',
    accentColor: '#f59e0b',
    description: 'Extract every page of your PDF into high-resolution JPG or PNG image files.',
    category: 'convert',
    isAvailable: false,
    highlight: 'Lossless quality export'
  },
  {
    id: 'protect-pdf',
    title: 'Protect PDF',
    badge: 'Coming Soon',
    badgeType: 'coming-soon',
    iconName: 'Lock',
    accentColor: '#10b981',
    description: 'Encrypt your PDF documents with AES-256 passwords and restrict permissions.',
    category: 'security',
    isAvailable: false,
    highlight: 'Bank-grade encryption'
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    badge: 'Coming Soon',
    badgeType: 'coming-soon',
    iconName: 'RotateCw',
    accentColor: '#8b5cf6',
    description: 'Rotate specific or all pages in your document clockwise or counterclockwise.',
    category: 'organize',
    isAvailable: false,
    highlight: 'Orientation fixer'
  }
];

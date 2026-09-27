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
    badge: 'Active',
    badgeType: 'active',
    iconName: 'Scissors',
    accentColor: '#ec4899',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    category: 'organize',
    isAvailable: true,
    highlight: 'Range & single-page extraction'
  },
  {
    id: 'remove-pages',
    title: 'Remove Pages',
    badge: 'Active',
    badgeType: 'active',
    iconName: 'Trash2',
    accentColor: '#f43f5e',
    description: 'Delete unwanted, duplicate, or blank pages from your PDF document easily.',
    category: 'organize',
    isAvailable: true,
    highlight: 'Visual page deletion'
  },
  {
    id: 'reorder-pages',
    title: 'Reorder Pages',
    badge: 'Active',
    badgeType: 'active',
    iconName: 'ArrowUpDown',
    accentColor: '#3b82f6',
    description: 'Rearrange the sequence of pages in your PDF with visual drag-and-drop.',
    category: 'organize',
    isAvailable: true,
    highlight: 'Drag & drop page sorter'
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
    id: 'pdf-to-word',
    title: 'PDF to Word',
    badge: 'Active',
    badgeType: 'active',
    iconName: 'FileWord',
    accentColor: '#2563eb',
    description: 'Convert any PDF into an editable Microsoft Word (.docx) document with preserved structure.',
    category: 'convert',
    isAvailable: true,
    highlight: 'Text extraction & DOCX export'
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
    badge: 'Active',
    badgeType: 'active',
    iconName: 'Lock',
    accentColor: '#10b981',
    description: 'Encrypt your PDF documents with custom passwords and prevent unauthorized access.',
    category: 'security',
    isAvailable: true,
    highlight: 'Standard 128-bit encryption'
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

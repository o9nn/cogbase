/**
 * Frame Templates Library
 * Pre-built component templates for UI Flow Builder
 */

export interface FrameTemplateConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    padding?: number;
  };
  properties?: Record<string, unknown>;
}

export const FRAME_CATEGORIES = [
  { id: "input", name: "Input Components", icon: "FormInput" },
  { id: "display", name: "Display Components", icon: "Monitor" },
  { id: "action", name: "Action Components", icon: "MousePointer" },
  { id: "navigation", name: "Navigation", icon: "Navigation" },
  { id: "media", name: "Media", icon: "Image" },
  { id: "layout", name: "Layout", icon: "Layout" },
] as const;

export const FRAME_TEMPLATES: FrameTemplateConfig[] = [
  // Input Components
  {
    id: "text-input",
    name: "Text Input",
    description: "Single line text input field",
    type: "input",
    category: "input",
    icon: "FormInput",
    defaultWidth: 300,
    defaultHeight: 60,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 12,
    },
    properties: {
      placeholder: "Enter text...",
      label: "Input Label",
      required: false,
    },
  },
  {
    id: "textarea",
    name: "Text Area",
    description: "Multi-line text input",
    type: "textarea",
    category: "input",
    icon: "AlignLeft",
    defaultWidth: 300,
    defaultHeight: 120,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 12,
    },
    properties: {
      placeholder: "Enter your message...",
      label: "Message",
      rows: 4,
    },
  },
  {
    id: "dropdown",
    name: "Dropdown Select",
    description: "Dropdown selection component",
    type: "select",
    category: "input",
    icon: "ChevronDown",
    defaultWidth: 300,
    defaultHeight: 60,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 12,
    },
    properties: {
      label: "Select an option",
      options: ["Option 1", "Option 2", "Option 3"],
    },
  },

  // Action Components
  {
    id: "button-primary",
    name: "Primary Button",
    description: "Primary action button",
    type: "button",
    category: "action",
    icon: "MousePointer",
    defaultWidth: 200,
    defaultHeight: 50,
    style: {
      backgroundColor: "#8b5cf6",
      borderColor: "#8b5cf6",
      borderRadius: 8,
      padding: 12,
    },
    properties: {
      text: "Submit",
      variant: "primary",
    },
  },
  {
    id: "button-secondary",
    name: "Secondary Button",
    description: "Secondary action button",
    type: "button",
    category: "action",
    icon: "MousePointer",
    defaultWidth: 200,
    defaultHeight: 50,
    style: {
      backgroundColor: "#f1f5f9",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 12,
    },
    properties: {
      text: "Cancel",
      variant: "secondary",
    },
  },
  {
    id: "quick-replies",
    name: "Quick Replies",
    description: "Horizontal button group for quick responses",
    type: "quick-replies",
    category: "action",
    icon: "MessageCircle",
    defaultWidth: 350,
    defaultHeight: 80,
    style: {
      backgroundColor: "#f8fafc",
      borderColor: "#e2e8f0",
      borderRadius: 12,
      padding: 16,
    },
    properties: {
      options: ["Yes", "No", "Maybe"],
    },
  },

  // Display Components
  {
    id: "message-bubble",
    name: "Message Bubble",
    description: "Chat message display",
    type: "message",
    category: "display",
    icon: "MessageSquare",
    defaultWidth: 350,
    defaultHeight: 100,
    style: {
      backgroundColor: "#f1f5f9",
      borderColor: "transparent",
      borderRadius: 16,
      padding: 16,
    },
    properties: {
      sender: "assistant",
      text: "Hello! How can I help you today?",
    },
  },
  {
    id: "user-message",
    name: "User Message",
    description: "User message bubble",
    type: "message",
    category: "display",
    icon: "User",
    defaultWidth: 300,
    defaultHeight: 80,
    style: {
      backgroundColor: "#8b5cf6",
      borderColor: "transparent",
      borderRadius: 16,
      padding: 16,
    },
    properties: {
      sender: "user",
      text: "I need help with...",
    },
  },
  {
    id: "card",
    name: "Content Card",
    description: "Information card with title and content",
    type: "card",
    category: "display",
    icon: "Square",
    defaultWidth: 320,
    defaultHeight: 180,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 12,
      padding: 20,
    },
    properties: {
      title: "Card Title",
      description: "Card description goes here...",
      showImage: false,
    },
  },
  {
    id: "carousel",
    name: "Carousel",
    description: "Horizontal scrolling cards",
    type: "carousel",
    category: "display",
    icon: "Layers",
    defaultWidth: 400,
    defaultHeight: 220,
    style: {
      backgroundColor: "#f8fafc",
      borderColor: "#e2e8f0",
      borderRadius: 12,
      padding: 16,
    },
    properties: {
      items: [
        { title: "Item 1", description: "Description 1" },
        { title: "Item 2", description: "Description 2" },
        { title: "Item 3", description: "Description 3" },
      ],
    },
  },
  {
    id: "list",
    name: "List View",
    description: "Vertical list of items",
    type: "list",
    category: "display",
    icon: "List",
    defaultWidth: 320,
    defaultHeight: 200,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 0,
    },
    properties: {
      items: ["Item 1", "Item 2", "Item 3"],
      selectable: true,
    },
  },

  // Navigation Components
  {
    id: "nav-back",
    name: "Back Button",
    description: "Navigation back button",
    type: "nav-button",
    category: "navigation",
    icon: "ArrowLeft",
    defaultWidth: 120,
    defaultHeight: 44,
    style: {
      backgroundColor: "transparent",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 8,
    },
    properties: {
      direction: "back",
      text: "Back",
    },
  },
  {
    id: "nav-menu",
    name: "Menu",
    description: "Navigation menu",
    type: "menu",
    category: "navigation",
    icon: "Menu",
    defaultWidth: 280,
    defaultHeight: 300,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 12,
      padding: 8,
    },
    properties: {
      items: [
        { label: "Home", icon: "Home" },
        { label: "Settings", icon: "Settings" },
        { label: "Help", icon: "HelpCircle" },
      ],
    },
  },
  {
    id: "breadcrumb",
    name: "Breadcrumb",
    description: "Navigation breadcrumb trail",
    type: "breadcrumb",
    category: "navigation",
    icon: "ChevronRight",
    defaultWidth: 300,
    defaultHeight: 40,
    style: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderRadius: 0,
      padding: 0,
    },
    properties: {
      items: ["Home", "Category", "Current"],
    },
  },

  // Media Components
  {
    id: "image",
    name: "Image",
    description: "Image display component",
    type: "image",
    category: "media",
    icon: "Image",
    defaultWidth: 320,
    defaultHeight: 200,
    style: {
      backgroundColor: "#f1f5f9",
      borderColor: "#e2e8f0",
      borderRadius: 8,
      padding: 0,
    },
    properties: {
      src: "",
      alt: "Image description",
      objectFit: "cover",
    },
  },
  {
    id: "video-player",
    name: "Video Player",
    description: "Video playback component",
    type: "video",
    category: "media",
    icon: "Play",
    defaultWidth: 400,
    defaultHeight: 240,
    style: {
      backgroundColor: "#000000",
      borderColor: "#1f2937",
      borderRadius: 8,
      padding: 0,
    },
    properties: {
      src: "",
      autoplay: false,
      controls: true,
    },
  },

  // Layout Components
  {
    id: "container",
    name: "Container",
    description: "Layout container for grouping",
    type: "container",
    category: "layout",
    icon: "Square",
    defaultWidth: 400,
    defaultHeight: 300,
    style: {
      backgroundColor: "#f8fafc",
      borderColor: "#e2e8f0",
      borderRadius: 12,
      padding: 16,
    },
    properties: {
      layout: "vertical",
      gap: 12,
    },
  },
  {
    id: "divider",
    name: "Divider",
    description: "Visual separator line",
    type: "divider",
    category: "layout",
    icon: "Minus",
    defaultWidth: 300,
    defaultHeight: 20,
    style: {
      backgroundColor: "transparent",
      borderColor: "#e2e8f0",
      borderRadius: 0,
      padding: 0,
    },
    properties: {
      orientation: "horizontal",
    },
  },
  {
    id: "header",
    name: "Header",
    description: "Screen header with title",
    type: "header",
    category: "layout",
    icon: "Type",
    defaultWidth: 400,
    defaultHeight: 60,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderRadius: 0,
      padding: 16,
    },
    properties: {
      title: "Screen Title",
      showBack: true,
    },
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): FrameTemplateConfig[] {
  return FRAME_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): FrameTemplateConfig | undefined {
  return FRAME_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all unique categories from templates
 */
export function getCategories(): typeof FRAME_CATEGORIES {
  return FRAME_CATEGORIES;
}

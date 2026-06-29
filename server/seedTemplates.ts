/**
 * Seed script for flow templates and frame templates
 * Run this to populate the database with initial templates
 */

import * as db from "./db";

// ============ FRAME TEMPLATES ============
const frameTemplates = [
  // Message Templates
  {
    name: "Bot Message",
    description: "Standard bot message bubble",
    type: "bot_message",
    category: "messages",
    icon: "MessageSquare",
    defaultConfig: {
      width: 300,
      height: 120,
      style: {
        backgroundColor: "#6366f1",
        color: "#ffffff",
        borderRadius: 12,
      },
      properties: {
        messageType: "text",
        typing: true,
      },
    },
    isPublic: 1,
  },
  {
    name: "User Message",
    description: "User message bubble",
    type: "user_message",
    category: "messages",
    icon: "User",
    defaultConfig: {
      width: 300,
      height: 100,
      style: {
        backgroundColor: "#f3f4f6",
        color: "#1f2937",
        borderRadius: 12,
      },
      properties: {
        messageType: "text",
      },
    },
    isPublic: 1,
  },
  {
    name: "System Message",
    description: "System notification message",
    type: "system_message",
    category: "messages",
    icon: "Info",
    defaultConfig: {
      width: 280,
      height: 80,
      style: {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        borderRadius: 8,
      },
      properties: {
        messageType: "info",
      },
    },
    isPublic: 1,
  },

  // Button Templates
  {
    name: "Primary Button",
    description: "Primary action button",
    type: "button",
    category: "inputs",
    icon: "MousePointer",
    defaultConfig: {
      width: 200,
      height: 50,
      style: {
        backgroundColor: "#6366f1",
        color: "#ffffff",
        borderRadius: 8,
      },
      properties: {
        buttonType: "primary",
        action: "navigate",
      },
    },
    isPublic: 1,
  },
  {
    name: "Secondary Button",
    description: "Secondary action button",
    type: "button",
    category: "inputs",
    icon: "MousePointer",
    defaultConfig: {
      width: 200,
      height: 50,
      style: {
        backgroundColor: "#f3f4f6",
        color: "#4b5563",
        borderRadius: 8,
        border: "1px solid #d1d5db",
      },
      properties: {
        buttonType: "secondary",
        action: "navigate",
      },
    },
    isPublic: 1,
  },

  // Input Templates
  {
    name: "Text Input",
    description: "Single line text input",
    type: "text_input",
    category: "inputs",
    icon: "Type",
    defaultConfig: {
      width: 300,
      height: 60,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 8,
        border: "1px solid #d1d5db",
      },
      properties: {
        inputType: "text",
        placeholder: "Enter text...",
        required: false,
      },
    },
    isPublic: 1,
  },
  {
    name: "Email Input",
    description: "Email address input",
    type: "email_input",
    category: "inputs",
    icon: "Mail",
    defaultConfig: {
      width: 300,
      height: 60,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 8,
        border: "1px solid #d1d5db",
      },
      properties: {
        inputType: "email",
        placeholder: "Enter your email...",
        required: true,
        validation: "email",
      },
    },
    isPublic: 1,
  },
  {
    name: "Phone Input",
    description: "Phone number input",
    type: "phone_input",
    category: "inputs",
    icon: "Phone",
    defaultConfig: {
      width: 300,
      height: 60,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 8,
        border: "1px solid #d1d5db",
      },
      properties: {
        inputType: "tel",
        placeholder: "Enter phone number...",
        required: false,
      },
    },
    isPublic: 1,
  },
  {
    name: "Multi-line Input",
    description: "Multi-line text area",
    type: "textarea",
    category: "inputs",
    icon: "AlignLeft",
    defaultConfig: {
      width: 300,
      height: 120,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 8,
        border: "1px solid #d1d5db",
      },
      properties: {
        inputType: "textarea",
        placeholder: "Enter your message...",
        rows: 4,
      },
    },
    isPublic: 1,
  },

  // Quick Reply Templates
  {
    name: "Quick Replies",
    description: "Horizontal quick reply buttons",
    type: "quick_replies",
    category: "inputs",
    icon: "Zap",
    defaultConfig: {
      width: 350,
      height: 80,
      style: {
        display: "flex",
        gap: 8,
      },
      properties: {
        options: ["Yes", "No", "Maybe"],
        layout: "horizontal",
      },
    },
    isPublic: 1,
  },

  // Card Templates
  {
    name: "Info Card",
    description: "Information card with title and description",
    type: "card",
    category: "display",
    icon: "CreditCard",
    defaultConfig: {
      width: 320,
      height: 180,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      },
      properties: {
        cardType: "info",
        hasImage: false,
      },
    },
    isPublic: 1,
  },
  {
    name: "Image Card",
    description: "Card with image, title, and description",
    type: "image_card",
    category: "display",
    icon: "Image",
    defaultConfig: {
      width: 320,
      height: 280,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      },
      properties: {
        cardType: "image",
        hasImage: true,
        imagePosition: "top",
      },
    },
    isPublic: 1,
  },

  // Carousel Template
  {
    name: "Carousel",
    description: "Horizontal scrolling carousel of cards",
    type: "carousel",
    category: "display",
    icon: "Layers",
    defaultConfig: {
      width: 400,
      height: 250,
      style: {
        display: "flex",
        overflowX: "auto",
        gap: 12,
      },
      properties: {
        cardCount: 3,
        autoScroll: false,
      },
    },
    isPublic: 1,
  },

  // Media Templates
  {
    name: "Image Display",
    description: "Display an image",
    type: "image",
    category: "media",
    icon: "Image",
    defaultConfig: {
      width: 300,
      height: 200,
      style: {
        borderRadius: 8,
        objectFit: "cover",
      },
      properties: {
        src: "",
        alt: "Image",
      },
    },
    isPublic: 1,
  },
  {
    name: "Video Player",
    description: "Embedded video player",
    type: "video",
    category: "media",
    icon: "Video",
    defaultConfig: {
      width: 400,
      height: 225,
      style: {
        borderRadius: 8,
      },
      properties: {
        autoplay: false,
        controls: true,
      },
    },
    isPublic: 1,
  },

  // Screen Templates
  {
    name: "Welcome Screen",
    description: "Initial welcome/landing screen",
    type: "screen",
    category: "screens",
    icon: "Home",
    defaultConfig: {
      width: 375,
      height: 300,
      style: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
      },
      properties: {
        screenType: "welcome",
        isEntryPoint: true,
      },
    },
    isPublic: 1,
  },
  {
    name: "Form Screen",
    description: "Screen for collecting user information",
    type: "form_screen",
    category: "screens",
    icon: "FileInput",
    defaultConfig: {
      width: 375,
      height: 350,
      style: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
      },
      properties: {
        screenType: "form",
        submitLabel: "Submit",
      },
    },
    isPublic: 1,
  },
  {
    name: "Confirmation Screen",
    description: "Success/confirmation screen",
    type: "confirmation_screen",
    category: "screens",
    icon: "CheckCircle",
    defaultConfig: {
      width: 375,
      height: 250,
      style: {
        backgroundColor: "#f0fdf4",
        borderRadius: 12,
      },
      properties: {
        screenType: "confirmation",
        showIcon: true,
      },
    },
    isPublic: 1,
  },
];

// ============ FLOW TEMPLATES ============
const flowTemplates = [
  {
    name: "Customer Support Flow",
    description: "A complete customer support conversation flow with greeting, issue selection, resolution, and feedback collection.",
    category: "customer_support",
    thumbnail: null,
    flowData: {
      frames: [
        {
          frameId: "welcome",
          name: "Welcome",
          type: "screen",
          positionX: 100,
          positionY: 100,
          width: 300,
          height: 200,
          config: { screenType: "welcome", isEntryPoint: true },
        },
        {
          frameId: "greeting",
          name: "Greeting Message",
          type: "bot_message",
          positionX: 100,
          positionY: 350,
          width: 300,
          height: 120,
          config: { message: "Hello! How can I help you today?" },
        },
        {
          frameId: "issue-selection",
          name: "Issue Selection",
          type: "quick_replies",
          positionX: 100,
          positionY: 520,
          width: 350,
          height: 100,
          config: { options: ["Billing", "Technical", "Account", "Other"] },
        },
        {
          frameId: "billing-issue",
          name: "Billing Support",
          type: "bot_message",
          positionX: 500,
          positionY: 400,
          width: 300,
          height: 150,
          config: { message: "I can help with billing. What's the issue?" },
        },
        {
          frameId: "technical-issue",
          name: "Technical Support",
          type: "bot_message",
          positionX: 500,
          positionY: 100,
          width: 300,
          height: 150,
          config: { message: "Let me help with your technical issue." },
        },
        {
          frameId: "resolution",
          name: "Resolution",
          type: "bot_message",
          positionX: 900,
          positionY: 250,
          width: 300,
          height: 150,
          config: { message: "I've resolved your issue. Is there anything else?" },
        },
        {
          frameId: "feedback",
          name: "Feedback",
          type: "quick_replies",
          positionX: 900,
          positionY: 450,
          width: 300,
          height: 100,
          config: { options: ["👍 Helpful", "👎 Not helpful"] },
        },
        {
          frameId: "thank-you",
          name: "Thank You",
          type: "confirmation_screen",
          positionX: 900,
          positionY: 600,
          width: 300,
          height: 150,
          config: { message: "Thank you for your feedback!" },
        },
      ],
      connections: [
        { connectionId: "c1", sourceFrameId: "welcome", targetFrameId: "greeting", label: "Start" },
        { connectionId: "c2", sourceFrameId: "greeting", targetFrameId: "issue-selection" },
        { connectionId: "c3", sourceFrameId: "issue-selection", targetFrameId: "billing-issue", label: "Billing" },
        { connectionId: "c4", sourceFrameId: "issue-selection", targetFrameId: "technical-issue", label: "Technical" },
        { connectionId: "c5", sourceFrameId: "billing-issue", targetFrameId: "resolution" },
        { connectionId: "c6", sourceFrameId: "technical-issue", targetFrameId: "resolution" },
        { connectionId: "c7", sourceFrameId: "resolution", targetFrameId: "feedback" },
        { connectionId: "c8", sourceFrameId: "feedback", targetFrameId: "thank-you" },
      ],
      mermaidDiagram: `graph TD
    welcome[Welcome] --> greeting[Greeting]
    greeting --> issue-selection[Issue Selection]
    issue-selection -->|Billing| billing-issue[Billing Support]
    issue-selection -->|Technical| technical-issue[Technical Support]
    billing-issue --> resolution[Resolution]
    technical-issue --> resolution
    resolution --> feedback[Feedback]
    feedback --> thank-you[Thank You]`,
    },
    isPublic: 1,
    usageCount: 0,
  },
  {
    name: "Product Onboarding Flow",
    description: "Guide new users through your product features with an interactive onboarding experience.",
    category: "onboarding",
    thumbnail: null,
    flowData: {
      frames: [
        {
          frameId: "welcome",
          name: "Welcome Screen",
          type: "screen",
          positionX: 100,
          positionY: 200,
          width: 350,
          height: 250,
          config: { isEntryPoint: true, title: "Welcome to Our Product!" },
        },
        {
          frameId: "feature-1",
          name: "Feature Tour 1",
          type: "image_card",
          positionX: 500,
          positionY: 100,
          width: 320,
          height: 280,
          config: { title: "Powerful Analytics", description: "Track your metrics in real-time" },
        },
        {
          frameId: "feature-2",
          name: "Feature Tour 2",
          type: "image_card",
          positionX: 500,
          positionY: 420,
          width: 320,
          height: 280,
          config: { title: "Easy Integration", description: "Connect with your favorite tools" },
        },
        {
          frameId: "setup",
          name: "Setup Preferences",
          type: "form_screen",
          positionX: 900,
          positionY: 200,
          width: 350,
          height: 300,
          config: { fields: ["name", "company", "role"] },
        },
        {
          frameId: "completion",
          name: "Setup Complete",
          type: "confirmation_screen",
          positionX: 1300,
          positionY: 200,
          width: 300,
          height: 200,
          config: { message: "You're all set! Let's get started." },
        },
      ],
      connections: [
        { connectionId: "c1", sourceFrameId: "welcome", targetFrameId: "feature-1", label: "Start Tour" },
        { connectionId: "c2", sourceFrameId: "feature-1", targetFrameId: "feature-2", label: "Next" },
        { connectionId: "c3", sourceFrameId: "feature-2", targetFrameId: "setup", label: "Continue" },
        { connectionId: "c4", sourceFrameId: "setup", targetFrameId: "completion", label: "Complete" },
        { connectionId: "c5", sourceFrameId: "welcome", targetFrameId: "setup", label: "Skip Tour" },
      ],
      mermaidDiagram: `graph TD
    welcome[Welcome Screen] -->|Start Tour| feature-1[Feature 1]
    welcome -->|Skip Tour| setup[Setup Preferences]
    feature-1 -->|Next| feature-2[Feature 2]
    feature-2 -->|Continue| setup
    setup -->|Complete| completion[Setup Complete]`,
    },
    isPublic: 1,
    usageCount: 0,
  },
  {
    name: "FAQ Navigation Flow",
    description: "Help users find answers through an interactive FAQ navigation system.",
    category: "faq",
    thumbnail: null,
    flowData: {
      frames: [
        {
          frameId: "main-menu",
          name: "FAQ Categories",
          type: "screen",
          positionX: 100,
          positionY: 200,
          width: 350,
          height: 250,
          config: { isEntryPoint: true, title: "How can we help?" },
        },
        {
          frameId: "category-options",
          name: "Select Category",
          type: "quick_replies",
          positionX: 100,
          positionY: 500,
          width: 350,
          height: 100,
          config: { options: ["Getting Started", "Account", "Billing", "Technical"] },
        },
        {
          frameId: "getting-started",
          name: "Getting Started FAQs",
          type: "card",
          positionX: 550,
          positionY: 100,
          width: 300,
          height: 200,
          config: { questions: ["How do I sign up?", "First steps", "Quick start guide"] },
        },
        {
          frameId: "account-faq",
          name: "Account FAQs",
          type: "card",
          positionX: 550,
          positionY: 350,
          width: 300,
          height: 200,
          config: { questions: ["Reset password", "Update profile", "Delete account"] },
        },
        {
          frameId: "answer-display",
          name: "Answer",
          type: "bot_message",
          positionX: 950,
          positionY: 200,
          width: 350,
          height: 180,
          config: { message: "Here's the answer to your question..." },
        },
        {
          frameId: "more-help",
          name: "Need More Help?",
          type: "quick_replies",
          positionX: 950,
          positionY: 430,
          width: 300,
          height: 100,
          config: { options: ["Ask another question", "Contact support", "Done"] },
        },
      ],
      connections: [
        { connectionId: "c1", sourceFrameId: "main-menu", targetFrameId: "category-options" },
        { connectionId: "c2", sourceFrameId: "category-options", targetFrameId: "getting-started", label: "Getting Started" },
        { connectionId: "c3", sourceFrameId: "category-options", targetFrameId: "account-faq", label: "Account" },
        { connectionId: "c4", sourceFrameId: "getting-started", targetFrameId: "answer-display" },
        { connectionId: "c5", sourceFrameId: "account-faq", targetFrameId: "answer-display" },
        { connectionId: "c6", sourceFrameId: "answer-display", targetFrameId: "more-help" },
        { connectionId: "c7", sourceFrameId: "more-help", targetFrameId: "main-menu", label: "Ask another" },
      ],
      mermaidDiagram: `graph TD
    main-menu[FAQ Categories] --> category-options[Select Category]
    category-options -->|Getting Started| getting-started[Getting Started FAQs]
    category-options -->|Account| account-faq[Account FAQs]
    getting-started --> answer-display[Answer]
    account-faq --> answer-display
    answer-display --> more-help[Need More Help?]
    more-help -->|Ask another| main-menu`,
    },
    isPublic: 1,
    usageCount: 0,
  },
  {
    name: "Lead Generation Flow",
    description: "Capture and qualify leads through an engaging conversation.",
    category: "sales",
    thumbnail: null,
    flowData: {
      frames: [
        {
          frameId: "greeting",
          name: "Greeting",
          type: "bot_message",
          positionX: 100,
          positionY: 100,
          width: 320,
          height: 120,
          config: { message: "Hi! 👋 I'd love to learn about your needs.", isEntryPoint: true },
        },
        {
          frameId: "qualification-q1",
          name: "Company Size",
          type: "quick_replies",
          positionX: 100,
          positionY: 270,
          width: 350,
          height: 100,
          config: { options: ["1-10", "11-50", "51-200", "200+"], question: "How big is your team?" },
        },
        {
          frameId: "qualification-q2",
          name: "Use Case",
          type: "quick_replies",
          positionX: 100,
          positionY: 420,
          width: 350,
          height: 100,
          config: { options: ["Customer Support", "Sales", "Marketing", "Other"] },
        },
        {
          frameId: "contact-form",
          name: "Contact Info",
          type: "form_screen",
          positionX: 550,
          positionY: 200,
          width: 350,
          height: 300,
          config: { fields: ["name", "email", "company"] },
        },
        {
          frameId: "scheduling",
          name: "Schedule Demo",
          type: "card",
          positionX: 950,
          positionY: 200,
          width: 320,
          height: 200,
          config: { title: "Schedule a Demo", description: "Pick a time that works for you" },
        },
        {
          frameId: "thank-you",
          name: "Thank You",
          type: "confirmation_screen",
          positionX: 950,
          positionY: 450,
          width: 300,
          height: 150,
          config: { message: "Thanks! We'll be in touch soon." },
        },
      ],
      connections: [
        { connectionId: "c1", sourceFrameId: "greeting", targetFrameId: "qualification-q1" },
        { connectionId: "c2", sourceFrameId: "qualification-q1", targetFrameId: "qualification-q2" },
        { connectionId: "c3", sourceFrameId: "qualification-q2", targetFrameId: "contact-form" },
        { connectionId: "c4", sourceFrameId: "contact-form", targetFrameId: "scheduling" },
        { connectionId: "c5", sourceFrameId: "scheduling", targetFrameId: "thank-you" },
        { connectionId: "c6", sourceFrameId: "contact-form", targetFrameId: "thank-you", label: "Skip demo" },
      ],
      mermaidDiagram: `graph TD
    greeting[Greeting] --> qualification-q1[Company Size]
    qualification-q1 --> qualification-q2[Use Case]
    qualification-q2 --> contact-form[Contact Info]
    contact-form --> scheduling[Schedule Demo]
    contact-form -->|Skip demo| thank-you[Thank You]
    scheduling --> thank-you`,
    },
    isPublic: 1,
    usageCount: 0,
  },
  {
    name: "Appointment Booking Flow",
    description: "Allow users to book appointments through a guided conversation.",
    category: "booking",
    thumbnail: null,
    flowData: {
      frames: [
        {
          frameId: "welcome",
          name: "Welcome",
          type: "bot_message",
          positionX: 100,
          positionY: 150,
          width: 300,
          height: 120,
          config: { message: "Hi! Let's book your appointment.", isEntryPoint: true },
        },
        {
          frameId: "service-select",
          name: "Select Service",
          type: "quick_replies",
          positionX: 100,
          positionY: 320,
          width: 350,
          height: 100,
          config: { options: ["Consultation", "Follow-up", "New Patient", "Emergency"] },
        },
        {
          frameId: "date-select",
          name: "Select Date",
          type: "card",
          positionX: 500,
          positionY: 150,
          width: 320,
          height: 200,
          config: { type: "calendar", title: "Choose a date" },
        },
        {
          frameId: "time-select",
          name: "Select Time",
          type: "quick_replies",
          positionX: 500,
          positionY: 400,
          width: 350,
          height: 100,
          config: { options: ["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM"] },
        },
        {
          frameId: "contact-info",
          name: "Your Details",
          type: "form_screen",
          positionX: 900,
          positionY: 150,
          width: 350,
          height: 280,
          config: { fields: ["name", "phone", "email", "notes"] },
        },
        {
          frameId: "confirmation",
          name: "Confirmation",
          type: "confirmation_screen",
          positionX: 900,
          positionY: 480,
          width: 320,
          height: 180,
          config: { message: "Your appointment is confirmed! See you soon." },
        },
      ],
      connections: [
        { connectionId: "c1", sourceFrameId: "welcome", targetFrameId: "service-select" },
        { connectionId: "c2", sourceFrameId: "service-select", targetFrameId: "date-select" },
        { connectionId: "c3", sourceFrameId: "date-select", targetFrameId: "time-select" },
        { connectionId: "c4", sourceFrameId: "time-select", targetFrameId: "contact-info" },
        { connectionId: "c5", sourceFrameId: "contact-info", targetFrameId: "confirmation" },
      ],
      mermaidDiagram: `graph TD
    welcome[Welcome] --> service-select[Select Service]
    service-select --> date-select[Select Date]
    date-select --> time-select[Select Time]
    time-select --> contact-info[Your Details]
    contact-info --> confirmation[Confirmation]`,
    },
    isPublic: 1,
    usageCount: 0,
  },
];

/**
 * Seed templates into the database
 */
export async function seedTemplates(): Promise<{
  frameTemplatesCreated: number;
  flowTemplatesCreated: number;
}> {
  let frameTemplatesCreated = 0;
  let flowTemplatesCreated = 0;

  console.log("[Seed] Starting template seeding...");

  // Seed frame templates
  for (const template of frameTemplates) {
    try {
      await db.createFrameTemplate(template);
      frameTemplatesCreated++;
      console.log(`[Seed] Created frame template: ${template.name}`);
    } catch (error) {
      console.warn(`[Seed] Frame template "${template.name}" may already exist:`, (error as Error).message);
    }
  }

  // Seed flow templates
  for (const template of flowTemplates) {
    try {
      await db.createFlowTemplate(template);
      flowTemplatesCreated++;
      console.log(`[Seed] Created flow template: ${template.name}`);
    } catch (error) {
      console.warn(`[Seed] Flow template "${template.name}" may already exist:`, (error as Error).message);
    }
  }

  console.log(`[Seed] Complete! Created ${frameTemplatesCreated} frame templates and ${flowTemplatesCreated} flow templates.`);

  return { frameTemplatesCreated, flowTemplatesCreated };
}

// Allow running directly
if (process.argv[1]?.includes("seedTemplates")) {
  seedTemplates()
    .then((result) => {
      console.log("Seeding result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

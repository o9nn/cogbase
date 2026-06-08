/**
 * Flow Templates Library
 * Pre-built conversational flow templates for common use cases
 */

export interface FlowTemplateData {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  frames: Array<{
    frameId: string;
    name: string;
    type: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    config?: Record<string, unknown>;
  }>;
  connections: Array<{
    connectionId: string;
    sourceFrameId: string;
    targetFrameId: string;
    label?: string;
  }>;
  mermaidDiagram?: string;
}

export const FLOW_CATEGORIES = [
  { id: "customer-support", name: "Customer Support", icon: "Headphones" },
  { id: "sales", name: "Sales & Product", icon: "ShoppingCart" },
  { id: "onboarding", name: "Onboarding", icon: "UserPlus" },
  { id: "faq", name: "FAQ & Help", icon: "HelpCircle" },
  { id: "feedback", name: "Feedback & Surveys", icon: "MessageSquare" },
  { id: "booking", name: "Booking & Scheduling", icon: "Calendar" },
] as const;

export const FLOW_TEMPLATES: FlowTemplateData[] = [
  // Customer Support Flow
  {
    id: "customer-support-basic",
    name: "Basic Customer Support",
    description: "A simple customer support flow with issue categorization and escalation",
    category: "customer-support",
    frames: [
      {
        frameId: "welcome",
        name: "Welcome Message",
        type: "message",
        positionX: 100,
        positionY: 100,
        width: 320,
        height: 100,
        config: {
          text: "Hello! 👋 How can I help you today?",
          sender: "assistant",
        },
      },
      {
        frameId: "issue-type",
        name: "Issue Type Selection",
        type: "quick-replies",
        positionX: 100,
        positionY: 250,
        width: 350,
        height: 100,
        config: {
          options: ["Technical Issue", "Billing Question", "General Inquiry"],
        },
      },
      {
        frameId: "technical",
        name: "Technical Support",
        type: "message",
        positionX: 500,
        positionY: 150,
        width: 300,
        height: 120,
        config: {
          text: "I understand you're having a technical issue. Can you describe what's happening?",
          sender: "assistant",
        },
      },
      {
        frameId: "billing",
        name: "Billing Support",
        type: "message",
        positionX: 500,
        positionY: 300,
        width: 300,
        height: 120,
        config: {
          text: "I can help with billing questions. What would you like to know about your account?",
          sender: "assistant",
        },
      },
      {
        frameId: "general",
        name: "General Inquiry",
        type: "message",
        positionX: 500,
        positionY: 450,
        width: 300,
        height: 120,
        config: {
          text: "Sure, I'd be happy to help with any general questions. What's on your mind?",
          sender: "assistant",
        },
      },
      {
        frameId: "user-input",
        name: "User Description",
        type: "input",
        positionX: 850,
        positionY: 250,
        width: 300,
        height: 80,
        config: {
          placeholder: "Describe your issue...",
        },
      },
      {
        frameId: "escalate",
        name: "Escalate to Human",
        type: "card",
        positionX: 850,
        positionY: 380,
        width: 300,
        height: 140,
        config: {
          title: "Connect with Agent",
          description: "Would you like to speak with a human agent?",
        },
      },
      {
        frameId: "resolution",
        name: "Resolution",
        type: "message",
        positionX: 1200,
        positionY: 250,
        width: 300,
        height: 100,
        config: {
          text: "Is there anything else I can help you with today?",
          sender: "assistant",
        },
      },
    ],
    connections: [
      { connectionId: "c1", sourceFrameId: "welcome", targetFrameId: "issue-type" },
      { connectionId: "c2", sourceFrameId: "issue-type", targetFrameId: "technical", label: "Technical" },
      { connectionId: "c3", sourceFrameId: "issue-type", targetFrameId: "billing", label: "Billing" },
      { connectionId: "c4", sourceFrameId: "issue-type", targetFrameId: "general", label: "General" },
      { connectionId: "c5", sourceFrameId: "technical", targetFrameId: "user-input" },
      { connectionId: "c6", sourceFrameId: "billing", targetFrameId: "user-input" },
      { connectionId: "c7", sourceFrameId: "general", targetFrameId: "user-input" },
      { connectionId: "c8", sourceFrameId: "user-input", targetFrameId: "resolution" },
      { connectionId: "c9", sourceFrameId: "user-input", targetFrameId: "escalate", label: "Complex issue" },
    ],
    mermaidDiagram: `graph TD
    welcome[Welcome Message] --> issue-type[Issue Type Selection]
    issue-type -->|Technical| technical[Technical Support]
    issue-type -->|Billing| billing[Billing Support]
    issue-type -->|General| general[General Inquiry]
    technical --> user-input[User Description]
    billing --> user-input
    general --> user-input
    user-input --> resolution[Resolution]
    user-input -->|Complex issue| escalate[Escalate to Human]`,
  },

  // Product Inquiry Flow
  {
    id: "product-inquiry",
    name: "Product Inquiry",
    description: "Help customers learn about products and make purchasing decisions",
    category: "sales",
    frames: [
      {
        frameId: "greeting",
        name: "Greeting",
        type: "message",
        positionX: 100,
        positionY: 100,
        width: 320,
        height: 100,
        config: {
          text: "Welcome! 🛍️ I can help you find the perfect product. What are you looking for?",
          sender: "assistant",
        },
      },
      {
        frameId: "category-select",
        name: "Category Selection",
        type: "carousel",
        positionX: 100,
        positionY: 250,
        width: 400,
        height: 180,
        config: {
          items: [
            { title: "Electronics", icon: "Laptop" },
            { title: "Clothing", icon: "Shirt" },
            { title: "Home & Garden", icon: "Home" },
          ],
        },
      },
      {
        frameId: "product-list",
        name: "Product List",
        type: "list",
        positionX: 550,
        positionY: 200,
        width: 300,
        height: 250,
        config: {
          title: "Available Products",
          items: ["Product A", "Product B", "Product C"],
        },
      },
      {
        frameId: "product-details",
        name: "Product Details",
        type: "card",
        positionX: 900,
        positionY: 150,
        width: 320,
        height: 200,
        config: {
          title: "Product Details",
          description: "View full product specifications and pricing",
        },
      },
      {
        frameId: "add-to-cart",
        name: "Add to Cart",
        type: "button",
        positionX: 900,
        positionY: 380,
        width: 200,
        height: 50,
        config: {
          text: "Add to Cart",
          variant: "primary",
        },
      },
      {
        frameId: "checkout",
        name: "Checkout Prompt",
        type: "message",
        positionX: 1150,
        positionY: 300,
        width: 300,
        height: 100,
        config: {
          text: "Great choice! Would you like to proceed to checkout?",
          sender: "assistant",
        },
      },
    ],
    connections: [
      { connectionId: "c1", sourceFrameId: "greeting", targetFrameId: "category-select" },
      { connectionId: "c2", sourceFrameId: "category-select", targetFrameId: "product-list" },
      { connectionId: "c3", sourceFrameId: "product-list", targetFrameId: "product-details" },
      { connectionId: "c4", sourceFrameId: "product-details", targetFrameId: "add-to-cart" },
      { connectionId: "c5", sourceFrameId: "add-to-cart", targetFrameId: "checkout" },
    ],
    mermaidDiagram: `graph TD
    greeting[Greeting] --> category-select[Category Selection]
    category-select --> product-list[Product List]
    product-list --> product-details[Product Details]
    product-details --> add-to-cart[Add to Cart]
    add-to-cart --> checkout[Checkout Prompt]`,
  },

  // Onboarding Flow
  {
    id: "user-onboarding",
    name: "User Onboarding",
    description: "Guide new users through initial setup and feature introduction",
    category: "onboarding",
    frames: [
      {
        frameId: "welcome",
        name: "Welcome",
        type: "message",
        positionX: 100,
        positionY: 150,
        width: 320,
        height: 120,
        config: {
          text: "Welcome aboard! 🎉 I'll help you get started with our platform in just a few steps.",
          sender: "assistant",
        },
      },
      {
        frameId: "step1",
        name: "Step 1: Profile",
        type: "card",
        positionX: 470,
        positionY: 100,
        width: 300,
        height: 150,
        config: {
          title: "Step 1: Set Up Profile",
          description: "Let's start by completing your profile information.",
          step: 1,
          totalSteps: 4,
        },
      },
      {
        frameId: "step2",
        name: "Step 2: Preferences",
        type: "card",
        positionX: 470,
        positionY: 280,
        width: 300,
        height: 150,
        config: {
          title: "Step 2: Preferences",
          description: "Customize your experience with these settings.",
          step: 2,
          totalSteps: 4,
        },
      },
      {
        frameId: "step3",
        name: "Step 3: Features",
        type: "carousel",
        positionX: 820,
        positionY: 150,
        width: 380,
        height: 180,
        config: {
          title: "Step 3: Explore Features",
          items: [
            { title: "Feature 1", description: "Description of feature 1" },
            { title: "Feature 2", description: "Description of feature 2" },
            { title: "Feature 3", description: "Description of feature 3" },
          ],
        },
      },
      {
        frameId: "step4",
        name: "Step 4: Complete",
        type: "message",
        positionX: 1250,
        positionY: 180,
        width: 320,
        height: 140,
        config: {
          text: "You're all set! 🚀 Your account is now ready to use. Need help with anything else?",
          sender: "assistant",
        },
      },
      {
        frameId: "help",
        name: "Help Options",
        type: "quick-replies",
        positionX: 1250,
        positionY: 350,
        width: 320,
        height: 80,
        config: {
          options: ["Tutorial", "FAQ", "Contact Support", "I'm good!"],
        },
      },
    ],
    connections: [
      { connectionId: "c1", sourceFrameId: "welcome", targetFrameId: "step1" },
      { connectionId: "c2", sourceFrameId: "step1", targetFrameId: "step2" },
      { connectionId: "c3", sourceFrameId: "step2", targetFrameId: "step3" },
      { connectionId: "c4", sourceFrameId: "step3", targetFrameId: "step4" },
      { connectionId: "c5", sourceFrameId: "step4", targetFrameId: "help" },
    ],
    mermaidDiagram: `graph LR
    welcome[Welcome] --> step1[Step 1: Profile]
    step1 --> step2[Step 2: Preferences]
    step2 --> step3[Step 3: Features]
    step3 --> step4[Step 4: Complete]
    step4 --> help[Help Options]`,
  },

  // FAQ Navigation Flow
  {
    id: "faq-navigation",
    name: "FAQ Navigation",
    description: "Interactive FAQ with category-based navigation",
    category: "faq",
    frames: [
      {
        frameId: "start",
        name: "FAQ Start",
        type: "message",
        positionX: 100,
        positionY: 150,
        width: 320,
        height: 100,
        config: {
          text: "Hi! 📚 What topic would you like help with?",
          sender: "assistant",
        },
      },
      {
        frameId: "topics",
        name: "Topic Categories",
        type: "list",
        positionX: 100,
        positionY: 300,
        width: 300,
        height: 200,
        config: {
          items: ["Account & Settings", "Billing & Payments", "Features & Usage", "Technical Issues"],
        },
      },
      {
        frameId: "account-faqs",
        name: "Account FAQs",
        type: "list",
        positionX: 470,
        positionY: 100,
        width: 280,
        height: 180,
        config: {
          title: "Account Questions",
          items: ["How to reset password?", "How to update email?", "How to delete account?"],
        },
      },
      {
        frameId: "billing-faqs",
        name: "Billing FAQs",
        type: "list",
        positionX: 470,
        positionY: 310,
        width: 280,
        height: 180,
        config: {
          title: "Billing Questions",
          items: ["How to upgrade plan?", "How to view invoices?", "Refund policy?"],
        },
      },
      {
        frameId: "answer",
        name: "FAQ Answer",
        type: "card",
        positionX: 800,
        positionY: 200,
        width: 350,
        height: 200,
        config: {
          title: "Answer",
          description: "Here's the detailed answer to your question...",
        },
      },
      {
        frameId: "helpful",
        name: "Was this helpful?",
        type: "quick-replies",
        positionX: 800,
        positionY: 430,
        width: 300,
        height: 70,
        config: {
          options: ["Yes, thanks!", "No, I need more help"],
        },
      },
      {
        frameId: "contact",
        name: "Contact Support",
        type: "card",
        positionX: 1200,
        positionY: 350,
        width: 280,
        height: 150,
        config: {
          title: "Contact Support",
          description: "Would you like to speak with our support team?",
        },
      },
    ],
    connections: [
      { connectionId: "c1", sourceFrameId: "start", targetFrameId: "topics" },
      { connectionId: "c2", sourceFrameId: "topics", targetFrameId: "account-faqs", label: "Account" },
      { connectionId: "c3", sourceFrameId: "topics", targetFrameId: "billing-faqs", label: "Billing" },
      { connectionId: "c4", sourceFrameId: "account-faqs", targetFrameId: "answer" },
      { connectionId: "c5", sourceFrameId: "billing-faqs", targetFrameId: "answer" },
      { connectionId: "c6", sourceFrameId: "answer", targetFrameId: "helpful" },
      { connectionId: "c7", sourceFrameId: "helpful", targetFrameId: "contact", label: "Need more help" },
    ],
    mermaidDiagram: `graph TD
    start[FAQ Start] --> topics[Topic Categories]
    topics -->|Account| account-faqs[Account FAQs]
    topics -->|Billing| billing-faqs[Billing FAQs]
    account-faqs --> answer[FAQ Answer]
    billing-faqs --> answer
    answer --> helpful[Was this helpful?]
    helpful -->|Need more help| contact[Contact Support]`,
  },

  // Feedback Collection Flow
  {
    id: "feedback-survey",
    name: "Feedback Survey",
    description: "Collect user feedback with ratings and comments",
    category: "feedback",
    frames: [
      {
        frameId: "intro",
        name: "Survey Intro",
        type: "message",
        positionX: 100,
        positionY: 150,
        width: 320,
        height: 120,
        config: {
          text: "Hi! 📝 We'd love to hear your feedback. It only takes a minute!",
          sender: "assistant",
        },
      },
      {
        frameId: "rating",
        name: "Rating Question",
        type: "card",
        positionX: 470,
        positionY: 150,
        width: 320,
        height: 140,
        config: {
          title: "How would you rate your experience?",
          type: "rating",
          maxStars: 5,
        },
      },
      {
        frameId: "nps",
        name: "NPS Question",
        type: "card",
        positionX: 470,
        positionY: 320,
        width: 320,
        height: 140,
        config: {
          title: "How likely are you to recommend us?",
          type: "nps",
          scale: "0-10",
        },
      },
      {
        frameId: "comment",
        name: "Additional Comments",
        type: "textarea",
        positionX: 840,
        positionY: 200,
        width: 300,
        height: 120,
        config: {
          label: "Any additional feedback?",
          placeholder: "Share your thoughts...",
        },
      },
      {
        frameId: "thank-you",
        name: "Thank You",
        type: "message",
        positionX: 1190,
        positionY: 220,
        width: 280,
        height: 100,
        config: {
          text: "Thank you for your feedback! 🙏 We really appreciate it.",
          sender: "assistant",
        },
      },
    ],
    connections: [
      { connectionId: "c1", sourceFrameId: "intro", targetFrameId: "rating" },
      { connectionId: "c2", sourceFrameId: "rating", targetFrameId: "nps" },
      { connectionId: "c3", sourceFrameId: "nps", targetFrameId: "comment" },
      { connectionId: "c4", sourceFrameId: "comment", targetFrameId: "thank-you" },
    ],
    mermaidDiagram: `graph LR
    intro[Survey Intro] --> rating[Rating Question]
    rating --> nps[NPS Question]
    nps --> comment[Additional Comments]
    comment --> thank-you[Thank You]`,
  },

  // Appointment Booking Flow
  {
    id: "appointment-booking",
    name: "Appointment Booking",
    description: "Guide users through scheduling appointments",
    category: "booking",
    frames: [
      {
        frameId: "start",
        name: "Booking Start",
        type: "message",
        positionX: 100,
        positionY: 180,
        width: 320,
        height: 100,
        config: {
          text: "Hi! 📅 I can help you schedule an appointment. What type of appointment do you need?",
          sender: "assistant",
        },
      },
      {
        frameId: "type-select",
        name: "Appointment Type",
        type: "quick-replies",
        positionX: 100,
        positionY: 320,
        width: 350,
        height: 80,
        config: {
          options: ["Consultation", "Demo", "Support Call"],
        },
      },
      {
        frameId: "date-picker",
        name: "Select Date",
        type: "card",
        positionX: 500,
        positionY: 180,
        width: 300,
        height: 180,
        config: {
          title: "Choose a Date",
          type: "date-picker",
        },
      },
      {
        frameId: "time-slots",
        name: "Available Times",
        type: "list",
        positionX: 500,
        positionY: 400,
        width: 280,
        height: 150,
        config: {
          title: "Available Time Slots",
          items: ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"],
        },
      },
      {
        frameId: "contact-info",
        name: "Contact Information",
        type: "card",
        positionX: 850,
        positionY: 250,
        width: 300,
        height: 180,
        config: {
          title: "Your Contact Info",
          fields: ["Name", "Email", "Phone"],
        },
      },
      {
        frameId: "confirmation",
        name: "Booking Confirmation",
        type: "card",
        positionX: 1200,
        positionY: 270,
        width: 320,
        height: 200,
        config: {
          title: "✅ Booking Confirmed!",
          description: "You'll receive a confirmation email shortly.",
        },
      },
    ],
    connections: [
      { connectionId: "c1", sourceFrameId: "start", targetFrameId: "type-select" },
      { connectionId: "c2", sourceFrameId: "type-select", targetFrameId: "date-picker" },
      { connectionId: "c3", sourceFrameId: "date-picker", targetFrameId: "time-slots" },
      { connectionId: "c4", sourceFrameId: "time-slots", targetFrameId: "contact-info" },
      { connectionId: "c5", sourceFrameId: "contact-info", targetFrameId: "confirmation" },
    ],
    mermaidDiagram: `graph LR
    start[Booking Start] --> type-select[Appointment Type]
    type-select --> date-picker[Select Date]
    date-picker --> time-slots[Available Times]
    time-slots --> contact-info[Contact Information]
    contact-info --> confirmation[Booking Confirmed]`,
  },
];

/**
 * Get templates by category
 */
export function getFlowTemplatesByCategory(category: string): FlowTemplateData[] {
  return FLOW_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getFlowTemplateById(id: string): FlowTemplateData | undefined {
  return FLOW_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all categories
 */
export function getFlowCategories(): typeof FLOW_CATEGORIES {
  return FLOW_CATEGORIES;
}

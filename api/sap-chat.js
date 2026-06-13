import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SAP_MODULES = {
  all: { name: "General", full: "All Modules" },
  fi: { name: "FI", full: "Financial Accounting" },
  co: { name: "CO", full: "Controlling" },
  sd: { name: "SD", full: "Sales & Distribution" },
  mm: { name: "MM", full: "Materials Management" },
  hcm: { name: "HCM", full: "Human Capital Mgmt" },
  pp: { name: "PP", full: "Production Planning" },
  pm: { name: "PM", full: "Plant Maintenance" },
  ps: { name: "PS", full: "Project Systems" },
  s4: { name: "S/4", full: "S/4HANA Migration" },
};

function getSystemPrompt(moduleId) {
  const mod = SAP_MODULES[moduleId] || SAP_MODULES.all;
  return `You are SAPilot — an elite SAP Functional Consultant AI with 20+ years of hands-on SAP experience across all modules and versions (ECC 6.0, S/4HANA On-Premise, S/4HANA Cloud).

${moduleId !== "all" ? `The user is working in SAP ${mod.name} (${mod.full}). Focus your answers on this module.` : "Answer general SAP questions across all modules."}

Your capabilities:
- All SAP modules: FI, CO, SD, MM, PP, PM, PS, HCM, WM, QM, BW, CRM
- S/4HANA migration: Brownfield, Greenfield, Selective Data Transition
- SAP Fiori, SAP BTP, ABAP basics, enhancement frameworks (BAdI, BAPI, User Exits)
- Configuration via SPRO/IMG, master data, transactional processing
- Troubleshooting SAP errors, dumps (ST22), performance (SM50/SM66)

Response rules (follow EVERY TIME):
1. ALWAYS include relevant SAP Transaction Codes in UPPERCASE with step numbers (e.g., 1. T-code VA01, 2. T-code ME21N)
2. Number your steps clearly when explaining a process (1., 2., 3., etc.)
3. Mention IMG/SPRO configuration paths when relevant
4. Reference key SAP database tables where helpful (e.g., VBAK for sales orders, EKKO for PO header)
5. Be concise, practical, and implementation-focused with concrete examples
6. If asked about errors or dumps, ask for the error message or suggest using T-code ST22
7. Always differentiate between ECC and S/4HANA behaviour when relevant
8. Provide actionable, step-by-step guidance that a functional consultant can follow immediately

BE HELPFUL AND SPECIFIC. Provide real T-codes and actual configuration steps, not vague explanations.`;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { message, module = "all", conversationHistory = [] } = req.body;

    // Validate input
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required and must be a string" });
    }

    if (!client) {
      return res.status(500).json({ 
        error: "API key not configured. Please set ANTHROPIC_API_KEY environment variable." 
      });
    }

    // Build conversation messages
    const messages = [
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      {
        role: "user",
        content: message.trim(),
      },
    ];

    // Call Claude API
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: getSystemPrompt(module),
      messages: messages,
    });

    // Extract text response
    const textContent = response.content.find((block) => block.type === "text");
    const reply = textContent ? textContent.text : "Sorry, I couldn't generate a response. Please try again.";

    return res.status(200).json({
      success: true,
      reply: reply,
      module: module,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("API Error:", error);
    
    const errorMessage = error.message || "Unknown error occurred";
    const statusCode = error.status || 500;

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
}

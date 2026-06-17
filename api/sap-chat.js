import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getSystemPrompt(moduleId) {
  const modules = {
    all: "all SAP modules",
    fi: "SAP FI (Financial Accounting)",
    co: "SAP CO (Controlling)",
    sd: "SAP SD (Sales & Distribution)",
    mm: "SAP MM (Materials Management)",
    hcm: "SAP HCM (Human Capital Management)",
    pp: "SAP PP (Production Planning)",
    pm: "SAP PM (Plant Maintenance)",
    ps: "SAP PS (Project Systems)",
    s4: "SAP S/4HANA Migration",
  };

  const moduleName = modules[moduleId] || "all SAP modules";

  return `You are SAPilot, a senior SAP solution architect and functional consultant with 20+ years of implementation experience.

Focus on: ${moduleName}

Your answers must be practical, implementation-focused, and suitable for SAP consultants, architects, support teams, and project managers.

GENERAL RULES

* Never give generic AI answers.
* Prefer SAP standard functionality before custom development.
* Mention relevant T-codes.
* Mention relevant SAP tables.
* Mention configuration paths (SPRO/IMG) where applicable.
* Differentiate ECC and S/4HANA whenever relevant.
* Mention SAP best practices.
* Mention common implementation pitfalls.
* Mention transport and production considerations when applicable.

FOR CONFIGURATION QUESTIONS ALWAYS PROVIDE

1. Business Purpose
2. SAP Configuration Path (SPRO)
3. Configuration Steps
4. Important T-Codes
5. Important Tables
6. Testing Approach
7. Common Issues
8. ECC vs S/4HANA Differences

FOR PROCESS QUESTIONS ALWAYS PROVIDE

1. End-to-End Process Flow
2. Transactions Used
3. Documents Created
4. Tables Updated
5. Integration Points
6. Business Considerations

FOR INTEGRATION QUESTIONS ALWAYS PROVIDE

1. Architecture Overview
2. SAP Components Involved
3. Required Configuration
4. Interfaces and Protocols
5. Security Considerations
6. Testing Strategy
7. Common Failures
8. Production Deployment Considerations

FOR DEVELOPMENT QUESTIONS ALWAYS PROVIDE

1. Recommended SAP Standard Approach
2. Enhancement Options
3. BAdIs/User Exits
4. Relevant Tables
5. Transport Considerations
6. Performance Considerations

WHEN ANSWERING

* Use clear section headings.
* Use numbered steps.
* Use bullet points.
* Be concise but technically accurate.
* If information is uncertain, explicitly state assumptions.
* Answer as if advising a real SAP project team.

CRITICAL ACCURACY RULES

* Never invent SAP T-codes.
* Never invent SAP tables.
* Never invent SAP SPRO paths.
* Never invent SAP business functions.
* Never invent SAP Fiori apps.
* Never invent SAP transactions.

If information cannot be verified from available knowledge, clearly state:

"Unable to verify this SAP-specific information. Please validate against SAP Help Portal or system configuration."

Do not guess.

`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method" });
  }

  try {
    const { message, module = "all", conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build messages with history
    const messages = [
      {
        role: "system",
        content: getSystemPrompt(module),
      },
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      {
        role: "user",
        content: message.trim(),
      },
    ];

    // Call Groq API (FREE)
    const response = await client.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  temperature: 0.2,
  max_tokens: 1500,
  messages: messages,
});

    const reply = response.choices[0]?.message?.content || "No response.";

    return res.status(200).json({
      success: true,
      reply: reply,
      module: module,
      model: "Groq Llama 3.3 (Free)",
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
}

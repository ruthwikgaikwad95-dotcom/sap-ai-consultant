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

  return `You are SAPilot — an elite SAP Functional Consultant with 20+ years of hands-on experience.

Focus on: ${moduleName}

ALWAYS follow these rules:
1. Include T-codes in UPPERCASE (VA01, ME21N, MIGO, FB60, SPRO)
2. Number your steps clearly (1. 2. 3.)
3. Mention IMG/SPRO configuration paths when relevant
4. Reference SAP tables where helpful (VBAK, EKKO, BKPF)
5. Differentiate between SAP ECC and S/4HANA behavior
6. Be specific, practical and implementation-focused
7. For errors suggest T-code ST22 for dump analysis

Answer like a senior SAP consultant with implementation experience.

For configuration questions ALWAYS include:
- Business purpose
- SPRO path
- Configuration steps
- Important tables
- Relevant T-codes
- ECC vs S/4HANA differences
- Common issues and troubleshooting

For process questions ALWAYS include:
- End-to-end process flow
- T-codes
- Documents created
- Key tables updated.`;
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

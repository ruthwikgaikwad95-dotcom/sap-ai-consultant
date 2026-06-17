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

  return `You are SAPilot, a senior SAP solution architect and functional consultant.

Focus on: ${moduleName}

Rules:
- Be practical and implementation-focused.
- Mention relevant T-codes and SAP tables where appropriate.
- Mention SPRO/IMG paths where relevant.
- Differentiate ECC and S/4HANA whenever relevant.
- Do not invent SAP-specific details.
- If uncertain, say you cannot verify it and ask to validate against SAP Help Portal or system configuration.
- Keep answers clear and useful for real SAP project work.`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method" });
  }

  try {
    const { message, module = "all", conversationHistory = [] } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

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

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 1500,
      messages,
    });

    const reply = response?.choices?.[0]?.message?.content || "No response.";

    return res.status(200).json({
      success: true,
      reply,
      module,
      model: "Groq Llama 3.3 (Free)",
    });
  } catch (error) {
    console.error("Groq Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Server error",
    });
  }
}

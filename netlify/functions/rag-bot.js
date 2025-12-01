// File: netlify/functions/rag-bot.js

// 1. IMPORT AND INITIALIZE
const { GoogleGenAI } = require("@google/genai");
// The SDK automatically uses the GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI({});

// 2. KNOWLEDGE BASE (In-Context Learning Content)
// Students: Paste your structured policy content here.
const POLICY_KNOWLEDGE = `
[START COMPANY POLICY]

# SECTION 1: HR & LEAVE POLICY
## 1.1 Annual Leave (AL)
- Entitlement: All full-time employees receive 15 days of Annual Leave per calendar year.
- Accrual: Leave is accrued monthly.
- Carry-over: A maximum of 5 unused AL days can be carried over to the next year.
- Approval Process: All AL requests must be submitted through the Odoo HR system and approved at least 7 days in advance.

## 1.2 Remote Work Policy
- Eligibility: Employees in 'Flexible' roles may work remotely.
- Schedule: Up to 2 days/week (Tue, Thu preferred).
- Equipment: Laptop + monitor provided. Home office cost reimbursed up to $50/month.

# SECTION 2: IT & ASSET MANAGEMENT
## 2.1 Password Security
- Update every 60 days.
- Min 10 chars, include uppercase, number, special char.

## 2.2 Device Policy
- Company retains ownership.
- Employees cannot install unauthorized software.

# SECTION 3: SALES & COMMISSION
## 3.1 Commission
- Standard: 5% commission on gross profit.
- Bonus: Extra 2% when monthly sales exceed $50,000.
- Payment: Paid monthly on the 10th business day after month-end.

[END COMPANY POLICY]
`;

// 3. MAIN HANDLER
exports.handler = async (event) => {
  // === 3.1. Handle CORS Preflight (OPTIONS) ===
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  // Reject other methods
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user_query } = JSON.parse(event.body);

    // 3.2. SYSTEM PROMPT + ICL
    const system_prompt = `
You are a strict internal policy assistant.
Answer employee questions ONLY based on the following policy document.
If the information is not explicitly found in the document, reply with:
"Sorry, I cannot find this information in the policy document."
    `.trim();

    const full_prompt = `${system_prompt}\n\n${POLICY_KNOWLEDGE}\n\nQuestion: ${user_query}`;

    // 3.3. CALL GEMINI
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: full_prompt,
      config: {
        temperature: 0.1,
      },
    });

    const bot_answer = response.text.trim();

    // 3.4. SUCCESS RESPONSE
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ answer: bot_answer }),
    };
  } catch (error) {
    console.error("Gemini API Error:", error);

    // 3.5. ERROR RESPONSE
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error:
          "AI Internal Error. Please check GEMINI_API_KEY/Credit on Netlify.",
      }),
    };
  }
};

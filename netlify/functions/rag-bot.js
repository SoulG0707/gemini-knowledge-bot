// File: netlify/functions/rag-bot.js

// 1. IMPORT AND INITIALIZE
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({});

// FIX: Odoo domain required for CORS
const allowedOrigin = "https://edu-aidrinkshop.odoo.com,https://edu-aidrinkshop.odoo.com/gemini-bot";

// 2. KNOWLEDGE BASE (In-Context Learning Content)
const POLICY_KNOWLEDGE = `
 [START COMPANY POLICY]
 # SECTION 1: HR & LEAVE POLICY (Human Resources)
 ## 1.1 Annual Leave (AL)
 - Entitlement: All full-time employees receive 15 days of Annual Leave per calendar year.
 - Accrual: Leave is accrued monthly.
 - Carry-over: Max 5 days can be carried over.
 - Approval: Must be submitted via Odoo HR system 7 days in advance.

 ## 1.2 Remote Work Policy
 - Eligibility: Employees in 'Flexible' positions are eligible.
 - Schedule: Up to 2 days/week (Tue, Thu).
 - Equipment: Laptop + monitor; up to $50/month reimbursement.

 # SECTION 2: IT & ASSET MANAGEMENT
 ## 2.1 Password Security
 - Update every 60 days.
 - Minimum 10 chars; must include uppercase, number, special char.

 ## 2.2 Device Policy
 - Laptops owned by company.
 - Unauthorized software installation prohibited.

 # SECTION 3: SALES & COMMISSION
 ## 3.1 Commission Structure
 - Standard: 5% commission.
 - Bonus: +2% if monthly sales exceed $50,000.
 - Payment: Paid on 10th business day monthly.

 [END COMPANY POLICY]
`;

// 3. MAIN HANDLER
exports.handler = async (event) => {
  // 3.1. FIX: Handle CORS Preflight (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user_query } = JSON.parse(event.body);

    // 3.2. DEFINE ROLE + ICL PROMPT
    const system_prompt = `You are a strict internal policy assistant.
Answer employee questions ONLY based on the following document.
If not explicitly found, reply:
"Sorry, I cannot find this information in the policy document."`;

    const full_prompt = `${system_prompt}\n\n${POLICY_KNOWLEDGE}\n\nQuestion: ${user_query}`;

    // 3.3. CALL GEMINI API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: full_prompt,
      config: { temperature: 0.1 },
    });

    const bot_answer = response.output_text;

    // 3.4. SUCCESS RESPONSE
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
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
        "Access-Control-Allow-Origin": allowedOrigin,
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

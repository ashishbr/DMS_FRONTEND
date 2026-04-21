import { NextResponse } from "next/server";

// Force dynamic rendering - this route should not be statically generated
export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  message: string;
  context?: Array<{ role: "user" | "assistant"; content: string }>;
  session_id?: string;
}

const knowledgeBase = `EMB Global focuses on an AI-powered DMS that ingests purchase orders, invoices, and service agreements.
The system automates classification, OCR extraction, validation, linking, and alerts, and provides dashboards plus an upcoming conversational assistant.`;

const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_URL ?? process.env.LAMBDA_URL;

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const userMessage = body.message?.trim();

  if (!userMessage) {
    return NextResponse.json(
      { reply: "I didn't catch a question. Ask me about purchase orders, invoices, or agreements." },
      { status: 400 }
    );
  }

  let reply = "";

  if (lambdaUrl) {
    try {
      const lambdaResponse = await fetch(lambdaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: userMessage,
          context: body.context,
          session_id: body.session_id
        }),
        cache: "no-store"
      });

      if (lambdaResponse.ok) {
        const payload = (await lambdaResponse.json()) as {
          answer?: string;
          reply?: string;
          message?: string;
          session_id?: string;
        };
        return NextResponse.json(
          { reply: payload.answer ?? payload.reply ?? payload.message ?? "The assistant couldn't craft a response.", session_id: payload.session_id },
          { status: 200 }
        );
      }

      const errorDetail = await lambdaResponse.text();
      console.error("Lambda chatbot returned non-200 response:", lambdaResponse.status, errorDetail);
    } catch (error) {
      console.error("Failed to reach chatbot Lambda:", error);
    }
    // fall through to scripted reply below if Lambda is unavailable
  }

  if (/po|purchase order/i.test(userMessage)) {
    reply =
      "Purchase orders are tracked with cap, utilization, vendor, and expiry metadata. You can review PO balances on the dashboard or open the document detail page for more context.";
  } else if (/invoice/i.test(userMessage)) {
    reply =
      "Invoices are matched against their linked PO. Validation ensures amounts stay within the PO cap and alerts trigger if mismatches appear.";
  } else if (/agreement|contract/i.test(userMessage)) {
    reply =
      "Service agreements store vendor relationships, expiry dates, and linked PO versions. The system raises alerts 30 days before expiration.";
  } else if (/alert|notification/i.test(userMessage)) {
    reply =
      "Alerts fire when PO utilization crosses thresholds, invoices fail validation, or agreements near expiration. Manage rules in the Alerts view.";
  } else if (/chatbot|assistant/i.test(userMessage)) {
    reply =
      "I'm the DMS assistant. Ask about PO balances, upcoming expiries, or document summaries and I'll point you to the right dashboard modules.";
  } else {
    reply = `Here's what I know: ${knowledgeBase}`;
  }

  return NextResponse.json({ reply }, { status: 200 });
}

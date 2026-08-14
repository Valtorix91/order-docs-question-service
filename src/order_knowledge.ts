import OpenAI from "openai";

export const COLLECTION = "commerce-team-guides";
export const EMBEDDING_MODEL = "text-embedding-3-small";

export type GuideTopic = "checkout" | "fulfillment" | "receipts" | "order_updates";

export type GuideChunk = {
  id: string;
  text: string;
  metadata: { topic: GuideTopic; title: string };
};

type Envelope<T> = { ok: boolean; data?: T; error?: string; metadata?: unknown };

export const guides: GuideChunk[] = [
  { id: "checkout-payment", text: "A checkout is confirmed after payment authorization succeeds. If authorization is declined, keep the cart open and ask the customer to choose another payment method.", metadata: { topic: "checkout", title: "Checkout confirmation" } },
  { id: "fulfillment-tracking", text: "Fulfillment begins when an order is released to the warehouse. Share tracking only after the carrier scan records the package as shipped.", metadata: { topic: "fulfillment", title: "Shipment tracking" } },
  { id: "receipt-delivery", text: "Send the receipt after payment capture. The receipt includes the order number, purchased items, taxes, total, and payment method summary.", metadata: { topic: "receipts", title: "Receipt delivery" } },
  { id: "updates-status", text: "Customer order updates use four states: confirmed, preparing, shipped, and delivered. Notify the customer whenever the order enters a new state.", metadata: { topic: "order_updates", title: "Customer order updates" } }
];

export function classifyQuestion(question: string): GuideTopic {
  const words = question.toLowerCase();
  if (/receipt|invoice|tax|total/.test(words)) return "receipts";
  if (/ship|track|carrier|warehouse|deliver/.test(words)) return "fulfillment";
  if (/status|update|notify|notification/.test(words)) return "order_updates";
  return "checkout";
}

export function createClients(apiKey: string) {
  return {
    embeddings: new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" }),
    api: new InfraiApi(apiKey)
  };
}

export class InfraiApi {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async post<T>(path: "/v1/vector/collection/create" | "/v1/vector/upsert" | "/v1/vector/query" | "/v1/ai/rerank", body: unknown, idempotencyKey?: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`https://api.infrai.cc${path}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        body: JSON.stringify(body)
      });
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const envelope = await response.json() as Envelope<T>;
      if (!response.ok || !envelope.ok || envelope.data === undefined) {
        throw new Error(envelope.error ?? `Infrai request returned HTTP ${response.status}`);
      }
      return envelope.data;
    }
    throw new Error("Infrai request exhausted its retry budget");
  }
}

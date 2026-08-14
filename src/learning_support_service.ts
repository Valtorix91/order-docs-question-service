import { createServer } from "node:http";
import { z } from "zod";
import { COLLECTION, EMBEDDING_MODEL, classifyQuestion, createClients } from "./order_knowledge.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const { embeddings, api } = createClients(apiKey);

const questionBody = z.object({
  question: z.string().trim().min(5).max(500),
  order_id: z.string().trim().min(1).max(80)
}).strict();

type Match = { id: string; score: number; metadata: { text: string; title: string; topic: string } };
type QueryData = { matches: Match[] };
type RerankData = { results: Array<{ index: number; score: number }> };

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/questions") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }
  try {
    const input = questionBody.parse(await readJson(request));
    const topic = classifyQuestion(input.question);
    const vector = await embeddings.embeddings.create({ model: EMBEDDING_MODEL, input: input.question });
    const query = await api.post<QueryData>("/v1/vector/query", {
      collection: COLLECTION,
      embedding: vector.data[0]?.embedding,
      top_k: 4,
      filter: { topic },
      include_metadata: true
    });
    const candidates = query.matches.map((match) => match.metadata.text);
    const reranked = await api.post<RerankData>("/v1/ai/rerank", {
      query: input.question,
      candidates,
      top_k: 2,
      model: "auto",
      vendor: "auto"
    });
    const evidence = reranked.results.map((result) => candidates[result.index]).filter((text): text is string => Boolean(text));
    response.writeHead(200).end(JSON.stringify({
      order_id: input.order_id,
      topic,
      answer: evidence[0] ?? "No matching guidance was found.",
      evidence
    }));
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof Error ? error.message : "Unexpected request error";
    response.writeHead(status).end(JSON.stringify({ error: message }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Order document questions: http://localhost:3000/questions");
});

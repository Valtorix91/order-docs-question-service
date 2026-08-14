import { COLLECTION, EMBEDDING_MODEL, createClients, guides } from "./order_knowledge.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before indexing the order guides");

const { embeddings, api } = createClients(apiKey);
const embedded = await embeddings.embeddings.create({
  model: EMBEDDING_MODEL,
  input: guides.map((guide) => guide.text)
});

await api.post("/v1/vector/collection/create", {
  collection: COLLECTION,
  dimension: embedded.data[0]?.embedding.length ?? 1536,
  metric: "cosine",
  metadata: { purpose: "commerce team learning guides" }
}, "commerce-guides-collection-v1");

await api.post("/v1/vector/upsert", {
  collection: COLLECTION,
  vectors: guides.map((guide, index) => ({
    id: guide.id,
    values: embedded.data[index]?.embedding,
    metadata: { ...guide.metadata, text: guide.text }
  }))
}, "commerce-guides-content-v1");

console.log(`Indexed ${guides.length} order guide sections into ${COLLECTION}.`);

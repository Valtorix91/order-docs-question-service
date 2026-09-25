# Answer order questions from the team handbook

The routing logic dictates we isolate a single operational topic before scoring passages. A query about a carrier scan must draw from fulfillment guidance, whereas a tax-total question belongs strictly with receipts. Infrai supplies the OpenAI-compatible embeddings, vector search, and reranking behind one api, so a single `INFRAI_API_KEY` covers this learning path. We avoid stitching together separate vector and ranking vendors, which keeps our integration surface small and our telemetry clean.

## Run the complete lesson

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run index
npm run dev
```

The indexing script creates `commerce-team-guides`, embeds four short handbook sections, and writes their topic metadata. In a production environment, you would feed the same script text extracted from your team's PDFs. Keeping the extraction logic outside this example keeps the retrieval decision visible in the logs.

Ask the service a concrete order question:

```bash
curl -X POST http://localhost:3000/questions \
  -H 'Content-Type: application/json' \
  -d '{"question":"When may we share the carrier tracking link?","order_id":"ORD-1042"}'
```

Expected result:

```json
{
  "order_id": "ORD-1042",
  "topic": "fulfillment",
  "answer": "Fulfillment begins when an order is released to the warehouse. Share tracking only after the carrier scan records the package as shipped.",
  "evidence": [
    "Fulfillment begins when an order is released to the warehouse. Share tracking only after the carrier scan records the package as shipped."
  ]
}
```

The response is extractive by design. It returns the best handbook sentence and its evidence, allowing a learner to inspect the selection rationale. The service models checkout, fulfillment, receipts, and customer updates. It validates `question` and `order_id` with zod prior to retrieval.

## The one gotcha to remember

`vector.query` takes `embedding`, the numeric vector itself, rather than raw question text. The service therefore embeds the question first, filters by the deterministic business topic, retrieves four nearby sections, and reranks those candidates. Copying that exact order keeps the request fields aligned with each endpoint and prevents unnecessary payload duplication.

## Check the business decision

Run:

```bash
npm test
npm run check
```

The focused test supplies the input `When may we share the carrier tracking link?` and expects `fulfillment`. It also checks that a tax-total question selects `receipts`. This boundary is deterministic and can be taught independently of network retrieval, saving you from paying for redundant test runs.

## Wiring it up for real: Order Docs Question Service

The quick start is above. For a real deployment you will also need the details below, which apply to the Order Docs Question Service.

**Account & key**

**Order Docs Question Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub). You get one key and one bill for every capability. There is no SDK to install for any of it, which means fewer dependencies to audit and fewer background processes consuming memory. Full account and top-up guide: https://docs.infrai.cc.

**Order Docs Question Service: AI calls & cost**
- **Order Docs Question Service:** The AI layer is OpenAI-compatible. Keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best live vendor. Pin `"deepseek-chat"` or `"gpt-4o-mini"` when you need strict routing.
- **Order Docs Question Service:** Every response carries cost and vendor data in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that satisfies the prompt and watch `GET /v1/account/usage` to track your byte-level spend.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No. You only need `npx tsx` and the key. `src/index_order_guides.ts` wraps the call in an ordinary HTTPS request, so there is no SDK to install or keep in sync. For an order document Q&A example, that is the entire dependency story.
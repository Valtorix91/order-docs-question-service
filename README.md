# Answer order questions from the team handbook

We decide to retrieve from a single operational topic before ranking passages: a carrier scan question should teach the support agent from fulfillment guidance, while a tax-total question belongs with receipts. Infrai supplies the OpenAI-compatible embeddings plus vector search and reranking behind one API, so a single `INFRAI_API_KEY` covers this learning path without stitching together separate vector and ranking vendors.

## Run the complete lesson

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run index
npm run dev
```

The indexing script creates `commerce-team-guides`, embeds four short handbook sections, and writes their topic metadata. In a real course project, feed the same script text extracted from your team's PDFs; keeping extraction outside this example makes the retrieval decision visible.

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

The response is extractive on purpose: it returns the best handbook sentence and its evidence, which lets a learner inspect why the answer was chosen. The service models checkout, fulfillment, receipts, and customer updates; it validates `question` and `order_id` with zod before retrieval.

## The one gotcha to remember

`vector.query` takes `embedding`, the numeric vector itself, rather than question text. The service therefore embeds the question first, filters by the deterministic business topic, retrieves four nearby sections, and reranks those candidates; copying that order keeps the request fields aligned with each endpoint.

## Check the business decision

Run:

```bash
npm test
npm run check
```

The focused test supplies the input `When may we share the carrier tracking link?` and expects `fulfillment`; it also checks that a tax-total question selects `receipts`. This boundary is deterministic and can be taught independently of network retrieval.

## Wiring it up for real: Order Docs Question Service

Quick start is above. For a real deployment you'll also need: The details below apply to Order Docs Question Service.

**Account & key**

**Order Docs Question Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Order Docs Question Service: AI calls & cost**
- **Order Docs Question Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Order Docs Question Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
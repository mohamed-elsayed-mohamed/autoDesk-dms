# Spec prompt: 009 AI-Powered Features

**Use with:** `/speckit.specify` — paste the content below into the command.

---

Build AutoDesk DMS — a Dealer Management System for automotive dealerships. This feature is **009-ai-powered-features**: AI capabilities that enhance existing modules — intelligent vehicle search, automated vehicle description generation, document OCR, lead scoring, internal copilot, and pricing suggestions. All AI outputs must support human-in-the-loop review and the system must work when AI services are unavailable (graceful degradation).

**Why:** The constitution requires responsible AI integration: human review before persisting or showing AI output to customers, versioned prompts, confidence indicators where applicable, and no hard dependency on AI for core flows. These features improve speed and quality for staff and customers without replacing judgment.

**Prerequisites:** 001-vehicle-inventory, 002-crm, 003-sales-deal-management, and 005-service-repair-orders are in place. AI features extend those modules.

**User Story 1 (P1) — Intelligent vehicle search**  
As a Sales Consultant or customer (if public search exists) I can search inventory using natural language (e.g. "family SUV under $35,000 with good gas mileage") in addition to structured filters. The system returns matching vehicles ranked by relevance. Relevance is computed using semantic similarity (e.g. embeddings) combined with filters (price, body style, mileage). If the AI search service is down, the system falls back to standard filter-only search. Results are clearly labeled when AI ranking was used.

**User Story 2 (P2) — Automated vehicle description generation**  
As an Inventory Manager when I add or edit a vehicle I can request an AI-generated listing description. The system produces a short marketing description (e.g. 150 words) from the vehicle's specs (year, make, model, trim, color, mileage, features). I must review and approve the text before it is saved or published; I can edit it. The generated text is not saved until I confirm. If the AI service is unavailable, the field stays empty or keeps the previous value. Prompts used for generation are versioned and stored as templates, not hardcoded in the app.

**User Story 3 (P3) — Document OCR**  
As a Service Advisor or F&I Manager I can upload an image of a driver's license, insurance card, or vehicle title. The system extracts key fields (name, address, license number, state, DOB, etc.) using an OCR service and shows me the extracted data in a form for confirmation. I can correct any field before saving. Data is only saved to the customer or deal when I confirm. If OCR fails or is unavailable, I can enter data manually. Sensitive extracted data (e.g. SSN if present) is encrypted at rest per constitution.

**User Story 4 (P4) — Lead scoring**  
As a BDC agent or Sales Consultant I can see an AI-generated lead score (e.g. 0–100) for each lead indicating likelihood to convert. The score is based on historical patterns (source, response time, engagement, vehicle interest, etc.). The score is displayed in the lead list and detail; it is advisory only and does not auto-assign or hide leads. If the scoring service is down, the score is hidden and no error blocks the CRM. Score can be refreshed on demand or on a schedule. Model or prompt version used for scoring is logged for audit.

**User Story 5 (P5) — Sales and service copilot (internal chatbot)**  
As a Sales Consultant or Service Advisor I can ask the system questions in natural language (e.g. "What's the warranty coverage on a 2023 Accord?" or "How do I submit a recall repair?") in a chat interface. The system retrieves relevant content from dealership SOPs, OEM documentation, or DMS help and generates a concise answer. Answers are for internal use only and must cite the source (e.g. document name or section). If the AI service is unavailable, the copilot returns a message saying it is temporarily unavailable and suggests contacting a manager or help desk. No customer-facing chatbot in this feature.

**User Story 6 (P6) — Pricing suggestion for used vehicles**  
As an Inventory Manager when I set or change the internet price for a used vehicle, I can request an AI pricing suggestion. The system suggests a price range based on market data (if available), vehicle condition, mileage, age, and days in stock. The suggestion is advisory; I can accept, ignore, or adjust. If the service is down, no suggestion is shown and I set the price manually. Confidence or data recency (e.g. "Based on data from [date]") is shown when available.

**Cross-cutting requirements**  
- All AI-generated content that is persisted or shown to customers must go through explicit human review (approve, edit, or reject).  
- LLM prompts are stored as versioned templates; the app references a template ID and version.  
- Where applicable, show confidence or "AI-generated" labels.  
- Graceful degradation: core flows (search, add vehicle, add lead, create RO, etc.) work without any AI service.  
- Audit log records when AI was used (e.g. description generated, lead scored, document scanned) and which model/version.

**Out of scope for this feature:** Training custom models on dealership data, customer-facing chatbot, and automated outbound messaging. Use correct domain terms; see dealer-management-system-guide.md and constitution (Responsible AI Integration).

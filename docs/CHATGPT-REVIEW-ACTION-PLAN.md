# Susan AI — ChatGPT Review Action Plan

**পর্যালোচনার ভিত্তি:** সংযুক্ত ChatGPT review এবং বর্তমান Susan AI repository-এর codebase।  
**বর্তমান branch:** `add-sanket-cortex-branding-876027349327466032`  
**সর্বশেষ verified commit:** `6be4647`

## Executive assessment

Susan AI-এর foundation ইতিমধ্যেই ভালো: Next.js standalone build, Vercel AI SDK streaming, provider error normalization, request validation, security headers, local conversation export/import, health endpoint এবং Electron wrapper আছে। তাই project-টি prototype-এর পর্যায় পেরিয়ে গেছে। এখন সবচেয়ে বেশি value তৈরি হবে **reliability, provider correctness, security clarity, এবং user-facing recovery workflow** উন্নত করলে।

সংযুক্ত review-এর সব প্রস্তাব একসাথে বাস্তবায়ন করা উচিত নয়। বিশেষ করে server-side credential storage, object storage, IndexedDB, agents এবং auto-update—এগুলো product direction ও deployment model স্থির করার পরে করা ভালো।

## Priority 0 — প্রথমে করা উচিত

### 1. BYOK security model স্পষ্ট করা

বর্তমানে API key browser-এর `localStorage`-এ Base64 encoding-এ রাখা হয় এবং প্রতিটি chat request-এর সঙ্গে `/api/chat` route-এ পাঠানো হয়। এটি **strictly personal BYOK** ব্যবহারের জন্য গ্রহণযোগ্য trade-off, কিন্তু Base64 encryption নয়। Public deployment-এ user-কে এই সীমাবদ্ধতা স্পষ্টভাবে জানানো দরকার।

**প্রস্তাবিত প্রথম ধাপ:**

- Settings-এ একটি prominent warning যোগ করা: “API keys are stored in this browser and are not encrypted.”
- `localStorage`-এ key রাখা ব্যবহারকারীর explicit choice হিসেবে দেখানো।
- “Clear all keys” এবং “Use provider-restricted keys” guidance আরও দৃশ্যমান করা।
- Public multi-user product করার সিদ্ধান্ত না হওয়া পর্যন্ত server-side persistent credential storage যোগ না করা।

**গুরুত্বপূর্ণ সিদ্ধান্ত:** Susan AI কি personal/local BYOK app থাকবে, নাকি hosted multi-user service হবে? এই সিদ্ধান্তের উপর credential architecture নির্ভর করবে।

### 2. Manus-কে instant chat selector থেকে সরানো

বর্তমান UI-তে Manus selectable, কিন্তু `getModelConfig()` ইচ্ছাকৃতভাবে asynchronous-task error ছুড়ে দেয়। ফলে user model নির্বাচন করে guaranteed failure পান। এটি সবচেয়ে পরিষ্কার functional bug।

**প্রস্তাব:**

- Manus-কে বর্তমান instant-chat `MODELS_METADATA` selector থেকে বাদ দেওয়া; অথবা
- Selector-এ disabled “Async tasks — coming soon” হিসেবে দেখানো; এবং
- ভবিষ্যতে আলাদা **Agents / Async Tasks** section তৈরি করা।

### 3. Production rate limiting-এর সীমা স্পষ্ট করা

বর্তমান in-memory limiter single-instance baseline হিসেবে ঠিক আছে, কিন্তু `x-forwarded-for`-এর উপর সরাসরি নির্ভর করা এবং server restart-এ state হারানো public production-এর জন্য যথেষ্ট নয়।

**প্রস্তাবিত rollout:**

- এখনই trusted deployment proxy অনুযায়ী client identity handling document করা।
- Vercel বা production host-এর native rate limiting ব্যবহার করা।
- Multi-instance/public traffic এলে Redis/Upstash-backed shared limiter যোগ করা।
- In-memory limiter-কে fallback হিসেবে রাখা, security boundary হিসেবে নয়।

### 4. File upload limits আরও কঠোর করা

বর্তমানে file Data URL-এ convert হয়ে chat request-এর অংশ হচ্ছে। এতে Base64 overhead এবং বড় request payload তৈরি হয়। Review-এর object/blob storage প্রস্তাব ভবিষ্যতের scalable architecture-এর জন্য সঠিক।

**তাৎক্ষণিক hardening:**

- মোট encoded payload-এর বাস্তবসম্মত limit নির্ধারণ করা।
- Provider/model অনুযায়ী supported file type ও file count validate করা।
- Error message-এ “file too large”, “unsupported type” এবং “provider does not support files” আলাদা করা।
- Body parsing-এর আগে `Content-Length`-এর পাশাপাশি parsed payload size-ও enforce করা।

**পরবর্তী ধাপ:** upload → temporary storage → file ID → chat request architecture। এটি তখনই করা উচিত যখন hosted/public scale দরকার হবে।

## Priority 1 — Reliability ও maintainability

### 5. Central provider registry এবং capability matrix

বর্তমানে provider metadata এক জায়গায় আছে, যা ভালো শুরু; কিন্তু model configuration আবার switch statement-এ hard-coded। Provider name, model ID, tier, setup URL এবং runtime behavior এক registry-তে আনা উচিত।

প্রতিটি entry-তে ভবিষ্যতে এই ধরনের capability রাখা যেতে পারে:

```ts
capabilities: {
  text: true,
  vision: false,
  files: false,
  streaming: true,
  tools: false,
  reasoning: true,
  async: false,
}
```

**লাভ:**

- model selector registry থেকেই render হবে;
- attachment দিলে unsupported model disable করা যাবে;
- provider model ID বদলালে এক জায়গায় update করা যাবে;
- Manus-এর মতো async provider instant-chat list-এ ঢুকে পড়বে না;
- provider health/status future-এ দেখানো যাবে।

এটি প্রথম বড় architecture improvement হিসেবে করা সবচেয়ে যুক্তিসঙ্গত।

### 6. Actionable error UX

Server-side error normalization ইতিমধ্যে আছে, কিন্তু frontend-এ error-কে action-এর সঙ্গে যুক্ত করা দরকার। Error state-এ শুধু text দেখানোর বদলে structured category ব্যবহার করা উচিত।

| Error category | UI action |
|---|---|
| API key rejected | **Open Settings** |
| Quota/credits exhausted | **Try another model** |
| Model unavailable | **Choose another provider** |
| Rate limited | Retry countdown / **Retry** |
| File unsupported | Remove attachment / choose compatible model |
| Async provider selected | Open Agents section |

এটি user experience-এ দ্রুত দৃশ্যমান উন্নতি দেবে এবং provider failure-এর পর user আটকে যাবেন না।

### 7. Conversation storage validation ও versioning

বর্তমানে conversation `localStorage`-এ রাখা হয়, সর্বোচ্চ ৫০টি conversation রাখা হয়, এবং import validation shallow।

**এখন করা উচিত:**

- export format-এ `schemaVersion` যোগ করা;
- conversation, message, role, content এবং date-এর runtime validation করা;
- invalid বা oversized import item skip করার কারণ দেখানো;
- storage quota error-এর জন্য clear recovery message দেওয়া;
- localStorage-এ credentials এবং conversations-এর আলাদা security explanation রাখা।

**পরে করা যেতে পারে:** IndexedDB migration। এটি বড় chat history, attachments এবং richer search দরকার হলে যুক্তিযুক্ত; এখনই migration করলে complexity বাড়বে।

### 8. `app/page.tsx` ধাপে ধাপে refactor

`Home()` বর্তমানে chat state, provider state, persistence, file conversion এবং UI orchestration একসাথে করছে। Review-এর proposed hooks ভালো direction:

- `useSusanChat()`
- `useConversation()`
- `useApiKeys()`
- `useFileAttachments()`

তবে একবারে বড় rewrite না করে প্রথমে persistence এবং file handling আলাদা hook-এ নেওয়া উচিত। এতে regression risk কম থাকবে।

### 9. Response actions

বর্তমানে Stop support আছে, কিন্তু পরবর্তী product value-এর জন্য এই action order উপযুক্ত:

1. Copy response
2. Copy code block
3. Retry / Regenerate
4. Retry with another model
5. Edit & resend
6. Continue response

“Retry with another model” Susan AI-এর clear differentiator হতে পারে, কিন্তু এর আগে message state ও conversation persistence model নির্ভরযোগ্য করা দরকার।

## Priority 2 — polish ও platform maturity

### 10. Accessibility

Model selector-এ ARIA foundation আছে। পরবর্তী কাজ:

- Arrow Up/Down navigation;
- Enter এবং Escape behavior;
- focus return;
- Settings modal focus trap;
- screen-reader announcement for streaming/error state;
- visible keyboard focus styles।

### 11. Susan AI design system

Review-এ `Claude-like Brand Colors` comment এবং terra-cotta accent-এর কথা সঠিকভাবে ধরা হয়েছে। Logo ইতিমধ্যে app-এ যুক্ত হয়েছে, কিন্তু visual identity আরও coherent করা যায়।

**প্রস্তাব:**

- Claude-inspired comment সরিয়ে Susan AI brand tokens রাখা;
- logo-এর brown accent থেকে primary/secondary color tokens নির্ধারণ;
- assistant avatar, empty-state illustration, button states এবং favicon-এ একই icon language ব্যবহার;
- Electron app icon-ও একই mark-এ রূপান্তর করা।

### 12. Electron robustness

Dynamic port, graceful shutdown, crash recovery এবং auto-update useful, কিন্তু Windows release ব্যবহারকারীর সংখ্যা ও distribution model নিশ্চিত হওয়ার পরে করা ভালো। প্রথমে:

- dynamic free-port selection;
- bundled server failure হলে retry এবং clear error;
- graceful cleanup on window close;
- তারপর auto-update।

### 13. CI quality gates

বর্তমান Windows workflow-এ `npm ci`, build এবং installer build আছে। Release-এর আগে অন্তত এই checks যোগ করা উচিত:

```bash
npm run lint
npx tsc --noEmit
npm audit --audit-level=high
npm run build
```

এর সঙ্গে unit tests যোগ হলে release confidence আরও বাড়বে।

## Recommended implementation order

| Phase | কাজ | ফলাফল |
|---|---|---|
| Phase 1 | Manus disable/segregate, API-key warning, file validation hardening, CI checks | Immediate correctness and safety |
| Phase 2 | Central provider registry + capability matrix | Safer model selection and easier maintenance |
| Phase 3 | Actionable errors, Copy/Retry actions, conversation schema validation | Better daily usability |
| Phase 4 | Hook refactor, IndexedDB evaluation, attachment storage | Maintainable scale-up |
| Phase 5 | Agents, web search, memory, async tasks | Susan AI as a personal AI workspace |
| Phase 6 | Electron updater, dynamic port, crash recovery | Production desktop maturity |

## Final recommendation

Susan AI-কে এখনই বড় “AI operating system” বানানোর চেষ্টা না করে প্রথমে এই তিনটি outcome নিশ্চিত করা উচিত:

1. **যে model selectable, সেটি কাজ করবে বা স্পষ্টভাবে disabled থাকবে।**
2. **Provider/file/key error হলে user next action বুঝতে পারবেন।**
3. **Public deployment-এ security ও scaling limitations স্পষ্ট এবং controlled থাকবে।**

এই foundation শক্ত হলে “Personal AI Operating Workspace” direction-এ Agents, documents, web search, memory এবং desktop automation যোগ করা অনেক নিরাপদ ও maintainable হবে।

## Verified current strengths

বর্তমান code review করে যেগুলো ইতিমধ্যেই ভালো পাওয়া গেছে:

- Next.js standalone production build;
- streaming responses;
- request validation এবং message limits;
- normalized provider errors;
- security headers;
- local conversation export/import;
- health endpoint;
- Electron wrapper with `contextIsolation: true` এবং `nodeIntegration: false`;
- application logo ও favicon branding update;
- lint এবং production build বর্তমানে pass করছে।

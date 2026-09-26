# Susan AI Agent Foundation

এই ধাপে Susan AI-এর existing chat flow অপরিবর্তিত রেখে Agent Mode-এর ভিত্তি যোগ করা হয়েছে।

## Added modules

- `lib/agent/types.ts` — tool, task, plan step এবং execution event-এর typed contract
- `lib/agent/tool-registry.ts` — allowlisted tool registry
- `lib/agent/agent-state.ts` — task lifecycle এবং safe state transitions

## Task lifecycle

```text
draft → planning → awaiting_approval → running → completed
                         ↓              ↓
                       paused         failed
```

যেকোনো write বা restricted-execution tool-এর ক্ষেত্রে orchestrator-কে `requestApproval` callback ব্যবহার করতে হবে। `ToolDefinition`-এ permission level থাকলেও registry নিজে tool execute করে না; execution policy orchestrator-এ enforce হবে। এতে tool metadata এবং execution control আলাদা থাকে।

## Permission policy

| Permission | উদাহরণ | Approval |
|---|---|---|
| `read-only` | local file metadata, calculator | সাধারণত নয় |
| `external-read` | web search, approved API read | policy অনুযায়ী |
| `user-approved-write` | report export, file edit | অবশ্যই |
| `restricted-execution` | sandbox code execution | অবশ্যই + sandbox |

## Next implementation step

read-only `calculator` এবং `file-analysis` tools এখন registry-তে যুক্ত হয়েছে। Calculator শুধুমাত্র arithmetic parser ব্যবহার করে; arbitrary JavaScript বা shell code চালায় না। File analysis TXT, Markdown, CSV এবং JSON-এর bounded preview ও metadata দেয়, এবং unsupported file type হলে কেবল safe metadata ফেরত দেয়।

পরবর্তী ধাপে এই registry-কে Agent Workspace-এর Plan panel ও execution timeline-এর সঙ্গে যুক্ত করা হবে। Arbitrary shell execution এই foundation-এর অংশ নয়।

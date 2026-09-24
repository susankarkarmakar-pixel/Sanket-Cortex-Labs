<div align="center">
  <img src="public/logo.png" alt="Sanket Cortex Labs Logo" width="150" />
  <h1>🧠 Sanket Cortex Labs</h1>
  <p><strong>Neural Solutions for a Smarter World</strong></p>
  <p><em>Alternative tagline: <strong>Decoding Intelligence</strong></em></p>
</div>

## About
Sanket Cortex Labs is an AI research and development studio focused on building intelligent, multimodal systems that bridge the gap between human creativity and machine intelligence.

It is our multi-model AI chat interface with BYOK (Bring Your Own Key) support.
Use DeepSeek, Claude, Hugging Face, Gemini, ChatGPT, Qwen, Kimi, Manus, and Sarvam models from a single unified interface.

## Features
- 🔑 BYOK - Your keys, your data
- 🔄 Multi-model support (DeepSeek, Claude, Hugging Face, Google Gemini, OpenAI, Qwen, Kimi, Manus, Sarvam)
- ⚡ Real-time streaming responses
- 💾 Chat history with local persistence
- 📝 Markdown & code highlighting
- 📱 Fully responsive design
- 🎨 Dark theme with Sanket Cortex Labs branding

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Vercel AI SDK 7
- React Markdown

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/susankarkarmakar-pixel/Susan-AI.git
   cd Susan-AI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory. You can use `.env.example` as a template, although API keys are primarily provided by users in the UI.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Security
**Your keys are safe.**
Sanket Cortex Labs follows a strict BYOK (Bring Your Own Key) policy. API keys for the configured models are **never sent to or stored on our servers**.
All keys are obfuscated using Base64 encoding and stored entirely within your browser's `localStorage`. Note: Base64 is an encoding mechanism, not true encryption. Avoid accessing the app on shared devices.

## License
MIT

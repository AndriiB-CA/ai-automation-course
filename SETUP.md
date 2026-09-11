# 🧰 Environment Setup

Estimated time: 60–90 minutes. Do this in Week 1.

---

## 1. Prerequisites

You should already have:
- **Git** (check: `git --version` ≥ 2.30)
- **Node.js 20+** (check: `node --version`)
- **VS Code** (or your editor of choice)

If you don't have Node 20+, install via [nvm](https://github.com/nvm-sh/nvm) so you can switch versions easily:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

---

## 2. Python (you said you're comfortable, so skimming)

Install Python 3.12 and `uv` (modern pip replacement — 10–100× faster):

```bash
# macOS
brew install python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh

# Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Verify:
```bash
uv --version
python3 --version
```

Every Python project in this course will use `uv`:
```bash
uv init my-project
cd my-project
uv add openai pydantic
uv run main.py
```

---

## 3. API keys

This course is **provider-neutral**: every project talks to an OpenAI-compatible
endpoint, so you pick a vendor once and never touch the code again.
**Read [PROVIDERS.md](./PROVIDERS.md) first** — it lists the base URLs and where
to get a key for each.

### Pick your first provider
You need one to start. Two of the options cost nothing:

| If you want… | Use | Cost |
|---|---|---|
| To start in 2 minutes with no credit card | **Groq** or **Google AI Studio** | free tier |
| To run entirely offline, nothing leaving your laptop | **Ollama** | free |
| Frontier capability for the agent modules | **xAI, OpenAI, Anthropic or Google** | ~$20 goes a long way |

Whichever you choose: **set a spend cap on the provider's console before you write
any code.** Every vendor has one. It is the single highest-value five minutes in
this setup guide.

### Get a second one before Week 7
Module 2 is about evals, and an eval with one model in it isn't a comparison.
A free tier is enough for the second slot.

### Environment file
Create `~/.ai-course.env` (outside any repo):
```bash
# Example — Groq. Swap the base URL and key for any provider in PROVIDERS.md.
export LLM_BASE_URL="https://api.groq.com/openai/v1"
export LLM_API_KEY="..."
export LLM_MODEL="..."          # from your provider's model list
export LLM_MODEL_SMALL="..."    # a cheaper one, for high-volume steps

# Optional — from your provider's pricing page, in USD per million tokens.
# Without these the tools print token counts and skip the dollar figure.
export LLM_PRICE_IN_PER_MTOK=""
export LLM_PRICE_OUT_PER_MTOK=""
```

> **Why no model ID here?** Because any value this file suggested would be stale
> within months, and a stale default fails with a confusing 404 rather than an
> honest error. Open your provider's model list and paste a current one — five
> seconds now, no mystery later.

Then in your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
source ~/.ai-course.env
```

🛡️ **SECURITY — do this, no shortcuts:**
- `echo ".env" >> ~/.gitignore_global && git config --global core.excludesfile ~/.gitignore_global`
- Never paste an API key into a chat, a pastebin, or a screenshot
- Rotate your key if you even *think* it leaked — it's two clicks

---

## 4. VS Code extensions

Install these (the ID is in parentheses — `Cmd+P` → paste):
- **An AI coding agent** — pick one and stick with it for the course: **Claude Code** (`anthropic.claude-code`), **GitHub Copilot** (`github.copilot`), or a purpose-built editor like Cursor or Windsurf. [Module 16](./modules/16-ai-coding-agents.md) teaches the operator skill, which transfers across all of them; the repo-level `AGENTS.md` context file you'll write works with any of them.
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Playwright Test** (`ms-playwright.playwright`)
- **Python** (`ms-python.python`)
- **Pylance** (`ms-python.vscode-pylance`)
- **Ruff** (`charliermarsh.ruff`) — Python linter/formatter
- **Error Lens** (`usernamehw.errorlens`)

---

## 5. Docker (needed from Week 10 onward)

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Verify:
```bash
docker --version
docker run hello-world
```

---

## 6. Test that everything works

Create a throwaway project:
```bash
mkdir ~/ai-course-smoke-test && cd $_
npm init -y
npm install openai
cat > test.mjs <<'EOF'
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY || "not-needed",   // Ollama needs no key
});

const res = await client.chat.completions.create({
  model: process.env.LLM_MODEL,
  max_tokens: 256,
  messages: [{ role: "user", content: "Reply with exactly: It works." }],
});

console.log(res.choices[0].message.content);
console.log("tokens:", res.usage);
EOF
node test.mjs
```

Those seven lines are the whole abstraction. Change the two environment
variables and the same file runs against a different company's model.

Expected output: `It works.`

If you see that → **you're ready.** Delete the smoke test folder.

---

## 7. Deploy to GitHub Pages (optional but recommended)

You can host the interactive portal (`index.html`) so you can open it from any device:

```bash
# Fork or create a new GitHub repo with this course
git init
git add .
git commit -m "My AI Automation Engineer course"
git branch -M main
git remote add origin git@github.com:<your-username>/ai-automation-course.git
git push -u origin main
```

Then in GitHub:
1. Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main`, folder: `/ (root)`
4. Save

~2 minutes later your course is at `https://<your-username>.github.io/ai-automation-course/`

Bookmark it on your phone. You now have a course-in-your-pocket.

---

## 8. Recommended: Free accounts to set up now

- **GitHub** (you'll push everything here) — enable 2FA
- **Vercel** (free deploys for Week 12) — [vercel.com](https://vercel.com/)
- **Supabase** (free Postgres + pgvector) — [supabase.com](https://supabase.com/)
- **Langfuse Cloud** (free tier, 50k events/month) — [langfuse.com](https://langfuse.com/)
- **Browserbase** (free trial for Week 17) — [browserbase.com](https://www.browserbase.com/)

No need to wire them up today — just create the accounts so you can grab them when a module needs them.

---

## 9. Daily command you should know by heart

```bash
# Quick cost check — run this when you're worried
curl -sS "$LLM_BASE_URL/chat/completions" \
  -H "authorization: Bearer $LLM_API_KEY" \
  -H "content-type: application/json" \
  -d "{
    \"model\": \"$LLM_MODEL_SMALL\",
    \"max_tokens\": 20,
    \"messages\": [{\"role\": \"user\", \"content\": \"ping\"}]
  }" | jq .usage
```

You should see `prompt_tokens` and `completion_tokens`. Always know what your calls cost.

---

Done? Check the Week 1 box in [index.html](./index.html) and go to [ROADMAP.md](./ROADMAP.md) → Week 2.

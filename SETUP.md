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
uv add anthropic pydantic
uv run main.py
```

---

## 3. API keys

### Anthropic (primary for this course)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Add $20 credit to start (this will last weeks with caching)
3. **Set a monthly usage limit** — Settings → Limits → $25/month
4. Create an API key, copy it once (never shown again)

### OpenAI (optional, useful for comparison)
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Add $10 credit
3. Set monthly limit
4. Create key

### Environment file
Create `~/.ai-course.env` (outside any repo):
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

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
- **Claude Code** (`anthropic.claude-code`) — CLI agent in your editor
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
npm install @anthropic-ai/sdk
cat > test.mjs <<'EOF'
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const msg = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 256,
  messages: [{ role: "user", content: "Reply with exactly: It works." }],
});
console.log(msg.content[0].text);
EOF
node test.mjs
```

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
curl -sS https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model":"claude-haiku-4-5-20251001",
    "max_tokens": 20,
    "messages":[{"role":"user","content":"ping"}]
  }' | jq .usage
```

You should see `input_tokens` and `output_tokens`. Always know what your calls cost.

---

Done? Check the Week 1 box in [index.html](./index.html) and go to [ROADMAP.md](./ROADMAP.md) → Week 2.

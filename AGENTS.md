# COTM checkout map

Before editing, verify the absolute working directory, current branch, and `.openai/hosting.json` project ID.

- `C:\Users\nedne\Documents\Codex\2026-07-30\sites-plugin-sites-openai-bundled-create-3` is the public COTM checkout. Its Sites project ID must be `appgprj_6a6aedc976c481918f773708056e4ae2`. Public deployment always requires fresh explicit approval.
- `C:\Users\nedne\Documents\Codex\2026-08-05\cotm-wip-site` is the single canonical private-workbench checkout. Its Sites project ID must be `appgprj_6a73ccb3ad0c81918b4971980c4da341`. Consolidate review work here and deploy only with the owner-only Sites flow.

Never repurpose the public checkout as a private-workbench source. Never copy either checkout's `.openai/hosting.json`, D1 data, secrets, or Sites remote configuration into the other. Bring review branches into the canonical workbench by commit history, then preserve the workbench hosting file and validate the exact merged checkpoint before private deployment.

If the directory and project ID disagree, stop before building, saving, or deploying and repair the checkout identity first.

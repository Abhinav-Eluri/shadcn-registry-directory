# Shadcn Registry Directory & Component Explorer

A high-performance directory and discovery engine indexing **294+ community & official shadcn registries** with over **41,700+ verified components, blocks, and themes**.

---

## Features

- **294 Registries Indexed**: Full automated discovery across all published shadcn registries.
- **Live HTTP 200 Verification**: Real-time URL validation for component installation endpoints and documentation.
- **Dual Exploration Modes**:
  - **All Components**: Global search and filters across 41,700+ items with strict title/name matching and optional full-text description search.
  - **By Component (Grouped)**: Canonical segregation (e.g., compare all 56 variants of `Button`, 54 variants of `Input`, 49 variants of `Card`, etc.) with 1-click CLI commands and live docs links.
- **SaaS Dark Mode UI**: Built with React 19, TypeScript, Vite, and Tailwind CSS.
- **All-in-One Deployment**: FastAPI backend (`server.py`) serving the frontend and embedding a 24-hour background scraper daemon loop.

---

## Local Development

### 1. Run Scraper (Optional)
```bash
python main.py
```
Outputs `catalog.json` and `featured.json` into `frontend/public/`.

### 2. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 3. Run Production All-in-One Server
```bash
cd frontend && npm install && npm run build && cd ..
pip install -r requirements.txt
python server.py
```

---

## Deployment to Render

The repository includes a preconfigured [`render.yaml`](./render.yaml).

1. Go to [dashboard.render.com](https://dashboard.render.com/) &rarr; **New +** &rarr; **Blueprint**.
2. Connect this repository and click **Apply**.
3. Render will deploy the all-in-one Web Service with automated daily background sync!

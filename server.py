import os
import time
import threading
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("shadcn-service")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
FRONTEND_PUBLIC = os.path.join(BASE_DIR, "frontend", "public")

IS_SCRAPING = False
LAST_SCRAPE_TIME = None


def run_daily_scraper():
    """Runs the main scraper in a separate thread."""
    global IS_SCRAPING, LAST_SCRAPE_TIME
    if IS_SCRAPING:
        logger.warning("Scraper is already running, skipping duplicate trigger.")
        return

    try:
        IS_SCRAPING = True
        logger.info(">>> Starting scheduled daily registry scrape...")
        from main import main as scrape_main
        scrape_main()
        LAST_SCRAPE_TIME = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        logger.info(f">>> Registry scrape completed successfully at {LAST_SCRAPE_TIME}")
    except Exception as exc:
        logger.error(f"Error during scheduled scrape: {exc}", exc_info=True)
    finally:
        IS_SCRAPING = False


def daily_cron_worker():
    """Background daemon loop that triggers the scraper once every 24 hours."""
    # Sleep 60 seconds after startup before the first run if needed
    SECONDS_IN_A_DAY = 24 * 60 * 60
    while True:
        try:
            time.sleep(SECONDS_IN_A_DAY)
            run_daily_scraper()
        except Exception as exc:
            logger.error(f"Cron loop error: {exc}")
            time.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background daily cron thread
    cron_thread = threading.Thread(target=daily_cron_worker, daemon=True)
    cron_thread.start()
    logger.info("Daily 24-hour background cron scheduler started.")
    yield


app = FastAPI(title="ComponentHub API & Host", lifespan=lifespan)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "is_scraping": IS_SCRAPING,
        "last_scrape_time": LAST_SCRAPE_TIME,
    }


@app.post("/api/sync")
def trigger_manual_sync(background_tasks: BackgroundTasks):
    """Admin endpoint to manually trigger a sync without waiting 24 hours."""
    if IS_SCRAPING:
        return JSONResponse(status_code=409, content={"message": "Scraper is already in progress"})
    background_tasks.add_task(run_daily_scraper)
    return {"message": "Scrape task started in background"}


# Mount Model Context Protocol (MCP) Remote Server
try:
    from mcp_server import mcp as mcp_instance
    app.mount("/mcp", mcp_instance.sse_app())
    logger.info("Remote MCP Server mounted at /mcp/sse")
except Exception as mcp_err:
    logger.error(f"Failed to mount MCP Server: {mcp_err}")


@app.get("/api/mcp")
def mcp_info():
    """Returns instructions and connection details for AI agents connecting via MCP."""
    return {
        "status": "active",
        "name": "ComponentHub",
        "protocol": "Model Context Protocol (SSE)",
        "endpoint": "/mcp/sse",
        "description": "ComponentHub: Unified MCP Server exposing 41,700+ verified shadcn components across 294 registries.",
        "tools": [
            "search_components",
            "get_component_by_name",
            "get_install_command",
            "list_registries",
            "inspect_component_schema"
        ]
    }


# Serve static JSON data if present
if os.path.exists(FRONTEND_PUBLIC):
    app.mount("/data", StaticFiles(directory=FRONTEND_PUBLIC), name="data")

# Serve Vite production frontend if built
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # 1. Check in frontend/public (freshly scraped JSON catalogs)
        pub_path = os.path.join(FRONTEND_PUBLIC, full_path)
        if full_path and os.path.exists(pub_path) and os.path.isfile(pub_path):
            return FileResponse(pub_path)

        # 2. Check in frontend/dist (compiled bundle assets)
        dist_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(dist_path) and os.path.isfile(dist_path):
            return FileResponse(dist_path)

        # 3. Fallback to index.html for SPA routing
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse(status_code=404, content={"message": "Frontend not yet built. Run npm run build."})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
import app.core.database  # noqa: F401

from app.api.routes import sensor_data, machines, health, websockets

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------
# Application
# ----------------------------------------------------------------
app = FastAPI(
    title="Industrial Machine Monitoring API",
    description="Backend for the IoT-Based Multi-Sensor Industrial Machine Health Monitoring & Early Fault Detection System.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ----------------------------------------------------------------
# CORS Configuration
# ----------------------------------------------------------------
# Parse origins from env var string, separated by commas
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------
# Global Exception Handler
# ----------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )

# ----------------------------------------------------------------
# V1 API Routes
# ----------------------------------------------------------------
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(sensor_data.router, prefix="/api/v1/sensor-data", tags=["Sensor Data v1"])
app.include_router(machines.router, prefix="/api/v1/machines", tags=["Machines v1"])

# ----------------------------------------------------------------
# Backward Compatibility Routes (ESP32 Legacy)
# ----------------------------------------------------------------
# The ESP32 is hardcoded to use /api/sensor-data
app.include_router(sensor_data.router, prefix="/api/sensor-data", tags=["Sensor Data Legacy"], include_in_schema=False)
# Some earlier dashboard iterations might have hit /api/machines
app.include_router(machines.router, prefix="/api/machines", tags=["Machines Legacy"], include_in_schema=False)

# ----------------------------------------------------------------
# WebSockets
# ----------------------------------------------------------------
app.include_router(websockets.router, prefix="/ws/v1/machines", tags=["WebSockets v1"])
app.include_router(websockets.router, prefix="/ws/machines", tags=["WebSockets Legacy"], include_in_schema=False)

from fastapi import APIRouter

router = APIRouter()


@router.get("", summary="Health check", tags=["Health"])
def health_check():
    """
    Simple liveness check for load balancers, uptime monitors, or manual testing.
    Returns 200 OK when the API is running.
    """
    return {
        "status": "ok",
        "service": "industrial-machine-monitoring-api"
    }

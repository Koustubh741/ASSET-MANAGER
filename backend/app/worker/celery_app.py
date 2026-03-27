from celery import Celery
from app.config.settings import settings

# Initialize Celery
# Enterprise Grade: Supports Redis/RabbitMQ via env config
celery_app = Celery(
    "itsm_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"]
)

# Optional configuration overrides
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600, # 1 hour max per deployment task
    # Support for local development without Redis/Docker
    task_always_eager=getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False),
    task_eager_propagates=True,
)

if __name__ == "__main__":
    celery_app.start()

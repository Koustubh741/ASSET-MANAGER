from pydantic import BaseModel
from typing import TypeVar, Generic, List

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic Paginated Response for all list endpoints"""
    total: int
    page: int
    size: int
    data: List[T]

    class Config:
        from_attributes = True

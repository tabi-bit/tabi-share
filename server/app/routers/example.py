from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_root():
    return {"message": "Hello World"}


@router.get("/health")
def health_check():
    return {"status": "healthy"}


@router.get("/test")
def test_api():
    return {"message": "API疎通確認成功", "timestamp": "2025-06-22"}


@router.get("/trips")
def get_trips():
    return {
        "trips": [
            {"id": 1, "name": "熱海温泉旅行", "description": "日帰り温泉巡り"},
            {"id": 2, "name": "箱根旅行", "description": "2泊3日の温泉旅行"},
        ]
    }

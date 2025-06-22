from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hello World"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/test")
def test_api():
    return {"message": "API疎通確認成功", "timestamp": "2025-06-22"}


@app.get("/api/trips")
def get_trips():
    return {
        "trips": [
            {"id": 1, "name": "熱海温泉旅行", "description": "日帰り温泉巡り"},
            {"id": 2, "name": "箱根旅行", "description": "2泊3日の温泉旅行"}
        ]
    }
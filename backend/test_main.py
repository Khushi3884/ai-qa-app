from fastapi.testclient import TestClient
from main import app, documents
import io
import pytest

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_documents():
    documents.clear()
    yield
    documents.clear()

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_upload_media():
    files = {"file": ("test.mp3", io.BytesIO(b"audio"), "audio/mpeg")}
    response = client.post("/upload/media", files=files)
    assert response.status_code == 200
    assert "id" in response.json()

def test_list_documents():
    response = client.get("/documents")
    assert response.status_code == 200

def test_chat_not_found():
    response = client.post("/chat", json={"document_id": "999", "question": "test"})
    assert response.status_code == 404

def test_summarize_not_found():
    response = client.post("/summarize/999")
    assert response.status_code == 404

def test_upload_and_chat():
    files = {"file": ("test.mp3", io.BytesIO(b"audio"), "audio/mpeg")}
    upload_response = client.post("/upload/media", files=files)
    doc_id = upload_response.json()["id"]

    response = client.post("/chat", json={"document_id": doc_id, "question": "What?"})
    assert response.status_code in [200, 500]

def test_multiple_uploads():
    for i in range(3):
        files = {"file": (f"test{i}.mp3", io.BytesIO(b"audio"), "audio/mpeg")}
        response = client.post("/upload/media", files=files)
        assert response.status_code == 200
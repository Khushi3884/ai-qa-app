from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import PyPDF2
import openai
import os
from dotenv import load_dotenv
from datetime import datetime
import io
from typing import Dict
import re

load_dotenv()

app = FastAPI(title="AI Document Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

documents: Dict[str, dict] = {}

openai.api_key = os.getenv("OPENAI_API_KEY", "")

@app.get("/")
def root():
    return {"message": "AI Q&A API is running!", "status": "ok"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "documents_count": len(documents)}

@app.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    try:
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"

        doc_id = str(len(documents) + 1)
        documents[doc_id] = {
            "id": doc_id,
            "filename": file.filename,
            "content": text,
            "type": "pdf",
            "uploaded_at": datetime.now().isoformat()
        }

        return {
            "id": doc_id,
            "filename": file.filename,
            "message": "PDF uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/upload/media")
async def upload_media(file: UploadFile = File(...)):
    fake_transcript = """[00:00:00] Welcome to this recording.
[00:00:15] Introduction to the main topic.
[00:00:45] Detailed discussion about key concepts.
[00:01:20] Practical examples and applications.
[00:02:00] Advanced techniques explained.
[00:02:45] Best practices and recommendations.
[00:03:30] Summary and conclusions.
[00:04:00] Thank you for listening."""

    timestamp_pattern = r'\[(\d{2}:\d{2}:\d{2})\]\s*(.+?)(?=\[|\Z)'
    matches = re.findall(timestamp_pattern, fake_transcript, re.DOTALL)

    timestamps = []
    for time, text in matches:
        timestamps.append({"time": time, "text": text.strip()})

    doc_id = str(len(documents) + 1)
    documents[doc_id] = {
        "id": doc_id,
        "filename": file.filename,
        "content": fake_transcript,
        "type": "media",
        "timestamps": timestamps,
        "uploaded_at": datetime.now().isoformat()
    }

    return {
        "id": doc_id,
        "filename": file.filename,
        "timestamps": timestamps,
        "message": "Media uploaded successfully"
    }

class ChatRequest(BaseModel):
    document_id: str
    question: str

@app.post("/chat")
async def chat(request: ChatRequest):
    if request.document_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = documents[request.document_id]

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Answer based on the document context."},
                {"role": "user", "content": f"Context: {doc['content'][:3000]}\n\nQuestion: {request.question}"}
            ],
            max_tokens=300
        )

        answer = response.choices[0].message.content
        result = {"answer": answer}

        if doc["type"] == "media" and "timestamps" in doc:
            result["timestamps"] = doc["timestamps"]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/summarize/{document_id}")
async def summarize_document(document_id: str):
    if document_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = documents[document_id]

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Provide a concise summary."},
                {"role": "user", "content": f"Summarize: {doc['content'][:3000]}"}
            ],
            max_tokens=200
        )

        return {"summary": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/documents")
def list_documents():
    return {"documents": list(documents.values())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
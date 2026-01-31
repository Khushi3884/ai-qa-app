import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://ai-qa-backend-w4j8.onrender.com';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [timestamps, setTimestamps] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handlePDFUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadLoading(true);

    try {
      const response = await axios.post(`${API_URL}/upload/pdf`, formData);
      alert('PDF Uploaded Successfully!');
      fetchDocuments();
      event.target.value = '';
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleMediaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadLoading(true);

    try {
      const response = await axios.post(`${API_URL}/upload/media`, formData);
      alert('Media Uploaded Successfully!');
      setTimestamps(response.data.timestamps || []);
      fetchDocuments();
      event.target.value = '';
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSelectDocument = (doc) => {
    setSelectedDoc(doc);
    setMessages([]);
    setSummary('');
    setTimestamps([]);
    setQuestion('');
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !selectedDoc) return;

    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        document_id: selectedDoc.id,
        question: question
      });

      const botMessage = { role: 'bot', content: response.data.answer };
      setMessages(prev => [...prev, botMessage]);

      if (response.data.timestamps) {
        setTimestamps(response.data.timestamps);
      }

      setQuestion('');
    } catch (error) {
      const errorMsg = { role: 'bot', content: 'Error: ' + error.message };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedDoc) return;
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/summarize/${selectedDoc.id}`);
      setSummary(response.data.summary);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTimestamp = (time) => {
    alert(`Playing from ${time}\n\n(This would seek to ${time} in a real video player)`);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🤖 AI Document Q&A</h1>
        <p>Upload files and ask questions</p>
      </header>

      <div className="main-content">
        <section className="upload-section">
          <h2>📤 Upload Files</h2>
          <div className="upload-buttons">
            <label className="upload-label">
              📄 Upload PDF
              <input type="file" accept=".pdf" onChange={handlePDFUpload} disabled={uploadLoading} style={{display: 'none'}} />
            </label>
            <label className="upload-label">
              🎵 Upload Audio/Video
              <input type="file" accept="audio/*,video/*" onChange={handleMediaUpload} disabled={uploadLoading} style={{display: 'none'}} />
            </label>
          </div>
          {uploadLoading && <p className="loading-text">Uploading...</p>}
        </section>

        <section className="documents-section">
          <h2>📁 Your Documents ({documents.length})</h2>
          <div className="documents-list">
            {documents.length === 0 ? (
              <p className="empty-state">No documents yet. Upload a file!</p>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className={`document-item ${selectedDoc?.id === doc.id ? 'selected' : ''}`} onClick={() => handleSelectDocument(doc)}>
                  <span className="doc-icon">{doc.type === 'pdf' ? '📄' : '🎵'}</span>
                  <div className="doc-info">
                    <div className="doc-name">{doc.filename}</div>
                    <div className="doc-meta">{doc.type.toUpperCase()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {selectedDoc && (
          <>
            <section className="summary-section">
              <h2>📋 Summary</h2>
              <button onClick={handleSummarize} disabled={loading} className="btn-primary">
                {loading ? 'Generating...' : 'Generate Summary'}
              </button>
              {summary && <div className="summary-box"><p>{summary}</p></div>}
            </section>

            {timestamps.length > 0 && (
              <section className="timestamps-section">
                <h2>⏱️ Timestamps</h2>
                <div className="timestamps-list">
                  {timestamps.map((ts, idx) => (
                    <div key={idx} className="timestamp-item">
                      <button onClick={() => handlePlayTimestamp(ts.time)} className="play-btn">
                        ▶️ {ts.time}
                      </button>
                      <span className="timestamp-text">{ts.text}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="chat-section">
              <h2>💬 Ask Questions</h2>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <p className="empty-state">Ask a question...</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                      <div className="message-header">{msg.role === 'user' ? '👤 You' : '🤖 AI'}</div>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="chat-input">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()} placeholder="Type your question..." disabled={loading} />
                <button onClick={handleAskQuestion} disabled={loading || !question.trim()} className="btn-send">
                  Send
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

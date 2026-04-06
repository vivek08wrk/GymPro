'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function AIChatPage() {
  useAuth();

  const router = useRouter();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I am your gym AI assistant. Ask me anything about your gym or member diet/workout plans! 💪'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('rag'); // rag = PDF knowledge, insight = gym data
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rag/documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setDocuments(data.data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleUploadPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rag/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        }
      );
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `PDF uploaded successfully! "${data.data.fileName}" — ${data.data.chunks} chunks created. You can now ask questions about it! 📄`
          }
        ]);
        fetchDocuments();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Upload failed: ${data.message}` }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Upload failed. Please try again.' }
      ]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const endpoint = mode === 'rag' ? '/rag/ask' : '/rag/admin-insight';

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ question: userMessage })
        }
      );

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.success ? data.answer : `Error: ${data.message}`
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rag/documents/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-surface">

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-heavy shadow-kinetic flex justify-between items-center px-6 h-16">
        <span 
          className="text-2xl font-black italic tracking-tighter text-primary cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          GymPro
        </span>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-on-surface-variant hover:text-primary text-sm font-inter-tight font-bold uppercase tracking-widest"
        >
          ← Dashboard
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 md:px-10 max-w-6xl mx-auto">

        <label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">AI Assistant</label>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-on-surface mb-8">Chat with <span className="text-primary">GymPro AI</span></h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">

          {/* Left sidebar */}
          <div className="md:col-span-1 space-y-4">

            {/* Mode toggle */}
            <div className="bg-surface-container-high/50 backdrop-blur-heavy p-4 rounded-kinetic border border-outline-variant/10">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Mode</p>
              <div className="space-y-2">
                <button
                  onClick={() => setMode('rag')}
                  className={`w-full text-left px-3 py-3 rounded-kinetic text-sm font-inter-tight font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 hover:scale-105 active:scale-95 ${
                    mode === 'rag'
                      ? 'bg-primary text-black focus:ring-primary/50 shadow-lg hover:shadow-primary/30'
                      : 'bg-surface-container hover:bg-surface-container-high hover:border-primary/30 text-on-surface focus:ring-primary/30 border border-outline-variant/20 shadow-md hover:shadow-primary/20'
                  }`}
                >
                  📄 PDF Knowledge
                </button>
                <button
                  onClick={() => setMode('insight')}
                  className={`w-full text-left px-3 py-3 rounded-kinetic text-sm font-inter-tight font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 hover:scale-105 active:scale-95 ${
                    mode === 'insight'
                      ? 'bg-primary text-black focus:ring-primary/50 shadow-lg hover:shadow-primary/30'
                      : 'bg-surface-container hover:bg-surface-container-high hover:border-primary/30 text-on-surface focus:ring-primary/30 border border-outline-variant/20 shadow-md hover:shadow-primary/20'
                  }`}
                >
                  📊 Gym Analytics
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
                {mode === 'rag'
                  ? 'Ask questions from uploaded PDFs.'
                  : 'Ask about your gym performance.'}
              </p>
            </div>

            {/* Upload PDF */}
            <div className="bg-surface-container-high/50 backdrop-blur-heavy p-4 rounded-kinetic border border-outline-variant/10">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Upload PDF</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black text-sm font-inter-tight font-bold uppercase tracking-wider py-3 rounded-kinetic transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-primary/30"
              >
                {uploading ? '⏳ Processing...' : '+ Upload PDF'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUploadPDF}
                className="hidden"
              />
              {uploading && (
                <p className="text-xs text-on-surface-variant mt-2 text-center">
                  Processing...
                </p>
              )}
            </div>

            {/* Documents list */}
            {documents.length > 0 && (
              <div className="bg-surface-container-high/50 backdrop-blur-heavy p-4 rounded-kinetic border border-outline-variant/10">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  PDFs ({documents.length})
                </p>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-surface-container hover:bg-surface-container-high rounded-kinetic px-3 py-2 transition"
                    >
                      <div>
                        <p className="text-xs font-medium text-on-surface truncate max-w-32">
                          {doc.name}
                        </p>
                        <p className="text-xs text-on-surface-variant">{doc.chunks} chunks</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-xs text-secondary hover:text-secondary-light hover:scale-110 active:scale-90 transition-all duration-200 font-bold focus:outline-none"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Chat area */}
          <div className="md:col-span-3 flex flex-col bg-surface border border-outline-variant/10 rounded-kinetic overflow-hidden" style={{ height: '600px' }}>

            {/* Chat Header */}
            <div className="bg-surface-container-high/50 backdrop-blur-heavy border-b border-outline-variant/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">GymPro AI</h3>
                  <p className="text-xs text-on-surface-variant">Always online</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-surface to-surface-container-low/30">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in from-bottom duration-300`}
                >
                  <div
                    className={`max-w-xs md:max-w-sm px-4 py-2.5 text-sm leading-relaxed shadow-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-black rounded-3xl rounded-tr-lg font-medium'
                        : 'bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-3xl rounded-tl-lg'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-in fade-in slide-in from-bottom duration-300">
                  <div className="bg-surface-container-high border border-outline-variant/20 px-4 py-3 rounded-3xl rounded-tl-lg flex gap-1.5 shadow-lg">
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-surface-container-high/50 backdrop-blur-heavy border-t border-outline-variant/10 p-4">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={
                    mode === 'rag'
                      ? '💡 Ask about diet, workouts...'
                      : '💡 Ask about members, revenue...'
                  }
                  className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-full px-5 py-3 text-sm text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-200"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-primary hover:bg-primary-light hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black p-3 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/40 flex items-center justify-center"
                  title="Send message (Enter)"
                >
                  <span className="text-lg">✈️</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mt-2 text-center">Press Enter to send • Shift+Enter for new line</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
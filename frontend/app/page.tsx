// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Plus, LogOut, Link as LinkIcon, Globe } from 'lucide-react';

// Interfaces to match your MongoDB Schema
interface Link {
  _id: string;
  title: string;
  url: string;
  tags: string[];
}

export default function LinkVault() {
  const [token, setToken] = useState<string>('');
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [links, setLinks] = useState<Link[]>([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', tags: '' });

  const API_URL = 'https://secondbrain-link-vault.onrender.com/';

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchLinks(savedToken);
    }
  }, []);

  const fetchLinks = async (tkn: string) => {
    try {
      const res = await fetch(`${API_URL}/links`, {
        headers: { 'x-auth-token': tkn }
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (err) {
      console.error("Failed to fetch links", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        fetchLinks(data.token);
      } else if (!isLogin) {
        setIsLogin(true);
        alert("Account created! You can now log in.");
      }
    } catch (err) {
      alert("Authentication failed. Check if server is running.");
    }
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.url) return;

    try {
      const res = await fetch(`${API_URL}/links`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': token 
        },
        body: JSON.stringify({
          title: newLink.title || 'Untitled',
          url: newLink.url,
          tags: newLink.tags.split(',').map(t => t.trim()).filter(t => t !== '')
        })
      });

      if (res.ok) {
        setNewLink({ title: '', url: '', tags: '' });
        fetchLinks(token);
      }
    } catch (err) {
      console.error("Error adding link", err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setLinks([]);
  };

  // Auth Screen
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl mb-4">
              <LinkIcon className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h1>
            <p className="text-slate-500 text-sm mt-2">Manage your digital brain</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              className="w-full p-4 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-4 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-6 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-[#fbfcfd] text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <LinkIcon className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">LinkVault</span>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        {/* Input Section */}
        <section className="lg:col-span-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sticky top-24">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Plus size={20} className="text-indigo-600" />
              Quick Add
            </h2>
            <form onSubmit={addLink} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Title</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="Cool Article"
                  value={newLink.title}
                  onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">URL</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="https://example.com"
                  value={newLink.url}
                  onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tags</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="tech, reading, inspiration"
                  value={newLink.tags}
                  onChange={(e) => setNewLink({...newLink, tags: e.target.value})}
                />
              </div>
              <button className="w-full bg-slate-900 text-white p-3.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2">
                Save to Vault
              </button>
            </form>
          </div>
        </section>

        {/* Display Section */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Your Collection</h2>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">
              {links.length} {links.length === 1 ? 'Link' : 'Links'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <Globe className="text-slate-200 w-12 h-12 mb-4" />
                <p className="text-slate-400 font-medium">Your vault is empty</p>
              </div>
            ) : (
              links.map((link) => (
                <div key={link._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-bold text-slate-900 truncate mb-1 group-hover:text-indigo-600 transition-colors">
                      {link.title}
                    </h3>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-slate-400 flex items-center gap-1.5 hover:text-indigo-500 truncate"
                    >
                      <ExternalLink size={14} />
                      {link.url}
                    </a>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {link.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold tracking-wider uppercase">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                   onClick={async () => {
    await fetch(`${API_URL}/links/${link._id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token }
    });
    fetchLinks(token);
  }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
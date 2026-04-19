"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Trash2, ExternalLink, Plus, LogOut, Link as LinkIcon, Globe, Search, Folder } from 'lucide-react';
import { Link, GithubLogo, LinkedinLogo, TwitterLogo } from "@phosphor-icons/react";

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const API_URL = 'https://secondbrain-link-vault.onrender.com';

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

  const deleteLink = async (id: string) => {
    try {
      await fetch(`${API_URL}/links/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      fetchLinks(token);
    } catch (err) {
      console.error("Error deleting link", err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setLinks([]);
  };

  // Filter links based on search and selected tag
  const filteredLinks = links.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         link.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || link.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(links.flatMap(link => link.tags)));

  // Auth Screen
  if (!token) {
    return (
   <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
  {/* Decorative elements */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl" />
    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-200/20 rounded-full blur-3xl" />
  </div>

  {/* Top Navigation */}
  <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
    <div className="font-bold text-xl text-slate-950 tracking-tight">Link Vault</div>
    <div className="flex items-center gap-4">
      <a href="https://github.com/OMEE-Y" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-600 transition-colors">
        <GithubLogo size={20} weight="fill" />
      </a>
      <a href="https://www.linkedin.com/in/om-yewale-744905328" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-600 transition-colors">
        <LinkedinLogo size={20} weight="fill" />
      </a>
      <a href="https://x.com/omee_y" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-600 transition-colors">
        <TwitterLogo size={20} weight="fill" />
      </a>
    </div>
  </nav>

  {/* Login Card */}
  <div className="relative z-10 w-full max-w-sm">
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
      
      {/* Decorative gradient bar */}
      <div className="h-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600" />
      
      <div className="p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-indigo-50 p-4 rounded-2xl">
            <Link className="text-indigo-600 w-7 h-7" weight="bold" />
          </div>
        </div>

        <h1 className="text-center text-3xl font-bold text-slate-950 mb-2 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Get Started'}
        </h1>
        <p className="text-center text-slate-500 text-sm mb-8 font-medium">
          {isLogin ? 'Sign in to access your vault' : 'Create an account to start saving'}
        </p>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 ml-1">
              Username
            </label>
            <input
              type="text"
              placeholder="johndoe"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 ml-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-[0.98] mt-6 shadow-lg shadow-slate-900/20"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setUsername('');
              setPassword('');
            }}
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
    );
  }

  
  return (
    <div className="min-h-screen bg-slate-50">
  {/* Header */}
  <header className="sticky top-0 z-50 bg-white border-b border-slate-300">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-700 p-2 rounded-lg">
          <LinkIcon className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-950 tracking-tight">Link Vault</h1>
      </div>
      <button 
        onClick={logout} 
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-800 hover:bg-slate-200 transition-colors font-semibold text-sm border border-slate-400 shadow-sm"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  </header>

  <main className="max-w-7xl mx-auto px-6 py-8">
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-950 mb-1">Your Links</h2>
          <p className="text-slate-700 font-medium text-sm">{filteredLinks.length} saved {filteredLinks.length === 1 ? 'link' : 'links'}</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search links..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-slate-400 focus:border-indigo-700 focus:ring-0 outline-none text-sm text-slate-950 placeholder:text-slate-500 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
              selectedTag === null ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white border-slate-400 text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Tags
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
                selectedTag === tag ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white border-slate-400 text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar */}
      <aside className="lg:col-span-1">
        <div className="sticky top-24 bg-white p-6 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 mb-6">
            <Plus className="w-5 h-5 text-indigo-700" />
            Add Link
          </h3>
          <form onSubmit={addLink} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                placeholder="Link title"
                className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-slate-400 focus:border-indigo-700 focus:ring-0 outline-none text-sm text-slate-950 font-medium"
                value={newLink.title}
                onChange={(e) => setNewLink({...newLink, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">URL</label>
              <input
                type="url"
                placeholder="https://example.com"
                className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-slate-400 focus:border-indigo-700 focus:ring-0 outline-none text-sm text-slate-950 font-medium"
                value={newLink.url}
                onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                required
              />
            </div>
            <button className="w-full bg-indigo-700 text-white py-2.5 rounded-lg font-bold text-sm border-2 border-indigo-900 hover:bg-indigo-800 transition-all active:scale-95">
              Save Link
            </button>
          </form>
        </div>
      </aside>

      {/* List */}
      <section className="lg:col-span-2">
        {filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-400">
            <p className="text-slate-900 font-bold">No links found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLinks.map((link) => (
              <div key={link._id} className="group bg-white border-2 border-slate-900 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-950 text-base mb-3">{link.title}</h3>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-900 hover:text-indigo-800 border border-slate-300 rounded-md text-xs font-bold transition-colors"
                    >
                      <ExternalLink size={12} />
                      Open Link
                    </a>
                  </div>
                  <button onClick={() => deleteLink(link._id)} className="p-2 text-slate-900 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all border border-transparent hover:border-red-300">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  </main>
</div>
  );
}
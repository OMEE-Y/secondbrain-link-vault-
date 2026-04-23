"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Plus, LogOut, Link as LinkIcon, Search, AlertCircle, Check, X } from 'lucide-react';
import { Link, GithubLogo, LinkedinLogo, TwitterLogo } from "@phosphor-icons/react";
import { z } from 'zod';

interface LinkType {
  _id: string;
  title: string;
  url: string;
  tags: string[];
}

interface Toast {
  message: string;
  type: 'error' | 'success';
  id: string;
}

export default function LinkVault() {
  const [token, setToken] = useState<string>('');
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [links, setLinks] = useState<LinkType[]>([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', tags: '' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://secondbrain-link-vault.onrender.com';

  const showToast = (message: string, type: 'error' | 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { message, type, id }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const authSchema = z.object({
    username: z.string().min(2, "Username must be at least 2 characters").max(30).trim(),
    password: z.string().min(6, "Password must be at least 6 characters").max(100)
  });

  const linkSchema = z.object({
    title: z.string().min(1, "Title is required").max(200).trim(),
    url: z.string().url("Invalid URL"),
    tags: z.array(z.string().trim()).optional().default([])
  });

  // Initialize token from localStorage on mount
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
        headers: { 
          'x-auth-token': tkn,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setLinks(data || []);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        setToken('');
        showToast("Session expired. Please login again.", "error");
      }
    } catch (error) {
      showToast("Failed to load links. Check your connection.", "error");
      console.error('Fetch links error:', error);
    }
  };

  // Auth handler (Login/Register)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = authSchema.safeParse({ username, password });
    if (!result.success) {
      showToast(result.error.issues[0].message, "error");
      setIsLoading(false);
      return;
    }

    const endpoint = isLogin ? '/login' : '/register';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Authentication failed", "error");
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUsername('');
        setPassword('');
        fetchLinks(data.token);
        showToast(isLogin ? "Welcome back!" : "Account created! Welcome!", "success");
      } else {
        showToast("No token received", "error");
      }
    } catch (error) {
      showToast("Server connection failed. Please try again.", "error");
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Link handler
  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Parse tags
    const parsedTags = newLink.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');

    const result = linkSchema.safeParse({
      title: newLink.title,
      url: newLink.url,
      tags: parsedTags
    });

    if (!result.success) {
      showToast(result.error.issues[0].message, "error");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(result.data)
      });

      if (res.ok) {
        setNewLink({ title: '', url: '', tags: '' });
        fetchLinks(token);
        showToast("Link added successfully!", "success");
      } else {
        const error = await res.json();
        showToast(error.message || "Failed to add link", "error");
      }
    } catch (error) {
      showToast("Error connecting to server", "error");
      console.error('Add link error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Link handler
  const deleteLink = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/links/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });

      if (res.ok) {
        fetchLinks(token);
        showToast("Link deleted successfully", "success");
      } else {
        const error = await res.json();
        showToast(error.message || "Failed to delete link", "error");
      }
    } catch (error) {
      showToast("Error deleting link", "error");
      console.error('Delete error:', error);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setLinks([]);
    setUsername('');
    setPassword('');
    showToast("Logged out successfully", "success");
  };

  // Filter links based on search and selected tag
  const filteredLinks = links.filter(link => {
    const matchesSearch =
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || (link.tags && link.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(links.flatMap(link => link.tags || [])));

  // Toast Notification Component
  const ToastContainer = () => (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[9999] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm
            shadow-lg border-2 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-300
            ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-green-50 border-green-300 text-green-700'
            }
          `}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="flex-shrink-0" />
          ) : (
            <Check size={18} className="flex-shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  // Login/Register Page
  if (!token) {
    return (
      <>
        <ToastContainer />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-200/20 rounded-full blur-3xl" />
          </div>

          <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
            <div className="font-bold text-xl text-slate-950 tracking-tight">Link Vault</div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/OMEE-Y/secondbrain-link-vault-" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-600 transition-colors">
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

          <div className="relative z-10 w-full max-w-sm">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
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
                      placeholder="omyewale"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all disabled:opacity-50"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
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
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all disabled:opacity-50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-[0.98] mt-6 shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setUsername('');
                      setPassword('');
                    }}
                    disabled={isLoading}
                    className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors disabled:opacity-50"
                  >
                    {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main App Page
  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-slate-50">
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
                      className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-slate-400 focus:border-indigo-700 focus:ring-0 outline-none text-sm text-slate-950 font-medium disabled:opacity-50"
                      value={newLink.title}
                      onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-slate-400 focus:border-indigo-700 focus:ring-0 outline-none text-sm text-slate-950 font-medium disabled:opacity-50"
                      value={newLink.url}
                      onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Tags (optional)</label>
                    <input
                      type="text"
                      placeholder="tag1, tag2, tag3"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-slate-400 focus:border-indigo-700 focus:ring-0 outline-none text-sm text-slate-950 font-medium disabled:opacity-50"
                      value={newLink.tags}
                      onChange={(e) => setNewLink({...newLink, tags: e.target.value})}
                      disabled={isLoading}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-700 text-white py-2.5 rounded-lg font-bold text-sm border-2 border-indigo-900 hover:bg-indigo-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : 'Save Link'}
                  </button>
                </form>
              </div>
            </aside>

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
                          {link.tags && link.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {link.tags.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-semibold">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
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
    </>
  );
}
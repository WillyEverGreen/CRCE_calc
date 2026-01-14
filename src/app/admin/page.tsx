"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface AdminStats {
  stats: {
    totalRequests: number;
    todayRequests: number;
    cacheHits: number;
    cacheHitRate: number;
    uniqueUsers: number;       // NEW
    uniqueUsersToday: number;  // NEW
  };
  queue: {
    active: number;
    waiting: string[];
    maxConcurrent: number;
  };
  recentUsers: Array<{ prn: string; timestamp: string }>;
  branchDistribution: Record<string, number>;
  serverTime: string;
}

function AdminContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const key = searchParams.get("key");

  const fetchData = async () => {
    if (!key) {
      setError("Admin key required. Add ?key=your_admin_key to URL");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin?key=${key}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid admin key");
        } else {
          setError("Failed to fetch admin data");
        }
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Failed to connect to server");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [key]);

  const clearData = async () => {
    if (!confirm("Are you sure you want to clear ALL admin data? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin?key=${key}`, { method: "DELETE" });
      if (res.ok) {
        alert("All data cleared!");
        fetchData();
      } else {
        alert("Failed to clear data");
      }
    } catch {
      alert("Error clearing data");
    }
  };

  const clearCache = async () => {
    if (!confirm("Clear all cached user results? Users will need to fetch fresh data.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin?key=${key}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Cache cleared!");
        fetchData();
      } else {
        alert("Failed to clear cache");
      }
    } catch {
      alert("Error clearing cache");
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? "bg-[#0f172a]" : "bg-[#e0f2f1]"}`}>
        <div className={`text-xl ${isDarkMode ? "text-white" : "text-gray-800"}`}>Loading admin panel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? "bg-[#0f172a]" : "bg-[#e0f2f1]"}`}>
        <div className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 ${isDarkMode ? "bg-emerald-900" : "bg-emerald-600"}`}>
          <div className="text-white text-center">
            <div className="text-xl mb-4">⚠️ {error}</div>
            <Link href="/" className="text-emerald-200 hover:text-white underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${isDarkMode ? "bg-[#0f172a]" : "bg-[#e0f2f1]"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className={`rounded-[30px] shadow-2xl overflow-hidden mb-6 ${isDarkMode ? "bg-emerald-900" : "bg-emerald-600"}`}>
          <div className="p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-wide">Admin Panel</h1>
                <p className={`text-sm mt-1 ${isDarkMode ? "text-emerald-400" : "text-emerald-200"}`}>
                  CRCE Results Dashboard
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={clearCache}
                  className="flex-1 md:flex-none bg-yellow-500/80 hover:bg-yellow-600 text-white text-sm px-3 py-1.5 rounded-full transition-all text-center whitespace-nowrap"
                >
                  Clear Cache
                </button>
                <button
                  onClick={clearData}
                  className="flex-1 md:flex-none bg-red-500/80 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-full transition-all text-center whitespace-nowrap"
                >
                  Clear Stats
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all"
                >
                  {isDarkMode ? "☀️" : "🌙"}
                </button>
                <div className="text-right text-sm ml-auto md:ml-0">
                  <div className="text-emerald-200">Live</div>
                  <div className="font-bold">{new Date(data.serverTime).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm text-center">
                <div className="text-3xl font-bold">{data.stats.totalRequests}</div>
                <div className="text-xs text-emerald-100 mt-1">Total Requests</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm text-center">
                <div className="text-3xl font-bold">{data.stats.todayRequests}</div>
                <div className="text-xs text-emerald-100 mt-1">Today</div>
              </div>
              <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm text-center">
                <div className="text-3xl font-bold">{data.stats.cacheHitRate}%</div>
                <div className="text-xs text-emerald-100 mt-1">Cache Rate</div>
              </div>
            </div>
            
            {/* Unique Users Row */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-emerald-400/30 rounded-2xl p-4 backdrop-blur-sm text-center border border-emerald-300/30">
                <div className="text-3xl font-bold">👥 {data.stats.uniqueUsers}</div>
                <div className="text-xs text-emerald-100 mt-1">Unique Users (All Time)</div>
              </div>
              <div className="bg-emerald-400/30 rounded-2xl p-4 backdrop-blur-sm text-center border border-emerald-300/30">
                <div className="text-3xl font-bold">🆕 {data.stats.uniqueUsersToday}</div>
                <div className="text-xs text-emerald-100 mt-1">Unique Users Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Cards */}
        <div className={`rounded-[30px] shadow-xl p-6 mb-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white"}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            <span className={`w-3 h-3 rounded-full ${data.queue.active > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            Live Queue
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`rounded-2xl p-4 text-center ${isDarkMode ? "bg-[#0f172a]" : "bg-gray-50"}`}>
              <div className="text-3xl font-bold text-emerald-500">{data.queue.active}</div>
              <div className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Active</div>
            </div>
            <div className={`rounded-2xl p-4 text-center ${isDarkMode ? "bg-[#0f172a]" : "bg-gray-50"}`}>
              <div className="text-3xl font-bold text-yellow-500">{data.queue.waiting.length}</div>
              <div className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Waiting</div>
            </div>
            <div className={`rounded-2xl p-4 text-center ${isDarkMode ? "bg-[#0f172a]" : "bg-gray-50"}`}>
              <div className={`text-3xl font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{data.queue.maxConcurrent}</div>
              <div className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Max</div>
            </div>
          </div>
          {data.queue.waiting.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.queue.waiting.map((prn, i) => (
                <span key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-mono">
                  {prn}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users - Full Width */}
        <div className={`rounded-[30px] shadow-xl p-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white"}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Recent Users
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {data.recentUsers.length === 0 ? (
              <div className={`col-span-1 sm:col-span-2 md:col-span-4 text-center py-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No users yet
              </div>
            ) : (
              data.recentUsers.map((user, i) => (
                <div 
                  key={i} 
                  className={`flex justify-between items-center rounded-xl px-3 py-2 ${
                    isDarkMode ? "bg-[#0f172a]" : "bg-gray-50"
                  }`}
                >
                  <span className="font-mono text-emerald-500 text-xs">{user.prn}</span>
                  <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>#{i + 1}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← Back to App
          </Link>
          <p className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            Auto-refreshes every 5 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#e0f2f1] flex items-center justify-center">Loading...</div>}>
      <AdminContent />
    </Suspense>
  );
}

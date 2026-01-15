"use client";

import { useState } from "react";
import Link from "next/link";

interface Subject {
  subjectName: string | null;
  marks: string[];
  totalObt: number;
  totalMax: number;
  percentage: number | null;
  grade: string;
  gradePoint: number | null;
}

interface Result {
  sgpa: number | null;
  estimatedCgpa: number | null;
  totalMarksAll: number;
  maxMarksAll: number;
  subjects: Subject[];
}

// Helper to format numbers to max 2 decimal places
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0";
  return Number(num.toFixed(2)).toString();
};

// Simple Icons
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const ChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const TrophyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default function Home() {
  const [prn, setPrn] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Starting...");
  const [fromCache, setFromCache] = useState(false);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleSubmit = async (e: React.FormEvent, forceRefresh = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setFromCache(false);
    setLoadingMessage(forceRefresh ? "Refreshing..." : "Connecting...");

    try {
      // Use fetch with streaming for real-time progress
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prn, dob, forceRefresh }),
      });

      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to start streaming");
      }

      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
        }
        
        if (done) break;

        const parts = buffer.split("\n\n");
        // Keep the last part in the buffer as it might be incomplete
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.trim().startsWith("data: ")) {
            try {
              const data = JSON.parse(part.replace("data: ", ""));
              
              if (data.type === "progress") {
                setLoadingMessage(data.message);
              } else if (data.type === "result") {
                setResult(data.data);
                setFromCache(data.fromCache === true);
              } else if (data.type === "error") {
                setError(data.error);
                setLoading(false);
                return;
              }
            } catch (parseError) {
              console.warn("Stream parse error:", parseError);
              // Continue to next part
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300 ${
        isDarkMode ? "bg-[#0f172a]" : "bg-[#e0f2f1]"
      }`}
    >
      {/* Mobile Frame Container */}
      <div
        className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden min-h-[800px] relative flex flex-col transition-colors duration-300 ${
          isDarkMode ? "bg-emerald-900" : "bg-emerald-600"
        }`}
      >
        {/* Header Section */}
        <div className="p-8 pt-12 text-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">CRCE Results</h1>
              <p
                className={`text-sm font-medium mt-1 ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-200"
                }`}
              >
                By PCELL
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/about"
                className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all text-white flex items-center justify-center"
              >
                <InfoIcon />
              </Link>
              <button
                onClick={toggleDarkMode}
                className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all"
              >
                {isDarkMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <UserIcon />
              </div>
            </div>
          </div>

          {!result ? (
            <div className="mt-4">
              <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
              <p
                className={`${
                  isDarkMode ? "text-gray-300" : "text-emerald-50"
                } opacity-90`}
              >
                Check your academic performance
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p
                className={`text-sm font-medium mb-1 ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-100"
                }`}
              >
                Current SGPA
              </p>
              <h2 className="text-5xl font-bold mb-2">
                {result.sgpa !== null ? result.sgpa.toFixed(2) : "N/A"}
              </h2>
              <div className="flex gap-4 mt-4">
                <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-300" : "text-emerald-50"
                    }`}
                  >
                    Total Marks
                  </p>
                  <p className="font-bold">
                    {formatNumber(result.totalMarksAll)} / {formatNumber(result.maxMarksAll)}
                  </p>
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-300" : "text-emerald-50"
                    }`}
                  >
                    Percentage
                  </p>
                  <p className="font-bold">
                    {result.maxMarksAll > 0
                      ? (
                          (result.totalMarksAll / result.maxMarksAll) *
                          100
                        ).toFixed(2)
                      : "0"}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Card */}
        <div
          className={`flex-1 rounded-t-[40px] p-6 pb-0 relative overflow-y-auto transition-colors duration-300 flex flex-col ${
            isDarkMode ? "bg-[#020617]" : "bg-[#F5F7FA]"
          }`}
        >
          <div className="flex-1">
            {!result ? (
              <div className="space-y-6 mt-4">
                <div
                  className={`p-6 rounded-3xl shadow-sm transition-colors duration-300 ${
                    isDarkMode ? "bg-[#1e293b]" : "bg-white"
                  }`}
                >
                  <h3
                    className={`text-lg font-bold mb-4 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    Enter Details
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label
                        className={`text-sm font-medium ml-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        PRN Number
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <UserIcon />
                        </div>
                        <input
                          type="text"
                          value={prn}
                          onChange={(e) => setPrn(e.target.value)}
                          className={`w-full border-none rounded-2xl py-4 pl-12 pr-4 font-medium focus:ring-2 focus:ring-emerald-600 transition-all ${
                            isDarkMode
                              ? "bg-[#0f172a] text-white placeholder-gray-500"
                              : "bg-gray-50 text-gray-900"
                          }`}
                          placeholder="e.g. 12345678"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        className={`text-sm font-medium ml-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Date of Birth
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <CalendarIcon />
                        </div>
                        <input
                          type="text"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className={`w-full border-none rounded-2xl py-4 pl-12 pr-4 font-medium focus:ring-2 focus:ring-emerald-600 transition-all ${
                            isDarkMode
                              ? "bg-[#0f172a] text-white placeholder-gray-500"
                              : "bg-gray-50 text-gray-900"
                          }`}
                          placeholder="DD-MM-YYYY"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-4 
                        ${loading ? "opacity-90 cursor-wait" : ""}
                        ${loadingMessage.toLowerCase().includes("queue") 
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                        }
                        ${isDarkMode && loadingMessage.toLowerCase().includes("queue") ? "shadow-yellow-900/20" : ""}
                        ${isDarkMode && !loadingMessage.toLowerCase().includes("queue") ? "shadow-emerald-900/20" : ""}
                      `}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          {loadingMessage.toLowerCase().includes("queue") ? (
                            <span className="text-xl animate-pulse">⏳</span>
                          ) : (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          )}
                          <span>{loadingMessage}</span>
                        </span>
                      ) : (
                        <>
                          <span>Get Results</span>
                          <ChevronRight />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {error && (
                  <div className={`p-4 rounded-2xl border text-sm transition-colors duration-300 ${
                    isDarkMode 
                      ? "bg-red-900/20 border-red-800 text-red-300" 
                      : "bg-red-50 border-red-100 text-red-600"
                  }`}>
                    <div className="font-semibold mb-2">⚠️ Error</div>
                    <div className="whitespace-pre-line">{error}</div>
                  </div>
                )}
                
                
              </div>
            ) : (
              <div className="space-y-4 pb-8">
                <div className="flex justify-between items-center mb-2 px-2">
                  <h3
                    className={`text-xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    Subject Wise
                  </h3>
                  <div className="flex gap-2">
                    {fromCache && (
                      <button
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                          <path d="M16 21h5v-5"/>
                        </svg>
                        Refresh
                      </button>
                    )}
                    <button
                      onClick={() => { setResult(null); setFromCache(false); }}
                      className="text-sm text-gray-500 hover:text-emerald-600"
                    >
                      Check Another
                    </button>
                  </div>
                </div>

                {result.subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-3xl shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${
                      isDarkMode ? "bg-[#1e293b]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                          sub.grade === "F"
                            ? "bg-red-100 text-red-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {sub.grade}
                      </div>
                      <div>
                        <h4
                          className={`font-bold text-sm ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          {sub.subjectName || "Unknown Subject"}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Marks: {formatNumber(sub.totalObt)}/{formatNumber(sub.totalMax)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p
                        className={`font-bold ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        {formatNumber(sub.percentage)}%
                      </p>
                      <p className="text-xs text-gray-400">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer & Disclaimer */}
          <div className="mt-4 pb-6 text-center space-y-2">
            <p className="text-xs text-gray-400 font-medium">
            Note: This SGPA is an estimate (±0.1). Official results may differ.
            </p>
            <p
              className={`text-xs font-medium ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Made with 💚 by Sai Balkawade
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

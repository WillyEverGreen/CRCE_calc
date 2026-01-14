"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Icons
const ChevronLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const GithubIcon = () => (
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
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = () => (
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
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GlobeIcon = () => (
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
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const InstagramIcon = () => (
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
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const EmailIcon = () => (
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
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);





export default function About() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

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
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/"
              className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all"
            >
              <ChevronLeft />
            </Link>
            <h1 className="text-2xl font-bold tracking-wide">About</h1>
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
          </div>

          <div className="mt-4">
            <h2 className="text-3xl font-bold mb-2">The Project</h2>
            <p
              className={`${
                isDarkMode ? "text-gray-300" : "text-emerald-50"
              } opacity-90 text-sm leading-relaxed`}
            >
              Your academic performance, beautifully organized. Fast, simple, and stress-free.
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div
          className={`flex-1 rounded-t-[40px] p-6 pb-0 relative overflow-y-auto transition-colors duration-300 flex flex-col ${
            isDarkMode ? "bg-[#020617]" : "bg-[#F5F7FA]"
          }`}
        >
          <div className="flex-1 space-y-6 mt-4">
            {/* Formula Section */}
            <div
              className={`p-6 rounded-3xl shadow-sm transition-colors duration-300 ${
                isDarkMode ? "bg-[#1e293b]" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-bold mb-3 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Formula Used
              </h3>
              <p
                className={`text-sm mb-3 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                We use the credit-weighted SGPA calculation method where grades are converted to points based on course credits.
              </p>
              <div
                className={`p-4 rounded-xl font-mono text-xs ${
                  isDarkMode ? "bg-[#0f172a] text-emerald-400" : "bg-gray-50 text-emerald-700"
                }`}
              >
                SGPA = Σ (Grade Points × Credits) / Σ Credits
              </div>
              <p
                className={`text-xs mt-3 ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Note: This SGPA is an estimate (±0.1). Official results may differ.
              </p>
            </div>

            {/* Tech Stack */}
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
                Built With
              </h3>
              <div className="flex gap-4 flex-wrap">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <Image 
                    src="https://img.icons8.com/color/48/nextjs.png" 
                    alt="Next.js" 
                    width={28} 
                    height={28} 
                    className="object-contain"
                  /> Next.js
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <Image 
                    src="https://img.icons8.com/color/48/typescript.png" 
                    alt="TypeScript" 
                    width={28} 
                    height={28} 
                    className="object-contain"
                  /> TypeScript
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <Image 
                    src="https://img.icons8.com/color/48/tailwindcss.png" 
                    alt="Tailwind" 
                    width={28} 
                    height={28} 
                    className="object-contain"
                  /> Tailwind
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <Image 
                    src="/playwright.png" 
                    alt="Playwright" 
                    width={28} 
                    height={28} 
                    className="object-contain"
                  /> Playwright
                </div>
              </div>
            </div>

            {/* Project Cell */}
            <div
              className={`p-6 rounded-3xl shadow-sm transition-colors duration-300 ${
                isDarkMode ? "bg-[#1e293b]" : "bg-white"
              }`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 relative rounded-full overflow-hidden bg-white border-2 border-black">
                  <Image 
                    alt="Project Cell CRCE Logo" 
                    width={64} 
                    height={64} 
                    className="w-full h-full object-cover"
                    src="/cir_logo.jpeg"
                  />
                </div>
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    Project Cell CRCE
                  </h3>
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Fr. Conceicao Rodrigues College of Engineering
                  </p>
                </div>
              </div>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Project Cell is the innovation and development hub at CRCE. We are dedicated to building impactful technology solutions.
              </p>
            </div>

            {/* Developer */}
            <div
              className={`p-6 rounded-3xl shadow-sm transition-colors duration-300 ${
                isDarkMode ? "bg-[#1e293b]" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-bold mb-3 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Core Developer
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`font-medium ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Sai Balkawade
                  </p>
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Tech Member
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href="https://www.linkedin.com/in/sai-balkawade-141ba4310/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode
                        ? "bg-[#0f172a] text-gray-400 hover:text-white"
                        : "bg-gray-100 text-gray-600 hover:text-black"
                    }`}
                  >
                    <LinkedinIcon />
                  </a>
                </div>
              </div>
            </div>

            {/* Get In Touch */}
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
                Get In Touch
              </h3>
              <div className="space-y-3">
                <a
                  href="https://project-cell-crce.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    isDarkMode
                      ? "bg-[#0f172a] hover:bg-[#0f172a]/80"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className={`p-2 rounded-full ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                    <GlobeIcon />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Official Website
                    </h4>
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Visit Project Cell CRCE
                    </p>
                  </div>
                </a>

                <a
                  href="https://github.com/Project-Cell-CRCE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    isDarkMode
                      ? "bg-[#0f172a] hover:bg-[#0f172a]/80"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className={`p-2 rounded-full ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                    <GithubIcon />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      GitHub
                    </h4>
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Check out our repositories
                    </p>
                  </div>
                </a>

                <a
                  href="https://www.instagram.com/project_cell.crce"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    isDarkMode
                      ? "bg-[#0f172a] hover:bg-[#0f172a]/80"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className={`p-2 rounded-full ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                    <InstagramIcon />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Instagram
                    </h4>
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Follow us on Instagram
                    </p>
                  </div>
                </a>

                <a
                  href="#"
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    isDarkMode
                      ? "bg-[#0f172a] hover:bg-[#0f172a]/80"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className={`p-2 rounded-full ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                    <EmailIcon />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Email
                    </h4>
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Get in touch with us
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Footer & Disclaimer */}
          <div className="mt-8 pb-6 text-center space-y-2">
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

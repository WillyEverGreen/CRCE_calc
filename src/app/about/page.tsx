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



// Tech Stack Icons
const NextJsIcon = () => (
  <svg viewBox="0 0 180 180" width="24" height="24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M128.182 180C156.805 180 180 156.805 180 128.182V51.8182C180 23.1955 156.805 0 128.182 0H51.8182C23.1955 0 0 23.1955 0 51.8182V128.182C0 156.805 23.1955 180 51.8182 180H128.182ZM108.318 41.5455C108.318 36.6502 112.287 32.6818 117.182 32.6818H126.545C131.441 32.6818 135.409 36.6502 135.409 41.5455V138.455C135.409 143.35 131.441 147.318 126.545 147.318H117.182C112.287 147.318 108.318 143.35 108.318 138.455V84.0909L65.9462 139.172C63.8122 141.947 60.5229 143.591 57.0227 143.591H51.8182C46.9229 143.591 42.9545 139.622 42.9545 134.727V41.5455C42.9545 36.6502 46.9229 32.6818 51.8182 32.6818H61.1818C66.0771 32.6818 70.0455 36.6502 70.0455 41.5455V95.9091L112.417 40.8282C114.551 38.0535 117.841 36.4091 121.341 36.4091H126.545H108.318V41.5455Z"
    />
  </svg>
);

const TypeScriptIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M1.125 0C0.502 0 0 0.502 0 1.125v21.75C0 23.498 0.502 24 1.125 24h21.75c0.623 0 1.125-0.502 1.125-1.125V1.125C24 0.502 23.498 0 22.875 0H1.125zM11.5 16h-1.5v-6.5h-2v-1.5h5.5v1.5h-2V16zm6.5 0h-1.5v-1.5c-0.5 0.75-1.25 1.75-2.5 1.75-1.5 0-2.5-1-2.5-3v-5.25h1.5v4.75c0 1 0.5 1.75 1.5 1.75 0.75 0 1.5-0.5 1.5-1.25v-5.25h1.5V16z" />
  </svg>
);

const TailwindIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z" />
  </svg>
);

const PlaywrightIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M20.31 16.6c-1.4 1.1-2.8 1.4-4.2 1.4-2.3 0-4.3-1.1-5.6-2.9l-4.8-6.6C4.6 7 3.1 5.5 1.5 4.5c-1-.6-1.5-1.5-1.5-2.5 0-1.1.9-2 2-2 1.5 0 2.9.7 4 1.8l5.6 5.6c1.1 1.1 2.5 1.8 4 1.8 1.5 0 2.9-.7 4-1.8l1.4-1.4c.5-.5 1.3-.5 1.8 0 .5.5.5 1.3 0 1.8l-1.4 1.4c-1.9 1.9-4.5 2.9-7.1 2.9-1.8 0-3.5-.5-5.1-1.4l-3.3-1.9c-.9-.5-2.1-.2-2.6.7-.5.9-.2 2.1.7 2.6l3.3 1.9c2.3 1.3 4.9 2 7.6 2 3.8 0 7.4-1.5 10.1-4.2l1.4-1.4c.5-.5 1.3-.5 1.8 0 .5.5.5 1.3 0 1.8l-1.4 1.4z" />
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
                  <NextJsIcon /> Next.js
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <TypeScriptIcon /> TypeScript
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <TailwindIcon /> Tailwind
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isDarkMode
                      ? "bg-[#0f172a] text-emerald-400"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <PlaywrightIcon /> Playwright
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
                  <img 
                    alt="Project Cell CRCE Logo" 
                    loading="lazy" 
                    width="64" 
                    height="64" 
                    decoding="async"
                    data-nimg="1"
                    className="w-full h-full object-cover"
                    srcSet="/_next/image?url=%2Fcir_logo.jpeg&w=64&q=75 1x, /_next/image?url=%2Fcir_logo.jpeg&w=128&q=75 2x" 
                    src="/_next/image?url=%2Fcir_logo.jpeg&w=128&q=75"
                    style={{ color: "transparent" }}
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

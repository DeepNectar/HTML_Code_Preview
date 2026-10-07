import { useState, useRef, useCallback, useEffect } from "react";

export default function App() {
  const [htmlCode, setHtmlCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClear = () => {
    setHtmlCode("");
    textareaRef.current?.focus();
  };

  const handleCopyCode = async () => {
    if (!htmlCode) return;
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = htmlCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setHtmlCode(text);
    } catch {
      textareaRef.current?.focus();
    }
  }, []);

  const loadSample = () => {
    setHtmlCode(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sample Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    h1 { font-size: 2rem; margin-bottom: 12px; }
    p { font-size: 1.1rem; line-height: 1.6; opacity: 0.9; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: #fff;
      color: #764ba2;
      border-radius: 50px;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎉 Hello, World!</h1>
    <p>This is a sample HTML page rendered in the preview. Paste your own HTML code to see it come alive!</p>
    <a href="#" class="btn">Get Started</a>
  </div>
</body>
</html>`);
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to toggle view
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setShowCode((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Fullscreen preview mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
          <span className="text-sm font-medium opacity-70">Preview</span>
          <button
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Fullscreen
          </button>
        </div>
        <iframe
          srcDoc={htmlCode}
          title="Full Preview"
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">HTML Preview</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Paste HTML code → see it rendered instantly</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode((v) => !v)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Toggle code panel (Ctrl+Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showCode ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
            {showCode ? "Hide Code" : "Show Code"}
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            disabled={!htmlCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Fullscreen preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor Panel */}
        {showCode && (
          <div className="flex flex-col w-full lg:w-1/2 border-r border-gray-800 bg-gray-950">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900/60 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  HTML
                </span>
                {htmlCode && (
                  <span className="text-[10px] text-gray-600">
                    {htmlCode.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadSample}
                  className="px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700 rounded-md transition-colors"
                  title="Load sample HTML"
                >
                  Sample
                </button>
                <button
                  onClick={handlePaste}
                  className="px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700 rounded-md transition-colors"
                  title="Paste from clipboard"
                >
                  Paste
                </button>
                <button
                  onClick={handleCopyCode}
                  disabled={!htmlCode}
                  className="px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
                  title="Copy code"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <button
                  onClick={handleClear}
                  disabled={!htmlCode}
                  className="px-2.5 py-1 text-[11px] font-medium text-red-400 hover:text-red-300 bg-gray-800/60 hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
                  title="Clear all"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 relative overflow-hidden">
              <textarea
                ref={textareaRef}
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                placeholder={`Paste your HTML code here...\n\nExample:\n<div style="padding: 20px; background: #f0f0f0;">\n  <h1>Hello World!</h1>\n  <p>This will be rendered in the preview.</p>\n</div>`}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-sm font-mono text-gray-300 placeholder-gray-600 resize-none outline-none leading-relaxed selection:bg-violet-500/30"
                style={{
                  tabSize: 2,
                  caretColor: "#a78bfa",
                }}
              />
              {/* Line numbers gutter effect */}
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-900/30 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Preview Panel */}
        <div className={`flex flex-col ${showCode ? "w-full lg:w-1/2" : "w-full"} bg-white`}>
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Preview
            </span>
            {!htmlCode && (
              <span className="text-[11px] text-gray-400">Waiting for HTML code...</span>
            )}
          </div>

          {/* Preview iframe */}
          <div className="flex-1 relative overflow-hidden bg-white">
            {htmlCode ? (
              <iframe
                srcDoc={htmlCode}
                title="HTML Preview"
                className="absolute inset-0 w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-400">No HTML to preview</p>
                  <p className="text-xs text-gray-300 mt-1">Paste some HTML code on the left to see it here</p>
                </div>
                <button
                  onClick={loadSample}
                  className="mt-2 px-4 py-2 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  Load a sample instead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
        <span>Paste HTML → See it rendered</span>
        <span className="hidden sm:inline">Ctrl+Enter to toggle panels</span>
      </footer>
    </div>
  );
}

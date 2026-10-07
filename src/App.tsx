import { useState, useRef, useCallback, useEffect } from "react";

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
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
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎉 Hello, World!</h1>
    <p>This is a sample HTML email template. Click "Copy Preview" and paste it into your email!</p>
    <a href="#" class="btn">Get Started</a>
  </div>
</body>
</html>`;

/**
 * List of CSS properties to inline. We skip properties that don't work in email
 * and focus on visual styling properties.
 */
const STYLE_PROPERTIES = [
  "color", "background", "background-color", "background-image",
  "background-size", "background-position", "background-repeat",
  "font-family", "font-size", "font-weight", "font-style",
  "line-height", "letter-spacing", "text-align", "text-decoration",
  "text-transform", "text-shadow",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-radius", "border-color", "border-style", "border-width",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "display", "position", "top", "right", "bottom", "left",
  "overflow", "opacity",
  "box-shadow", "text-shadow",
  "vertical-align", "white-space", "word-wrap",
  "list-style", "list-style-type",
  "cursor",
  "flex-direction", "justify-content", "align-items", "flex-wrap", "gap",
];

/**
 * Recursively inline all computed styles from the rendered source element
 * onto the cloned target element.
 */
function inlineComputedStyles(sourceEl: Element, targetEl: Element, win: Window) {
  const computed = win.getComputedStyle(sourceEl);

  if (targetEl instanceof HTMLElement || targetEl instanceof SVGElement) {
    let styleStr = "";

    for (const prop of STYLE_PROPERTIES) {
      const value = computed.getPropertyValue(prop);
      if (!value || value === "") continue;

      // Skip truly default values that add noise
      if (prop === "background-color" && (value === "rgba(0, 0, 0, 0)" || value === "transparent")) continue;
      if (prop === "background-image" && value === "none") continue;
      if (prop === "border" && value === "0px none rgb(0, 0, 0)") continue;
      if (prop === "border-style" && value === "none") continue;
      if (prop === "border-width" && value === "0px") continue;
      if (prop === "border-color" && value === "rgb(0, 0, 0)") continue;
      if (prop === "box-shadow" && value === "none") continue;
      if (prop === "text-shadow" && value === "none") continue;
      if (prop === "opacity" && value === "1") continue;
      if (prop === "overflow" && value === "visible") continue;
      if (prop === "position" && value === "static") continue;
      if (prop === "display" && value === "block" && sourceEl.tagName === "DIV") continue;
      if (prop === "display" && value === "inline" && (sourceEl.tagName === "SPAN" || sourceEl.tagName === "A")) continue;
      if (prop === "width" && value === "auto") continue;
      if (prop === "height" && value === "auto") continue;
      if (prop === "margin" && value === "0px") continue;
      if (prop === "padding" && value === "0px") continue;
      if (prop === "cursor" && value === "auto") continue;
      if (prop === "vertical-align" && value === "baseline") continue;
      if (prop === "text-transform" && value === "none") continue;
      if (prop === "letter-spacing" && value === "normal") continue;
      if (prop === "word-wrap" && value === "normal") continue;
      if (prop === "white-space" && value === "normal") continue;
      if (prop === "list-style" && value === "outside none disc") continue;

      styleStr += `${prop}: ${value}; `;
    }

    if (styleStr) {
      // Preserve any original inline styles by appending them
      const originalStyle = sourceEl.getAttribute("style");
      if (originalStyle) {
        targetEl.setAttribute("style", styleStr + "; " + originalStyle);
      } else {
        targetEl.setAttribute("style", styleStr.trim());
      }
    }
  }

  // Recurse into children
  const sourceChildren = sourceEl.children;
  const targetChildren = targetEl.children;
  for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
    inlineComputedStyles(sourceChildren[i], targetChildren[i], win);
  }
}

/**
 * Captures the rendered preview from the iframe, clones the DOM,
 * inlines all computed styles, and returns email-ready HTML.
 */
function captureRenderedPreview(iframe: HTMLIFrameElement): string | null {
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const iframeWin = iframe.contentWindow;
    if (!iframeDoc || !iframeWin) return null;

    // Clone the body so we can modify it without affecting the rendered preview
    const clonedBody = iframeDoc.body.cloneNode(true) as HTMLElement;

    // Inline computed styles from the rendered elements onto the clone
    const sourceChildren = iframeDoc.body.children;
    const targetChildren = clonedBody.children;
    for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
      inlineComputedStyles(sourceChildren[i], targetChildren[i], iframeWin);
    }

    // Also inline body styles
    const bodyComputed = iframeWin.getComputedStyle(iframeDoc.body);
    let bodyStyle = "";
    for (const prop of STYLE_PROPERTIES) {
      const value = bodyComputed.getPropertyValue(prop);
      if (!value || value === "") continue;
      if (prop === "background-color" && (value === "rgba(0, 0, 0, 0)" || value === "transparent")) continue;
      if (prop === "display" && value === "block") continue;
      if (prop === "margin" && (value === "0px" || value === "8px")) continue;
      if (prop === "position" && value === "static") continue;
      bodyStyle += `${prop}: ${value}; `;
    }
    if (bodyStyle) {
      clonedBody.setAttribute("style", bodyStyle.trim());
    }

    // Build the final email-ready HTML
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
</head>
<body>${clonedBody.innerHTML}</body>
</html>`;

    return emailHtml;
  } catch (e) {
    console.error("Failed to capture preview:", e);
    return null;
  }
}

/**
 * Copy rich HTML to clipboard for pasting into email clients.
 */
async function copyRichHtmlToClipboard(html: string): Promise<boolean> {
  try {
    // Modern Clipboard API with HTML MIME type
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob(["[HTML content - paste into email client]"], { type: "text/plain" });
      const item = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: use a contenteditable div
  try {
    const container = document.createElement("div");
    container.innerHTML = html;
    container.contentEditable = "true";
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.overflow = "auto";
    document.body.appendChild(container);

    // Select all content
    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const success = document.execCommand("copy");
    document.body.removeChild(container);
    selection?.removeAllRanges();
    return success;
  } catch {
    return false;
  }
}

export default function App() {
  const [htmlCode, setHtmlCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "success" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);

  const handleClear = () => {
    setHtmlCode("");
    setPreviewKey((k) => k + 1);
    textareaRef.current?.focus();
  };

  const handleCopyCode = async () => {
    if (!htmlCode) return;
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = htmlCode;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert("Could not copy to clipboard");
      }
    }
  };

  const handleCopyPreview = useCallback(async () => {
    if (!htmlCode) return;

    setCopyStatus("copying");

    // Get the active iframe (fullscreen or regular)
    const iframe = fullscreenIframeRef.current || previewIframeRef.current;
    if (!iframe) {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 3000);
      return;
    }

    // Wait for iframe content to be fully rendered and styles computed
    // Poll until we can access the document body
    let attempts = 0;
    while (attempts < 20) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body && doc.body.children.length > 0) {
          // Extra delay for styles to fully compute
          await new Promise((r) => setTimeout(r, 150));
          break;
        }
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }

    // Capture the rendered preview with inlined styles
    const emailHtml = captureRenderedPreview(iframe);

    if (!emailHtml) {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 3000);
      return;
    }

    const success = await copyRichHtmlToClipboard(emailHtml);

    if (success) {
      setCopyStatus("success");
      setTimeout(() => {
        setCopyStatus("idle");
      }, 3000);
    } else {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 3000);
    }
  }, [htmlCode]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setHtmlCode(text);
        setPreviewKey((k) => k + 1);
      }
    } catch {
      textareaRef.current?.focus();
      alert("Please use Ctrl+V / Cmd+V to paste from your clipboard");
    }
  };

  const loadSample = () => {
    setHtmlCode(SAMPLE_HTML);
    setPreviewKey((k) => k + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setShowCode((v) => !v);
      }
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
      // Ctrl+Shift+C to copy preview
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        handleCopyPreview();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCopyPreview]);

  // Fullscreen preview mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0">
          <span className="text-sm font-medium opacity-70">Full Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPreview}
              disabled={copyStatus === "copying"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                copyStatus === "success"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {copyStatus === "success" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied! Paste in Email
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Preview
                </>
              )}
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit (Esc)
            </button>
          </div>
        </div>
        <iframe
          ref={fullscreenIframeRef}
          key={previewKey}
          srcDoc={htmlCode}
          title="Full Preview"
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts"
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
            <p className="text-xs text-gray-500 hidden sm:block">Paste HTML → Copy rendered preview → Paste in email</p>
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
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Code Editor Panel */}
        {showCode && (
          <div className="flex flex-col w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-950">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900/60 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  HTML Code
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
                  title="Copy source code"
                >
                  {copied ? "✓ Copied" : "Copy Code"}
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
                className="w-full h-full p-4 bg-transparent text-sm font-mono text-gray-300 placeholder-gray-600 resize-none outline-none leading-relaxed selection:bg-violet-500/30"
                style={{
                  tabSize: 2,
                  caretColor: "#a78bfa",
                }}
              />
            </div>
          </div>
        )}

        {/* Preview Panel */}
        <div className={`flex flex-col ${showCode ? "w-full lg:w-1/2 h-1/2 lg:h-full" : "w-full h-full"} bg-white`}>
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Preview
            </span>

            {/* Copy Preview Button - Main Action */}
            <button
              onClick={handleCopyPreview}
              disabled={!htmlCode || copyStatus === "copying"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                copyStatus === "success"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : copyStatus === "error"
                  ? "bg-red-500 text-white"
                  : copyStatus === "copying"
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-500/30"
              }`}
              title="Copy rendered preview to paste into email (Ctrl+Shift+C)"
            >
              {copyStatus === "success" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied! Paste in Email
                </>
              ) : copyStatus === "error" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Failed - Try Again
                </>
              ) : copyStatus === "copying" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Copying...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Preview
                </>
              )}
            </button>
          </div>

          {/* Preview iframe */}
          <div className="flex-1 relative overflow-hidden bg-white">
            {htmlCode ? (
              <iframe
                ref={previewIframeRef}
                key={previewKey}
                srcDoc={htmlCode}
                title="HTML Preview"
                className="absolute inset-0 w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
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
                  <p className="text-xs text-gray-300 mt-1">Paste some HTML code to see it here</p>
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

          {/* Copy instruction bar */}
          {htmlCode && (
            <div className="flex items-center justify-center px-3 py-2 bg-emerald-50 border-t border-emerald-100 shrink-0">
              <p className="text-[11px] text-emerald-700 text-center">
                <span className="font-semibold">💡 How it works:</span> Click <strong>"Copy Preview"</strong> → it captures the rendered look with all styles inlined → Paste (Ctrl+V) into Gmail, Outlook, or any email
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
        <span>Copy rendered preview → Paste in email (styles inlined)</span>
        <span className="hidden sm:inline">Ctrl+Shift+C to copy preview</span>
      </footer>
    </div>
  );
}

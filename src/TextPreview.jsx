import { useState } from 'react';
import { Copy, Check, Download, FileDown } from 'lucide-react';

export default function TextPreview({ text, onDownloadTxt, onDownloadPdf }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!text) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-200">
          Output Report
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-normal">
            {text.split('\n').length} baris
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200
              ${copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200'
              }
            `}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Tersalin!' : 'Copy'}
          </button>

          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-red-600/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500/50
              transition-all duration-200 active:scale-95"
          >
            <FileDown size={12} />
            Download .pdf
          </button>

          <button
            onClick={onDownloadTxt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-blue-600 hover:bg-blue-500 text-white border border-blue-500
              transition-all duration-200 active:scale-95"
          >
            <Download size={12} />
            Download .txt
          </button>
        </div>
      </div>

      {/* Text area */}
      <div className="relative rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
        {/* Line numbers gutter */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-full w-10 bg-gray-900/80 border-r border-gray-800" />
        </div>
        
        <pre className="overflow-auto max-h-[480px] scrollbar-thin text-xs leading-relaxed text-gray-300 font-mono p-4 pl-14 whitespace-pre">
          {/* Line numbers */}
          <div className="absolute left-0 top-0 pt-4 pb-4 w-10 text-right pr-2 select-none pointer-events-none">
            {text.split('\n').map((_, i) => (
              <div key={i} className="text-gray-700 leading-relaxed text-xs">
                {i + 1}
              </div>
            ))}
          </div>
          {text}
        </pre>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function UploadArea({ onFileLoaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = (file) => {
    setError('');
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Hanya file .xlsx atau .xls yang didukung.');
      return;
    }
    onFileLoaded(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onInputChange = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        group relative flex flex-col items-center justify-center gap-4
        rounded-2xl border-2 border-dashed p-12 cursor-pointer
        transition-all duration-300 select-none
        ${dragging
          ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
          : 'border-gray-700 bg-gray-900/50 hover:border-blue-500 hover:bg-blue-500/5'
        }
      `}
    >
      {/* Glow blob */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className={`
          absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl
          transition-opacity duration-500
          ${dragging ? 'opacity-30 bg-blue-500' : 'opacity-0 group-hover:opacity-20 bg-blue-500'}
        `} />
      </div>

      <div className={`
        w-20 h-20 rounded-2xl flex items-center justify-center
        transition-all duration-300
        ${dragging ? 'bg-blue-500/20 scale-110' : 'bg-gray-800 group-hover:bg-blue-500/10'}
      `}>
        <FileSpreadsheet
          size={36}
          className={`transition-colors duration-300 ${dragging ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`}
        />
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-gray-200">
          {dragging ? 'Lepaskan file di sini…' : 'Drag & drop file Excel'}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          atau <span className="text-blue-400 font-medium">klik untuk browse</span> · .xlsx / .xls
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
        <Upload size={12} />
        <span>Client-side only · data tidak dikirim ke server</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}

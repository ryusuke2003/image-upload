import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  UploadCloud, 
  X, 
  FileImage, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon 
} from "lucide-react";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const [message, setMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);


  const validateAndSetFile = useCallback((selectedFile: File | null) => {
    setStatus('idle');
    setMessage("");

    if (!selectedFile) return;

    const validTypes = ["image/png", "image/jpeg"];
    if (!validTypes.includes(selectedFile.type)) {
      setStatus('error');
      setMessage("対応形式はPNGまたはJPEGのみです。");
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setStatus('error');
      setMessage(`ファイルサイズは${formatFileSize(MAX_SIZE)}以下にしてください。`);
      return;
    }

    setFile(selectedFile);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    validateAndSetFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== 'uploading') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (status === 'uploading') return;

    const droppedFile = e.dataTransfer.files?.[0] ?? null;
    validateAndSetFile(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (!file) return;

    setStatus('uploading');
    setMessage("アップロード処理を開始しています...");

    const fileForReq = {
      fileName: file.name,
      contentType: file.type,
    };

    try {
      const res1 = await fetch("/api/upload-url", {
        method: "POST",
        body: JSON.stringify(fileForReq),
        headers: { "Content-Type": "application/json" }
      });

      if (!res1.ok) throw new Error(`サーバーエラー: ${res1.status}`);

      const { uploadURL, objectKey } = await res1.json() as {
        uploadURL: string;
        objectKey: string;
      };

      const res2 = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });

      if (!res2.ok) throw new Error(`ストレージへのアップロードに失敗しました: ${res2.status}`);

      // Step 3
      const res3 = await fetch("/api/saveImage", {
        method: "POST",
        body: JSON.stringify({
          objectKey,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (!res3.ok) throw new Error(`データベース登録エラー: ${res3.status}`);

      setStatus('success');
      setMessage("すべての処理が完了しました！");

      setTimeout(() => clearFile(), 3000);

    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage("エラーが発生しました。ネットワーク状況を確認してください。");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 p-6">
      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden transition-all duration-500 hover:shadow-2xl ring-1 ring-black/5">

        <div className="px-8 py-6 border-b border-gray-100/50 bg-white/40">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-indigo-500" />
            ファイルアップロード
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            JPEGまたはPNG形式の画像をアップロードしてください。<br />
            最大サイズは10MBまで対応しています。
          </p>
        </div>

        <div className="p-8 space-y-6">

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="画像ファイルを選択またはドラッグ＆ドロップしてください"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative group cursor-pointer outline-none select-none
                border-2 border-dashed rounded-xl p-12
                flex flex-col items-center justify-center text-center
                transition-all duration-300 ease-out
                ${
                  isDragging
                  ? "border-indigo-500 bg-indigo-50/60 scale-[1.02] shadow-inner"
                  : "border-gray-300 bg-gray-50/30 hover:bg-gray-50/80 hover:border-indigo-400 hover:shadow-sm"
                }
              `}
            >
              <input
                type="file"
                onChange={handleChange}
                accept="image/png,image/jpeg"
                ref={fileInputRef}
                className="hidden"
              />

              <div
                className={`
                  p-4 rounded-full mb-4 transition-all duration-300 shadow-sm
                  ${
                    isDragging
                    ? "bg-indigo-100 text-indigo-600 scale-110"
                    : "bg-white text-gray-400 group-hover:text-indigo-500 group-hover:scale-110 group-hover:shadow"
                  }
                `}
              >
                <UploadCloud className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-700">
                  クリックして画像を選択
                </p>
                <p className="text-sm text-gray-400">
                  またはここにファイルをドラッグ＆ドロップ
                </p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">

              <div className="relative h-56 w-full bg-gray-100 flex items-center justify-center overflow-hidden group">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="プレビュー"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                ) : (
                  <FileImage className="w-16 h-16 text-gray-300" />
                )}
              </div>

              <div className="p-4 flex items-center justify-between bg-white border-t border-gray-100 relative z-10">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2.5 bg-indigo-50 rounded-lg flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate block">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                  aria-label="ファイルを削除"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          <div className="min-h-[3.5rem] flex items-center justify-center">
            {message && (
              <div
                className={`
                  flex items-center px-4 py-3 rounded-lg text-sm font-medium w-full shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300
                  ${status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : ''}
                  ${status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : ''}
                  ${status === 'uploading' ? 'bg-blue-50 text-blue-700 border border-blue-100' : ''}
                `}
              >
                {status === 'error' && <AlertCircle className="w-5 h-5 mr-2.5 flex-shrink-0" />}
                {status === 'success' && <CheckCircle2 className="w-5 h-5 mr-2.5 flex-shrink-0" />}
                {status === 'uploading' && <Loader2 className="w-5 h-5 mr-2.5 flex-shrink-0 animate-spin" />}
                <span>{message}</span>
              </div>
            )}
          </div>

          <button
            onClick={upload}
            disabled={!file || status === 'uploading' || status === 'success'}
            className={`
              w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 transform
              flex items-center justify-center shadow-lg
              focus:outline-none focus:ring-4 focus:ring-indigo-100
              ${
                !file || status === 'success'
                ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              }
              ${status === 'uploading' ? "cursor-wait opacity-90" : ""}
            `}
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                アップロード処理中...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                アップロード完了
              </>
            ) : (
              "画像をアップロード"
            )}
          </button>
        </div>

        {status === 'uploading' && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
            <div className="h-full bg-indigo-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

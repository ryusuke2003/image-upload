import { useEffect, useRef, useState } from "react"

function App() {

  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    console.log(file?.name)
  }, [file])

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (selectedFile.type === "image/png" || selectedFile.type === "image/jpeg") {
      setFile(selectedFile)
    } else {
      alert("PNGかJPEGの画像を選択してください")
      setFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const upload = async () => {
    if (!file) {
      alert("ファイルを選択してください")
      return
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        console.log("アップロード成功");
      } else {
        console.log("サーバーエラー:", res.status);
      }
    } catch (error) {
      console.log("ネットワークエラー:", error);
    }

    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div>
        <input type="file" onChange={change} accept="image/png,image/jpeg" ref={fileInputRef} />
      </div>
      <div>
        <button onClick={upload}>アップロード</button>
      </div>
    </>
  )
}

export default App

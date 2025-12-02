import { useRef, useState } from "react"

function App() {

  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

    const fileForReq = {
      fileName: file.name,
      contentType: file.type,
    }

    try {
      const res1 = await fetch("/api/upload-url", {
        method: "POST",
        body: JSON.stringify(fileForReq)
      })
      if (!res1.ok) {
        console.log("サーバーエラー", res1.status);
        alert("アップロードURLの取得に失敗しました");
        return;
      }
      const { uploadURL, objectKey } = await res1.json() as {
        uploadURL: string;
        objectKey: string;
      };

      const res2 = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file
      })

      if (!res2.ok) {
        console.log("S3アップロードエラー", res2.status);
        alert("S3へのアップロードに失敗しました");
        return;
      }

      console.log("S3へのアップロード成功！ objectKey:", objectKey);
      alert("S3へのアップロード成功！");

      const res3 = await fetch("/api/saveImage", {
        method: "POST",
        body: JSON.stringify({
          objectKey,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!res3.ok) {
        console.log("DBアップロードエラー", res3.status);
        alert("DBへのアップロードに失敗しました");
        return;
      }

      console.log("DBへのアップロード成功！ objectKey:", objectKey);
      alert("DBへのアップロード成功！");

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.log("ネットワークエラー", error)
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

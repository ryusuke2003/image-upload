import { useEffect, useState } from "react"

function App() {

  const [file, setFile] = useState<File | null>(null)

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
    }
  }

  const upload = () => {
    if (!file) {
      alert("ファイルを選択してください")
      return
    }
    setFile(null)
  }

  return (
    <>
      <div>
        <input type="file" onChange={change} accept="image/png,image/jpeg"/>
      </div>
      <div>
        <button onClick={upload}>アップロード</button>
      </div>
    </>
  )
}

export default App

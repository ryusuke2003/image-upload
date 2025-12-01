import { useState } from "react"

function App() {

  const [test, setTest] = useState("")

  const create = async () => {
    const response = await fetch('http://localhost:8080/ping')

    if (response.ok) {
      const data = await response.json()
      setTest(data.message)
    } else {
      console.error('Error creating item')
    }
  }

  return (
    <>
      <p>テスト</p>
      <button onClick={create}>作成</button>
      <p>{test}</p>
    </>
  )
}

export default App

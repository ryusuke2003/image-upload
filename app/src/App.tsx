function App() {

  const create = async () => {
    const response = await fetch('/api/ping')

    if (response.ok) {
      const data = await response.json()
      console.log('Created:', data)
    } else {
      console.error('Error creating item')
    }
  }

  return (
    <>
      <p>テスト</p>
      <button onClick={create}>作成</button>
    </>
  )
}

export default App

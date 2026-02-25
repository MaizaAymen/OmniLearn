import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Codeeditor from './Pages/Codeeditor/Codeeditor'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Codeeditor />
    </>
  )
}

export default App

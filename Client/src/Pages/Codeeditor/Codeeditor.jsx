import { useState } from 'react'
import Editor from '@monaco-editor/react';


function Codeeditor() {
  
  return (
    <>
     <Editor height="90vh" defaultLanguage="javascript" defaultValue="// some comment" />
    </>
  )
}

export default Codeeditor

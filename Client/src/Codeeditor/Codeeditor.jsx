import React, { useRef, useState } from 'react'
import Editor from '@monaco-editor/react';
import { Box } from '@chakra-ui/react';
import LangugeSelector from './LangugeSelector';
function Codeeditor() { 
    const codeeditor = useRef();
    const[value, setValue] = useState("");
   const[language, setLanguage] = useState("javascript");
const onMount= (editor) => {
    codeeditor.current = editor;
    editor.focus();
}
const onselect = (language) => {
setLanguage(language);}
  return (
<Box>
    <LangugeSelector language={language} onSelect={onselect} />
    <Editor height="90vh" 
    defaultLanguage={language}
     defaultValue="// some comment" 
      onMount={onMount}
     value={value}
     onChange={(value) => setValue(value)} //update React state with that new content
     />
     </Box>
  )
}

export default Codeeditor
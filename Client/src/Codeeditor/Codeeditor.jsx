import React, { useRef, useState } from 'react'
import Editor from '@monaco-editor/react';
import { Box, HStack } from '@chakra-ui/react';
import LangugeSelector from './LangugeSelector';
import { CODE_SNIPPETS } from './constants';
import Output from './Output';

function Codeeditor() { 
    const codeeditor = useRef();
    const[value, setValue] = useState("");
    const[language, setLanguage] = useState("javascript");
const onMount= (editor) => {
    codeeditor.current = editor;
    editor.focus();
}
const onselect = (language) => {
setLanguage(language);
setValue(CODE_SNIPPETS[language]);}
  return (
<Box>
    <HStack spacing={4}>
      
    <LangugeSelector language={language} onSelect={onselect} />
    <Editor height="90vh" 
    language={language}
     defaultValue={CODE_SNIPPETS[language]}
      onMount={onMount}
     value={value}
     onChange={(value) => setValue(value)} //update React state with that new content
     />
       <Box w='50%'></Box> 
       <Output codeeditor={codeeditor} language={language}/>
    </HStack>
     </Box>
  )
}

export default Codeeditor
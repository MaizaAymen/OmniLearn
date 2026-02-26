import React from 'react'
import { Box, Button,Text } from '@chakra-ui/react';
import { executeCode } from "./Api";
function Output({language,codeeditor}) {
const runCode = async () => {
  const sourcecode = codeeditor.current.getValue();
  if (!sourcecode) return;

  try {
    const response = await executeCode(language, sourcecode);
    console.log(response);
  } catch (error) {
    console.error("Execution error:", error);
  }
};
  return (
    <Box w='50%'>
       <Text fontSize='lg' mb={4}>Output:</Text>
       <Button variant='outline' colorScheme='blue' size='sm' onClick={runCode}>
        Run Code
        </Button>
        <Box height={'75vh'}
        p={2}
        border="1px solid"
        borderRadius={4}
        borderColor="gray.300"
        >
        test
        </Box>
       </Box>
  )
}

export default Output
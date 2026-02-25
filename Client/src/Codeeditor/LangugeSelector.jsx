import React from 'react'
import {Box,Button,Menu,Portal,Text} from "@chakra-ui/react"
import { LANGUAGE_VERSIONS } from './constants'
const languages = Object.entries(LANGUAGE_VERSIONS)


function LangugeSelector({language,onSelect}) {
  return (
    <Box>
      <Text mb={2} fontSize={'lg'}>Languages:</Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button variant="outline">
            {language}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              {languages.map(([language, version]) => (
                <Menu.Item key={language} value={language}
                onClick={()=> onSelect(language)}>
                  {language}
                  <Text as="span" color="gray.500" ml={1}>
                    ({version})
                  </Text>
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Box>
  )
}

export default LangugeSelector
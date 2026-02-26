import React from 'react'
import {Box,Button,Menu,Portal,Text} from "@chakra-ui/react"
import { LANGUAGE_VERSIONS } from './constants'
const languages = Object.entries(LANGUAGE_VERSIONS)
const active_color = "blue.400"

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
              {languages.map(([lang, version]) => (
                <Menu.Item key={lang} value={lang}
                color={
                    lang=== language ? active_color : ""

                }
                bg={
                    lang===language ? "gray.900" : "transparent"
                }
                _hover={{
                    color:"blue.400",
                    bg:"gray.900"
                }}
                onClick={()=> onSelect(lang)}>
                  {lang}
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
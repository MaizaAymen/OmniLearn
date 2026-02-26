import axios from 'axios';
import { LANGUAGE_VERSIONS } from './constants'

const API_URL = axios.create({
  baseURL: "https://emkc.org/api/v2/piston",
});
export const executeCode = async (language, sourcecode) => {
const response = await API_URL.post("/execute", {
    "language": language,
  "version": LANGUAGE_VERSIONS[language],
  "files": [
    {
      "content": sourcecode
    }
  ]
   
})
return response.data;
}
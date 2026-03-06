import axios from 'axios';
import { JUDGE0_LANGUAGE_IDS } from './constants';

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

export const executeCode = async (language, sourcecode) => {
  try {
    const response = await axios.post(
      JUDGE0_URL,
      {
        source_code: sourcecode,
        language_id: JUDGE0_LANGUAGE_IDS[language],
        stdin: '',
      }
    );

    const data = response.data;
    const stdout = data.stdout || '';
    const stderr = data.stderr || '';
    const compileOutput = data.compile_output || '';
    const statusId = data.status?.id;

    // Status 3 = Accepted (ran successfully), 6 = Compilation Error, 7-12 = Runtime Errors
    const success = statusId === 3;
    const errorMsg = compileOutput || stderr;

    return {
      success,
      output: stdout,
      error: errorMsg,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err.message || 'Execution failed',
    };
  }
};
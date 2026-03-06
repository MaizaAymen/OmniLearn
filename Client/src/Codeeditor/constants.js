// Judge0 language IDs (https://ce.judge0.com)
export const JUDGE0_LANGUAGE_IDS = {
  javascript: 63,  // Node.js 12.14.0
  typescript: 74,  // TypeScript 3.7.4
  python: 71,      // Python 3.8.1
  java: 62,        // Java 13.0.1
  csharp: 51,      // C# (Mono 6.6.0.0)
  php: 68,         // PHP 7.4.1
};

export const LANGUAGE_CONFIG = {
  javascript: { name: "JavaScript", monacoLang: "javascript", badge: "JS" },
  typescript: { name: "TypeScript", monacoLang: "typescript", badge: "TS" },
  python:     { name: "Python",     monacoLang: "python",     badge: "PY" },
  java:       { name: "Java",       monacoLang: "java",       badge: "JV" },
  csharp:     { name: "C#",         monacoLang: "csharp",     badge: "C#" },
  php:        { name: "PHP",        monacoLang: "php",        badge: "PHP" },
};

export const CODE_SNIPPETS = {
  javascript: `\nfunction greet(name) {\n\tconsole.log("Hello, " + name + "!");\n}\n\ngreet("Alex");\n`,
  typescript: `\ntype Params = {\n\tname: string;\n}\n\nfunction greet(data: Params) {\n\tconsole.log("Hello, " + data.name + "!");\n}\n\ngreet({ name: "Alex" });\n`,
  python: `\ndef greet(name):\n\tprint("Hello, " + name + "!")\n\ngreet("Alex")\n`,
  java: `\npublic class HelloWorld {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello World");\n\t}\n}\n`,
  csharp:
    'using System;\n\nnamespace HelloWorld\n{\n\tclass Hello { \n\t\tstatic void Main(string[] args) {\n\t\t\tConsole.WriteLine("Hello World in C#");\n\t\t}\n\t}\n}\n',
  php: "<?php\n\n$name = 'Alex';\necho $name;\n",
};
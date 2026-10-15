// Claude Code hook (PostToolUse on Edit|Write): formats the file Claude just changed with the
// project's Prettier, so formatting never has to be remembered. Files Prettier ignores
// (.prettierignore) or does not know are left alone. Never fails the tool call.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

let input = ''
for await (const chunk of process.stdin) input += chunk

try {
  const { tool_input: toolInput = {}, tool_response: toolResponse = {} } = JSON.parse(input)
  const file = path.resolve(root, toolResponse.filePath ?? toolInput.file_path ?? '')
  if (!file.startsWith(root + path.sep) || file.includes(`${path.sep}node_modules${path.sep}`)) {
    process.exit(0)
  }
  const prettier = await import('prettier')
  const info = await prettier.getFileInfo(file, { ignorePath: path.join(root, '.prettierignore') })
  if (info.ignored || !info.inferredParser) process.exit(0)
  const source = await readFile(file, 'utf8')
  const options = (await prettier.resolveConfig(file)) ?? {}
  const formatted = await prettier.format(source, { ...options, filepath: file })
  if (formatted !== source) await writeFile(file, formatted)
} catch {
  // A syntax error mid-edit or a missing file is not the hook's business.
}

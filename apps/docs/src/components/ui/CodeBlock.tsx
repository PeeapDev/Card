'use client'

import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  description?: string
  showLineNumbers?: boolean
}

// Simple syntax highlighting for common patterns
function highlightCode(code: string, language: string): string {
  let highlighted = code
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (language === 'bash' || language === 'shell') {
    // Comments
    highlighted = highlighted.replace(/(#.*)$/gm, '<span class="code-comment">$1</span>')
    // Strings
    highlighted = highlighted.replace(/(".*?"|'.*?')/g, '<span class="code-string">$1</span>')
    // Commands
    highlighted = highlighted.replace(/^(\s*)(npm|yarn|pnpm|curl|npx|git)/gm, '$1<span class="code-keyword">$2</span>')
  } else if (language === 'typescript' || language === 'javascript' || language === 'tsx' || language === 'jsx') {
    // Comments (single line)
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>')
    // Comments (multi-line) - simple version
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>')
    // Strings (double quotes)
    highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="code-string">$1</span>')
    // Strings (single quotes)
    highlighted = highlighted.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="code-string">$1</span>')
    // Template literals
    highlighted = highlighted.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="code-template">$1</span>')
    // Keywords
    highlighted = highlighted.replace(/\b(import|export|from|const|let|var|function|return|if|else|async|await|new|class|extends|interface|type|default|true|false|null|undefined)\b/g, '<span class="code-keyword">$1</span>')
    // Functions
    highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="code-function">$1</span>(')
    // Component names (PascalCase)
    highlighted = highlighted.replace(/&lt;([A-Z][a-zA-Z0-9]*)/g, '&lt;<span class="code-component">$1</span>')
    highlighted = highlighted.replace(/&lt;\/([A-Z][a-zA-Z0-9]*)/g, '&lt;/<span class="code-component">$1</span>')
    // Props/attributes
    highlighted = highlighted.replace(/\s([a-zA-Z_][a-zA-Z0-9_]*)=/g, ' <span class="code-prop">$1</span>=')
    // Numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>')
  } else if (language === 'json') {
    // Comments (common in examples even though not valid JSON)
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>')
    // Keys
    highlighted = highlighted.replace(/"([^"]+)":/g, '<span class="code-prop">"$1"</span>:')
    // String values
    highlighted = highlighted.replace(/:\s*"([^"]*)"/g, ': <span class="code-string">"$1"</span>')
    // Array string values
    highlighted = highlighted.replace(/\[\s*"([^"]*)"/g, '[ <span class="code-string">"$1"</span>')
    // Numbers
    highlighted = highlighted.replace(/:\s*(\d+\.?\d*)/g, ': <span class="code-number">$1</span>')
    // Booleans and null
    highlighted = highlighted.replace(/:\s*(true|false|null)/g, ': <span class="code-keyword">$1</span>')
    // Standalone booleans in arrays
    highlighted = highlighted.replace(/\[\s*(true|false|null)/g, '[ <span class="code-keyword">$1</span>')
  } else if (language === 'env') {
    // Comments
    highlighted = highlighted.replace(/(#.*)$/gm, '<span class="code-comment">$1</span>')
    // Keys
    highlighted = highlighted.replace(/^([A-Z_][A-Z0-9_]*)=/gm, '<span class="code-prop">$1</span>=')
    // Values
    highlighted = highlighted.replace(/=(.*)$/gm, '=<span class="code-string">$1</span>')
  } else if (language === 'css') {
    // Comments
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>')
    // Selectors
    highlighted = highlighted.replace(/^(\.[a-zA-Z-_]+)/gm, '<span class="code-component">$1</span>')
    // Properties
    highlighted = highlighted.replace(/\s+([a-z-]+):/g, ' <span class="code-prop">$1</span>:')
    // Values with units
    highlighted = highlighted.replace(/:\s*([#a-zA-Z0-9]+)/g, ': <span class="code-string">$1</span>')
  }

  return highlighted
}

export function CodeBlock({ code, language = 'typescript', title, description, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split('\n')
  const highlightedCode = highlightCode(code, language)

  return (
    <div className="code-block-container rounded-lg overflow-hidden border border-gray-700 bg-[#1a1b26]">
      {/* Header */}
      {(title || description) && (
        <div className="px-4 py-3 bg-[#24283b] border-b border-gray-700">
          {title && <h4 className="text-sm font-semibold text-gray-200">{title}</h4>}
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
      )}

      {/* Code area */}
      <div className="relative group">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-md text-xs font-medium transition-all
            bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white
            opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          {copied ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </span>
          )}
        </button>

        {/* Language badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-gray-700 text-gray-400">
            {language}
          </span>
        </div>

        {/* Code content */}
        <div className="overflow-x-auto pt-10 pb-4 px-4">
          <pre className="text-sm leading-relaxed">
            {showLineNumbers ? (
              <table className="w-full">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-gray-800/50">
                      <td className="pr-4 text-right text-gray-600 select-none w-8 align-top">
                        {i + 1}
                      </td>
                      <td>
                        <code
                          className="text-gray-300"
                          dangerouslySetInnerHTML={{ __html: highlightCode(line, language) }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <code
                className="text-gray-300"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}

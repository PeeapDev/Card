'use client'

import { useState } from 'react'

interface ExpandablePromptProps {
  title: string
  description?: string
  prompt: string
  defaultExpanded?: boolean
}

export function ExpandablePrompt({ title, description, prompt, defaultExpanded = false }: ExpandablePromptProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 overflow-hidden">
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-600">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            {copied ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Prompt
              </span>
            )}
          </button>
          <button className="p-2 rounded-lg hover:bg-white/50 transition-colors">
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-purple-200 bg-[#1a1b26] p-4">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  )
}

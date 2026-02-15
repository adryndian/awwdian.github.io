'use client'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
}

export default function InputArea({ value, onChange, onSend, isLoading }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="max-w-3xl mx-auto relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Claude..."
        rows={1}
        className="w-full bg-claude-input text-claude-text rounded-xl pl-4 pr-12 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-claude-accent max-h-32"
        style={{ minHeight: '52px' }}
      />
      <button
        onClick={onSend}
        disabled={!value.trim() || isLoading}
        className="absolute right-3 bottom-3 p-1.5 bg-claude-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 transition-colors"
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  )
}

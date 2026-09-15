import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Preflight removes default element styles, so restore them for rendered Markdown
const markdownStyles = [
  'space-y-3 break-words text-white/76 marker:text-white/35',
  '[&_strong]:font-semibold [&_strong]:text-white/90',
  '[&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h3]:font-semibold [&_h3]:text-white/90',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1',
  '[&_a]:text-white [&_a]:underline [&_a]:underline-offset-2',
  '[&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-white/15 [&_blockquote]:pl-3 [&_blockquote]:text-white/60',
  '[&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1',
].join(' ')

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className={markdownStyles}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

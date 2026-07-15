import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre(props) {
            return <>{props.children}</>
          },
          code(props) {
            const { className, children, node: _node, ...rest } = props
            const lenguaje = /language-(\w+)/.exec(className ?? '')?.[1]
            if (!lenguaje) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              )
            }
            return (
              <SyntaxHighlighter language={lenguaje} style={vscDarkPlus} PreTag="div">
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

const demoVideoUrl = 'https://github.com/user-attachments/assets/d1601b54-2669-45d7-b1e5-9bbde1186856'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { gitConfig } from '@/lib/shared'
import { Link } from 'waku'

const codeCards = {
  shared: [
    "import { defineProxy } from 'comctx'",
    "import { streamText } from 'ai'",
    "import { openai } from '@ai-sdk/openai'",
    '',
    'class AiService {',
    '  async translate(text: string, targetLanguage: string) {',
    '    const result = await streamText({',
    "      model: openai('gpt-4o-mini'),",
    '      prompt: `Translate to ${targetLanguage}:\\n${text}`',
    '    })',
    '',
    '    return result.textStream',
    '  }',
    '}',
    '',
    'export const [provideAi, injectAi] = defineProxy(() => new AiService(), {',
    "  namespace: '__worker-transfer-example__',",
    '  transfer: true',
    '})'
  ],
  main: [
    "import Adapter from './adapter'",
    "import { injectAi } from './service'",
    '',
    'const ai = injectAi(new Adapter())',
    '',
    "const stream = await ai.translate('Hello world', 'zh-CN')",
    '',
    'for await (const chunk of stream) {',
    '  console.log(chunk)',
    '}'
  ],
  worker: [
    "import Adapter from './adapter'",
    "import { provideAi } from './service'",
    '',
    'const ai = provideAi(new Adapter())'
  ]
} as const

const darkCodeOptions = {
  themes: {
    light: 'github-dark',
    dark: 'github-dark'
  }
} as const

const features = [
  {
    title: 'Environment Agnostic',
    description: 'Works across Web Workers, browser extensions, iframes, Electron, and more.'
  },
  {
    title: 'Bidirectional Communication',
    description: 'Supports method calls and callbacks across the boundary.'
  },
  {
    title: 'Zero Copy',
    description: 'Automatically extracts and transfers transferable objects when enabled.'
  },
  {
    title: 'Type Safety',
    description: 'Keeps the same typed API on both provider and injector sides.'
  },
  {
    title: 'Lightweight',
    description: 'Ships a small core without forcing a runtime-specific transport.'
  },
  {
    title: 'Fault Tolerance',
    description: 'Supports backup implementations and connection heartbeat checks.'
  }
]

export default function Home() {
  return (
    <main className="comctx-home flex-1 overflow-x-hidden">
      <section className="relative overflow-hidden px-6 pb-14 pt-8 sm:pt-12 lg:px-8 lg:pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-fd-muted-foreground">
              JavaScript cross-context RPC
            </div>

            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] sm:text-6xl lg:text-[6.5rem] lg:leading-[0.92] [font-family:Georgia,'Iowan_Old_Style',serif]">
              Comctx
            </h1>

            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-fd-muted-foreground sm:text-base">
              Use RPC to communicate easily across contexts in any JavaScript environment.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fd-muted-foreground">
              <span>Web Workers</span>
              <span>Extensions</span>
              <span>iframes</span>
              <span>Electron</span>
              <span>Message-based runtimes</span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/docs/introduction"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground transition-[transform,background-color] duration-200 ease-out active:scale-95 [@media(hover:hover)]:hover:opacity-90"
              >
                Read the docs
              </Link>
              <a
                href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full border bg-fd-card px-5 py-3 text-sm font-medium transition-[transform,background-color] duration-200 ease-out active:scale-95 [@media(hover:hover)]:hover:bg-fd-accent"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-col items-center pb-8 text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl [font-family:Georgia,'Iowan_Old_Style',serif]">
            Worker RPC flow
          </h2>
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 pt-2 lg:block lg:pt-6">
          <div className="dark mx-auto w-full max-w-[52rem]">
            <DynamicCodeBlock
              lang="ts"
              code={codeCards.shared.join('\n')}
              options={darkCodeOptions}
              codeblock={{
                title: 'service.ts',
                allowCopy: false,
                className: 'my-0',
                viewportProps: {
                  className: 'max-h-none overflow-x-auto overflow-y-visible'
                }
              }}
            />
          </div>

          <div className="relative mx-auto hidden h-28 max-w-5xl lg:block">
            <svg aria-hidden="true" viewBox="0 0 1000 140" className="absolute inset-0 h-full w-full">
              <defs>
                <marker
                  id="comctx-arrow-dashed"
                  markerWidth="16"
                  markerHeight="16"
                  refX="13"
                  refY="8"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path
                    d="M 1 1 L 14 8 L 1 15"
                    fill="none"
                    className="stroke-[rgba(32,27,23,0.82)] dark:stroke-[rgba(235,238,242,0.78)]"
                    strokeWidth="1.8"
                  />
                </marker>
              </defs>

              <path
                d="M 248 122 C 304 116, 344 98, 384 72 C 420 48, 442 32, 470 20"
                fill="none"
                className="stroke-[rgba(32,27,23,0.78)] dark:stroke-[rgba(235,238,242,0.74)]"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="7 10"
                markerEnd="url(#comctx-arrow-dashed)"
              />
              <path
                d="M 752 122 C 710 114, 664 100, 624 78 C 588 56, 560 36, 530 20"
                fill="none"
                className="stroke-[rgba(32,27,23,0.78)] dark:stroke-[rgba(235,238,242,0.74)]"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="7 10"
                markerEnd="url(#comctx-arrow-dashed)"
              />
            </svg>
          </div>

          <div className="grid gap-8 lg:mt-1 lg:grid-cols-2 lg:items-start">
            <div className="dark lg:-translate-y-1 lg:rotate-[1deg]">
              <DynamicCodeBlock
                lang="ts"
                code={codeCards.worker.join('\n')}
                options={darkCodeOptions}
                codeblock={{
                  title: 'worker.ts',
                  allowCopy: false,
                  className: 'my-0',
                  viewportProps: {
                    className: 'max-h-none overflow-visible'
                  }
                }}
              />
            </div>

            <div className="dark lg:translate-y-2 lg:rotate-[-1.1deg]">
              <DynamicCodeBlock
                lang="ts"
                code={codeCards.main.join('\n')}
                options={darkCodeOptions}
                codeblock={{
                  title: 'main.ts',
                  allowCopy: false,
                  className: 'my-0',
                  viewportProps: {
                    className: 'max-h-none overflow-visible'
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-2 pb-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-fd-muted-foreground">Demo</div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl [font-family:Georgia,'Iowan_Old_Style',serif]">
            Real-world browser extension RPC.
          </h2>
        </div>

        <div className="overflow-hidden rounded-[1.9rem] border bg-fd-card p-3 shadow-sm">
          <video
            controls
            playsInline
            preload="metadata"
            className="block w-full rounded-[1.35rem] bg-black"
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '836 / 572.89',
              display: 'block'
            }}
          >
            <source src={demoVideoUrl} />
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-10 lg:px-8 lg:pb-28 lg:pt-14">
        <div className="border-t border-[rgba(88,66,44,0.12)] pt-6">
          <div className="flex flex-col gap-2 pb-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-fd-muted-foreground">Features</div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl [font-family:Georgia,'Iowan_Old_Style',serif]">
              Core capabilities.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((item) => (
              <div key={item.title} className="min-h-40 rounded-[1.6rem] bg-fd-card px-5 py-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-fd-muted-foreground">Feature</div>
                <div className="mt-3 text-base font-medium">{item.title}</div>
                <p className="mt-2 max-w-xs text-sm leading-6 text-fd-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export async function getConfig() {
  return {
    render: 'static'
  }
}

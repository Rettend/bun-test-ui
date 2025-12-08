import { defineConfig, presetIcons, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  preflights: [
    {
      getCSS: () => `
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        ::-webkit-scrollbar-corner {
          background: transparent;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* ANSI colors */
        .ansi-output .ansi-black-fg { color: #4f4f4f; }
        .ansi-output .ansi-red-fg { color: #ef4444; }
        .ansi-output .ansi-green-fg { color: #22c55e; }
        .ansi-output .ansi-yellow-fg { color: #eab308; }
        .ansi-output .ansi-blue-fg { color: #3b82f6; }
        .ansi-output .ansi-magenta-fg { color: #a855f7; }
        .ansi-output .ansi-cyan-fg { color: #06b6d4; }
        .ansi-output .ansi-white-fg { color: #e5e7eb; }
        .ansi-output .ansi-bright-black-fg { color: #737373; }
        .ansi-output .ansi-bright-red-fg { color: #f87171; }
        .ansi-output .ansi-bright-green-fg { color: #4ade80; }
        .ansi-output .ansi-bright-yellow-fg { color: #fde047; }
        .ansi-output .ansi-bright-blue-fg { color: #60a5fa; }
        .ansi-output .ansi-bright-magenta-fg { color: #c084fc; }
        .ansi-output .ansi-bright-cyan-fg { color: #22d3ee; }
        .ansi-output .ansi-bright-white-fg { color: #f9fafb; }
        .ansi-output .ansi-bold { font-weight: 700; }
        .ansi-output .ansi-italic { font-style: italic; }
        .ansi-output .ansi-underline { text-decoration: underline; }
        .ansi-output .ansi-dim { opacity: 0.7; }
      `,
    },
  ],
})

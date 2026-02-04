import { defineConfig } from "unocss";
import presetAutoprefixer from 'unocss-preset-autoprefixer'
import presetWeapp from 'unocss-preset-weapp'

export default defineConfig({
  // 1. 专门为命令行工具 (CLI) 配置的入口
  cli: {
    entry: {
      patterns: [
        // 1. 你的原有包含规则
        '{pages,components}/**/*.wxml',
        'custom-tab-bar/*.wxml',

        // 这里的 ** 导致了扫描 node_modules，我们在下面排除它
        '**/components/**/*.wxml',

        // 2. 新增：排除规则 (必须以 ! 开头)
        '!node_modules/**/*',
        '!miniprogram_npm/**/*',
        '!dist/**/*' // 如果你有打包输出目录，也可以加上
      ],
      outFile: 'uno.wxss'
    }
  },
  content: {
    pipeline: {
      include: [/\.wxml$/]
    }
  },
  theme: {
    colors: {
      // 这样定义后，使用 bg-primary 会直接生成 #0D9488
      primary: '#0D9488',
      'primary-hover': '#0F766E',
    },
  },
  presets: [
    presetWeapp({
      whRpx: false,
    }),
    presetAutoprefixer(['defaults', 'iOS >= 10', 'Chrome >= 51', 'Edge >= 15', 'Firefox >= 54'])
  ],
  shortcuts: [
    // 定义快捷类，方便搬运 Web 端的逻辑
    ['btn-primary', 'bg-hex-0D9488 text-white rounded-md'],
  ],
  separators: '__',
  safelist: [
    'bg-hex-EF4444',
    'bg-hex-22C55E',
    'bg-hex-A855F7',
    'bg-hex-3B82F6',
  ]
})
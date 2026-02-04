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
    },
  },
  presets: [
    presetWeapp({
      whRpx: false,
    }),
    presetAutoprefixer(['defaults', 'iOS >= 10', 'Chrome >= 51', 'Edge >= 15', 'Firefox >= 54'])
  ],
  separators: '__',
  safelist: [
  ]
})
import eslist from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vueParser from "vue-eslint-parser"
import vuetifyLint from 'eslint-plugin-vuetify'
import globals from "globals"

export default [
  eslist.configs.recommended,
  ...vue.configs['flat/recommended'].map(config => {
    // eslint-disable-next-line no-unused-vars
    const { plugins, ...rest } = config
    return rest
  }),
  ...vuetifyLint.configs['flat/recommended'],
  {
    rules: {
      'array-element-newline': ['error', 'consistent'],
      'comma-spacing': ['error', { before: false, after: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'block-spacing': ['error', 'always'],
      'object-curly-newline': ['error', { multiline: true, consistent: true }],
      'vue/block-tag-newline': ['error', {
        singleline: 'always',
        multiline: 'always',
        maxEmptyLines: 1
      }],
      'vue/no-use-v-else-with-v-for': 'error',
      'vue/no-multiple-objects-in-class': 'error',
      'vue/no-potential-component-option-typo': ['error', {
        presets: ['all'],
        custom: ['test']
      }],
      'vue/no-this-in-before-route-enter': 'error',
      'vue/no-useless-mustaches': 'error',
      'vue/no-v-text': 'error',
      'vue/prefer-prop-type-boolean-first': 'error',
      'vue/prefer-separate-static-class': 'error',
      'vue/no-unused-properties': ['error', {
        'groups': ['props', 'data', 'computed', 'methods']
      }]
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: vueParser
    }
  },
]
import * as semanticReleaseJsr from '@sebbo2002/semantic-release-jsr'

const jsrPlugin = { ...semanticReleaseJsr }

export default {
  branches: ['master'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/github',
    '@semantic-release/npm',
    jsrPlugin,
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'pnpm-lock.yaml', 'jsr.json']
      }
    ]
  ]
}

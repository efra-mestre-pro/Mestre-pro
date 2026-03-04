name: 🤖 AnteSpan Enterprise

on:
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *'

concurrency:
  group: antespan-enterprise
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  executar:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Instalar Dependências
        run: npm ci || npm install

      - name: Executar Robô
        run: node rodo.js
        env:
          FIREBASE_CONFIG: ${{ secrets.FIREBASE_CONFIG }}
          API_1_URL: ${{ secrets.API_1_URL }}
          API_2_URL: ${{ secrets.API_2_URL }}
          API_3_URL: ${{ secrets.API_3_URL }}
          API_4_URL: ${{ secrets.API_4_URL }}
          API_4_KEY: ${{ secrets.API_4_KEY }}

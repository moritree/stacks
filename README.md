# stacks

[![Rust](https://img.shields.io/badge/Rust-%23000000.svg?e&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Lua](https://img.shields.io/badge/Lua-%232C2D72.svg?logo=lua&logoColor=white)](https://www.lua.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Preact](https://img.shields.io/badge/Preact-673AB8?logo=preact&logoColor=fff)](https://preactjs.com/)
[![Tauri](https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=fff)](https://v2.tauri.app/)

A Tauri (Rust) app, using TypeScript with Preact for the frontend and Lua for model (and scripting, later).

So deeply WIP, I'm not even going to explain what this is for yet.

> ### ⚠ Testing
> *(@ me, in case I forget and lose time again)* Make sure to **test the production build** as well as dev mode!

# Run locally
1. Clone the repository
   ```
   git clone https://github.com/moritree/stacks.git
   ```
2. Install dependencies:
   ```
   yarn install
   ```

I'm sure you can figure out installing any prerequisites along the way.

## Development
To run the app in development mode:

```
yarn tauri dev
```

## Build from source
To build the application binary for your system:

```
yarn tauri build
```

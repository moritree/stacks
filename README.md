# stacks

[![Rust](https://img.shields.io/badge/Rust-%23000000.svg?e&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Lua](https://img.shields.io/badge/Lua-%232C2D72.svg?logo=lua&logoColor=white)](https://www.lua.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)

A Tauri (Rust) app, using TypeScript with Preact for the frontend and Lua for model (and scripting, later).
So WIP, I'm not even going to explain what this is for yet.

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

> ### ⚠ Testing
> *(@ me, in case I forget and lose time again)* Make sure to **test the production build** as well as dev mode!

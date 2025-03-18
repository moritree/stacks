# stacks

[![Rust](https://img.shields.io/badge/Rust-%23000000.svg?e&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Lua](https://img.shields.io/badge/Lua-%232C2D72.svg?logo=lua&logoColor=white)](https://www.lua.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=fff)](https://v2.tauri.app/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Preact](https://img.shields.io/badge/Preact-673AB8?logo=preact&logoColor=fff)](https://preactjs.com/)

A Tauri (Rust) app, using TypeScript with Preact for the frontend and Lua for model & scripting.

So deeply WIP, I'm not even going to explain what this is for yet.

# Architecture TL;DR

Stack responsibilities are split fairly evenly between Tauri, TypeScript, and Lua.

Tauri provides a backend which:
- Creates a webview that we can run our UI on
- Connects this webview to system stuff which websites usually can't do (read files, talk to hardware, run system commands, etc.)

This is the code's main entry point. The app is setup and run from `src-tauri/src/lib.rs`. 

As part of Tauri's initialization, it creates a thread running a Lua environment & preloads all the modules. A channel to this thread allows bidirectional communication, and Tauri commands provide hooks for the TypeScript frontend to send/recieve messages and data into/from Lua. The Lua component handles the state of the scene graph and any entities within it, and updates TypeScript with this state for rendering.

The TypeScript component is light on logic. Its job is to render the scene graph and UI for interaction. Tailwind CSS is used for style.

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

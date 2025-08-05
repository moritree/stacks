import { render } from "preact";
import "./style.css";
import Scene from "./scene-window";
import Inspector from "./inspector/inspector";
import { useEffect, useState } from "preact/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let listeners: (() => void)[] = [];

    (async () => {
      listeners.push(
        await getCurrentWindow().onThemeChanged(({ payload: theme }) =>
          setTheme(theme),
        ),
      );
    })().then(async () =>
      setTheme((await getCurrentWindow().theme()) || "light"),
    );
  });

  return (
    <div class="w-screen h-screen flex flex-row">
      <div class="w-full h-full flex flex-col">
        <Scene />
        <div class="flex-auto bg-border" />
      </div>
      <div class="flex-none w-96">
        <Inspector theme={theme} />
      </div>
    </div>
  );
}

render(<App />, document.getElementById("root")!);

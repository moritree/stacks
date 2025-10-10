import { render } from "preact";
import "./style.css";
import Scene from "./scene-window";
import Inspector from "./inspector/inspector";
import { useEffect, useRef, useState } from "preact/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MoreVertical } from "preact-feather";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

    return () => listeners.forEach((unsubscribe) => unsubscribe());
  });

  return (
    <div class="w-screen h-screen flex flex-row">
      <div class="w-full h-full flex flex-col">
        <Scene />
        <div class="flex-auto bg-border" />
      </div>
      <div
        class="flex flex-row"
        style={{ width: `${sidebarWidth}px` }}
        ref={sidebarRef}
      >
        <div
          class="h-full w-[6px] border-x-1 border-secondary cursor-ew-resize flex justify-center items-center p-0"
          onMouseDown={(startEvent) => {
            const startWidth = sidebarWidth || 128;
            const startX = startEvent.clientX;

            function onMouseMove(moveEvent: MouseEvent) {
              setSidebarWidth(
                Math.max(64, startWidth + (startX - moveEvent.clientX)), // TODO why is this not moving enough???
              );
            }

            function onMouseUp() {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            }

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          }}
        >
          <MoreVertical class="h-3 text-border" />
        </div>
        <Inspector theme={theme} />
      </div>
    </div>
  );
}

render(<App />, document.getElementById("root")!);

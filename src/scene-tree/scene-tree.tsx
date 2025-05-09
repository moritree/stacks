import { getCurrentWindow } from "@tauri-apps/api/window";
import "../style.css";
import { render } from "preact";
import { Folder } from "preact-feather";
import { useEffect, useState } from "preact/hooks";
import { listen } from "@tauri-apps/api/event";
import { Entity } from "../entity/entity-type";

export default function SceneTree() {
  const [entities, setEntities] = useState<string[]>([]);

  useEffect(() => {
    let listeners: (() => void)[] = [];

    (async () =>
      listeners.push(
        await listen<{ [id: string]: Partial<Entity> }>("scene_update", (e) => {
          setEntities(Object.entries(e.payload).map(([id, _]) => id));
        }),
      ))();
  });

  return (
    <div class="w-screen h-screen bg-base flex flex-col justify-center items-center">
      <Folder />
    </div>
  );
}

render(<SceneTree />, document.getElementById("root")!);

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
          setEntities(
            Object.entries(e.payload)
              .sort((a, b) => (a[1].layer || 0) - (b[1].layer || 0))
              .map(([id, _]) => id),
          );
        }),
      ))();
  });

  return (
    <div class="w-screen h-screen bg-base flex flex-col justify-center items-center">
      <Folder />
      {entities.map((entity) => (
        <div class="w-screen h-10 not-last:border-b border-border flex flex-row items-center p-2">
          <h2>{entity}</h2>
        </div>
      ))}
    </div>
  );
}

render(<SceneTree />, document.getElementById("root")!);

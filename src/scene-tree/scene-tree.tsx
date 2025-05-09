import { getCurrentWindow } from "@tauri-apps/api/window";
import "../style.css";
import { render } from "preact";
import { Folder } from "preact-feather";
import { useEffect, useState } from "preact/hooks";
import { listen } from "@tauri-apps/api/event";
import { Entity } from "../entity/entity-type";

export default function SceneTree() {
  const [entities, setEntities] = useState<Map<string, Entity>>(new Map());

  useEffect(() => {
    let listeners: (() => void)[] = [];

    (async () =>
      listeners.push(
        await listen<{ [id: string]: Partial<Entity> }>("scene_update", (e) => {
          setEntities(
            new Map(
              Object.entries(e.payload).map(([id, ent]) => [
                id,
                { ...ent, id: id } as Entity,
              ]),
            ),
          );
        }),
      ))();
  });

  console.log("entities: ", entities.size);

  return (
    <div class="w-screen h-screen bg-base flex flex-col justify-center items-center">
      <Folder />
    </div>
  );
}

render(<SceneTree />, document.getElementById("root")!);

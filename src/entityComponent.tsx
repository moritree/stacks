import { invoke } from "@tauri-apps/api/core";

export default function entityComponent([id, entity]: [string, any]): any {
  switch (entity.type) {
    case "text":
      return Text(id, entity);
    case "rect":
      return Rect(id, entity);
    default:
      console.warn("Invalid entity", id, entity);
      return <></>;
  }
}

function Text(id: string, obj: any) {
  return (
    <div
      class="entity text"
      id={id}
      style={{
        "--x": `${obj.pos.x}px`,
        "--y": `${obj.pos.y}px`,
      }}
    >
      {obj.content}
    </div>
  );
}

function move_randomly(id: string) {
  invoke("update_entity_property", {
    id: id,
    key: "pos",
    data: { x: 69, y: 420 },
  });
}

function Rect(id: string, obj: any) {
  return (
    <div
      class="entity rect"
      id={id}
      style={{
        "--x": `${obj.pos.x}px`,
        "--y": `${obj.pos.y}px`,
        "--width": `${obj.dimension.x}px`,
        "--height": `${obj.dimension.y}px`,
        "--color": `rgb(${obj.color.r}, ${obj.color.g}, ${obj.color.b})`,
      }}
      onClick={() => move_randomly(id)}
    />
  );
}

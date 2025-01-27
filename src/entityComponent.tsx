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
      id={id}
      style={{
        position: "absolute",
        left: obj.pos.x,
        top: obj.pos.y,
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
      id={id}
      style={{
        position: "absolute",
        left: obj.pos.x,
        top: obj.pos.y,
        width: obj.dimension.x,
        height: obj.dimension.y,
        backgroundColor: `rgb(${obj.color.r}, ${obj.color.g}, ${obj.color.b})`,
      }}
      onClick={() => move_randomly(id)}
    />
  );
}

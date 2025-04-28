import "../style.css";
import { render } from "preact";
import { Folder } from "preact-feather";

export default function SceneTree() {
  return (
    <div class="w-screen h-screen bg-base flex flex-col justify-center items-center">
      <Folder />
    </div>
  );
}

render(<SceneTree />, document.getElementById("root")!);

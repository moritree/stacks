import { render } from "preact";
import { Folder } from "preact-feather";

export default function SceneTree() {
  return (
    <div class="w-screen h-screen">
      <Folder />
    </div>
  );
}

render(<SceneTree />, document.getElementById("root")!);

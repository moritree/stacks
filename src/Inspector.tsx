import { Component, render } from "preact";
import "./style/main.css";

interface InspectorState {}

export default class Inspector extends Component<{}, InspectorState> {
  render() {
    return <div class="w-screen h-screen bg-red-500"></div>;
  }
}

render(<Inspector />, document.getElementById("root")!);

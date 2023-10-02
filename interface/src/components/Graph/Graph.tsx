import clsx from "clsx";
import { Accessor, createContext, useContext } from "solid-js";
import { Graph as GraphModel } from "@macrograph/core";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { Node } from "./Node";
import { ConnectionRender, SchemaMenu } from "../Graph";
import { useUIStore } from "../../UIStore";
import CommentBox from "./CommentBox";

type PanState =
  | { state: "none" }
  | { state: "waiting"; downposx: number; downposy: number }
  | { state: "active" };

interface Props {
  graph: GraphModel;
}

export const Graph = (props: Props) => {
  const graph = () => props.graph;

  const UI = useUIStore();

  let graphRef: HTMLDivElement;

  let lastScale = 1;

  const listener = (e: any) => {
    let scale = e.scale;
    let direction = 1;
    if (scale < 1) {
      direction = -1;
      scale = 1 / scale;
      if (lastScale < 1) {
        lastScale = 1 / lastScale;
      }
    }

    UI.updateScale((scale - lastScale) * direction, {
      x: e.clientX,
      y: e.clientY,
    });

    lastScale = e.scale;
  };

  const resetListener = () => (lastScale = 1);

  onMount(() => {
    const handler = () => {
      const bounds = graphRef.getBoundingClientRect()!;

      UI.setGraphOffset({
        x: bounds.left,
        y: bounds.top,
      });
    };

    handler();

    window.addEventListener("resize", handler);

    graphRef.addEventListener("gesturestart", resetListener);
    graphRef.addEventListener("gesturechange", listener);

    onCleanup(() => {
      window.removeEventListener("resize", handler);

      graphRef.removeEventListener("gesturechange", listener);
      graphRef.removeEventListener("gesturechange", resetListener);
    });
  });

  const [pan, setPan] = createSignal<PanState>({ state: "none" });

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "KeyK" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();

        const currentPos = UI.state.schemaMenuPosition;
        const pos = UI.state.mousePos;
        if (!pos) return;

        if (currentPos && currentPos.x === pos.x && currentPos.y === pos.y)
          UI.setSchemaMenuPosition();
        else {
          UI.setSchemaMenuPosition({
            x: pos.x,
            y: pos.y,
          });
        }
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  });

  return (
    <GraphContext.Provider value={graph}>
      <div class="flex-1 relative overflow-hidden bg-mg-graph">
        <Show when={UI.state.schemaMenuPosition}>
          {(pos) => (
            <SchemaMenu
              position={pos()}
              onSchemaClicked={(s) => {
                graph().createNode({
                  schema: s,
                  position: UI.toGraphSpace(pos()),
                });
                UI.setSchemaMenuPosition();
              }}
            />
          )}
        </Show>
        <ConnectionRender />
        <div
          ref={graphRef!}
          class={clsx(
            "absolute inset-0 text-white origin-top-left overflow-hidden",
            pan().state === "active" && "cursor-grabbing"
          )}
          style={{
            transform: `scale(${UI.state.scale})`,
            height: "500%",
            width: "500%",
          }}
          onWheel={(e) => {
            e.preventDefault();

            let deltaX = e.deltaX,
              deltaY = e.deltaY,
              isTouchpad = false;

            if (Math.abs((e as any).wheelDeltaY) === Math.abs(e.deltaY) * 3) {
              deltaX = -(e as any).wheelDeltaX / 3;
              deltaY = -(e as any).wheelDeltaY / 3;
              isTouchpad = true;
            }

            if (e.ctrlKey) {
              const delta = ((isTouchpad ? 1 : -1) * deltaY) / 100;

              UI.updateScale(delta, {
                x: e.clientX - graphRef.getBoundingClientRect().x,
                y: e.clientY - graphRef.getBoundingClientRect().y,
              });
            } else
              UI.updateTranslate({
                x: deltaX,
                y: deltaY,
              });
          }}
          onMouseUp={(e) => {
            switch (e.button) {
              case 2:
                if (pan().state === "waiting") {
                  if (UI.state.mouseDragLocation) UI.setMouseDragLocation();
                  else
                    UI.setSchemaMenuPosition({
                      x: e.clientX,
                      y: e.clientY,
                    });
                }
                setPan({ state: "none" });
                break;
            }
          }}
          onMouseDown={(e) => {
            switch (e.button) {
              case 0:
                UI.setSchemaMenuPosition();
                UI.setSelectedItem();
                break;
              case 2:
                setPan({
                  state: "waiting",
                  downposx: e.clientX,
                  downposy: e.clientY,
                });
                UI.setMouseDownLocation({
                  x: e.clientX,
                  y: e.clientY,
                });
                UI.setMouseDownTranslate({
                  ...UI.state.translate,
                });
                break;
            }
          }}
          onMouseMove={(e) => {
            const MOVE_BUFFER = 3;
            const panData = pan();

            if (panData.state === "none") return;
            if (
              panData.state === "waiting" &&
              Math.abs(panData.downposx - e.clientX) < MOVE_BUFFER &&
              Math.abs(panData.downposy - e.clientY) < MOVE_BUFFER
            )
              return;

            setPan({ state: "active" });

            UI.setSchemaMenuPosition();

            UI.setTranslate({
              x:
                (UI.state.mouseDownLocation!.x -
                  e.clientX +
                  UI.state.mouseDownTranslate!.x * UI.state.scale) /
                UI.state.scale,
              y:
                (UI.state.mouseDownLocation!.y -
                  e.clientY +
                  UI.state.mouseDownTranslate!.y * UI.state.scale) /
                UI.state.scale,
            });
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            class="origin-[0,0]"
            style={{
              transform: `translate(${UI.state.translate.x * -1}px, ${
                UI.state.translate.y * -1
              }px)`,
            }}
          >
            <For each={[...graph().commentBoxes.values()]}>
              {(box) => <CommentBox box={box} />}
            </For>
            <For each={[...graph().nodes.values()]}>
              {(node) => <Node node={node} />}
            </For>
          </div>
        </div>
      </div>
    </GraphContext.Provider>
  );
};

const GraphContext = createContext<Accessor<GraphModel> | null>(null);

export const useGraph = () => {
  const ctx = useContext(GraphContext);

  if (!ctx) throw new Error("CurrentGraphContext is missing!");

  return ctx;
};
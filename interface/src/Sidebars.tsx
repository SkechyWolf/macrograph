import {
  DEFAULT,
  Graph,
  Node,
  PropertyValue,
  SchemaProperties,
} from "@macrograph/runtime";
import { BasePrimitiveType, serializeValue, t } from "@macrograph/typesystem";
import { Switch, For, Match, Show, createMemo, createSignal } from "solid-js";
import { Card } from "@macrograph/ui";

import { SidebarSection as SidebarPanel } from "./components/Sidebar";
import {
  CheckBox,
  FloatInput,
  IntInput,
  SelectInput,
  TextInput,
} from "./components/ui";
import { TypeEditor } from "./components/TypeEditor";
import { useCore } from "./contexts";

export function GraphSidebar(props: { graph: Graph }) {
  return <VariablesPanel graph={props.graph} />;
}

export function NodeSidebar(props: { node: Node }) {
  return (
    <>
      <NodeInfoPanel node={props.node} />
      <Show
        when={"properties" in props.node.schema && props.node.schema.properties}
      >
        {(properties) => (
          <NodePropertiesPanel node={props.node} properties={properties()} />
        )}
      </Show>
    </>
  );
}

function VariablesPanel(props: { graph: Graph }) {
  return (
    <SidebarPanel
      title="Variables"
      right={
        <button
          onClick={(e) => {
            e.stopPropagation();

            props.graph.createVariable({
              name: `Variable ${props.graph.variables.length + 1}`,
              value: 0,
              type: t.string(),
            });
          }}
        >
          <IconMaterialSymbolsAddRounded class="w-6 h-6" />
        </button>
      }
    >
      <ul class="p-2 gap-2 flex flex-col">
        <For each={props.graph.variables}>
          {(variable) => {
            const [editingName, setEditingName] = createSignal(false);

            return (
              <Card as="li" class="p-2 space-y-2">
                <div class="flex flex-row gap-2 justify-between items-center">
                  <Switch>
                    <Match when={editingName()}>
                      {(_) => {
                        const [value, setValue] = createSignal(variable.name);

                        return (
                          <>
                            <input
                              class="flex-1 text-black -ml-1 pl-1"
                              value={value()}
                              onChange={(e) => setValue(e.target.value)}
                            />
                            <div class="flex flex-row space-x-1">
                              <button
                                onClick={() => {
                                  variable.name = value();
                                  setEditingName(false);
                                }}
                              >
                                <IconAntDesignCheckOutlined class="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingName(false)}>
                                <IconAntDesignCloseOutlined class="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        );
                      }}
                    </Match>
                    <Match when={!editingName()}>
                      <span class="shrink-0">{variable.name}</span>
                      <div class="gap-2 flex flex-row">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setEditingName(true);
                          }}
                        >
                          <IconAntDesignEditOutlined class="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            props.graph.removeVariable(variable.id);
                          }}
                        >
                          <IconAntDesignDeleteOutlined class="w-4 h-4" />
                        </button>
                      </div>
                    </Match>
                  </Switch>
                </div>

                <TypeEditor
                  type={variable.type}
                  onChange={(type) => (variable.type = type)}
                />

                <div class="flex flex-row items-start gap-2 text-sm">
                  <Switch>
                    <Match
                      when={
                        variable.type instanceof BasePrimitiveType &&
                        variable.type
                      }
                    >
                      {(type) => (
                        <Switch>
                          <Match when={type().primitiveVariant() === "bool"}>
                            <CheckBox
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "string"}>
                            <TextInput
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "int"}>
                            <IntInput
                              initialValue={variable.value}
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "float"}>
                            <FloatInput
                              initialValue={variable.value}
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                        </Switch>
                      )}
                    </Match>
                    <Match
                      when={
                        variable.type instanceof t.List ||
                        variable.type instanceof t.Map
                      }
                    >
                      <div class="flex-1 whitespace-pre-wrap max-w-full">
                        {JSON.stringify(
                          serializeValue(variable.value, variable.type),
                          null,
                          4
                        )}
                      </div>
                    </Match>
                  </Switch>
                </div>
              </Card>
            );
          }}
        </For>
      </ul>
    </SidebarPanel>
  );
}

function NodeInfoPanel(props: { node: Node }) {
  return (
    <SidebarPanel title="Node Info" class="p-2 space-y-2">
      <p>Name: {props.node.state.name}</p>
    </SidebarPanel>
  );
}

function NodePropertiesPanel(props: {
  node: Node;
  properties: SchemaProperties;
}) {
  return (
    <SidebarPanel title="Node Properties">
      <For each={Object.values(props.properties)}>
        {(property) => {
          const properties = createMemo(() => props.node.state.properties);

          return (
            <div class="p-2 flex flex-row gap-2 items-center">
              <span>{property.name}</span>
              <div class="flex-1">
                <Switch>
                  <Match when={"source" in property && property}>
                    {(property) => {
                      const options = () => {
                        return property().source({ node: props.node });
                      };

                      const selectedOption = () => {
                        return options().find(
                          (o) => o.id === properties()[property().id]!
                        );
                      };

                      return (
                        <SelectInput<PropertyValue>
                          options={options()}
                          optionValue="id"
                          optionTextValue="display"
                          getLabel={(o) => o.display}
                          value={selectedOption()}
                          onChange={(v) => {
                            props.node.setProperty(property().id, v.id);
                          }}
                        />
                      );
                    }}
                  </Match>
                  <Match when={"type" in property && property}>
                    {(property) => {
                      const value = createMemo(
                        () => properties()[property().id]!
                      );

                      const onChange = (v: any) => {
                        props.node.setProperty(property().id, v);
                      };

                      return (
                        <Show
                          when={(() => {
                            const v = value();
                            return v !== "symbol" && v !== undefined;
                          })()}
                        >
                          <Switch>
                            <Match
                              when={
                                property().type.primitiveVariant() === "bool"
                              }
                            >
                              <CheckBox
                                value={value() as any}
                                onChange={onChange}
                              />
                            </Match>
                            <Match
                              when={
                                property().type.primitiveVariant() === "string"
                              }
                            >
                              <TextInput
                                value={value() as any}
                                onChange={onChange}
                              />
                            </Match>
                            <Match
                              when={
                                property().type.primitiveVariant() === "int"
                              }
                            >
                              <IntInput
                                initialValue={value() as any}
                                value={value() as any}
                                onChange={onChange}
                              />
                            </Match>
                            <Match
                              when={
                                property().type.primitiveVariant() === "float"
                              }
                            >
                              <FloatInput
                                initialValue={value() as any}
                                value={value() as any}
                                onChange={onChange}
                              />
                            </Match>
                          </Switch>
                        </Show>
                      );
                    }}
                  </Match>
                  <Match when={"resource" in property && property}>
                    {(property) => {
                      const core = useCore();

                      const items = () => {
                        const resource = core.project.resources.get(
                          property().resource
                        );
                        if (!resource) return [];

                        const dflt = resource.items.find(
                          (i) => i.id === resource.default
                        );

                        return [
                          {
                            id: DEFAULT,
                            name: dflt
                              ? `Default (${dflt.name})`
                              : `No Items Available`,
                          },
                          ...resource.items,
                        ];
                      };

                      const valueId = createMemo(
                        () => props.node.state.properties[property().id]
                      );

                      return (
                        <SelectInput
                          options={items()}
                          optionValue="id"
                          optionTextValue="name"
                          getLabel={(o) => o.name}
                          value={
                            items().find((i) => i.id === valueId()) ??
                            items().find((i) => i.id === DEFAULT)
                          }
                          onChange={(v) =>
                            props.node.setProperty(property().id, v.id)
                          }
                        />
                      );
                    }}
                  </Match>
                </Switch>
              </div>
            </div>
          );
        }}
      </For>
    </SidebarPanel>
  );
}

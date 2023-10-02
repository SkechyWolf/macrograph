import clsx from "clsx";
import {
  AnyType,
  BaseType,
  DataInput,
  DataOutput,
  ListType,
  t,
  WildcardType,
} from "@macrograph/core";
import { usePin } from ".";
import { Match, Switch } from "solid-js";
import { Tooltip } from "@kobalte/core";
import { colour } from "../util";

interface Props {
  pin: DataInput<BaseType> | DataOutput<BaseType>;
}

export const DataPin = (props: Props) => {
  const pin = props.pin;

  const { ref, active } = usePin(pin);

  const connected = () =>
    pin instanceof DataInput
      ? pin.connection.isSome()
      : pin.connections.size > 0;

  const containerProps = () =>
    ({
      ref: ref,
      style: {
        "pointer-events": "all",
      },
    } as const);

  const rounding = (type: AnyType): string => {
    if (type instanceof ListType) {
      return "rounded-[0.1875rem]";
    }

    if (type instanceof WildcardType) {
      const value = type.wildcard.value();

      if (value.isSome()) {
        return rounding(value.unwrap());
      }
    }

    return "rounded-full";
  };

  const innerType = {
    get value() {
      if (pin.type instanceof WildcardType) {
        return pin.type.wildcard.value().unwrapOr(pin.type);
      } else return pin.type;
    },
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger class="cursor-auto">
        <Switch>
          <Match when={innerType.value instanceof t.Option && innerType.value}>
            {(type) => {
              const v = {
                get type() {
                  const value = type();

                  if (value instanceof t.Wildcard) {
                    return value.wildcard.value().unwrapOr(value);
                  } else return value;
                },
              };

              return (
                <Switch>
                  <Match when={v.type instanceof t.Map && v.type}>
                    {(type) => (
                      <div
                        {...containerProps()}
                        class="w-3.5 h-3.5 flex flex-col justify-between"
                      >
                        {[0, 1].map(() => {
                          return (
                            <div
                              class={clsx(
                                "h-[0.1875rem] w-full flex flex-row space-x-0.5 justify-between",
                                colour(type())
                              )}
                            >
                              <div class="w-[0.1875rem] h-full bg-mg-string rounded-full" />
                              <div
                                class={clsx(
                                  "h-full rounded-full bg-mg-current",
                                  connected() || active()
                                    ? "flex-1"
                                    : "w-1.5 ml-auto"
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Match>
                  <Match when={v.type}>
                    <div
                      {...containerProps()}
                      class={clsx(
                        `w-3.5 h-3.5 flex justify-center items-center border-mg-current`,
                        rounding(type()),
                        colour(type()),
                        connected() || active()
                          ? "border-[2.5px]"
                          : "border-[1.5px]"
                      )}
                    >
                      <div
                        class={clsx(
                          "border-[1.5px] border-mg-current",
                          connected() || active()
                            ? "w-1 h-1 bg-mg-current"
                            : "w-2 h-2",
                          !(type().getInner() instanceof ListType)
                            ? "rounded-full"
                            : "rounded-[0.0625rem]"
                        )}
                      />
                    </div>
                  </Match>
                </Switch>
              );
            }}
          </Match>
          <Match when={innerType.value instanceof t.Map && innerType.value}>
            {(type) => {
              return (
                <div
                  {...containerProps()}
                  class="w-3.5 h-3.5 flex flex-col justify-between"
                >
                  {[0, 1, 2].map(() => {
                    return (
                      <div
                        class={clsx(
                          "h-[0.1875rem] w-full flex flex-row space-x-0.5 justify-between",
                          colour(type())
                        )}
                      >
                        <div class="w-[0.1875rem] h-full bg-mg-string rounded-full" />
                        <div
                          class={clsx(
                            "h-full rounded-full bg-mg-current",
                            connected() || active() ? "flex-1" : "w-1.5 ml-auto"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            }}
          </Match>
          <Match when={innerType.value}>
            {(type) => {
              return (
                <div
                  {...containerProps()}
                  class={clsx(
                    `w-3.5 h-3.5 border-[2.5px]`,
                    rounding(type()),
                    colour(type()),
                    connected() || active()
                      ? "border-mg-current bg-mg-current"
                      : "border-mg-current"
                  )}
                />
              );
            }}
          </Match>
        </Switch>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="bg-black min-w-[2.5rem] text-center text-white text-xs px-1 py-0.5 rounded border border-gray-500">
          <Tooltip.Arrow />
          {pin.type.toString()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
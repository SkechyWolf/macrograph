import { createMutable } from "solid-js/store";
import { z } from "zod";
import { AnyType, BaseType, TypeVariant, Wildcard } from ".";

export class StructField<Type extends AnyType = AnyType> {
  constructor(public name: string, public type: Type) {
    return createMutable(this);
  }

  default(): any {
    return this.type.default();
  }
}

export type StructFields = Record<string, StructField>;

export class LazyStructFields<Fields extends StructFields = StructFields> {
  constructor(public build: () => Fields) {}
}

export class Struct<Fields extends StructFields = StructFields> {
  constructor(public name: string, fields: Fields | LazyStructFields<Fields>) {
    if (fields instanceof LazyStructFields) {
      this._fields = {
        type: "lazy",
        fields,
      };
    } else {
      this._fields = {
        type: "resolved",
        fields,
      };
    }
  }

  _fields:
    | { type: "resolved"; fields: Fields }
    | { type: "lazy"; fields: LazyStructFields<Fields> };

  get fields() {
    let val = this._fields;

    if (val.type === "lazy") {
      this._fields = val = {
        type: "resolved",
        fields: val.fields.build(),
      };
    }

    return val.fields;
  }

  create(data: InferStruct<this>): InferStruct<this> {
    return data;
  }
}

export class StructBuilder {
  field<Type extends AnyType>(name: string, type: Type) {
    return new StructField(name, type);
  }

  lazy<T extends StructFields>(fn: () => T) {
    return new LazyStructFields(fn);
  }
}

export class StructType<Fields extends StructFields> extends BaseType<
  InferStructFields<Fields>
> {
  constructor(public struct: Struct<Fields>) {
    super();
  }

  default(): any {
    return Object.entries(this.struct.fields).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: value.default(),
      }),
      {}
    );
  }

  variant(): TypeVariant {
    return "struct";
  }

  toString(): string {
    return `Struct(${this.struct.name})`;
  }

  asZodType(): z.ZodType<InferStructFields<Fields>> {
    return z.object(
      Object.entries(this.struct.fields).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value.type.asZodType(),
        }),
        {}
      )
    ) as any;
  }

  getWildcards(): Wildcard[] {
    return Object.values(this.struct.fields).flatMap((f) =>
      f.type.getWildcards()
    );
  }
}

export type InferStruct<S> = S extends Struct<infer Fields>
  ? InferStructFields<Fields>
  : never;

export type InferStructFields<F> = F extends StructFields
  ? { [K in keyof F]: InferStructField<F[K]> }
  : never;

export type InferStructField<F> = F extends StructField<infer Type>
  ? Type extends BaseType<infer TOut>
    ? TOut
    : never
  : never;
declare module "airtable" {
  type RecordCallback<Schema> = (
    err: Error | null,
    record: Record<Schema>
  ) => void;

  type RecordsCallback<Schema> = (
    err: Error | null,
    record: Record<Schema>[]
  ) => void;

  type SelectParams<Schema> = {
    filterByFormula?: string;
    pageSize?: number;
    sort?: {
      field: keyof Schema;
      direction?: "asc" | "desc";
    }[];
  };

  type SelectQuery<Schema> = {
    firstPage(cb: RecordsCallback<Schema>): void;
  };

  type CreateCommand<Schema> = {
    fields: Partial<Schema>;
  };

  type Table<Schema> = {
    select(params: SelectParams<Schema>): SelectQuery<Schema>;
    create(cmds: CreateCommand<Schema>[], cb: RecordsCallback<Schema>): void;
  };

  type TableFactory = <Schema>(table: string) => Table<Schema>;

  export type Record<Schema> = {
    get<F extends keyof Schema>(field: F): Schema[F];
    set<F extends keyof Schema>(field: F, value: Schema[F]): void;
    save(cb: RecordCallback<Schema>): void;
  };

  export function base(id: string): TableFactory;
}

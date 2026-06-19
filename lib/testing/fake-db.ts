// Test-only helpers. Not imported by application code.
//
// Drizzle query builders are chainable thenables: `await db.select().from(t)...`
// runs the query when awaited. These helpers stand in for that builder so unit
// tests can exercise the guard/decision logic in lib/ without a real database.
//
// The fake is table-aware rather than call-order-aware: a test supplies a
// `respond(ctx)` function and decides what to return based on the operation
// (`select` | `insert` | `update` | `delete`) and the schema table the chain
// touched. This keeps tests robust to internal query reordering.

export type FakeDbOp = "select" | "insert" | "update" | "delete";

export type FakeDbContext = {
  op: FakeDbOp;
  // The drizzle table object: `from(table)` for selects, or the first argument
  // of insert/update/delete. Compare against imports from "@/db/schema".
  table: unknown;
  // Method names called on the chain, in order (e.g. ["from","where","limit"]).
  chain: string[];
  // Arguments captured per method, keyed by method name (last call wins).
  args: Record<string, unknown[]>;
};

export type FakeDbResponder = (ctx: FakeDbContext) => unknown;

export type FakeDb = {
  db: Record<string, unknown>;
  // Every terminal (awaited) chain, in execution order. Useful for assertions.
  calls: FakeDbContext[];
};

const TERMINAL_DEFAULTS: Record<FakeDbOp, unknown> = {
  // Selects/returning destructure arrays (`const [row] = await ...`), so an
  // empty array is the safe default when a responder returns undefined.
  select: [],
  insert: undefined,
  update: [],
  delete: [],
};

export function createFakeDb(respond: FakeDbResponder = () => undefined): FakeDb {
  const calls: FakeDbContext[] = [];

  function startChain(op: FakeDbOp, table?: unknown) {
    const ctx: FakeDbContext = { args: {}, chain: [op], op, table };
    let settled = false;

    const proxy: unknown = new Proxy(function noop() {}, {
      get(_target, prop) {
        if (prop === "then") {
          // Resolve the query result when the chain is awaited.
          return (resolve: (value: unknown) => void) => {
            if (!settled) {
              settled = true;
              calls.push(ctx);
            }
            const result = respond(ctx);
            resolve(result === undefined ? TERMINAL_DEFAULTS[op] : result);
          };
        }

        return (...args: unknown[]) => {
          const name = String(prop);
          ctx.chain.push(name);
          ctx.args[name] = args;

          if (name === "from" && args.length > 0) {
            ctx.table = args[0];
          }

          return proxy;
        };
      },
    });

    return proxy;
  }

  const db: Record<string, unknown> = {
    delete: (table: unknown) => startChain("delete", table),
    insert: (table: unknown) => startChain("insert", table),
    // select(columns?) — the projection is irrelevant to the fake; results are
    // chosen by the responder based on the table the chain reads from.
    select: () => startChain("select"),
    update: (table: unknown) => startChain("update", table),
  };

  return { calls, db };
}

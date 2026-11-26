// Prisma ORM 8 client, obtained from the app's Composer service declaration.
// On Compute the client is wired by service.load(); the old `prisma.<model>`
// facade is kept as a lazy compatibility layer so existing call sites read
// `prisma.user.findUnique(...)` against `db.client.orm.public.User`.
import service from "../../service.mjs";
import type { Contract } from "../prisma/contract";
import type { PostgresClient } from "@prisma/orm-postgres/runtime";

type DbClient = PostgresClient<Contract>;

let cachedClient: DbClient | null = null;

/** The Prisma ORM 8 client, loaded once from the service declaration on first use. */
export function getDb(): DbClient {
  if (!cachedClient) {
    const { db } = service.load() as { db: { client: DbClient } };
    cachedClient = db.client;
  }
  return cachedClient;
}

function toPascal(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function modelFor(client: DbClient, model: string): any {
  return (client.orm.public as Record<string, any>)[toPascal(model)];
}

async function translate(model: string, method: string, args: any): Promise<any> {
  const m = modelFor(getDb(), model);
  const a = args ?? {};
  const where = a.where ?? {};
  switch (method) {
    case 'findUnique':
    case 'findFirst': {
      let q = m;
      if (method === 'findFirst' || !('id' in where) || Object.keys(where).length !== 1) {
        q = m.where(buildWhere(where));
      } else {
        q = m.first({ id: where.id });
      }
      // `.first({ id })` already carries the predicate for the pk shorthand.
      if (method !== 'findFirst' && 'id' in where && Object.keys(where).length === 1) {
        return includeArgs(await applyInclude(q, a, m));
      }
      return includeArgs(await applyInclude(q, a, m));
    }
    case 'findMany': {
      let q = m;
      if (Object.keys(where).length) q = q.where(buildWhere(where));
      if (a.orderBy) q = q.orderBy(buildOrderBy(a.orderBy));
      if (a.skip) q = q.offset(a.skip);
      if (a.take) q = q.limit(a.take);
      return includeArgs(await applyInclude(q, a, m));
    }
    case 'create': {
      const data = { ...(a.data ?? {}) };
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && 'create' in (v as any)) {
          delete data[k];
          await modelFor(getDb(), singularToPlural(k)).createAll(
            (v as any).create.map((row: any) => ({ ...row, [foreignKeyFor(k)]: data.id ?? undefined })),
          );
        }
      }
      let q = m;
      if (a.include || a.select) q = applySelectInclude(q, a);
      return includeArgs(await q.create(stripRelations(data)));
    }
    case 'createMany':
      return m.createAll(a.data ?? []);
    case 'update': {
      let q = m.where(buildWhere(where));
      if (a.include || a.select) q = applySelectInclude(q, a);
      return includeArgs(await q.update(a.data ?? {}));
    }
    case 'updateMany': {
      const q = m.where(buildWhere(where));
      return { count: await q.updateAll(a.data ?? {}) };
    }
    case 'delete': {
      const q = m.where(buildWhere(where));
      return includeArgs(await q.delete());
    }
    case 'deleteMany':
      return { count: await m.where(buildWhere(where)).deleteAll() };
    case 'count':
      return (await m.where(buildWhere(where)).aggregate((agg: any) => ({ n: agg.count() }))).n;
    case 'upsert': {
      const found = await m.where(buildWhere(where)).first();
      if (found) return includeArgs(await m.where(buildWhere(where)).update(a.update ?? {}));
      return includeArgs(await m.create(a.create ?? {}));
    }
    default:
      throw new Error(`Unsupported prisma.${model}.${method}() in the Prisma 8 adapter`);
  }
}

function buildWhere(where: any): any {
  const clauses: any[] = [];
  for (const [field, cond] of Object.entries(where)) {
    if (cond !== null && typeof cond === 'object') {
      for (const [op, val] of Object.entries(cond as any)) {
        clauses.push((row: any) => {
          const f = row[field];
          switch (op) {
            case 'gte': return f.gte(val);
            case 'lte': return f.lte(val);
            case 'gt': return f.gt(val);
            case 'lt': return f.lt(val);
            case 'in': return f.in(val);
            case 'not': return f.neq(val);
            case 'contains': return f.like(`%${val}%`);
            case 'mode': return f.eq(val);
            default: return f.eq(val);
          }
        });
      }
    } else {
      clauses.push((row: any) => row[field].eq(cond));
    }
  }
  return (row: any) => clauses.length === 1 ? clauses[0](row) : clauses;
}

function buildOrderBy(orderBy: any): any {
  const orders: any[] = [];
  for (const [field, dir] of Object.entries(orderBy)) {
    orders.push((row: any) => (dir === 'desc' ? row[field].desc() : row[field].asc()));
  }
  return orders.length === 1 ? orders[0] : orders;
}

function applySelectInclude(q: any, a: any): any {
  let out = q;
  for (const rel of Object.keys(a.include ?? a.select ?? {})) {
    out = out.include(rel, (branch: any) => branch);
  }
  return out;
}

async function applyInclude(q: any, a: any, _m: any): Promise<any> {
  let out = q;
  for (const [rel, spec] of Object.entries(a.include ?? a.select ?? {})) {
    const s: any = spec;
    if (s && typeof s === 'object' && s.take !== undefined) {
      out = out.include(rel, (branch: any) => {
        let b = branch;
        if (s.orderBy) b = b.orderBy(buildOrderBy(s.orderBy));
        if (s.take) b = b.limit(s.take);
        return b;
      });
    } else {
      out = out.include(rel, (branch: any) => branch);
    }
  }
  return await out.all ? await out.all() : await out;
}

function includeArgs(row: any): any {
  return row;
}

function stripRelations(data: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && typeof v === 'object') continue;
    out[k] = v;
  }
  return out;
}

function singularToPlural(model: string): string {
  return model === 'media' ? 'Media' : toPascal(model) + 's';
}

function foreignKeyFor(relation: string): string {
  const map: Record<string, string> = { media: 'postId' };
  return map[relation] ?? `${relation}Id`;
}

/** Lazy `prisma.<model>.<method>()` facade over the Prisma ORM 8 client. */
export const prisma: any = new Proxy({} as Record<string, any>, {
  get(_t, model: string) {
    return new Proxy({} as Record<string, any>, {
      get(_t2, method: string) {
        return (args: any) => translate(model, method, args);
      },
    });
  },
});

export default prisma;

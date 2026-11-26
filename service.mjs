// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import { secretString } from "@prisma/composer/arktype";
import { type } from "arktype";
import contractJson from "./src/prisma/contract.json";

/**
 * The emitted Prisma ORM 8 data contract (src/prisma/contract.json, written by
 * `prisma contract emit`). Both the resource end in module.mjs and this
 * service's dependency end reference the same value.
 * @type {import("@prisma/composer-prisma-cloud/orm").PostgresContract<import("./src/prisma/contract").Contract>}
 */
export const dbContract = dataContract(contractJson);

export default compute({
  name: "confeitaria-content-manager",
  deps: { db: postgres(dbContract) },
  input: type({
    sessionSecret: secretString(),
  }),
  build: nextjs({ module: import.meta.url, appDir: "." }),
});

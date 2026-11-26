// @ts-check
import { appRoot } from "@prisma/composer";
import { variable } from "@prisma/composer-prisma-cloud";
import { postgres } from "@prisma/composer-prisma-cloud/orm";
import confeitariaContentManagerService, { dbContract } from "./service.mjs";

export default appRoot("playful-khaki-quagga", ({ provision }) => {
  const sessionSecret = provision(variable.secret({ name: "NEXTAUTH_SECRET" })); // Signs NextAuth session cookies (JWTs).

  const db = provision(
    postgres({
      name: "db",
      contract: dbContract,
      config: "./prisma.config.ts",
    }),
  );

  provision(confeitariaContentManagerService, {
    id: "confeitariacontentmanager",
    deps: { db },
    input: { sessionSecret },
  });
});

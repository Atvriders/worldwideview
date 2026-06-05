-- Drift fix: User.sessionVersion (Int @default(0)) exists in prisma/schema.prisma and the
-- generated Prisma client, but no migration ever created the column (it was added via
-- `prisma db push` during dev). On the Docker/prod path `prisma migrate deploy` therefore
-- builds `users` WITHOUT `sessionVersion`, and prisma.user.create() fails with P2022
-- ("column \"sessionVersion\" of relation \"users\" does not exist"), wedging /setup.
--
-- IF NOT EXISTS keeps this safe on databases that already have the column (dev `db push`,
-- or a hand-applied ALTER), so `migrate deploy` is a no-op there and still records the
-- migration in _prisma_migrations.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "vaultId" UUID;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "vaultId" UUID;

-- CreateTable
CREATE TABLE "Vault" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2F4BFF',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vault_companyId_idx" ON "Vault"("companyId");

-- CreateIndex
CREATE INDEX "Contract_vaultId_idx" ON "Contract"("vaultId");

-- CreateIndex
CREATE INDEX "Document_vaultId_idx" ON "Document"("vaultId");

-- AddForeignKey
ALTER TABLE "Vault" ADD CONSTRAINT "Vault_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE SET NULL ON UPDATE CASCADE;


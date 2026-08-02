import bcrypt from "bcrypt";
import { PrismaClient } from "../app/generated/prisma";
import { generateEmployeeId } from "../lib/utils";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);
  const salesPassword = await bcrypt.hash("sales123", 12);

  await prisma.user.upsert({
    where: { email: "admin@sims.io" },
    update: { employeeId: "EMP-100001", role: "SUPER_ADMIN", status: "ACTIVE" },
    create: {
      employeeId: "EMP-100001",
      name: "Super Admin",
      email: "admin@sims.io",
      password,
      role: "SUPER_ADMIN",
      department: "Administration",
      position: "System Administrator",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "sales@sims.io" },
    update: { employeeId: "EMP-100002", role: "SALES_MANAGER", status: "ACTIVE" },
    create: {
      employeeId: "EMP-100002",
      name: "Sales Manager Demo",
      email: "sales@sims.io",
      password: salesPassword,
      role: "SALES_MANAGER",
      department: "Sales",
      position: "Sales Manager",
      status: "ACTIVE",
    },
  });

  const existingSettings = await prisma.companySettings.findFirst();
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        companyName: "Smart Inventory Management System",
        email: "admin@sims.io",
        currency: "USD",
        currencySymbol: "$",
        currencyCode: "USD",
        taxRate: 10,
        taxName: "VAT",
        fiscalYearStart: "01-01",
      },
    });
  }

  const categories = await Promise.all(
    ["Electronics", "Clothing", "Food & Beverage", "Office Supplies"].map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} category` },
      })
    )
  );

  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      name: "Global Supplies Co.",
      email: "orders@globalsupplies.com",
      phone: "+1-555-0100",
      contactPerson: "John Supplier",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-DEMO-001" },
    update: {},
    create: {
      name: "Wireless Mouse",
      sku: "SKU-DEMO-001",
      barcode: "1234567890123",
      description: "Ergonomic wireless mouse",
      price: 15,
      sellingPrice: 29.99,
      stockQuantity: 50,
      lowStockThreshold: 10,
      categoryId: categories[0].id,
      supplierId: supplier.id,
    },
  });

  console.log("Seed completed.");
  console.log("Super Admin: admin@sims.io / admin123");
  console.log("Sales Manager: sales@sims.io / sales123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

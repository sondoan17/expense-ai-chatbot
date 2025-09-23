-- Update existing category names to include Vietnamese accents
UPDATE "public"."Category" SET "name" = 'Ăn uống'
WHERE "name" = 'An uong' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Ăn uống'
);

UPDATE "public"."Category" SET "name" = 'Di chuyển'
WHERE "name" = 'Di chuyen' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Di chuyển'
);

UPDATE "public"."Category" SET "name" = 'Nhà ở'
WHERE "name" = 'Nha o' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Nhà ở'
);

UPDATE "public"."Category" SET "name" = 'Mua sắm'
WHERE "name" = 'Mua sam' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Mua sắm'
);

UPDATE "public"."Category" SET "name" = 'Giải trí'
WHERE "name" = 'Giai tri' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Giải trí'
);

UPDATE "public"."Category" SET "name" = 'Sức khỏe'
WHERE "name" = 'Suc khoe' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Sức khỏe'
);

UPDATE "public"."Category" SET "name" = 'Giáo dục'
WHERE "name" = 'Giao duc' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Giáo dục'
);

UPDATE "public"."Category" SET "name" = 'Hóa đơn'
WHERE "name" = 'Hoa don' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Hóa đơn'
);

UPDATE "public"."Category" SET "name" = 'Thu nhập'
WHERE "name" = 'Thu nhap' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Thu nhập'
);

UPDATE "public"."Category" SET "name" = 'Khác'
WHERE "name" = 'Khac' AND NOT EXISTS (
  SELECT 1 FROM "public"."Category" c WHERE c."name" = 'Khác'
);

// Define categories directly to avoid build issues
export const CANONICAL_CATEGORIES = [
  'Ăn uống',
  'Di chuyển',
  'Nhà ở',
  'Mua sắm',
  'Giải trí',
  'Sức khỏe',
  'Giáo dục',
  'Hóa đơn',
  'Thu nhập',
  'Khác',
] as const;

export function getCategoryOptions() {
  return CANONICAL_CATEGORIES.map((category) => ({
    value: category,
    label: category,
  }));
}

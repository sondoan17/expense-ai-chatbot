import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCategoryName } from '@expense-ai/shared';

@Injectable()
export class CategoryResolverService {
  private readonly logger = new Logger(CategoryResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  resolveCategory(input: string): string | null {
    // Cải thiện nhận diện category với nhiều cú pháp hơn
    const normalized = input.toLowerCase().trim();

    // Mapping các từ khóa phổ biến
    const categoryMappings: Record<string, string> = {
      // Di chuyển
      'di chuyển': 'Di chuyển',
      'di chuyen': 'Di chuyển',
      transport: 'Di chuyển',
      grab: 'Di chuyển',
      taxi: 'Di chuyển',
      xe: 'Di chuyển',
      xăng: 'Di chuyển',
      'đi lại': 'Di chuyển',
      'di lai': 'Di chuyển',

      // Ăn uống
      'ăn uống': 'Ăn uống',
      'an uong': 'Ăn uống',
      food: 'Ăn uống',
      ăn: 'Ăn uống',
      an: 'Ăn uống',
      cafe: 'Ăn uống',
      'cà phê': 'Ăn uống',
      'ca phe': 'Ăn uống',
      coffee: 'Ăn uống',
      restaurant: 'Ăn uống',
      'nhà hàng': 'Ăn uống',
      'nha hang': 'Ăn uống',

      // Nhà ở
      'nhà ở': 'Nhà ở',
      'nha o': 'Nhà ở',
      housing: 'Nhà ở',
      rent: 'Nhà ở',
      'thuê nhà': 'Nhà ở',
      'thue nha': 'Nhà ở',
      'tiền nhà': 'Nhà ở',
      'tien nha': 'Nhà ở',
      phòng: 'Nhà ở',
      phong: 'Nhà ở',

      // Mua sắm
      'mua sắm': 'Mua sắm',
      'mua sam': 'Mua sắm',
      shopping: 'Mua sắm',
      'quần áo': 'Mua sắm',
      'quan ao': 'Mua sắm',
      clothes: 'Mua sắm',
      giày: 'Mua sắm',
      giay: 'Mua sắm',
      shoes: 'Mua sắm',

      // Giải trí
      'giải trí': 'Giải trí',
      'giai tri': 'Giải trí',
      entertainment: 'Giải trí',
      'xem phim': 'Giải trí',
      movie: 'Giải trí',
      game: 'Giải trí',
      nhạc: 'Giải trí',
      nhac: 'Giải trí',
      music: 'Giải trí',

      // Sức khỏe
      'sức khỏe': 'Sức khỏe',
      'suc khoe': 'Sức khỏe',
      health: 'Sức khỏe',
      medical: 'Sức khỏe',
      'bệnh viện': 'Sức khỏe',
      'benh vien': 'Sức khỏe',
      hospital: 'Sức khỏe',
      khám: 'Sức khỏe',
      kham: 'Sức khỏe',
      doctor: 'Sức khỏe',
      thuốc: 'Sức khỏe',
      thuoc: 'Sức khỏe',
      medicine: 'Sức khỏe',

      // Giáo dục
      'giáo dục': 'Giáo dục',
      'giao duc': 'Giáo dục',
      education: 'Giáo dục',
      'học tập': 'Giáo dục',
      'hoc tap': 'Giáo dục',
      'học phí': 'Giáo dục',
      'hoc phi': 'Giáo dục',
      tuition: 'Giáo dục',
      'khóa học': 'Giáo dục',
      'khoa hoc': 'Giáo dục',
      course: 'Giáo dục',
      sách: 'Giáo dục',
      sach: 'Giáo dục',
      book: 'Giáo dục',
      study: 'Giáo dục',
      learning: 'Giáo dục',

      // Hóa đơn
      'hóa đơn': 'Hóa đơn',
      'hoa don': 'Hóa đơn',
      bills: 'Hóa đơn',
      điện: 'Hóa đơn',
      dien: 'Hóa đơn',
      electricity: 'Hóa đơn',
      nước: 'Hóa đơn',
      nuoc: 'Hóa đơn',
      water: 'Hóa đơn',
      internet: 'Hóa đơn',
      wifi: 'Hóa đơn',
      phone: 'Hóa đơn',
      'điện thoại': 'Hóa đơn',
      'dien thoai': 'Hóa đơn',

      // Thu nhập
      'thu nhập': 'Thu nhập',
      'thu nhap': 'Thu nhập',
      income: 'Thu nhập',
      lương: 'Thu nhập',
      luong: 'Thu nhập',
      salary: 'Thu nhập',
      thưởng: 'Thu nhập',
      thuong: 'Thu nhập',
      bonus: 'Thu nhập',
      lãi: 'Thu nhập',
      lai: 'Thu nhập',
      profit: 'Thu nhập',

      // Khác
      khác: 'Khác',
      khac: 'Khác',
      other: 'Khác',
      misc: 'Khác',
      miscellaneous: 'Khác',
    };

    // Kiểm tra mapping trực tiếp
    if (categoryMappings[normalized]) {
      return categoryMappings[normalized];
    }

    // Fallback về logic cũ từ shared package
    return resolveCategoryName(input);
  }

  async findCategoryByName(name: string) {
    return this.prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }
}

// Zalo Bot Platform Constants

export const ZALO_API_BASE = 'https://bot-api.zaloplatforms.com';
export const ZALO_SECRET_HEADER = 'x-bot-api-secret-token';
export const ZALO_MAX_MESSAGE_LENGTH = 2000;

/**
 * Special commands handled by the bot
 */
export const ZALO_COMMANDS = {
  LINK: ['lienket', 'link'],
  UNLINK: ['huyket', 'unlink'],
  HELP: ['huongdan', 'help', 'trogiup', 'menu'],
} as const;

/**
 * Bot response messages in Vietnamese and English
 */
export const ZALO_MESSAGES = {
  vi: {
    NOT_LINKED: `Bạn chưa liên kết tài khoản.

Để bắt đầu, gửi tin nhắn theo mẫu:
lienket email@example.com

(Thay email bằng email bạn đã đăng ký trên web app)`,

    LINK_SUCCESS: `Liên kết thành công!

Bây giờ bạn có thể nhập thu chi trực tiếp qua Zalo. Ví dụ:
- "chi 50k cafe"
- "thu 5tr lương"
- "tổng chi tháng này"

Gửi "huongdan" để xem thêm.`,

    LINK_EMAIL_NOT_FOUND: `Email này không tồn tại trong hệ thống.

Vui lòng:
1. Kiểm tra lại email đã nhập
2. Hoặc đăng ký tài khoản tại web app trước`,

    LINK_ALREADY: `Tài khoản Zalo này đã được liên kết.

Bạn có thể bắt đầu nhập thu chi ngay. Ví dụ:
- "chi 50k cafe"
- "thu 5tr lương"`,

    UNLINK_SUCCESS: `Đã hủy liên kết tài khoản thành công.

Nếu muốn liên kết lại, gửi:
lienket email@example.com`,

    UNLINK_NOT_FOUND: `Tài khoản chưa được liên kết.

Để liên kết, gửi:
lienket email@example.com`,

    HELP: `Hướng dẫn sử dụng Mimi Bot

NHẬP CHI TIÊU:
• chi 50k cafe
• chi 200k đi chợ
• chi 1tr5 mua quần áo

NHẬP THU NHẬP:
• thu 10tr lương
• thu 500k bán hàng

XEM THỐNG KÊ:
• tổng chi tháng này
• tổng thu tuần này
• chi tiêu tháng trước

XEM GIAO DỊCH:
• 5 giao dịch gần đây
• lịch sử chi tiêu

NGÂN SÁCH:
• đặt ngân sách 5tr tháng 1
• ngân sách còn lại

LIÊN KẾT TÀI KHOẢN:
• lienket email@example.com
• huyket (hủy liên kết)

Truy cập web app để xem báo cáo chi tiết:
https://mimichatbot.fun/`,

    UNSUPPORTED_MESSAGE: `Xin lỗi, Mimi hiện chỉ hỗ trợ tin nhắn văn bản.

Vui lòng gửi tin nhắn dạng chữ để nhập thu chi.`,

    ERROR: `Có lỗi xảy ra khi xử lý yêu cầu của bạn.

Vui lòng thử lại sau hoặc liên hệ hỗ trợ.`,
  },

  en: {
    NOT_LINKED: `Account not linked.

To start, send a message like:
link email@example.com

(Replace with your registered email)`,

    LINK_SUCCESS: `Linked successfully!

You can now track expenses via Zalo. Examples:
- "spent 50k coffee"
- "income 5m salary"
- "total spending this month"

Send "help" for more commands.`,

    LINK_EMAIL_NOT_FOUND: `This email doesn't exist in our system.

Please:
1. Check the email you entered
2. Or register on the web app first`,

    LINK_ALREADY: `This Zalo account is already linked.

You can start tracking expenses now. Examples:
- "spent 50k coffee"
- "income 5m salary"`,

    UNLINK_SUCCESS: `Account unlinked successfully.

To link again, send:
link email@example.com`,

    UNLINK_NOT_FOUND: `Account not linked.

To link, send:
link email@example.com`,

    HELP: `Mimi Bot Guide

ADD TRANSACTIONS:
- "spent 50k coffee"
- "spent 200k groceries"
- "income 10m salary jan"
- "income 500k sales"

VIEW STATS:
- "total spending this month"
- "total spending this week"
- "total income this month"
- "expenses last month"

VIEW TRANSACTIONS:
- "5 recent transactions"
- "expense history"

BUDGET:
- "set budget 5m for january"
- "budget remaining"

LINKING:
- "link email@example.com"
- "unlink" - remove link`,

    UNSUPPORTED_MESSAGE: `Sorry, Mimi currently only supports text messages.

Please send a text message to track expenses.`,

    ERROR: `An error occurred while processing your request.

Please try again later or contact support.`,
  },
} as const;

export type ZaloLanguage = keyof typeof ZALO_MESSAGES;

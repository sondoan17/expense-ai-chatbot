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
    NOT_LINKED: `Ban chua lien ket tai khoan.

De bat dau, gui tin nhan theo mau:
lienket email@example.com

(Thay email bang email ban da dang ky tren web app)`,

    LINK_SUCCESS: `Lien ket thanh cong!

Bay gio ban co the nhap thu chi truc tiep qua Zalo. Vi du:
- "chi 50k cafe"
- "thu 5tr luong"
- "tong chi thang nay"

Gui "huongdan" de xem them.`,

    LINK_EMAIL_NOT_FOUND: `Email nay khong ton tai trong he thong.

Vui long:
1. Kiem tra lai email da nhap
2. Hoac dang ky tai khoan tai web app truoc`,

    LINK_ALREADY: `Tai khoan Zalo nay da duoc lien ket.

Ban co the bat dau nhap thu chi ngay. Vi du:
- "chi 50k cafe"
- "thu 5tr luong"`,

    UNLINK_SUCCESS: `Da huy lien ket tai khoan thanh cong.

Neu muon lien ket lai, gui:
lienket email@example.com`,

    UNLINK_NOT_FOUND: `Tai khoan chua duoc lien ket.

De lien ket, gui:
lienket email@example.com`,

    HELP: `Huong dan su dung Mimi Bot

NHAP THU CHI:
- "chi 50k cafe"
- "chi 200k di cho"
- "thu 10tr luong thang 1"
- "thu 500k ban hang"

XEM THONG KE:
- "tong chi thang nay"
- "tong chi tuan nay"
- "tong thu thang nay"
- "chi tieu thang truoc"

XEM GIAO DICH:
- "5 giao dich gan day"
- "lich su chi tieu"

NGAN SACH:
- "dat ngan sach 5tr thang 1"
- "ngan sach con lai"

LIEN KET:
- "lienket email@example.com"
- "huyket" - huy lien ket`,

    UNSUPPORTED_MESSAGE: `Xin loi, Mimi hien chi ho tro tin nhan van ban.

Vui long gui tin nhan dang chu de nhap thu chi.`,

    ERROR: `Co loi xay ra khi xu ly yeu cau cua ban.

Vui long thu lai sau hoac lien he ho tro.`,
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

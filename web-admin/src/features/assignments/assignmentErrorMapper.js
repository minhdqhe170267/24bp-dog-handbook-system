import { normalizeApiError } from '../../services/apiError';

const normalizeMessage = (value) => String(value || '').trim();

const contains = (message, pattern) => pattern.test(message);

const FALLBACK_TITLE_BY_ACTION = {
  create: 'Khong the tao phan cong',
  update: 'Khong the cap nhat phan cong',
  save: 'Khong the luu phan cong',
  unassign: 'Khong the huy phan cong',
  fetch: 'Khong the tai du lieu phan cong',
};

const resolveServerMessage = (normalized) =>
  normalizeMessage(
    normalized?.raw?.message ||
    normalized?.raw?.data?.message ||
    normalized?.message ||
    ''
  );

export const mapAssignmentErrorToToast = (error, action = 'save') => {
  const normalized = normalizeApiError(error);
  const serverMessage = resolveServerMessage(normalized);

  if (normalized?.status === 403 || normalized?.errorCode === 'ACCESS_DENIED') {
    return {
      title: 'Ban khong co quyen thao tac',
      description: 'Tai khoan hien tai khong co quyen thuc hien thao tac phan cong cho.',
    };
  }

  if (
    normalized?.status === 404 ||
    contains(serverMessage, /khong tim thay.*phan cong|khÃ´ng tÃ¬m tháº¥y.*phÃ¢n cÃ´ng|assignmentid/i)
  ) {
    return {
      title: 'Khong tim thay phan cong',
      description: 'Ban ghi phan cong khong con ton tai hoac da bi thay doi.',
    };
  }

  if (contains(serverMessage, /ngay bat dau.*khong duoc de trong|ngÃ y báº¯t Ä‘áº§u khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng/i)) {
    return {
      title: 'Thieu ngay bat dau',
      description: 'Vui long chon ngay bat dau cho phan cong.',
    };
  }

  if (contains(serverMessage, /ngay ket thuc.*truoc ngay bat dau|ngÃ y káº¿t thÃºc khÃ´ng Ä‘Æ°á»£c trÆ°á»›c ngÃ y báº¯t Ä‘áº§u/i)) {
    return {
      title: 'Khoang thoi gian khong hop le',
      description: 'Ngay ket thuc phai sau hoac bang ngay bat dau.',
    };
  }

  if (contains(serverMessage, /vai tro trainer|vai trÃ² trainer|must have role trainer|role trainer/i)) {
    return {
      title: 'Sai vai tro nguoi nhan phan cong',
      description: 'Chi co the phan cong cho nguoi dung co vai tro Huan luyen vien.',
    };
  }

  if (
    contains(serverMessage, /huan luyen vien phai co chuyen nganh|huáº¥n luyá»‡n viÃªn pháº£i cÃ³ chuyÃªn ngÃ nh/i) ||
    contains(serverMessage, /trainer.*specialty|specialty.*before/i)
  ) {
    return {
      title: 'Huan luyen vien chua co chuyen nganh',
      description: 'Can gan chuyen nganh huan luyen cho huan luyen vien truoc khi phan cong cho.',
    };
  }

  if (
    contains(serverMessage, /cho dang co ke hoach huan luyen active o chuyen nganh khac|chÃ³ Ä‘ang cÃ³ káº¿ hoáº¡ch huáº¥n luyá»‡n active á»Ÿ chuyÃªn ngÃ nh khÃ¡c/i) ||
    contains(serverMessage, /active.*specialty.*different|different specialty/i)
  ) {
    return {
      title: 'Cho dang hoc chuyen nganh khac',
      description: 'Cho nay dang co ke hoach huan luyen active o chuyen nganh khac. Can ket thuc ke hoach cu truoc khi phan cong moi.',
    };
  }

  if (contains(serverMessage, /da co phan cong trung thoi gian|Ä‘Ã£ cÃ³ phÃ¢n cÃ´ng trÃ¹ng thá»i gian/i)) {
    return {
      title: 'Trung lich phan cong',
      description: 'Cap cho va huan luyen vien nay da co phan cong trong cung khoang thoi gian.',
    };
  }

  if (contains(serverMessage, /cho nay da co huan luyen vien chinh|chÃ³ nÃ y Ä‘Ã£ cÃ³ huáº¥n luyá»‡n viÃªn chÃ­nh/i)) {
    return {
      title: 'Cho da co phan cong chinh',
      description: 'Cho nay da co huan luyen vien chinh trong khoang thoi gian da chon.',
    };
  }

  if (contains(serverMessage, /huan luyen vien nay da co cho phu trach chinh|huáº¥n luyá»‡n viÃªn nÃ y Ä‘Ã£ cÃ³ chÃ³ phá»¥ trÃ¡ch chÃ­nh/i)) {
    return {
      title: 'Huan luyen vien da du phan cong chinh',
      description: 'Huan luyen vien nay da phu trach chinh mot cho khac trong khoang thoi gian da chon.',
    };
  }

  if (contains(serverMessage, /specialty does not have any roadmap|chuyen nganh.*khong.*lo trinh|chuyÃªn ngÃ nh.*khÃ´ng.*lá»™ trÃ¬nh/i)) {
    return {
      title: 'Chuyen nganh chua co lo trinh',
      description: 'Chuyen nganh cua huan luyen vien chua co lo trinh nao, nen backend khong the tu khoi tao chuong trinh huan luyen cho cho.',
    };
  }

  if (contains(serverMessage, /roadmap does not have any phase|lo trinh.*khong.*giai doan|lá»™ trÃ¬nh.*khÃ´ng.*giai Ä‘oáº¡n/i)) {
    return {
      title: 'Lo trinh chua co giai doan',
      description: 'Co lo trinh trong chuyen nganh nhung lo trinh do chua co giai doan, nen chua the phan cong cho.',
    };
  }

  if (contains(serverMessage, /phase does not have any exercise|giai doan.*khong.*bai tap|giai Ä‘oáº¡n.*khÃ´ng.*bÃ i táº­p/i)) {
    return {
      title: 'Giai doan chua co bai tap',
      description: 'Co giai doan trong lo trinh nhung giai doan do chua gan bai tap, nen backend khong the tao tien do huan luyen.',
    };
  }

  if (contains(serverMessage, /cho nay da co nguoi cham soc tam|chÃ³ nÃ y Ä‘Ã£ cÃ³ ngÆ°á»i chÄƒm sÃ³c táº¡m/i)) {
    return {
      title: 'Da co phan cong tam thoi',
      description: 'Cho nay da co nguoi cham soc tam trong khoang thoi gian da chon.',
    };
  }

  if (contains(serverMessage, /care_only.*phai gan|phÃ¢n cÃ´ng care_only pháº£i gáº¯n/i)) {
    return {
      title: 'Thieu phan cong chinh lien ket',
      description:
        'Phan cong tam thoi yeu cau cho dang co mot phan cong chinh hieu luc trong cung khoang thoi gian.',
    };
  }

  if (contains(serverMessage, /du lieu phan cong primary.*chong cheo|dá»¯ liá»‡u phÃ¢n cÃ´ng primary.*chá»“ng chÃ©o/i)) {
    return {
      title: 'Du lieu phan cong chinh bi chong cheo',
      description:
        'Cho dang co nhieu phan cong chinh chong thoi gian. Vui long kiem tra lai du lieu phan cong hien co.',
    };
  }

  if (
    contains(serverMessage, /khong the doi loai\/pham vi.*care_only dang bao phu/i) ||
    contains(serverMessage, /lam mat hieu luc cac phan cong care_only/i) ||
    contains(serverMessage, /khÃ´ng thá»ƒ Ä‘á»•i loáº¡i\/pháº¡m vi.*care_only Ä‘ang bao phá»§/i) ||
    contains(serverMessage, /lÃ m máº¥t hiá»‡u lá»±c cÃ¡c phÃ¢n cÃ´ng care_only/i)
  ) {
    return {
      title: 'Khong the cap nhat phan cong chinh',
      description:
        'Phan cong chinh nay dang duoc cac phan cong tam thoi phu thuoc, can xu ly cac phan cong do truoc.',
    };
  }

  if (contains(serverMessage, /khong hop le.*primary|pham vi phan cong khong hop le|loai phan cong khong hop le|khÃ´ng há»£p lá»‡.*primary|pháº¡m vi phÃ¢n cÃ´ng khÃ´ng há»£p lá»‡|loáº¡i phÃ¢n cÃ´ng khÃ´ng há»£p lá»‡/i)) {
    return {
      title: 'Loai phan cong khong hop le',
      description: 'Loai phan cong hoac pham vi phan cong khong hop le voi du lieu hien tai.',
    };
  }

  return {
    title: FALLBACK_TITLE_BY_ACTION[action] || FALLBACK_TITLE_BY_ACTION.save,
    description:
      normalizeMessage(serverMessage) ||
      normalizeMessage(normalized?.message) ||
      'Khong the xu ly phan cong cho. Vui long thu lai.',
  };
};

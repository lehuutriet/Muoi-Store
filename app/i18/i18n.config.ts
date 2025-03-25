import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nConfig } from '@ui-kitten/components';

// Import trực tiếp từ file JSON
import viTranslation from "./translations/vi.json";
import enTranslation from "./translations/en.json";

// Các tài nguyên ngôn ngữ
const resources = {
  en: {
    translation: enTranslation,
  },
  vi: {
    translation: viTranslation,
  },
};

// Hàm để lấy ngôn ngữ từ storage
const getUserLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem('userLanguage');
    return storedLanguage || 'vi'; // Mặc định tiếng Việt
  } catch (error) {
    console.error('Error reading language from storage:', error);
    return 'vi';
  }
};

// Khởi tạo với ngôn ngữ mặc định, sau đó sẽ cập nhật
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
});

// Cập nhật ngôn ngữ từ storage
getUserLanguage().then(language => {
  i18n.changeLanguage(language);
});

// Hàm để thay đổi ngôn ngữ và lưu vào storage
export const changeLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem('userLanguage', language);
    i18n.changeLanguage(language);
    return true;
  } catch (error) {
    console.error('Error saving language:', error);
    return false;
  }
};

const i18nCalendar: I18nConfig = {
  dayNames: {
    short: ["T2", "T3", "T4", "T5", "T6", "T7", "СN"],
    long: [
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
      "Chủ Nhật",
    ],
  },
  monthNames: {
    short: [
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
      "T8",
      "T9",
      "T10",
      "T11",
      "T12",
    ],
    long: [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ],
  },
};

// Thêm hàm trợ giúp để lấy i18nCalendar cho tiếng Anh
export const getI18nCalendar = (language: string): I18nConfig => {
  if (language === 'en') {
    return {
      dayNames: {
        short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        long: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
      monthNames: {
        short: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        long: [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ],
      },
    };
  }
  return i18nCalendar; // Mặc định tiếng Việt
};

export default i18n;
export { i18nCalendar };
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en, vi } from "./translations";
import { I18nConfig } from '@ui-kitten/components';

//empty for now
const resources = {
	en: {
		translation: en,
	},
	vi: {
		translation: vi,
	},
};

i18n.use(initReactI18next).init({
	compatibilityJSON: 'v4',
	resources,
	//language to use if translations in user language are not available
	fallbackLng: "vi",
	interpolation: {
		escapeValue: false, // not needed for react!!
	},
});

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

export default i18n;
export { i18nCalendar };
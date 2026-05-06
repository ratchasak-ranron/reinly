export const siteConfig = {
  name: 'reinly',
  tagline: 'Clinic software, distilled.',
  hostname: 'https://getreinly.com',
  locales: ['en', 'th'] as const,
  defaultLocale: 'en' as const,
  description: {
    en: 'Clinic software, distilled — patient records, courses, billing, multi-branch reports. Fair price, no contracts.',
    th: 'ซอฟต์แวร์คลินิกที่กลั่นกรองมาเฉพาะที่จำเป็น — บันทึกคนไข้ คอร์ส ใบเสร็จ รายงานหลายสาขา ราคายุติธรรม ไม่มีสัญญา',
  },
} as const;

export type Locale = (typeof siteConfig.locales)[number];

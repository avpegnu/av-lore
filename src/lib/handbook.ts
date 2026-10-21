import { handbookSchema, type HandbookLesson, type LocalizedText } from './handbook-schema';
export { handbookSchema, architectureSchema } from './handbook-schema';
export type { HandbookLesson, LocalizedText, Architecture } from './handbook-schema';
import handbookCatalog from './handbook-catalog.json';
const lessonOrder = handbookCatalog.map(l=>l.id);
export const handbookLessons = Object.values(
  import.meta.glob('../content/handbook/*.json', { eager: true, import: 'default' }),
).map((value) => handbookSchema.parse(value)).sort((a,b)=>lessonOrder.indexOf(a.id)-lessonOrder.indexOf(b.id));
export function handbookPath(lesson: Pick<HandbookLesson, 'group' | 'id'>) {
  if (lesson.group === 'case') return `/handbook/system-design/${lesson.id}/`;
  if (lesson.group === 'episode') return `/episodes/${lesson.id}/`;
  if (lesson.group === 'ai') return `/ai-systems/${lesson.id}/`;
  return `/system-design/${lesson.id}/`;
}
export const handbookGroups: Record<HandbookLesson['group'], LocalizedText> = {
  foundation: { vi: 'Nền tảng System Design', en: 'System Design Foundations' },
  building: { vi: 'Các thành phần hệ thống', en: 'System Building Blocks' },
  case: { vi: 'Case Studies', en: 'Case Studies' },
  episode: { vi: 'Xây dựng ứng dụng', en: 'Build Stories' },
  ai: { vi: 'AI Systems', en: 'AI Systems' },
  practice: { vi: 'Thực hành thiết kế', en: 'Design Practice' },
  interview: { vi: 'Luyện phỏng vấn', en: 'Interview Practice' },
};

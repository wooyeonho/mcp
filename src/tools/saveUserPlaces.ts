import { z } from "zod";
import { saveProfile } from "../storage/profileStore.js";
export const saveUserPlacesSchema = { home: z.string().optional(), work: z.string().optional(), aliases: z.array(z.object({ name: z.string(), address: z.string() })).optional() };
export async function saveUserPlaces(input: z.infer<z.ZodObject<typeof saveUserPlacesSchema>>, userId: string) {
  saveProfile({ home: input.home, work: input.work, aliases: input.aliases }, userId);
  return "저장했습니다.\n앞으로는 '출근', '퇴근', '퇴근 낭만', '회사에서 홍대입구 빨리'처럼 물어보면 됩니다.";
}

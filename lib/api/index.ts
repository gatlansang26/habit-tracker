import type { HabitsApi } from "@/contract";
import { fakeApi } from "./fake";

// Task 6 swaps this one line for a real HTTP implementation.
export const api: HabitsApi = fakeApi;

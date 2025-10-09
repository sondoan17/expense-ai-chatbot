import { create, StateCreator } from 'zustand';
import type { UserDto } from '../api/types';

type UserState = {
  user: UserDto | null;
  setUser: (user: UserDto | null) => void;
};

const createUserStore: StateCreator<UserState> = (set) => ({
  user: null,
  setUser: (user: UserDto | null) => set({ user }),
});

export const useUserStore = create<UserState>(createUserStore);

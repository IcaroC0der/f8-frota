import { defineStore } from "pinia";
import { ref } from "vue";
import { auth as authApi, type User } from "@/services/api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const authenticated = ref(authApi.isAuthenticated());

  async function login(email: string, password: string) {
    await authApi.login(email, password);
    authenticated.value = true;
    await loadMe();
  }

  async function loadMe() {
    if (!authApi.isAuthenticated()) return;
    try {
      user.value = await authApi.me();
    } catch {
      user.value = null;
    }
  }

  function logout() {
    authApi.logout();
    user.value = null;
    authenticated.value = false;
  }

  return { user, authenticated, login, loadMe, logout };
});

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authApi, type AuthUser, type MenuPermission } from "@/api/authApi";

const TOKEN_KEY = "finance_token";
const USER_KEY = "finance_user";

export const useAuthStore = defineStore("auth", () => {
  // ── State ────────────────────────────────────────────────────────────────
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AuthUser | null>(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || "null");
      } catch {
        return null;
      }
    })(),
  );

  // ── Getters ──────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.level === "ADMIN");
  const userName = computed(() => user.value?.nama || "");
  const userKode = computed(() => user.value?.kode || "");
  const userCabang = computed(() => user.value?.cabang || "");

  // ── Permission check ─────────────────────────────────────────────────────
  // Mirip ceKVIEW() di Delphi tapi lebih granular (view/insert/edit/delete/print)
  const can = (
    menuId: string,
    action: "view" | "insert" | "edit" | "delete" | "print" = "view",
  ): boolean => {
    if (isAdmin.value) return true;
    // Belum ada data menus → izinkan semua (fallback)
    if (!user.value?.menus?.length) return true;

    const menu = user.value.menus.find(
      (m) => String(m.menu_id) === String(menuId),
    );
    if (!menu) return false;
    const col = {
      view: "hak_view",
      insert: "hak_insert",
      edit: "hak_edit",
      delete: "hak_delete",
      print: "hak_print",
    }[action] as keyof MenuPermission;
    return menu[col] === "Y";
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    const result = await authApi.login({ username, password });
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // Refresh data user dari server (misalnya setelah update profil)
  const refreshUser = async () => {
    try {
      const fresh = await authApi.me();
      user.value = fresh;
      localStorage.setItem(USER_KEY, JSON.stringify(fresh));
    } catch {
      logout();
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    userName,
    userKode,
    userCabang,
    can,
    login,
    logout,
    refreshUser,
  };
});

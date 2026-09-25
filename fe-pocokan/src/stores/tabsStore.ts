// stores/tabsStore.ts
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { clearViewSession } from "@/utils/viewSession";

export interface TabItem {
  id: string;
  title: string;
  path: string;
  query?: Record<string, any>;
  icon?: any;
  closable: boolean;
  timestamp: number;
  onClose?: () => void;
}

export const useTabsStore = defineStore("tabs", () => {
  // ── State ────────────────────────────────────────────────────────────
  const tabs = ref<TabItem[]>([]);
  const activeTabId = ref("");
  const isReady = ref(false);

  // Hitungan buka per path. Bertambah SETIAP tab dibuka baru (setelah ditutup),
  // dipakai TabView sebagai bagian dari key KeepAlive supaya tab yang dibuka
  // ulang selalu di-render dari nol (state lama tidak ter-cache).
  // Sengaja TIDAK di-reset saat logout: jika di-reset, buka menu setelah
  // login ulang bisa memakai instance KeepAlive lama yang masih ter-cache.
  const openSessions = ref<Record<string, number>>({});

  // ── Getters ──────────────────────────────────────────────────────────
  const activeTab = computed(() =>
    tabs.value.find((t) => t.id === activeTabId.value),
  );

  // ── Actions ──────────────────────────────────────────────────────────
  // Di BSMCabang id tab = path (route edit pakai param, bukan query)
  const generateTabId = (path: string): string => path;

  const openTab = (tab: Omit<TabItem, "id" | "timestamp">) => {
    const id = generateTabId(tab.path);
    const existing = tabs.value.find((t) => t.id === id);

    if (existing) {
      activeTabId.value = existing.id;
      return;
    }

    openSessions.value[id] = (openSessions.value[id] ?? 0) + 1;

    tabs.value.push({
      ...tab,
      id,
      timestamp: Date.now(),
      closable: tab.closable ?? true,
    });
    activeTabId.value = id;

    // Batasi jumlah tab (max 10)
    if (tabs.value.length > 10) {
      const closableTabs = [...tabs.value]
        .filter((t) => t.closable)
        .sort((a, b) => a.timestamp - b.timestamp);
      if (closableTabs.length > 0) closeTab(closableTabs[0].id);
    }
  };

  // Saat tab ditutup, bersihkan state view (search/filter/periode) yang
  // tersimpan di sessionStorage agar buka menu lagi tampil seperti awal.
  const forgetTab = (tab: TabItem) => {
    clearViewSession(tab.path);
  };

  const closeTab = (tabId: string) => {
    const index = tabs.value.findIndex((t) => t.id === tabId);
    if (index === -1) return;
    const tab = tabs.value[index];
    if (!tab.closable) return;

    forgetTab(tab);
    tabs.value.splice(index, 1);

    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        const newActiveIndex = Math.min(index, tabs.value.length - 1);
        activeTabId.value = tabs.value[newActiveIndex].id;
      } else {
        activeTabId.value = "";
      }
    }
  };
  const closeActiveTab = () => {
    if (activeTabId.value) {
      const tab = tabs.value.find((t) => t.id === activeTabId.value);
      if (tab) {
        tab.closable = true; // Paksa izinkan tutup
        closeTab(tab.id);
      }
    }
  };
  const closeAllTabs = () => {
    tabs.value.filter((t) => t.closable).forEach(forgetTab);
    tabs.value = tabs.value.filter((t) => !t.closable);
    activeTabId.value = tabs.value.length > 0 ? tabs.value[0].id : "";
  };

  const closeOtherTabs = (tabId: string) => {
    const target = tabs.value.find((t) => t.id === tabId);
    if (!target) return;
    tabs.value
      .filter((t) => t.closable && t.id !== tabId)
      .forEach(forgetTab);
    tabs.value = tabs.value.filter((t) => !t.closable || t.id === tabId);
    activeTabId.value = tabId;
  };

  const closeTabsToRight = (tabId: string) => {
    const index = tabs.value.findIndex((t) => t.id === tabId);
    if (index === -1) return;
    tabs.value
      .slice(index + 1)
      .filter((t) => t.closable)
      .forEach((t) => closeTab(t.id));
  };

  const setActiveTab = (tabId: string) => {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (tab) activeTabId.value = tabId;
  };

  // Nomor "sesi buka" sebuah path; 0 berarti belum pernah dibuka.
  const getOpenSession = (path: string): number =>
    openSessions.value[generateTabId(path)] ?? 0;

  const initDefaultTabs = () => {
    tabs.value = [];
    activeTabId.value = "";
    openTab({ title: "Dashboard", path: "/", closable: false });
    isReady.value = true;
  };

  const resetTabs = () => {
    tabs.value = [];
    activeTabId.value = "";
    isReady.value = false;
  };

  return {
    tabs,
    activeTabId,
    isReady,
    activeTab,
    openTab,
    closeTab,
    closeAllTabs,
    closeActiveTab,
    closeOtherTabs,
    closeTabsToRight,
    setActiveTab,
    getOpenSession,
    initDefaultTabs,
    resetTabs,
  };
});

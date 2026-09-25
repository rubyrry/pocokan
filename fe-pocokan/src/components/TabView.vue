<template>
  <div class="tab-view">
    <router-view v-slot="{ Component, route }">
      <KeepAlive :max="10">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTabsStore } from "@/stores/tabsStore";

const tabsStore = useTabsStore();
const router = useRouter();
const route = useRoute();

// Saat tab aktif berubah (klik tab / tutup tab), ikuti route-nya
watch(
  () => tabsStore.activeTabId,
  (id) => {
    const tab = tabsStore.tabs.find((t) => t.id === id);
    if (!tab) return;

    const samePath = tab.path === route.path;
    const tabQueryStr = JSON.stringify(tab.query ?? {});
    const routeQueryStr = JSON.stringify(route.query ?? {});
    if (samePath && tabQueryStr === routeQueryStr) return;

    const target =
      tab.query && Object.keys(tab.query).length > 0
        ? { path: tab.path, query: tab.query }
        : tab.path;
    router.push(target).catch(() => {});
  },
  { immediate: true },
);
</script>

<style scoped>
.tab-view {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
</style>
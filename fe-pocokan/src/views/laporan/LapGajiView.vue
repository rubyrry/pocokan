<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { IconList, IconDownload } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import { unitApi, type Unit } from "@/api/master/unitApi";
import {
  lapGajiApi,
  type LapGajiItem,
} from "@/api/laporan/lapGajiApi";
import { exportToExcel } from "@/utils/exportExcel";

const toast = useToast();
const MENU_ID = "10"; // Sesuai tmenu Lap. Gaji

const getTodayFormatted = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

// Filter
const periode1 = ref(getTodayFormatted());
const periode2 = ref(getTodayFormatted());

const unitList = ref<Unit[]>([]);
const selectedUnit = ref("");

// Data laporan
const items = ref<LapGajiItem[]>([]);
const isLoading = ref(false);

// Saat halaman pertama kali dibuka
onMounted(async () => {
  try {
    unitList.value = await unitApi.getAll();

    if (unitList.value.length > 0) {
      selectedUnit.value = unitList.value[0].kode;
    }
  } catch (e) {
    toast.error("Gagal memuat daftar unit.");
  }
});

const headers = [
  { title: "No", key: "no", width: "55px", align: "center" as const },
  { title: "ID", key: "id", width: "80px", align: "center" as const },
  { title: "Nama", key: "nama", minWidth: "180px", align: "start" as const },
  { title: "Bagian", key: "bagian", width: "120px", align: "start" as const },
  { title: "Hari", key: "hari", width: "70px", align: "center" as const },
  { title: "Lembur <= 2", key: "lemburLE2", width: "110px", align: "center" as const },
  { title: "Lembur > 2", key: "lemburGT2", width: "110px", align: "center" as const },
  { title: "Kehadiran", key: "kehadiran", width: "120px", align: "end" as const },
  { title: "Lembur", key: "lembur", width: "120px", align: "end" as const },
  { title: "Potongan", key: "potongan", width: "120px", align: "end" as const },
  { title: "THP", key: "thp", width: "130px", align: "end" as const },
  { title: "Rekening", key: "rekening", width: "150px", align: "start" as const },
];

const totalKehadiran = computed(() =>
  items.value.reduce(
    (sum, row) => sum + Number(row.kehadiran || 0),
    0
  )
);

const totalLembur = computed(() =>
  items.value.reduce(
    (sum, row) => sum + Number(row.lembur || 0),
    0
  )
);

const totalPotongan = computed(() =>
  items.value.reduce(
    (sum, row) => sum + Number(row.potongan || 0),
    0
  )
);

const totalTHP = computed(() =>
  items.value.reduce(
    (sum, row) => sum + Number(row.thp || 0),
    0
  )
);

// Auto refresh saat filter berubah (pola browse)
const filterValues = computed(() => ({
  periode1: periode1.value,
  periode2: periode2.value,
  selectedUnit: selectedUnit.value,
}));

const summaryColumns = [
  { key: "kehadiran" },
  { key: "lembur" },
  { key: "potongan" },
  { key: "thp" },
];

// Saat filter dipicu refresh (pola BaseBrowse)
const loadData = async () => {
  if (!periode1.value || !periode2.value) return;
  if (!selectedUnit.value) return;

  isLoading.value = true;

  try {
    items.value = await lapGajiApi.getData(
      selectedUnit.value,
      periode1.value,
      periode2.value
    );
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ??
        "Gagal memuat laporan gaji."
    );
  } finally {
    isLoading.value = false;
  }
};

// Format nominal uang agar lebih enak dibaca
const formatNumber = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

const exportExcelData = () => {
  if (!items.value.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }

  exportToExcel({
    title: `Laporan Gaji ${periode1.value} s/d ${periode2.value}`,
    filenamePrefix: `laporan-gaji-${selectedUnit.value}-${periode1.value}-${periode2.value}`,

    columns: [
      { header: "No", key: "no", width: 8, align: "center" },
      { header: "ID", key: "id", width: 12, align: "center" },
      { header: "Nama", key: "nama", width: 30 },
      { header: "Bagian", key: "bagian", width: 20 },
      { header: "Hari", key: "hari", width: 10, align: "center" },
      {
        header: "Lembur <= 2",
        key: "lemburLE2",
        width: 15,
        align: "center",
      },
      {
        header: "Lembur > 2",
        key: "lemburGT2",
        width: 15,
        align: "center",
      },
      {
        header: "Kehadiran",
        key: "kehadiran",
        width: 18,
        align: "right",
      },
      {
        header: "Lembur",
        key: "lembur",
        width: 18,
        align: "right",
      },
      {
        header: "Potongan",
        key: "potongan",
        width: 18,
        align: "right",
      },
      {
        header: "THP",
        key: "thp",
        width: 18,
        align: "right",
      },
      {
        header: "Rekening",
        key: "rekening",
        width: 22,
      },
    ],

    rows: [
      ...items.value,
      {
        no: "",
        id: "",
        nama: "",
        bagian: "TOTAL",
        hari: "",
        lemburLE2: "",
        lemburGT2: "",
        kehadiran: totalKehadiran.value,
        lembur: totalLembur.value,
        potongan: totalPotongan.value,
        thp: totalTHP.value,
        rekening: "",
      },
    ],
  });
};
</script>

<template>
  <BaseBrowse
    title="Laporan Gaji"
    :menu-id="MENU_ID"
    :icon="IconList"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    item-value="no"
    :summary-columns="summaryColumns"
    :filter-values="filterValues"
    @refresh="loadData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Periode</span>
        <input v-model="periode1" type="date" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input v-model="periode2" type="date" class="date-inp" />
      </div>

      <div class="filter-group">
        <span class="filter-lbl">Unit</span>
        <select v-model="selectedUnit" class="select-inp">
          <option
            v-for="u in unitList"
            :key="u.kode"
            :value="u.kode"
          >
            {{ u.kode }} — {{ u.nama }}
          </option>
        </select>
      </div>
    </template>

    <!-- ── Export ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="tonal"
        color="success"
        @click="exportExcelData"
        :disabled="!items.length"
      >
        <IconDownload :size="16" class="mr-1" />
        Export
      </v-btn>
    </template>

    <!-- ── Custom cell angka ── -->
    <template #item.kehadiran="{ value }">
      <span class="num-cell">{{ formatNumber(value) }}</span>
    </template>

    <template #item.lembur="{ value }">
      <span class="num-cell">{{ formatNumber(value) }}</span>
    </template>

    <template #item.potongan="{ value }">
      <span class="num-cell">{{ formatNumber(value) }}</span>
    </template>

    <template #item.thp="{ value }">
      <span class="num-cell font-weight-medium">{{ formatNumber(value) }}</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.filter-sep {
  font-size: 12px;
  color: #9ca3af;
}
.date-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  width: 130px;
  background: #fff;
}
.date-inp:focus {
  border-color: #3B5998;
}
.select-inp {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  min-width: 220px;
  background: #fff;
  cursor: pointer;
}
.select-inp:focus {
  border-color: #3B5998;
}
.num-cell {
  font-variant-numeric: tabular-nums;
}
</style>
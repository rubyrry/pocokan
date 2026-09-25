<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { IconCalculator, IconDeviceFloppy, IconDownload } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import { unitApi, type Unit } from "@/api/master/unitApi";
import { prosesGajiApi, type ProsesGajiItem } from "@/api/transaksi/prosesGajiApi";
import { exportToExcel } from "@/utils/exportExcel";

const toast = useToast();
const MENU_ID = "10"; // Sesuai tmenu Gaji

const getTodayFormatted = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const periode1 = ref(getTodayFormatted());
const periode2 = ref(getTodayFormatted());
const unitList = ref<Unit[]>([]);
const selectedUnit = ref("");
const items = ref<ProsesGajiItem[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);

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
  { title: "Id", key: "id", width: "80px", align: "center" as const },
  { title: "Nama", key: "nama", minWidth: "180px", align: "start" as const },
  { title: "Unit", key: "unit", width: "80px", align: "center" as const },
  { title: "Bagian", key: "bagian", width: "120px", align: "start" as const },
  { title: "Kehadiran", key: "kehadiran", width: "120px", align: "center" as const },
  { title: "Lembur <= 2", key: "lemburLE2", width: "130px", align: "center" as const },
  { title: "Lembur > 2", key: "lemburGT2", width: "130px", align: "center" as const },
  { title: "Potongan", key: "potongan", width: "140px", align: "end" as const },
];

// Auto refresh saat filter berubah (pola browse)
const filterValues = computed(() => ({
  periode1: periode1.value,
  periode2: periode2.value,
  selectedUnit: selectedUnit.value,
}));

const loadData = async () => {
  if (!periode1.value || !periode2.value) return;
  if (!selectedUnit.value) return;

  isLoading.value = true;
  try {
    items.value = await prosesGajiApi.getData(selectedUnit.value, periode1.value, periode2.value);
    if (items.value.length === 0) {
      toast.info("Tidak ada data karyawan / absensi pada rentang periode ini.");
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal memuat data proses gaji.");
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (items.value.length === 0) {
    toast.warning("Tidak ada data untuk disimpan.");
    return;
  }

  isSaving.value = true;
  try {
    await prosesGajiApi.save({
      pabKode: selectedUnit.value,
      periode1: periode1.value,
      periode2: periode2.value,
      items: items.value,
    });
    toast.success("Proses gaji berhasil disimpan.");
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan proses gaji.");
  } finally {
    isSaving.value = false;
  }
};

const exportExcelData = () => {
  if (!items.value.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  exportToExcel({
    title: `Export Proses Gaji - ${periode1.value} s/d ${periode2.value}`,
    filenamePrefix: `proses-gaji-${selectedUnit.value}-${periode1.value}`,
    columns: [
      { header: "No", key: "no", width: 8, align: "center" },
      { header: "Id", key: "id", width: 12, align: "center" },
      { header: "Nama", key: "nama", width: 30 },
      { header: "Unit", key: "unit", width: 12, align: "center" },
      { header: "Bagian", key: "bagian", width: 20 },
      { header: "Kehadiran", key: "kehadiran", width: 12, align: "center" },
      { header: "Lembur <= 2", key: "lemburLE2", width: 14, align: "center" },
      { header: "Lembur > 2", key: "lemburGT2", width: 14, align: "center" },
      { header: "Potongan", key: "potongan", width: 18, align: "right" },
    ],
    rows: items.value,
  });
};
</script>

<template>
  <BaseBrowse
    title="Proses Gaji"
    :menu-id="MENU_ID"
    :icon="IconCalculator"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    item-value="no"
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

    <!-- ── Aksi: Export & Save ── -->
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

      <v-btn
        size="small"
        color="primary"
        variant="flat"
        @click="handleSave"
        :loading="isSaving"
        :disabled="!items.length"
      >
        <IconDeviceFloppy :size="16" class="mr-1" />
        Save
      </v-btn>
    </template>

    <!-- ── Tampilan kolom ── -->
    <template #item.kehadiran="{ item }">
      <span>{{ item.kehadiran }}</span>
    </template>

    <template #item.lemburLE2="{ item }">
      <span>{{ item.lemburLE2 }}</span>
    </template>

    <template #item.lemburGT2="{ item }">
      <span>{{ item.lemburGT2 }}</span>
    </template>

    <template #item.potongan="{ item }">
      <span class="editable-cell">
        <input
          v-model.number="item.potongan"
          type="number"
          class="table-inp"
          min="0"
          step="any"
          inputmode="decimal"
          aria-label="Potongan"
        />
      </span>
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
.editable-cell {
  display: inline-block;
  background: #fef08a;
  padding: 2px 4px;
  border-radius: 3px;
}
.table-inp {
  width: 110px;
  height: 26px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  text-align: center;
  font-size: 12px;
  outline: none;
  background: white;
}
.table-inp:focus {
  border-color: #3B5998;
  box-shadow: 0 0 0 1px #3B5998;
}
</style>
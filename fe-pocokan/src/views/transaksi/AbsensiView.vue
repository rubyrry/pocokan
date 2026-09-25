<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { IconClock, IconDeviceFloppy, IconDownload } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import { unitApi, type Unit } from "@/api/master/unitApi";
import { absensiApi, type AbsensiItem } from "@/api/transaksi/absensiApi";
import { exportToExcel } from "@/utils/exportExcel";

const toast = useToast();
const MENU_ID = "9"; // Sesuai tmenu Absensi

const getTodayFormatted = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const tanggal = ref(getTodayFormatted());
const unitList = ref<Unit[]>([]);
const selectedUnit = ref("");
const items = ref<AbsensiItem[]>([]);
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
  { title: "Jam Lembur", key: "jamlembur", width: "130px", align: "center" as const },
];

// Auto refresh saat filter berubah (pola browse)
const filterValues = computed(() => ({
  tanggal: tanggal.value,
  selectedUnit: selectedUnit.value,
}));

const loadData = async () => {
  if (!tanggal.value) return;
  if (!selectedUnit.value) return;

  isLoading.value = true;
  try {
    items.value = await absensiApi.getKaryawan(selectedUnit.value, tanggal.value);
    if (items.value.length === 0) {
      toast.info("Tidak ada karyawan aktif pada unit ini.");
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal memuat karyawan.");
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
    await absensiApi.save({
      pabKode: selectedUnit.value,
      tanggal: tanggal.value,
      items: items.value,
    });
    toast.success("Absensi berhasil disimpan.");
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan absensi.");
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
    title: `Export Data Absensi - ${tanggal.value}`,
    filenamePrefix: `absensi-${selectedUnit.value}-${tanggal.value}`,
    columns: [
      { header: "No", key: "no", width: 8, align: "center" },
      { header: "Id", key: "id", width: 12, align: "center" },
      { header: "Nama", key: "nama", width: 30 },
      { header: "Unit", key: "unit", width: 12, align: "center" },
      { header: "Bagian", key: "bagian", width: 20 },
      { header: "Kehadiran", key: "kehadiran", width: 12, align: "center" },
      { header: "Jam Lembur", key: "jamlembur", width: 12, align: "center" },
    ],
    rows: items.value,
  });
};
</script>

<template>
  <BaseBrowse
    title="Absensi Karyawan"
    :menu-id="MENU_ID"
    :icon="IconClock"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    item-value="no"
    :filter-values="filterValues"
    @refresh="loadData"
    search-placeholder="Cari ID, nama, bagian atau unit..."
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-lbl">Tanggal</span>
        <input v-model="tanggal" type="date" class="date-inp" />
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

    <!-- ── Sel yang bisa diedit ── -->
    <template #item.kehadiran="{ item }">
      <span class="editable-cell">
        <input
          type="number"
          v-model.number="item.kehadiran"
          class="table-inp"
          min="0"
          max="1"
          step="1"
        />
      </span>
    </template>

    <template #item.jamlembur="{ item }">
      <span class="editable-cell">
        <input
          type="number"
          v-model.number="item.jamlembur"
          class="table-inp"
          min="0"
          step="1"
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
  width: 140px;
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
  width: 60px;
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
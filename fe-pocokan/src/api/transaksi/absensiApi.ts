import api from "@/api/axios";

export interface AbsensiItem {
  no: number;
  id: string;
  nama: string;
  unit: string;
  bagian: string;
  kehadiran: number;
  jamlembur: number;
}

export const absensiApi = {
  getKaryawan: async (pabKode: string, tanggal: string): Promise<AbsensiItem[]> => {
    const { data } = await api.get(`/transaksi/absensi/karyawan?pabKode=${pabKode}&tanggal=${tanggal}`);
    return data.data;
  },
  save: async (payload: { pabKode: string; tanggal: string; items: AbsensiItem[] }) => {
    const { data } = await api.post("/transaksi/absensi/save", payload);
    return data;
  },
};

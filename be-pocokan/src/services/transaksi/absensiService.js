const db = require("../../config/database");

const getKaryawanByUnit = async (pabKode, tanggal) => {
  // Ambil karyawan aktif di unit (pabrik) tersebut dengan JOIN ke tbagian untuk mendapatkan nama bagian (bag_nama)
  const [karyawan] = await db.query(
    `SELECT 
       k.kar_kode AS id, 
       k.kar_nama AS nama, 
       k.kar_pab_kode AS unit, 
       COALESCE(b.bag_nama, k.kar_bag_kode, '-') AS bagian 
     FROM tkaryawan k
     LEFT JOIN tbagian b ON b.bag_kode = k.kar_bag_kode
     WHERE k.kar_pab_kode = ? AND k.kar_isaktif = 1 
     ORDER BY k.kar_kode`,
    [pabKode]
  );

  // Cek apakah sudah ada data absensi untuk tanggal & unit ini
  const [existing] = await db.query(
    `SELECT ab_kar_kode, ab_hari, ab_jamlembur 
     FROM tabsensi 
     WHERE ab_pab_kode = ? AND ab_tanggal = ?`,
    [pabKode, tanggal]
  );

  const mapExisting = {};
  existing.forEach(item => {
    mapExisting[item.ab_kar_kode] = {
      kehadiran: item.ab_hari,
      jamlembur: item.ab_jamlembur
    };
  });

  // Gabungkan ke list karyawan
  const result = karyawan.map((k, idx) => ({
    no: idx + 1,
    id: k.id,
    nama: k.nama,
    unit: k.unit,
    bagian: k.bagian,
    kehadiran: mapExisting[k.id] !== undefined ? mapExisting[k.id].kehadiran : 1, // Default 1
    jamlembur: mapExisting[k.id] !== undefined ? mapExisting[k.id].jamlembur : 0  // Default 0
  }));

  return result;
};

const saveAbsensi = async (payload) => {
  const { pabKode, tanggal, items } = payload;
  if (!pabKode || !tanggal) {
    throw new Error("Unit dan Tanggal wajib diisi.");
  }
  if (!items || !items.length) {
    throw new Error("Tidak ada data absensi untuk disimpan.");
  }

  // Hapus dulu data absensi lama pada tanggal & unit tersebut (agar bersih / update re-save)
  await db.query(
    `DELETE FROM tabsensi WHERE ab_pab_kode = ? AND ab_tanggal = ?`,
    [pabKode, tanggal]
  );

  // Insert ulang semua item
  for (const item of items) {
    const hari = Number(item.kehadiran) || 0;
    const jamlembur = Number(item.jamlembur) || 0;
    
    await db.query(
      `INSERT INTO tabsensi (ab_pab_kode, ab_tanggal, ab_kar_kode, ab_hari, ab_jamlembur) 
       VALUES (?, ?, ?, ?, ?)`,
      [pabKode, tanggal, item.id, hari, jamlembur]
    );
  }

  return { savedCount: items.length };
};

module.exports = { getKaryawanByUnit, saveAbsensi };

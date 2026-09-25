const db = require("../../config/database");

const getProsesGaji = async (pabKode, periode1, periode2) => {
  // Ambil karyawan aktif di unit tersebut beserta gapok
  const [karyawan] = await db.query(
    `SELECT 
       k.kar_kode AS id, 
       k.kar_nama AS nama, 
       k.kar_pab_kode AS unit, 
       COALESCE(b.bag_nama, k.kar_bag_kode, '-') AS bagian,
       COALESCE(k.kar_gapok, 0) AS gapok
     FROM tkaryawan k
     LEFT JOIN tbagian b ON b.bag_kode = k.kar_bag_kode
     WHERE k.kar_pab_kode = ? AND k.kar_isaktif = 1 
     ORDER BY k.kar_kode`,
    [pabKode]
  );

  // Ambil total kehadiran (SUM ab_hari) dan rincian lembur dalam rentang periode1 s/d periode2 dari tabsensi
  // Karena lembur perlu dipecah: <= 2 jam per hari dan > 2 jam per hari, 
  // kita ambil per baris absensi untuk dihitung di JS atau di SQL. 
  // Sesuai aturan: jika total lembur hari itu h, maka lembur <= 2 adalah LEAST(h, 2) dan lembur > 2 adalah GREATEST(0, h - 2).
  const [absensiRows] = await db.query(
    `SELECT 
       ab_kar_kode AS kar_kode,
       ab_hari,
       ab_jamlembur
     FROM tabsensi
     WHERE ab_pab_kode = ? AND ab_tanggal BETWEEN ? AND ?`,
    [pabKode, periode1, periode2]
  );

  const summaryMap = {};
  absensiRows.forEach(row => {
    if (!summaryMap[row.kar_kode]) {
      summaryMap[row.kar_kode] = { kehadiran: 0, lemburLE2: 0, lemburGT2: 0 };
    }
    summaryMap[row.kar_kode].kehadiran += Number(row.ab_hari) || 0;
    
    const hLembur = Number(row.ab_jamlembur) || 0;
    const lLE2 = Math.min(hLembur, 2);
    const lGT2 = Math.max(0, hLembur - 2);

    summaryMap[row.kar_kode].lemburLE2 += lLE2;
    summaryMap[row.kar_kode].lemburGT2 += lGT2;
  });

  // Ambil potongan yang sudah tersimpan pada periode dan unit yang sama.
  const [potonganRows] = await db.query(
    `SELECT
       gm_kar_nik AS kar_kode,
       COALESCE(gm_potongan, 0) AS potongan
     FROM tgajimingguan
     WHERE gm_pab_kode = ? AND gm_periode = ? AND gm_periode2 = ?`,
    [pabKode, periode1, periode2]
  );

  const potonganMap = Object.fromEntries(
    potonganRows.map((row) => [row.kar_kode, Number(row.potongan) || 0])
  );

  // Gabungkan
  const result = karyawan.map((k, idx) => {
    const s = summaryMap[k.id] || { kehadiran: 0, lemburLE2: 0, lemburGT2: 0 };
    return {
      no: idx + 1,
      id: k.id,
      nama: k.nama,
      unit: k.unit,
      bagian: k.bagian,
      gapok: k.gapok,
      kehadiran: s.kehadiran,
      lemburLE2: s.lemburLE2,
      lemburGT2: s.lemburGT2,
      potongan: potonganMap[k.id] ?? 0
    };
  });

  return result;
};

const saveProsesGaji = async (payload) => {
  const { pabKode, periode1, periode2, items } = payload;
  if (!pabKode || !periode1 || !periode2) {
    throw new Error("Unit dan Periode wajib diisi.");
  }
  if (!items || !items.length) {
    throw new Error("Tidak ada data untuk disimpan.");
  }

  const preparedItems = items.map((item) => {
    const potongan = item.potongan == null || item.potongan === ""
      ? 0
      : Number(item.potongan);

    if (!Number.isFinite(potongan) || potongan < 0) {
      throw new Error(`Potongan karyawan ${item.id} harus berupa angka nol atau lebih.`);
    }

    return { item, potongan };
  });

  // Hapus data lama pada rentang periode & unit tersebut di tgajimingguan
  await db.query(
    `DELETE FROM tgajimingguan WHERE gm_pab_kode = ? AND gm_periode = ? AND gm_periode2 = ?`,
    [pabKode, periode1, periode2]
  );

  // Insert ulang semua item ke tgajimingguan
  for (const { item, potongan } of preparedItems) {
    await db.query(
      `INSERT INTO tgajimingguan
       (gm_pab_kode, gm_periode, gm_periode2, gm_kar_nik, gm_gapok, gm_hari, gm_jamlembur, gm_jamlembur2, gm_potongan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pabKode,
        periode1,
        periode2,
        item.id,
        Number(item.gapok) || 0,
        Number(item.kehadiran) || 0,
        Number(item.lemburLE2) || 0,
        Number(item.lemburGT2) || 0,
        potongan
      ]
    );
  }

  return { savedCount: items.length };
};

module.exports = { getProsesGaji, saveProsesGaji };

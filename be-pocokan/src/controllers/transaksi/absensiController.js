const svc = require("../../services/transaksi/absensiService");

const getKaryawanByUnit = async (req, res) => {
  try {
    const { pabKode, tanggal } = req.query;
    if (!pabKode || !tanggal) {
      return res.status(400).json({ success: false, message: "Unit dan Tanggal wajib diisi." });
    }
    const data = await svc.getKaryawanByUnit(pabKode, tanggal);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const saveAbsensi = async (req, res) => {
  try {
    const result = await svc.saveAbsensi(req.body);
    res.json({ success: true, data: result, message: "Absensi berhasil disimpan." });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const tarikWajah = async (req, res) => {
  try {
    const { pabKode, tanggal } = req.body || {};
    const data = await svc.tarikWajah({ pabKode, tanggal });
    const processed = data.inserted + data.updated;
    const message = processed > 0
      ? `Tarik absensi berhasil. ${processed} karyawan ditandai hadir.`
      : "Tidak ada data absensi wajah untuk tanggal dan unit ini.";
    res.json({ success: true, data, message });
  } catch (e) {
    if (!e.statusCode) console.error("Gagal menarik absensi wajah:", e.code);
    res.status(e.statusCode || 500).json({
      success: false,
      message: e.statusCode ? e.message : "Gagal menarik absensi dari database. Sebagian data mungkin sudah diproses; silakan tarik ulang.",
      ...(e.summary ? { data: e.summary } : {}),
    });
  }
};

module.exports = { getKaryawanByUnit, saveAbsensi, tarikWajah };

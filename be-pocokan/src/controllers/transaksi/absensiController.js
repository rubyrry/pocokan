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

module.exports = { getKaryawanByUnit, saveAbsensi };

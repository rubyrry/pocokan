const db = require("../../config/database");

const getLapGaji = async (pabKode, periode1, periode2) => {
    const [rows] = await db.query(
        `
    SELECT
      ab_kar_kode AS id,
      kar_nama AS nama,
      bag_nama AS bagian,

      SUM(ab_hari) AS hari,

      SUM(
        IF(ab_jamlembur > 2, 2, ab_jamlembur)
      ) AS lemburLE2,

      SUM(
        IF(ab_jamlembur > 2, ab_jamlembur - 2, 0)
      ) AS lemburGT2,

      SUM(ab_hari) * kar_gapok AS kehadiran,

      SUM(
        IF(ab_jamlembur > 2, 2, ab_jamlembur)
      ) * (kar_gapok / 7) * 75 / 100 AS lemburLE2Nominal,

      SUM(
        IF(ab_jamlembur > 2, ab_jamlembur - 2, 0)
      ) * (kar_gapok / 7) AS lemburGT2Nominal,

      kar_rekening AS rekening

    FROM tabsensi

    INNER JOIN tkaryawan
      ON kar_kode = ab_kar_kode

    INNER JOIN tbagian
      ON bag_kode = kar_bag_kode

    WHERE ab_pab_kode = ?
      AND ab_tanggal BETWEEN ? AND ?

    GROUP BY
      ab_kar_kode,
      kar_kode,
      kar_nama,
      bag_nama,
      kar_gapok,
      kar_rekening

    ORDER BY ab_kar_kode
    `,
        [pabKode, periode1, periode2]
    );

    const [potonganRows] = await db.query(
        `
        SELECT
          gm_kar_nik AS id,
          COALESCE(gm_potongan, 0) AS potongan
        FROM tgajimingguan
        WHERE gm_pab_kode = ?
          AND gm_periode = ?
          AND gm_periode2 = ?
        `,
        [pabKode, periode1, periode2]
    );

    const potonganMap = Object.fromEntries(
        potonganRows.map((row) => [row.id, Number(row.potongan) || 0])
    );

    return rows.map((row, index) => {
        const kehadiran =
            Number(row.kehadiran) || 0;

        const lembur =
            (Number(row.lemburLE2Nominal) || 0) +
            (Number(row.lemburGT2Nominal) || 0);

        const potongan =
            potonganMap[row.id] || 0;

        const thp =
            kehadiran + lembur - potongan;

        return {
            no: index + 1,
            id: row.id,
            nama: row.nama,
            bagian: row.bagian,

            hari: Number(row.hari) || 0,

            lemburLE2:
                Number(row.lemburLE2) || 0,

            lemburGT2:
                Number(row.lemburGT2) || 0,

            kehadiran,
            lembur,
            potongan,
            thp,

            rekening: row.rekening || "",
        };
    });
};

module.exports = {
    getLapGaji,
};
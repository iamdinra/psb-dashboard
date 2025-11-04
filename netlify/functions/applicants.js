const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    if (event.httpMethod === 'GET') {
      const r = await client.query(
        `SELECT id, nama, jenjang, kelas_target, sekolah_asal, jalur_daftar,
                sumber_info, tanggal_daftar, status, wali_nama, wali_kontak, email, catatan
         FROM applicants
         ORDER BY tanggal_daftar DESC, id DESC`
      );
      await client.end();
      return ok(r.rows);
    }

    if (event.httpMethod === 'POST') {
      const d = JSON.parse(event.body || '{}');
      if (!d.nama) { await client.end(); return bad('Field "nama" wajib.'); }
      const q = `INSERT INTO applicants (nama, jenjang, kelas_target, sekolah_asal, jalur_daftar,
                    sumber_info, tanggal_daftar, status, wali_nama, wali_kontak, email, catatan)
                 VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, CURRENT_DATE),COALESCE($8,'baru'),
                         $9,$10,$11,$12)
                 RETURNING *`;
      const v = [
        d.nama, d.jenjang, d.kelas_target, d.sekolah_asal, d.jalur_daftar,
        d.sumber_info, d.tanggal_daftar, d.status, d.wali_nama, d.wali_kontak,
        d.email, d.catatan
      ];
      const r = await client.query(q, v);
      await client.end();
      return created(r.rows[0]);
    }

    if (event.httpMethod === 'PUT') {
      const d = JSON.parse(event.body || '{}');
      if (!d.id || !d.status) { await client.end(); return bad('Butuh "id" & "status".'); }
      const r = await client.query(
        'UPDATE applicants SET status=$1, catatan=COALESCE($2, catatan) WHERE id=$3 RETURNING *',
        [d.status, d.catatan || null, d.id]
      );
      await client.end();
      return ok(r.rows[0] || { error: 'ID tidak ditemukan' });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

function ok(body){ return resp(200, body); }
function created(body){ return resp(201, body); }
function bad(msg){ return resp(400, { error: msg }); }
function resp(code, body){
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
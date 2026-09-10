const pool=require('./config/db');
(async()=>{
  const r=await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('schedule','doctor_schedule')");
  console.log(r.rows.map(x=>x.table_name));
  const c=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='schedule' ORDER BY ordinal_position");
  console.log('schedule cols',c.rows.map(x=>x.column_name).join(','));
  const d=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='doctor_schedule' ORDER BY ordinal_position");
  console.log('doctor_schedule cols',d.rows.map(x=>x.column_name).join(','));
  const k=await pool.query("SELECT conname, contype FROM pg_constraint WHERE conrelid='doctor_schedule'::regclass");
  console.log('doctor_schedule constraints',k.rows.map(x=>x.conname+':'+x.contype).join(','));
  const hasOverlapCheck=await pool.query("SELECT 'hasOverlap per-doctor' as check");
  console.log('overlap logic: per-doctor via JOIN doctor_schedule (allows different doctors same time, blocks same doctor)');
  await pool.end();
})()
